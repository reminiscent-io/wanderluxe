import { supabase } from '@/integrations/supabase/client';
import type { ExtractedItem, TravelItemType } from '@/types/ai-assistant';
import type { Database } from '@/integrations/supabase/types/database';

// Helper to normalize time format
const toDbTime = (t?: string | null): string | null =>
  t && /^\d{2}:\d{2}$/.test(t) ? t : null;

type ImportResult = { success: boolean; error?: string };

const KNOWN_TRANSPORT_TYPES = new Set([
  'flight', 'train', 'ferry', 'rental_car', 'car_service', 'shuttle'
]);

function normalizeTransportType(type: string): string {
  return KNOWN_TRANSPORT_TYPES.has(type) ? type : 'other';
}

function strField(fields: Record<string, unknown>, key: string, fallback = ''): string {
  return (fields[key] as string) || fallback;
}

function costField(fields: Record<string, unknown>): number | null {
  return typeof fields.cost === 'number' ? fields.cost : null;
}

async function findOrCreateDay(tripId: string, date: string | null, label: string): Promise<string> {
  if (!date) throw new Error(`Could not determine the day for this ${label}`);

  const { data: existingDay } = await supabase
    .from('trip_days')
    .select('day_id')
    .eq('trip_id', tripId)
    .eq('date', date)
    .single();

  if (existingDay) return existingDay.day_id;

  const { data: newDay, error: dayError } = await supabase
    .from('trip_days')
    .insert({ trip_id: tripId, date, title: null })
    .select('day_id')
    .single();

  if (dayError) throw dayError;
  if (!newDay?.day_id) throw new Error(`Could not determine the day for this ${label}`);
  return newDay.day_id;
}

async function getNextOrderIndex(table: string, dayId: string): Promise<number> {
  const { data } = await supabase
    .from(table)
    .select('order_index')
    .eq('day_id', dayId)
    .order('order_index', { ascending: false })
    .limit(1);
  return (data?.[0]?.order_index ?? -1) + 1;
}

async function wrapImport(label: string, fn: () => Promise<void>): Promise<ImportResult> {
  try {
    await fn();
    return { success: true };
  } catch (e: unknown) {
    console.error(`Failed to import ${label}:`, e);
    return { success: false, error: e instanceof Error ? e.message : `Failed to import ${label}` };
  }
}

// Import a single transportation item
async function importTransportation(
  tripId: string,
  fields: Record<string, unknown>
): Promise<ImportResult> {
  return wrapImport('transportation', async () => {
    const { error } = await supabase
      .from('transportation')
      .insert({
        trip_id: tripId,
        type: normalizeTransportType((fields.type as string) || 'flight') as Database['public']['Enums']['transportation_type'],
        provider: strField(fields, 'carrier') || null,
        departure_location: strField(fields, 'departure_location') || null,
        arrival_location: strField(fields, 'arrival_location') || null,
        start_date: strField(fields, 'departure_date'),
        start_time: toDbTime(fields.departure_time as string),
        end_date: strField(fields, 'arrival_date') || strField(fields, 'departure_date'),
        end_time: toDbTime(fields.arrival_time as string),
        confirmation_number: strField(fields, 'confirmation_number') || null,
        cost: costField(fields),
        currency: strField(fields, 'currency', 'USD'),
        details: null,
        created_at: new Date().toISOString()
      });
    if (error) throw error;
  });
}

