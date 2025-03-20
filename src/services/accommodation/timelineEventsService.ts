
import { supabase } from '@/integrations/supabase/client';
import { AccommodationFormData } from './types';

// Helper function to create accommodation days entries
const createAccommodationDays = async (stay_id: string, tripId: string, dates: string[]) => {
  // Get existing trip days for this period
  const { data: tripDays, error: tripDaysError } = await supabase
    .from('trip_days')
    .select('day_id, date')
    .eq('trip_id', tripId)
    .in('date', dates);

  if (tripDaysError) throw tripDaysError;
  if (!tripDays?.length) return [];

  // Create accommodation_days entries only for existing trip days
  const accommodationDays = tripDays.map(day => ({
    stay_id,
    day_id: day.day_id,
    date: day.date
  }));

  const { error: daysError } = await supabase
    .from('accommodations_days')
    .insert(accommodationDays);

  if (daysError) throw daysError;
  
  return tripDays;
};

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
        hotel_details: formData.hotel_details,
        hotel_url: formData.hotel_url,
        hotel_checkin_date: formData.hotel_checkin_date,
        hotel_checkout_date: formData.hotel_checkout_date,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        currency: formData.currency || 'USD',
        hotel_address: formData.hotel_address || '',
        hotel_phone: formData.hotel_phone || '',
        hotel_place_id: formData.hotel_place_id || '',
        hotel_website: formData.hotel_website || '',
        order_index: 0,
        expense_type: 'accommodation',
        is_paid: formData.is_paid || false,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (accommodationError) throw accommodationError;

    // Create accommodation days entries
    await createAccommodationDays(accommodation.stay_id, tripId, dates);

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
    if (!formData.stay_id) throw new Error('Accommodation ID is required for update');

    // Update the main accommodation entry
    const { data: accommodation, error: accommodationError } = await supabase
      .from('accommodations')
      .update({
        trip_id: tripId,
        title: formData.hotel,
        hotel: formData.hotel,
        hotel_details: formData.hotel_details || '',
        hotel_url: formData.hotel_url || '',
        hotel_checkin_date: formData.hotel_checkin_date,
        hotel_checkout_date: formData.hotel_checkout_date,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        currency: formData.currency || 'USD',
        hotel_address: formData.hotel_address || '',
        hotel_phone: formData.hotel_phone || '',
        hotel_place_id: formData.hotel_place_id || '',
        hotel_website: formData.hotel_website || '',
        expense_type: 'accommodation',
        is_paid: formData.is_paid || false
      })
      .eq('stay_id', formData.stay_id)
      .select()
      .single();

    if (accommodationError) throw accommodationError;

    // Delete existing accommodation_days
    const { error: deleteError } = await supabase
      .from('accommodations_days')
      .delete()
      .eq('stay_id', accommodation.stay_id);

    if (deleteError) throw deleteError;

    // Create new accommodation days entries
    await createAccommodationDays(accommodation.stay_id, tripId, dates);

    return accommodation;
  } catch (error) {
    console.error('Error in updateAccommodationEvents:', error);
    throw error;
  }
};

export const deleteAccommodationEvents = async (stay_id: string) => {
  try {
    // First delete the accommodation days
    const { error: daysError } = await supabase
      .from('accommodations_days')
      .delete()
      .eq('stay_id', stay_id);

    if (daysError) throw daysError;

    // Then delete the accommodation
    const { error } = await supabase
      .from('accommodations')
      .delete()
      .eq('stay_id', stay_id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error in deleteAccommodationEvents:', error);
    throw error;
  }
};
