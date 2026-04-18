import { supabase } from '@/integrations/supabase/client';
import type { PlaceCard } from '@/types/ai-assistant';

const toDbTime = (t: unknown): string | null =>
  typeof t === 'string' && /^\d{2}:\d{2}$/.test(t) ? t : null;

const strOrNull = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v : null;

const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

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
  table: 'reservations' | 'day_activities';
  rowId: string;
  label: string;
};

export async function addPlaceCardItem(
  tripId: string,
  card: PlaceCard
): Promise<AddedPlaceCardItem> {
  const suggestion = card.suggested_add;
  if (!suggestion) throw new Error('This recommendation has no date. Add it manually instead.');

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

export async function undoPlaceCardItem(item: AddedPlaceCardItem): Promise<void> {
  const { error } = await supabase.from(item.table).delete().eq('id', item.rowId);
  if (error) throw new Error(error.message);
}
