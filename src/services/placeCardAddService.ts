import { supabase } from '@/integrations/supabase/client';
import { generateDateArray } from '@/utils/dateUtils';
import type { PlaceCard } from '@/types/ai-assistant';
import { defaultReservationEnd } from '@/utils/timeUtils';

const toDbTime = (t: unknown): string | null =>
  typeof t === 'string' && /^\d{2}:\d{2}$/.test(t) ? t : null;

const strOrNull = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v : null;

const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const isYmd = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

async function findOrCreateDay(tripId: string, date: string): Promise<string> {
  const { data: existing } = await supabase
    .from('trip_days')
    .select('day_id')
    .eq('trip_id', tripId)
    .eq('date', date)
    .single();
  if (existing?.day_id) return existing.day_id;

  const { data: created, error } = await supabase
    .from('trip_days')
    .insert({ trip_id: tripId, date, title: null })
    .select('day_id')
    .single();
  if (error || !created?.day_id) throw new Error('Could not create trip day');
  return created.day_id;
}

async function nextOrderIndex(table: 'day_activities' | 'reservations', dayId: string): Promise<number> {
  const { data } = await supabase
    .from(table)
    .select('order_index')
    .eq('day_id', dayId)
    .order('order_index', { ascending: false })
    .limit(1);
  return (data?.[0]?.order_index ?? -1) + 1;
}

export type AddedPlaceCardItem = {
  table: 'reservations' | 'day_activities' | 'accommodations';
  rowId: string;
  label: string;
};

export async function addPlaceCardItem(
  tripId: string,
  card: PlaceCard
): Promise<AddedPlaceCardItem> {
  const suggestion = card.suggested_add;
  if (!suggestion) throw new Error('This recommendation has no date. Add it manually instead.');

  if (suggestion.itemType === 'accommodation') {
    return addAccommodationCard(tripId, card, suggestion.fields);
  }

  const date = suggestion.fields.date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Missing or invalid date on this recommendation.');
  }
  const dayId = await findOrCreateDay(tripId, date);

  if (suggestion.itemType === 'reservation') {
    const time = toDbTime(suggestion.fields.time);
    if (!time) throw new Error('Reservations need a time — open the full form to add this.');

    const orderIndex = await nextOrderIndex('reservations', dayId);
    const { data, error } = await supabase
      .from('reservations')
      .insert({
        trip_id: tripId,
        day_id: dayId,
        restaurant_name: strOrNull(suggestion.fields.restaurant_name) || card.name,
        reservation_time: time,
        end_time: toDbTime(suggestion.fields.end_time) ?? defaultReservationEnd(time),
        number_of_people: numOrNull(suggestion.fields.party_size),
        address: strOrNull(suggestion.fields.address) || card.address || null,
        phone_number: strOrNull(suggestion.fields.phone) || card.phone || null,
        website: strOrNull(suggestion.fields.website) || card.booking_url || card.website || null,
        notes: strOrNull(suggestion.fields.notes),
        place_id: card.place_id || null,
        rating: numOrNull(card.rating),
        order_index: orderIndex,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error || !data?.id) throw new Error(error?.message || 'Failed to add reservation');
    return { table: 'reservations', rowId: data.id, label: card.name };
  }

  // activity
  const orderIndex = await nextOrderIndex('day_activities', dayId);
  const { data, error } = await supabase
    .from('day_activities')
    .insert({
      trip_id: tripId,
      day_id: dayId,
      title: strOrNull(suggestion.fields.name) || card.name,
      description: strOrNull(suggestion.fields.notes),
      start_time: toDbTime(suggestion.fields.start_time),
      end_time: toDbTime(suggestion.fields.end_time),
      location_address: strOrNull(suggestion.fields.location) || card.address || null,
      order_index: orderIndex,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error || !data?.id) throw new Error(error?.message || 'Failed to add activity');
  return { table: 'day_activities', rowId: data.id, label: card.name };
}

async function addAccommodationCard(
  tripId: string,
  card: PlaceCard,
  fields: Record<string, unknown>
): Promise<AddedPlaceCardItem> {
  const checkIn = fields.check_in_date;
  const checkOut = fields.check_out_date;
  if (!isYmd(checkIn) || !isYmd(checkOut)) {
    throw new Error('Missing check-in or check-out date on this recommendation.');
  }
  if (checkOut <= checkIn) {
    throw new Error('Check-out must be after check-in.');
  }

  const name = strOrNull(fields.name) || card.name;

  // accommodations.order_index is NOT NULL with no DB default — compute the
  // next slot for this trip so inserts don't fail on brand-new trips.
  const { data: maxRow } = await supabase
    .from('accommodations')
    .select('order_index')
    .eq('trip_id', tripId)
    .order('order_index', { ascending: false })
    .limit(1);
  const orderIndex = (maxRow?.[0]?.order_index ?? -1) + 1;

  const { data: stay, error: stayError } = await supabase
    .from('accommodations')
    .insert({
      trip_id: tripId,
      title: name,
      hotel: name,
      hotel_address: strOrNull(fields.address) || card.address || null,
      hotel_phone: strOrNull(fields.phone) || card.phone || null,
      hotel_website: strOrNull(fields.website) || card.booking_url || card.website || null,
      hotel_url: card.booking_url || null,
      hotel_place_id: strOrNull(fields.place_id) || card.place_id || null,
      hotel_checkin_date: checkIn,
      hotel_checkout_date: checkOut,
      checkin_time: toDbTime(fields.check_in_time),
      checkout_time: toDbTime(fields.check_out_time),
      order_index: orderIndex,
    })
    .select('stay_id')
    .single();
  if (stayError || !stay?.stay_id) {
    throw new Error(stayError?.message || 'Failed to add accommodation');
  }

  // Link this stay to every matching trip_day between check-in and check-out
  // (inclusive), so the timeline picks it up the same way manually-added
  // hotels do.
  const dates = generateDateArray(checkIn, checkOut);
  if (dates.length > 0) {
    const { data: tripDays } = await supabase
      .from('trip_days')
      .select('day_id, date')
      .eq('trip_id', tripId)
      .in('date', dates);
    const dayRows = (tripDays || []).map((d: { day_id: string; date: string }) => ({
      stay_id: stay.stay_id,
      day_id: d.day_id,
      date: d.date,
    }));
    if (dayRows.length > 0) {
      await supabase.from('accommodations_days').insert(dayRows);
    }
  }

  return { table: 'accommodations', rowId: stay.stay_id, label: name };
}

export async function undoPlaceCardItem(item: AddedPlaceCardItem): Promise<void> {
  if (item.table === 'accommodations') {
    // Delete the link rows first — accommodations_days has a FK on stay_id
    // but no cascade, so the parent delete would fail otherwise.
    await supabase.from('accommodations_days').delete().eq('stay_id', item.rowId);
    const { error } = await supabase.from('accommodations').delete().eq('stay_id', item.rowId);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from(item.table).delete().eq('id', item.rowId);
  if (error) throw new Error(error.message);
}
