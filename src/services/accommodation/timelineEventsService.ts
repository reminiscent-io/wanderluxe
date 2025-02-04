import { supabase } from "@/integrations/supabase/client";
import type { AccommodationFormData, HotelStay } from "./types";
import { toast } from "sonner";

export const createAccommodationEvents = async (
  tripId: string,
  formData: AccommodationFormData,
  stayDates: string[]
) => {
  const checkinDate = formData.checkinDate.split('T')[0];
  const checkoutDate = formData.checkoutDate.split('T')[0];

  // Create a new event for each day of the stay
  const events = stayDates.map((date, index) => ({
    trip_id: tripId,
    date,
    title: `Stay at ${formData.hotel}`,
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
    hotel_website: formData.hotelWebsite,
    final_accommodation_day: index === stayDates.length - 1 ? date : null
  }));

  const { error } = await supabase
    .from('timeline_events')
    .insert(events);

  if (error) {
    console.error('Error creating accommodation events:', error);
    throw error;
  }
};

export const updateAccommodationEvents = async (
  tripId: string,
  formData: AccommodationFormData,
  stayDates: string[]
) => {
  const checkinDate = formData.checkinDate.split('T')[0];
  const checkoutDate = formData.checkoutDate.split('T')[0];

  // First, find all existing events for this hotel
  const { data: existingEvents } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('trip_id', tripId)
    .eq('hotel', formData.hotel);

  if (existingEvents && existingEvents.length > 0) {
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
      .eq('hotel', formData.hotel);

    if (updateError) {
      console.error('Error updating accommodation events:', updateError);
      throw updateError;
    }
  } else {
    // If no existing events found, create new ones
    await createAccommodationEvents(tripId, formData, stayDates);
  }
};

export const deleteAccommodationEvents = async (stay: HotelStay) => {
  const { error } = await supabase
    .from('timeline_events')
    .delete()
    .eq('hotel', stay.hotel)
    .eq('hotel_checkin_date', stay.hotel_checkin_date)
    .eq('hotel_checkout_date', stay.hotel_checkout_date);

  if (error) {
    console.error('Error deleting accommodation events:', error);
    throw error;
  }
};