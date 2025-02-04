import { supabase } from '@/integrations/supabase/client';
import { AccommodationFormData } from './types';

export const createAccommodationEvents = async (
  tripId: string,
  formData: AccommodationFormData,
  stayDates: string[]
) => {
  // Ensure we're using date-only strings
  const checkinDate = formData.checkinDate.split('T')[0];
  const checkoutDate = formData.checkoutDate.split('T')[0];

  // Create the main check-in event
  const { data: checkInEvent, error: checkInError } = await supabase
    .from('timeline_events')
    .insert([{
      trip_id: tripId,
      date: checkinDate,
      title: `Check-in: ${formData.hotel}`,
      hotel: formData.hotel,
      hotel_details: formData.hotelDetails,
      hotel_url: formData.hotelUrl,
      hotel_checkin_date: checkinDate,
      hotel_checkout_date: checkoutDate,
      expense_type: 'accommodation',
      expense_cost: formData.expenseCost ? Number(formData.expenseCost) : null,
      expense_currency: formData.expenseCurrency,
      hotel_address: formData.hotelAddress,
      hotel_phone: formData.hotelPhone,
      hotel_place_id: formData.hotelPlaceId,
      hotel_website: formData.hotelWebsite,
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
      hotel_checkin_date: checkinDate,
      hotel_checkout_date: checkoutDate,
      hotel_address: formData.hotelAddress,
      hotel_phone: formData.hotelPhone,
      hotel_place_id: formData.hotelPlaceId,
      hotel_website: formData.hotelWebsite,
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
      date: checkoutDate,
      title: `Check-out: ${formData.hotel}`,
      hotel: formData.hotel,
      hotel_details: formData.hotelDetails,
      hotel_url: formData.hotelUrl,
      hotel_checkin_date: checkinDate,
      hotel_checkout_date: checkoutDate,
      hotel_address: formData.hotelAddress,
      hotel_phone: formData.hotelPhone,
      hotel_place_id: formData.hotelPlaceId,
      hotel_website: formData.hotelWebsite,
      order_index: 0
    }]);

  if (checkoutError) throw checkoutError;

  return checkInEvent;
};

export const updateAccommodationEvents = async (
  tripId: string,
  formData: AccommodationFormData,
  stayDates: string[]
) => {
  const checkinDate = formData.checkinDate.split('T')[0];
  const checkoutDate = formData.checkoutDate.split('T')[0];

  // Update all events for this hotel stay
  const { error: updateError } = await supabase
    .from('timeline_events')
    .update({
      hotel: formData.hotel,
      hotel_details: formData.hotelDetails,
      hotel_url: formData.hotelUrl,
      hotel_checkin_date: checkinDate,
      hotel_checkout_date: checkoutDate,
      expense_cost: formData.expenseCost ? Number(formData.expenseCost) : null,
      expense_currency: formData.expenseCurrency,
      hotel_address: formData.hotelAddress,
      hotel_phone: formData.hotelPhone,
      hotel_place_id: formData.hotelPlaceId,
      hotel_website: formData.hotelWebsite
    })
    .eq('trip_id', tripId)
    .eq('hotel_checkin_date', checkinDate)
    .eq('hotel_checkout_date', checkoutDate);

  if (updateError) throw updateError;
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
    .eq('hotel_checkin_date', stay.hotel_checkin_date.split('T')[0])
    .eq('hotel_checkout_date', stay.hotel_checkout_date.split('T')[0]);

  if (error) throw error;
};