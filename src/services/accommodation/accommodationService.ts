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
  checkin_time?: string | null;
  checkout_time?: string | null;
  cost?: string | null;
  currency?: string;
  hotel_place_id?: string | null;
}

// Helper function to generate and insert accommodation days
const insertAccommodationDays = async (
  stayId: string,
  tripId: string,
  checkinDate: string,
  checkoutDate: string
) => {
  // Generate array of dates between check-in and check-out
  const dateArray = generateDateArray(checkinDate, checkoutDate);
  console.log("Generated date array for accommodation days:", dateArray);

  // Fetch all trip days for the given trip
  const { data: dayData, error: dayError } = await supabase
    .from("trip_days")
    .select("day_id, date")
    .eq("trip_id", tripId);
  if (dayError) {
    console.error("Error fetching trip days:", dayError);
    throw dayError;
  }

  // Map each trip day date (formatted) to its day_id
  const dayMap = new Map(
    dayData.map(day => [day.date.split("T")[0], day.day_id])
  );

  // Build entries for each generated date if a matching day_id exists
  const accommodationDaysData = dateArray
    .map(date => {
      const formattedDate = date.toISOString().split("T")[0];
      const dayId = dayMap.get(formattedDate);
      if (!dayId) {
        console.warn(`No matching day_id found for date: ${formattedDate}`);
        return null;
      }
      return {
        stay_id: stayId,
        day_id: dayId,
        date: formattedDate,
      };
    })
    .filter(item => item !== null);

  if (accommodationDaysData.length > 0) {
    console.log("Inserting accommodation days:", accommodationDaysData);
    // Insert the accommodation_days records
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
};

// Add a new accommodation
export const addAccommodation = async (
  tripId: string,
  formData: AccommodationFormData
) => {
  try {
    console.log("Adding accommodation with data:", formData);
    // Insert the accommodation record
    const { data: accommodationData, error: accommodationError } = await supabase
      .from("accommodations")
      .insert({
        trip_id: tripId,
        title: formData.hotel || "Unnamed Accommodation",
        hotel: formData.hotel,
        hotel_details: formData.hotel_details || null,
        hotel_address: formData.hotel_address || null,
        hotel_phone: formData.hotel_phone || null,
        hotel_website: formData.hotel_website || null,
        hotel_url: formData.hotel_url || null,
        hotel_checkin_date: formData.hotel_checkin_date,
        hotel_checkout_date: formData.hotel_checkout_date,
        checkin_time: formData.checkin_time || null,
        checkout_time: formData.checkout_time || null,
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

    // Insert corresponding accommodation days
    const stayId = accommodationData.stay_id;
    await insertAccommodationDays(
      stayId,
      tripId,
      formData.hotel_checkin_date,
      formData.hotel_checkout_date
    );
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
        title: formData.hotel || "Unnamed Accommodation",
        hotel: formData.hotel,
        hotel_details: formData.hotel_details || null,
        hotel_address: formData.hotel_address || null,
        checkin_time: formData.checkin_time || null,
        checkout_time: formData.checkout_time || null,
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

    // Delete existing accommodation_days entries before re-inserting
    const { error: deleteError } = await supabase
      .from("accommodations_days")
      .delete()
      .eq("stay_id", stayId);
    if (deleteError) {
      console.error("Error deleting old accommodation days:", deleteError);
      throw deleteError;
    }

    // Insert new accommodation days using updated dates
    const tripId = accommodationData.trip_id;
    await insertAccommodationDays(
      stayId,
      tripId,
      formData.hotel_checkin_date,
      formData.hotel_checkout_date
    );
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