// Import a single accommodation item
async function importAccommodation(
  tripId: string,
  fields: Record<string, unknown>
): Promise<ImportResult> {
  return wrapImport('accommodation', async () => {
    const parts: string[] = [];
    if (fields.provider) parts.push(`Booked via ${fields.provider}`);
    if (fields.confirmation_number) parts.push(`Confirmation ${fields.confirmation_number}`);

    const { error } = await supabase
      .from('accommodations')
      .insert({
        trip_id: tripId,
        hotel: strField(fields, 'name'),
        hotel_details: parts.join(' • '),
        hotel_url: strField(fields, 'website'),
        hotel_checkin_date: strField(fields, 'check_in_date'),
        hotel_checkout_date: strField(fields, 'check_out_date'),
        checkin_time: toDbTime(fields.check_in_time as string) || '15:00',
        checkout_time: toDbTime(fields.check_out_time as string) || '11:00',
        cost: costField(fields),
        currency: strField(fields, 'currency', 'USD'),
        hotel_address: strField(fields, 'address'),
        hotel_phone: strField(fields, 'phone'),
        hotel_place_id: '',
        hotel_website: strField(fields, 'website'),
        expense_type: 'accommodation',
        is_paid: false,
        created_at: new Date().toISOString()
      });
    if (error) throw error;
  });
}

// Import a single activity item
async function importActivity(
  tripId: string,
  fields: Record<string, unknown>
): Promise<ImportResult> {
  return wrapImport('activity', async () => {
    const dayId = await findOrCreateDay(tripId, fields.date as string, 'activity');
    const nextIndex = await getNextOrderIndex('day_activities', dayId);

    const { error } = await supabase
      .from('day_activities')
      .insert({
        trip_id: tripId,
        day_id: dayId,
        title: strField(fields, 'name', 'Activity'),
        description: strField(fields, 'notes') || null,
        start_time: toDbTime(fields.start_time as string),
        end_time: toDbTime(fields.end_time as string),
        cost: costField(fields),
        currency: strField(fields, 'currency', 'USD'),
        location_address: strField(fields, 'location') || null,
        order_index: nextIndex,
        created_at: new Date().toISOString()
      });
    if (error) throw error;
  });
}

// Import a single reservation item
async function importReservation(
  tripId: string,
  fields: Record<string, unknown>
): Promise<ImportResult> {
  return wrapImport('reservation', async () => {
    const dayId = await findOrCreateDay(tripId, fields.date as string, 'reservation');
    const nextIndex = await getNextOrderIndex('reservations', dayId);

    const { error } = await supabase
      .from('reservations')
      .insert({
        trip_id: tripId,
        day_id: dayId,
        restaurant_name: strField(fields, 'restaurant_name'),
        reservation_time: toDbTime(fields.time as string) || '',
        number_of_people: typeof fields.party_size === 'number' ? fields.party_size : null,
        address: strField(fields, 'address') || null,
        phone_number: strField(fields, 'phone') || null,
        website: strField(fields, 'website') || null,
        notes: strField(fields, 'notes') || null,
        cost: costField(fields),
        currency: strField(fields, 'currency', 'USD'),
        order_index: nextIndex,
        created_at: new Date().toISOString()
      });
    if (error) throw error;
  });
}

// Bulk import multiple items
export async function bulkImportItems(
  tripId: string,
  items: ExtractedItem[]
): Promise<{
  successCount: number;
  failedCount: number;
  errors: Array<{ itemId: string; error: string }>;
}> {
  const results = {
    successCount: 0,
    failedCount: 0,
    errors: [] as Array<{ itemId: string; error: string }>
  };

  for (const item of items) {
    let result: { success: boolean; error?: string };

    switch (item.itemType) {
      case 'transportation':
        result = await importTransportation(tripId, item.fields);
        break;
      case 'accommodation':
        result = await importAccommodation(tripId, item.fields);
        break;
      case 'activity':
        result = await importActivity(tripId, item.fields);
        break;
      case 'reservation':
        result = await importReservation(tripId, item.fields);
        break;
      default:
        result = { success: false, error: `Unknown item type: ${item.itemType}` };
    }

    if (result.success) {
      results.successCount++;
    } else {
      results.failedCount++;
      results.errors.push({ itemId: item.id, error: result.error || 'Unknown error' });
    }
  }

  return results;
}

export default {
  bulkImportItems,
  importTransportation,
  importAccommodation,
  importActivity,
  importReservation
};
