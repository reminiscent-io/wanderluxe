import { toast } from 'sonner';
import type { AccommodationFormData, HotelStay } from './types';
import { generateDatesArray } from './dateUtils';
import { createTripDays } from './tripDaysService';
import { createAccommodationEvents, deleteAccommodationEvents, updateAccommodationEvents } from './timelineEventsService';

export type { AccommodationFormData } from './types';
export { generateDatesArray } from './dateUtils';

export const addAccommodation = async (tripId: string, formData: AccommodationFormData) => {
  try {
    console.log('Adding accommodation with dates:', {
      checkin: formData.hotel_checkin_date,
      checkout: formData.hotel_checkout_date
    });

    const stayDates = generateDatesArray(formData.hotel_checkin_date, formData.hotel_checkout_date);

    // Create trip days for the entire stay period
    await createTripDays(tripId, stayDates);

    // Create all timeline events for the stay
    await createAccommodationEvents(tripId, formData, stayDates);

    toast.success('Accommodation added successfully');
    return true;
  } catch (error) {
    console.error('Error adding accommodation:', error);
    toast.error('Failed to add accommodation');
    return false;
  }
};

export const updateAccommodation = async (
  tripId: string,
  stay_id: string,
  formData: AccommodationFormData
) => {
  try {
    if (!stay_id) {
      throw new Error('stay_id is required for update');
    }
    
    console.log('Updating accommodation with dates:', {
      checkin: formData.hotel_checkin_date,
      checkout: formData.hotel_checkout_date,
      stay_id: stay_id
    });

    const stayDates = generateDatesArray(formData.hotel_checkin_date, formData.hotel_checkout_date);

    // Create trip days for the entire stay period if needed
    await createTripDays(tripId, stayDates);

    // Update existing events for this hotel stay
    await updateAccommodationEvents(tripId, { ...formData, stay_id }, stayDates);
    
    // Invalidate both timeline and trip days queries
    const queryClient = useQueryClient();
    queryClient.invalidateQueries({ queryKey: ['timeline-events', tripId] });
    queryClient.invalidateQueries({ queryKey: ['trip-days', tripId] });

    toast.success('Accommodation updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating accommodation:', error);
    toast.error('Failed to update accommodation');
    return false;
  }
};

export const deleteAccommodation = async (stay_id: string) => {
  if (!stay_id) {
    throw new Error('Accommodation ID is required for deletion');
  }
  try {
    await deleteAccommodationEvents(stay_id);
    toast.success('Accommodation deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting accommodation:', error);
    toast.error('Failed to delete accommodation');
    return false;
  }
};