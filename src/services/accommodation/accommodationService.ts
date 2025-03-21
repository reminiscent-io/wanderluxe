import { supabase } from "@/integrations/supabase/client";
import { generateDateArray } from "./dateUtils";
import { toast } from "sonner";

// Type for accommodation form data
export interface AccommodationFormData {
  hotel: string;
  hotel_details?: string;
  hotel_address?: string;
  hotel_phone?: string;
  hotel_website?: string;
  hotel_url?: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  cost?: string | null;
  currency?: string;
  hotel_place_id?: string | null;
}

// Add a new accommodation
export const addAccommodation = async (tripId: string, formData: AccommodationFormData) => {
  try {
    console.log("Adding accommodation with data:", formData);

    // Insert the accommodation record
    const { data: accommodationData, error: accommodationError } = await supabase
      .from("accommodations")
      .insert({
        trip_id: tripId,
        hotel: formData.hotel,
        hotel_details: formData.hotel_details || null,
        hotel_address: formData.hotel_address || null,
        hotel_phone: formData.hotel_phone || null,
        hotel_website: formData.hotel_website || null,
        hotel_url: formData.hotel_url || null,
        hotel_checkin_date: formData.hotel_checkin_date,
        hotel_checkout_date: formData.hotel_checkout_date,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        currency: formData.currency || null,
        hotel_place_id: formData.hotel_place_id || null,
      })
      .select("*")
      .single();

    if (accommodationError) {
      console.error("Error adding accommodation:", accommodationError);
      throw accommodationError;
    }

    console.log("Accommodation added successfully:", accommodationData);

    // Generate array of dates between check-in and check-out
    const dateArray = generateDateArray(
      formData.hotel_checkin_date, 
      formData.hotel_checkout_date
    );

    console.log("Generated date array for accommodation days:", dateArray);

    // Get the stay_id from the newly created accommodation
    const stayId = accommodationData.stay_id;

    // Get day_ids for all dates that match the trip's days
    const { data: dayData, error: dayError } = await supabase
      .from("trip_days")
      .select("day_id, date")
      .eq("trip_id", tripId);

    if (dayError) {
      console.error("Error fetching trip days:", dayError);
      throw dayError;
    }

    // Map days to their corresponding day_ids
    const dayMap = new Map(dayData.map(day => [day.date.split('T')[0], day.day_id]));

    // Create accommodation_days entries for each date
    const accommodationDaysData = dateArray.map(date => {
      const formattedDate = date.toISOString().split('T')[0];
      const dayId = dayMap.get(formattedDate);

      if (!dayId) {
        console.warn(`No matching day_id found for date: ${formattedDate}`);
        return null;
      }

      return {
        stay_id: stayId,
        day_id: dayId,
        date: formattedDate
      };
    }).filter(item => item !== null);

    if (accommodationDaysData.length > 0) {
      console.log("Inserting accommodation days:", accommodationDaysData);

      // Insert all accommodation_days records
      const { error: daysError } = await supabase
        .from("accommodations_days")
        .insert(accommodationDaysData);

      if (daysError) {
        console.error("Error adding accommodation days:", daysError);
        throw daysError;
      }

      console.log("Accommodation days added successfully");
    } else {
      console.warn("No accommodation days to add - no matching trip days found");
    }

    return accommodationData;
  } catch (error) {
    console.error("Error in addAccommodation:", error);
    toast.error("Failed to add accommodation");
    throw error;
  }
};

// Update an existing accommodation
export const updateAccommodation = async (
  stayId: string, 
  formData: AccommodationFormData
) => {
  try {
    console.log("Updating accommodation with data:", { stayId, ...formData });

    // Update the accommodation record
    const { data: accommodationData, error: accommodationError } = await supabase
      .from("accommodations")
      .update({
        hotel: formData.hotel,
        hotel_details: formData.hotel_details || null,
        hotel_address: formData.hotel_address || null,
        hotel_phone: formData.hotel_phone || null,
        hotel_website: formData.hotel_website || null,
        hotel_url: formData.hotel_url || null,
        hotel_checkin_date: formData.hotel_checkin_date,
        hotel_checkout_date: formData.hotel_checkout_date,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        currency: formData.currency || null,
        hotel_place_id: formData.hotel_place_id || null,
      })
      .eq("stay_id", stayId)
      .select("*, accommodations_days(day_id, date)")
      .single();

    if (accommodationError) {
      console.error("Error updating accommodation:", accommodationError);
      throw accommodationError;
    }

    console.log("Accommodation updated successfully:", accommodationData);

    // Delete existing accommodation_days entries
    const { error: deleteError } = await supabase
      .from("accommodations_days")
      .delete()
      .eq("stay_id", stayId);

    if (deleteError) {
      console.error("Error deleting old accommodation days:", deleteError);
      throw deleteError;
    }

    // Get the trip_id from the updated accommodation
    const tripId = accommodationData.trip_id;

    // Generate array of dates between check-in and check-out
    const dateArray = generateDateArray(
      formData.hotel_checkin_date, 
      formData.hotel_checkout_date
    );

    console.log("Generated date array for accommodation days:", dateArray);

    // Get day_ids for all dates that match the trip's days
    const { data: dayData, error: dayError } = await supabase
      .from("trip_days")
      .select("day_id, date")
      .eq("trip_id", tripId);

    if (dayError) {
      console.error("Error fetching trip days:", dayError);
      throw dayError;
    }

    // Map days to their corresponding day_ids
    const dayMap = new Map(dayData.map(day => [day.date.split('T')[0], day.day_id]));

    // Create accommodation_days entries for each date
    const accommodationDaysData = dateArray.map(date => {
      const formattedDate = date.toISOString().split('T')[0];
      const dayId = dayMap.get(formattedDate);

      if (!dayId) {
        console.warn(`No matching day_id found for date: ${formattedDate}`);
        return null;
      }

      return {
        stay_id: stayId,
        day_id: dayId,
        date: formattedDate
      };
    }).filter(item => item !== null);

    if (accommodationDaysData.length > 0) {
      console.log("Inserting accommodation days:", accommodationDaysData);

      // Insert all accommodation_days records
      const { error: daysError } = await supabase
        .from("accommodations_days")
        .insert(accommodationDaysData);

      if (daysError) {
        console.error("Error adding accommodation days:", daysError);
        throw daysError;
      }

      console.log("Accommodation days added successfully");
    } else {
      console.warn("No accommodation days to add - no matching trip days found");
    }

    return accommodationData;
  } catch (error) {
    console.error("Error in updateAccommodation:", error);
    toast.error("Failed to update accommodation");
    throw error;
  }
};

// Delete an accommodation
export const deleteAccommodation = async (stayId: string) => {
  try {
    console.log("Deleting accommodation with ID:", stayId);

    // First delete all associated accommodation_days
    const { error: daysError } = await supabase
      .from("accommodations_days")
      .delete()
      .eq("stay_id", stayId);

    if (daysError) {
      console.error("Error deleting accommodation days:", daysError);
      throw daysError;
    }

    // Then delete the accommodation
    const { error: accommodationError } = await supabase
      .from("accommodations")
      .delete()
      .eq("stay_id", stayId);

    if (accommodationError) {
      console.error("Error deleting accommodation:", accommodationError);
      throw accommodationError;
    }

    console.log("Accommodation deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteAccommodation:", error);
    toast.error("Failed to delete accommodation");
    throw error;
  }
};
