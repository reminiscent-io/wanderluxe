import { supabase } from "@/integrations/supabase/client";
import { generateDateArray } from "@/utils/dateUtils";
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
  timezone?: string | null;
  /** When true, clears the key photo (e.g. location changed) */
  clear_image_url?: boolean;
}

// Compute the next order_index for accommodations within a trip
const getNextAccommodationOrderIndex = async (tripId: string): Promise<number> => {
  const { data, error } = await supabase
    .from("accommodations")
    .select("order_index")
    .eq("trip_id", tripId)
    .order("order_index", { ascending: false })
    .limit(1);
  if (error) {
    console.error("Error fetching max accommodation order_index:", error);
    throw error;
  }
  return (data?.[0]?.order_index ?? -1) + 1;
};

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

  // Build entries for each generated date if a matching day_id exists.
  // generateDateArray already returns local "yyyy-MM-dd" strings, so they are
  // used as-is — converting through Date here would reintroduce timezone drift.
  const accommodationDaysData = dateArray
    .map(formattedDate => {
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

// Update an existing accommodation
export const updateAccommodation = async (
  stayId: string,
  formData: AccommodationFormData
) => {
  try {
    console.log("Updating accommodation with data:", { stayId, ...formData });
    // Update the accommodation record
    const updatePayload: Record<string, unknown> = {
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
        timezone: formData.timezone || null,
    };
    // Clear the key photo when the location changed
    if (formData.clear_image_url) {
      updatePayload.image_url = null;
    }
    const { data: accommodationData, error: accommodationError } = await supabase
      .from("accommodations")
      .update(updatePayload)
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
