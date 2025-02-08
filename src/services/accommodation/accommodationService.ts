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
    console.log('Updating accommodation with dates:', {
      checkin: formData.hotel_checkin_date,
      checkout: formData.hotel_checkout_date
    });

    const stayDates = generateDatesArray(formData.hotel_checkin_date, formData.hotel_checkout_date);

    // Update existing events for this hotel stay
    await updateAccommodationEvents(tripId, formData, stayDates);

    toast.success('Accommodation updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating accommodation:', error);
    toast.error('Failed to update accommodation');
    return false;
  }
};

export const deleteAccommodation = async (id?: string) => {
  if (!id) {
    throw new Error('Accommodation ID is required for deletion');
  }
  try {
    await deleteAccommodationEvents(id);
    toast.success('Accommodation deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting accommodation:', error);
    toast.error('Failed to delete accommodation');
    return false;
  }
};