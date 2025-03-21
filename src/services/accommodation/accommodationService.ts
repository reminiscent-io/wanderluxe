
import { toast } from 'sonner';
import type { AccommodationFormData } from '@/types/trip';
import { generateDatesArray } from './dateUtils';
import { createTripDays } from './tripDaysService';
import { createAccommodationEvents, deleteAccommodationEvents, updateAccommodationEvents } from './timelineEventsService';

export { generateDatesArray } from './dateUtils';

export const addAccommodation = async (tripId: string, formData: AccommodationFormData) => {
  try {
    const stayDates = generateDatesArray(formData.hotel_checkin_date, formData.hotel_checkout_date);

    // Create trip days for the entire stay period
    await createTripDays(tripId, stayDates);

    // Create all timeline events for the stay
    const accommodationData = {
      ...formData,
      trip_id: tripId,
      expense_cost: formData.cost ? parseFloat(formData.cost) : null,
      expense_type: formData.expense_type || 'accommodation',
      is_paid: formData.is_paid || false,
      expense_date: formData.expense_date || null,
      currency: formData.currency || 'USD'
    };
    
    await createAccommodationEvents(tripId, accommodationData, stayDates);

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

    const stayDates = generateDatesArray(formData.hotel_checkin_date, formData.hotel_checkout_date);

    // Create trip days for the entire stay period if needed
    /await createTripDays(tripId, stayDates);

    // Update existing events for this hotel stay
    const accommodationData = {
      ...formData,
      stay_id,
      trip_id: tripId,
      expense_cost: formData.cost ? parseFloat(formData.cost) : null,
      expense_type: formData.expense_type || 'accommodation',
      is_paid: formData.is_paid || false,
      expense_date: formData.expense_date || null,
      currency: formData.currency || 'USD'
    };
    
    await updateAccommodationEvents(tripId, accommodationData, stayDates);

    toast.success('Accommodation updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating accommodation:', error);
    toast.error('Failed to update accommodation');
    return false;
  }
};

export const deleteAccommodation = async (stayId: string) => {
  if (!stayId) {
    throw new Error('Accommodation ID is required for deletion');
  }
  try {
    await deleteAccommodationEvents(stayId);
    toast.success('Accommodation deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting accommodation:', error);
    toast.error('Failed to delete accommodation');
    return false;
  }
};
