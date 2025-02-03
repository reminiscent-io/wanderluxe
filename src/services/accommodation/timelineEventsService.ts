import { supabase } from '@/integrations/supabase/client';
import { AccommodationFormData } from './types';

export const createAccommodationEvents = async (
  tripId: string,
  formData: AccommodationFormData,
  stayDates: string[]
) => {
  // Create the main check-in event
  const { data: checkInEvent, error: checkInError } = await supabase
    .from('timeline_events')
    .insert([{
      trip_id: tripId,
      date: formData.checkinDate,
      title: `Check-in: ${formData.hotel}`,
      hotel: formData.hotel,
      hotel_details: formData.hotelDetails,
      hotel_url: formData.hotelUrl,
      hotel_checkin_date: formData.checkinDate,
      hotel_checkout_date: formData.checkoutDate,
      expense_type: 'accommodation',
      expense_cost: formData.expenseCost ? Number(formData.expenseCost) : null,
      expense_currency: formData.expenseCurrency,
      order_index: 0
    }])
    .select()
    .single();

  if (checkInError) throw checkInError;

  // Create stay events for intermediate days
  if (stayDates.length > 1) {
    const stayEvents = stayDates.slice(1).map((date) => ({
      trip_id: tripId,
      date: date,
      title: `Stay at ${formData.hotel}`,
      hotel: formData.hotel,
      hotel_details: formData.hotelDetails,
      hotel_url: formData.hotelUrl,
      hotel_checkin_date: formData.checkinDate,
      hotel_checkout_date: formData.checkoutDate,
      order_index: 0
    }));

    const { error: stayError } = await supabase
      .from('timeline_events')
      .insert(stayEvents);

    if (stayError) throw stayError;
  }

  // Create checkout event
  const { error: checkoutError } = await supabase
    .from('timeline_events')
    .insert([{
      trip_id: tripId,
      date: formData.checkoutDate,
      title: `Check-out: ${formData.hotel}`,
      hotel: formData.hotel,
      hotel_details: formData.hotelDetails,
      hotel_url: formData.hotelUrl,
      hotel_checkin_date: formData.checkinDate,
      hotel_checkout_date: formData.checkoutDate,
      order_index: 0
    }]);

  if (checkoutError) throw checkoutError;

  return checkInEvent;
};

export const deleteAccommodationEvents = async (stay: {
  hotel: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
}) => {
  const { error } = await supabase
    .from('timeline_events')
    .delete()
    .eq('hotel', stay.hotel)
    .eq('hotel_checkin_date', stay.hotel_checkin_date)
    .eq('hotel_checkout_date', stay.hotel_checkout_date);

  if (error) throw error;
};