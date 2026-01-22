import { supabase } from '@/integrations/supabase/client';
import type { ExtractedItem, TravelItemType } from '@/types/ai-assistant';

// Helper to normalize time format
const toDbTime = (t?: string | null): string | null =>
  t && /^\d{2}:\d{2}$/.test(t) ? t : null;

// Import a single transportation item
async function importTransportation(
  tripId: string,
  fields: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const type = (fields.type as string) || 'flight';
    const normalizedType = type === 'flight' ? 'flight' :
                          type === 'train' ? 'train' :
                          type === 'ferry' ? 'ferry' :
                          type === 'rental_car' ? 'rental_car' :
                          type === 'car_service' ? 'car_service' :
                          type === 'shuttle' ? 'shuttle' : 'other';

    const { error } = await supabase
      .from('transportation')
      .insert({
        trip_id: tripId,
        type: normalizedType as any,
        provider: (fields.carrier as string) || null,
        departure_location: (fields.departure_location as string) || null,
        arrival_location: (fields.arrival_location as string) || null,
        start_date: (fields.departure_date as string) || '',
        start_time: toDbTime(fields.departure_time as string),
        end_date: (fields.arrival_date as string) || (fields.departure_date as string) || '',
        end_time: toDbTime(fields.arrival_time as string),
        confirmation_number: (fields.confirmation_number as string) || null,
        cost: typeof fields.cost === 'number' ? fields.cost : null,
        currency: (fields.currency as string) || 'USD',
        details: null,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    console.error('Failed to import transportation:', e);
    return { success: false, error: e?.message || 'Failed to import transportation' };
  }
}

// Import a single accommodation item
async function importAccommodation(
  tripId: string,
  fields: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const parts: string[] = [];
    if (fields.provider) parts.push(`Booked via ${fields.provider}`);
    if (fields.confirmation_number) parts.push(`Confirmation ${fields.confirmation_number}`);

    const { error } = await supabase
      .from('accommodations')
      .insert({
        trip_id: tripId,
        hotel: (fields.name as string) || '',
        hotel_details: parts.join(' • '),
        hotel_url: (fields.website as string) || '',
        hotel_checkin_date: (fields.check_in_date as string) || '',
        hotel_checkout_date: (fields.check_out_date as string) || '',
        checkin_time: toDbTime(fields.check_in_time as string) || '15:00',
        checkout_time: toDbTime(fields.check_out_time as string) || '11:00',
        cost: typeof fields.cost === 'number' ? fields.cost : null,
        currency: (fields.currency as string) || 'USD',
        hotel_address: (fields.address as string) || '',
        hotel_phone: (fields.phone as string) || '',
        hotel_place_id: '',
        hotel_website: (fields.website as string) || '',
        expense_type: 'accommodation',
        is_paid: false,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    console.error('Failed to import accommodation:', e);
    return { success: false, error: e?.message || 'Failed to import accommodation' };
  }
}

// Import a single activity item
async function importActivity(
  tripId: string,
  fields: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const activityDate = fields.date as string;

    // First, find or create the trip_day for this date
    let dayId: string | null = null;

    if (activityDate) {
      const { data: existingDay } = await supabase
        .from('trip_days')
        .select('day_id')
        .eq('trip_id', tripId)
        .eq('date', activityDate)
        .single();

      if (existingDay) {
        dayId = existingDay.day_id;
      } else {
        // Create the day
        const { data: newDay, error: dayError } = await supabase
          .from('trip_days')
          .insert({
            trip_id: tripId,
            date: activityDate,
            title: null
          })
          .select('day_id')
          .single();

        if (dayError) throw dayError;
        dayId = newDay?.day_id || null;
      }
    }

    // If we couldn't get/create a day, we can't add the activity
    if (!dayId) {
      throw new Error('Could not determine the day for this activity');
    }

    // Get the next order_index for this day
    const { data: existingActivities } = await supabase
      .from('day_activities')
      .select('order_index')
      .eq('day_id', dayId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextIndex = (existingActivities?.[0]?.order_index ?? -1) + 1;

    const { error } = await supabase
      .from('day_activities')
      .insert({
        trip_id: tripId,
        day_id: dayId,
        title: (fields.name as string) || 'Activity',
        description: (fields.notes as string) || null,
        start_time: toDbTime(fields.start_time as string),
        end_time: toDbTime(fields.end_time as string),
        cost: typeof fields.cost === 'number' ? fields.cost : null,
        currency: (fields.currency as string) || 'USD',
        order_index: nextIndex,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    console.error('Failed to import activity:', e);
    return { success: false, error: e?.message || 'Failed to import activity' };
  }
}

// Import a single reservation item
async function importReservation(
  tripId: string,
  fields: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('reservations')
      .insert({
        trip_id: tripId,
        restaurant_name: (fields.restaurant_name as string) || '',
        reservation_date: (fields.date as string) || '',
        reservation_time: toDbTime(fields.time as string) || '',
        number_of_people: typeof fields.party_size === 'number' ? fields.party_size : null,
        address: (fields.address as string) || null,
        phone_number: (fields.phone as string) || null,
        website: (fields.website as string) || null,
        notes: (fields.notes as string) || null,
        cost: typeof fields.cost === 'number' ? fields.cost : null,
        currency: (fields.currency as string) || 'USD',
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    console.error('Failed to import reservation:', e);
    return { success: false, error: e?.message || 'Failed to import reservation' };
  }
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
