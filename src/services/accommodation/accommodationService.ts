
import { supabase } from '@/integrations/supabase/client';
import { timelineEventsService } from './timelineEventsService';
import { AccommodationFormData } from '@/types/trip';

export const accommodationService = {
  createAccommodation: async (tripId: string, formData: AccommodationFormData) => {
    // Calculate the dates between check-in and checkout
    const checkinDate = new Date(formData.hotel_checkin_date);
    const checkoutDate = new Date(formData.hotel_checkout_date);
    const dates: string[] = [];
    
    // Generate dates array
    const currentDate = new Date(checkinDate);
    while (currentDate < checkoutDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    try {
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
    
    // Generate dates array
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
