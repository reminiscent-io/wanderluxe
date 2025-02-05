import { supabase } from '@/integrations/supabase/client';
import { AccommodationFormData } from './types';
import { generateDatesArray } from './dateUtils';

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
        hotel_details: formData.hotelDetails,
        hotel_url: formData.hotelUrl,
        hotel_checkin_date: formData.checkinDate,
        hotel_checkout_date: formData.checkoutDate,
        expense_cost: formData.expenseCost ? parseFloat(formData.expenseCost) : null,
        currency: formData.expenseCurrency,
        hotel_address: formData.hotelAddress,
        hotel_phone: formData.hotelPhone,
        hotel_place_id: formData.hotelPlaceId,
        hotel_website: formData.hotelWebsite,
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
      accommodation_id: accommodation.id,
      day_id: day.day_id,
      date: day.date
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
    // Update the main accommodation entry
    const { data: accommodation, error: accommodationError } = await supabase
      .from('accommodations')
      .update({
        title: formData.hotel,
        hotel: formData.hotel,
        hotel_details: formData.hotelDetails,
        hotel_url: formData.hotelUrl,
        hotel_checkin_date: formData.checkinDate,
        hotel_checkout_date: formData.checkoutDate,
        expense_cost: formData.expenseCost ? parseFloat(formData.expenseCost) : null,
        currency: formData.expenseCurrency,
        hotel_address: formData.hotelAddress,
        hotel_phone: formData.hotelPhone,
        hotel_place_id: formData.hotelPlaceId,
        hotel_website: formData.hotelWebsite
      })
      .eq('id', formData.id)
      .select()
      .single();

    if (accommodationError) throw accommodationError;

    // Delete existing accommodation_days
    const { error: deleteError } = await supabase
      .from('accommodations_days')
      .delete()
      .eq('accommodation_id', accommodation.id);

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
      accommodation_id: accommodation.id,
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

export const deleteAccommodationEvents = async (stay: any) => {
  try {
    // Delete all accommodation_days first
    const { error: daysError } = await supabase
      .from('accommodations_days')
      .delete()
      .eq('accommodation_id', stay.id);

    if (daysError) throw daysError;

    // Then delete the main accommodation entry
    const { error: accommodationError } = await supabase
      .from('accommodations')
      .delete()
      .eq('id', stay.id);

    if (accommodationError) throw accommodationError;

    return true;
  } catch (error) {
    console.error('Error in deleteAccommodationEvents:', error);
    throw error;
  }
};