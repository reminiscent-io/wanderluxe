import { supabase } from '@/integrations/supabase/client';
import { updateAccommodation, type AccommodationFormData } from '@/services/accommodation/accommodationService';
import type { EntityDropPatch } from './eventMapping';
import type { HotelStay } from '@/types/trip';

async function resolveDayId(tripId: string, date: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('trip_days')
    .select('day_id')
    .eq('trip_id', tripId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return (data as { day_id: string } | null)?.day_id ?? null;
}

export async function applyDropPatch(patch: EntityDropPatch, tripId: string, original: unknown): Promise<void> {
  switch (patch.entityType) {
    case 'activity': {
      const dayId = await resolveDayId(tripId, patch.date);
      if (!dayId) throw new Error('No trip day exists for that date');
      const { error } = await supabase
        .from('day_activities')
        .update({ day_id: dayId, start_time: patch.startTime, end_time: patch.endTime })
        .eq('id', patch.recordId);
      if (error) throw error;
      return;
    }
    case 'dining': {
      const dayId = await resolveDayId(tripId, patch.date);
      if (!dayId) throw new Error('No trip day exists for that date');
      const { error } = await supabase
        .from('reservations')
        .update({ day_id: dayId, reservation_time: patch.time })
        .eq('id', patch.recordId);
      if (error) throw error;
      return;
    }
    case 'transportation': {
      const { error } = await supabase
        .from('transportation')
        .update({ start_date: patch.startDate, start_time: patch.startTime, end_date: patch.endDate, end_time: patch.endTime })
        .eq('id', patch.recordId);
      if (error) throw error;
      return;
    }
    case 'accommodation': {
      const stay = original as HotelStay;
      const formData: AccommodationFormData = {
        hotel: stay.hotel,
        hotel_details: stay.hotel_details ?? undefined,
        hotel_address: stay.hotel_address ?? undefined,
        hotel_phone: stay.hotel_phone ?? undefined,
        hotel_website: stay.hotel_website ?? undefined,
        hotel_url: stay.hotel_url ?? undefined,
        hotel_checkin_date: patch.checkinDate,
        hotel_checkout_date: patch.checkoutDate,
        checkin_time: stay.checkin_time || null,
        checkout_time: stay.checkout_time || null,
        cost: stay.cost != null ? String(stay.cost) : null,
        currency: stay.currency ?? undefined,
        hotel_place_id: stay.hotel_place_id ?? undefined,
      };
      await updateAccommodation(stay.stay_id, formData);
      return;
    }
  }
}
