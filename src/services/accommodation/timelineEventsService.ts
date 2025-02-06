import { supabase } from '@/integrations/supabase/client';
import { AccommodationFormData } from './types';

export const createAccommodationEvents = async (
  tripId: string,
  formData: AccommodationFormData,
  dates: string[]
) => {
  try {
    // First, create the main accommodation entry
    const { data: accommodation, error: accommodationError } = await supabase
  .from('accommodations')
  .insert([{
    trip_id: tripId,
    title: formData.hotel,
    hotel: formData.hotel,
    hotel_details: formData.hotel_details,  // Changed from hotelDetails
    hotel_url: formData.hotel_url,  // Changed from hotelUrl
    hotel_checkin_date: formData.hotel_checkin_date,  // Changed from checkinDate
    hotel_checkout_date: formData.hotel_checkout_date,  // Changed from checkoutDate
    expense_cost: formData.expense_cost ? parseFloat(formData.expense_cost) : null,
    currency: formData.currency,  // Changed from expenseCurrency
    hotel_address: formData.hotel_address,
    hotel_phone: formData.hotel_phone,
    hotel_place_id: formData.hotel_place_id,
    hotel_website: formData.hotel_website,
    order_index: 0
  }])
      .select()
      .single();

    if (accommodationError) throw accommodationError;

    // Get all trip days for this period
    const { data: tripDays, error: tripDaysError } = await supabase
      .from('trip_days')
      .select('day_id, date')
      .eq('trip_id', tripId)
      .in('date', dates);

    if (tripDaysError) throw tripDaysError;

    // Create accommodation_days entries
    const accommodationDays = tripDays.map(day => ({
  stay_id: accommodation.stay_id,
  day_id: day.day_id,
  date: day.date  // Ensure this is in the correct date format
}));


    const { error: daysError } = await supabase
      .from('accommodations_days')
      .insert(accommodationDays);

    if (daysError) throw daysError;

    return accommodation;
  } catch (error) {
    console.error('Error in createAccommodationEvents:', error);
    throw error;
  }
};

export const updateAccommodationEvents = async (
  tripId: string,
  formData: AccommodationFormData,
  dates: string[]
) => {
  try {
    if (!formData.stay_id) throw new Error('Accommodation ID is required for update');  // Change from formData.id

// Update the main accommodation entry
const { data: accommodation, error: accommodationError } = await supabase
  .from('accommodations')
  .update({
    title: formData.hotel,
    hotel: formData.hotel,
    hotel_details: formData.hotel_details,  // Changed from hotelDetails
    hotel_url: formData.hotel_url,  // Changed from hotelUrl
    hotel_checkin_date: formData.hotel_checkin_date,  // Changed from checkinDate
    hotel_checkout_date: formData.hotel_checkout_date,  // Changed from checkoutDate
    expense_cost: formData.expense_cost ? parseFloat(formData.expense_cost) : null,
    currency: formData.currency,
    hotel_address: formData.hotel_address,
    hotel_phone: formData.hotel_phone,
    hotel_place_id: formData.hotel_place_id,
    hotel_website: formData.hotel_website
  })
  .eq('stay_id', formData.stay_id)  // Changed from formData.id

      .select()
      .single();

    if (accommodationError) throw accommodationError;

    // Delete existing accommodation_days
    const { error: deleteError } = await supabase
      .from('accommodations_days')
      .delete()
      .eq('stay_id', accommodation.stay_id);

    if (deleteError) throw deleteError;

    // Get all trip days for this period
    const { data: tripDays, error: tripDaysError } = await supabase
      .from('trip_days')
      .select('day_id, date')
      .eq('trip_id', tripId)
      .in('date', dates);

    if (tripDaysError) throw tripDaysError;

    // Create new accommodation_days entries
    const accommodationDays = tripDays.map(day => ({
      stay_id: accommodation.stay_id,
      day_id: day.day_id,
      date: day.date
    }));

    const { error: daysError } = await supabase
      .from('accommodations_days')
      .insert(accommodationDays);

    if (daysError) throw daysError;

    return accommodation;
  } catch (error) {
    console.error('Error in updateAccommodationEvents:', error);
    throw error;
  }
};

export const deleteAccommodationEvents = async (stay: { stay_id: string }) => {
  try {
    // Delete all accommodation_days first
    const { error: daysError } = await supabase
      .from('accommodations_days')
      .delete()
      .eq('stay_id', stay.stay_id);

    if (daysError) throw daysError;

    // Then delete the main accommodation entry
    const { error: accommodationError } = await supabase
      .from('accommodations')
      .delete()
      .eq('stay_id', stay.stay_id);

    if (accommodationError) throw accommodationError;

    return true;
  } catch (error) {
    console.error('Error in deleteAccommodationEvents:', error);
    throw error;
  }
};
