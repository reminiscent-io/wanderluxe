import { toast } from 'sonner';
import { AccommodationFormData, HotelStay } from './types';
import { generateDatesArray } from './dateUtils';
import { createTripDays } from './tripDaysService';
import { createAccommodationEvents, deleteAccommodationEvents } from './timelineEventsService';

export { AccommodationFormData } from './types';
export { generateDatesArray } from './dateUtils';

export const addAccommodation = async (tripId: string, formData: AccommodationFormData) => {
  try {
    console.log('Adding accommodation with dates:', {
      checkin: formData.checkinDate,
      checkout: formData.checkoutDate
    });

    const stayDates = generateDatesArray(formData.checkinDate, formData.checkoutDate);
    
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
  stayId: string,
  formData: AccommodationFormData
) => {
  try {
    console.log('Updating accommodation with dates:', {
      checkin: formData.checkinDate,
      checkout: formData.checkoutDate
    });

    // First, delete all existing events for this hotel stay
    await deleteAccommodationEvents({
      hotel: formData.hotel,
      hotel_checkin_date: formData.checkinDate,
      hotel_checkout_date: formData.checkoutDate
    });

    // Then create new events for the updated stay
    const success = await addAccommodation(tripId, formData);
    if (!success) throw new Error('Failed to update accommodation');

    toast.success('Accommodation updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating accommodation:', error);
    toast.error('Failed to update accommodation');
    return false;
  }
};

export const deleteAccommodation = async (stay: HotelStay) => {
  try {
    await deleteAccommodationEvents(stay);
    toast.success('Accommodation deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting accommodation:', error);
    toast.error('Failed to delete accommodation');
    return false;
  }
};