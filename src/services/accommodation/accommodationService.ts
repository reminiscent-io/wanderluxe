
import { supabase } from '@/integrations/supabase/client';
import { timelineEventsService } from './timelineEventsService';
import { AccommodationFormData } from '@/types/trip';

// Export individual functions for direct import
export const addAccommodation = async (tripId: string, formData: AccommodationFormData) => {
  return accommodationService.createAccommodation(tripId, formData);
};

export const updateAccommodation = async (tripId: string, stayId: string, formData: AccommodationFormData) => {
  const updatedFormData = { ...formData, stay_id: stayId };
  return accommodationService.updateAccommodation(tripId, updatedFormData);
};

export const deleteAccommodation = async (stayId: string) => {
  return accommodationService.deleteAccommodation(stayId);
};

export const accommodationService = {
  createAccommodation: async (tripId: string, formData: AccommodationFormData) => {
    // Calculate the dates between check-in and checkout
    const checkinDate = new Date(formData.hotel_checkin_date);
    const checkoutDate = new Date(formData.hotel_checkout_date);
    const dates: string[] = [];
    
    // Generate dates array for the entire duration of the stay
    // The array includes all dates from check-in (inclusive) to checkout (exclusive)
    const currentDate = new Date(checkinDate);
    while (currentDate < checkoutDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    try {
      // Pass the generated dates array to create accommodation_days entries
      const accommodation = await timelineEventsService.createAccommodationEvents(tripId, formData, dates);
      return accommodation;
    } catch (error) {
      console.error('Error in createAccommodation:', error);
      throw error;
    }
  },
  
  updateAccommodation: async (tripId: string, formData: AccommodationFormData) => {
    // Calculate the dates between check-in and checkout
    const checkinDate = new Date(formData.hotel_checkin_date);
    const checkoutDate = new Date(formData.hotel_checkout_date);
    const dates: string[] = [];
    
    // Generate dates array for the entire duration of the stay
    // The array includes all dates from check-in (inclusive) to checkout (exclusive)
    const currentDate = new Date(checkinDate);
    while (currentDate < checkoutDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    try {
      const accommodation = await timelineEventsService.updateAccommodationEvents(tripId, formData, dates);
      return accommodation;
    } catch (error) {
      console.error('Error in updateAccommodation:', error);
      throw error;
    }
  },
  
  deleteAccommodation: async (stayId: string) => {
    try {
      await timelineEventsService.deleteAccommodationEvents(stayId);
      return true;
    } catch (error) {
      console.error('Error in deleteAccommodation:', error);
      throw error;
    }
  }
};
