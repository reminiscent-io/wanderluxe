// /src/services/travelers.ts
import { supabase } from "@/integrations/supabase/client";

export async function listTravelers(tripId: string) {
  try {
    // Try to get trip shares (other travelers) but handle if table doesn't exist
    let shares: any[] = [];
    try {
      const { data: sharesData } = await supabase
        .from("trip_shares")
        .select("id, first_name, last_name, shared_with_email, permission_level, created_at")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });
      shares = sharesData || [];
    } catch (e) {
      console.warn("Trip shares table not available, continuing with owner only");
    }

    // Get trip owner from trips table 
    const { data: trip } = await supabase
      .from("trips")
      .select("user_id")
      .eq("trip_id", tripId)
      .single();
    
    if (!trip) {
      return { data: [], error: null };
    }

    // Create travelers array with just the owner for now
    const travelers = [{
      id: `owner_${trip.user_id}`,
      first_name: 'Trip Owner',
      last_name: '',
      shared_with_email: null,
      permission_level: 'edit' as const,
      created_at: new Date().toISOString(),
      is_owner: true
    }];
    
    // Add shared travelers if any exist
    if (shares.length > 0) {
      travelers.push(...shares.map(share => ({
        ...share,
        is_owner: false
      })));
    }
    
    return { data: travelers, error: null };
  } catch (error) {
    console.error("Error fetching travelers:", error);
    return { data: [], error: error as any };
  }
}

export async function upsertTraveler(tripId: string, payload: {
  id?: string;
  first_name: string;
  last_name?: string;
  shared_with_email?: string;
  permission_level?: "edit" | "read";
}) {
  const row = { 
    trip_id: tripId,
    first_name: payload.first_name,
    last_name: payload.last_name || null,
    shared_with_email: payload.shared_with_email || null,
    permission_level: payload.permission_level || "read",
    ...(payload.id && { id: payload.id })
  };
  
  // Get current user to ensure we have proper RLS context
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Add the user ID to the row for RLS
  const rowWithUser = {
    ...row,
    shared_by_user_id: user.id
  };

  return supabase.from("trip_shares").upsert(rowWithUser).select().single();
}

export async function deleteTraveler(id: string) {
  try {
    return await supabase.from("trip_shares").delete().eq("id", id);
  } catch (error) {
    console.warn("Could not delete from trip_shares:", error);
    return { data: null, error: error as any };
  }
}

// For now, we'll store traveler selections in localStorage until the database schema is updated
// These are placeholder functions that will be replaced with proper database operations

// Accommodation travelers
export async function getAccommodationTravelerIds(tripId: string, stayId: string) {
  const key = `accommodation_travelers_${tripId}_${stayId}`;
  const stored = localStorage.getItem(key);
  return { data: stored ? JSON.parse(stored) : [], error: null };
}

export async function setAccommodationTravelers(tripId: string, stayId: string, travelerIds: string[]) {
  const key = `accommodation_travelers_${tripId}_${stayId}`;
  localStorage.setItem(key, JSON.stringify(travelerIds));
  return { data: travelerIds, error: null };
}

// Transportation travelers
export async function getTransportationTravelerIds(tripId: string, transportationId: string) {
  const key = `transportation_travelers_${tripId}_${transportationId}`;
  const stored = localStorage.getItem(key);
  return { data: stored ? JSON.parse(stored) : [], error: null };
}

export async function setTransportationTravelers(tripId: string, transportationId: string, travelerIds: string[]) {
  const key = `transportation_travelers_${tripId}_${transportationId}`;
  localStorage.setItem(key, JSON.stringify(travelerIds));
  return { data: travelerIds, error: null };
}

// Day activity travelers
export async function getDayActivityTravelerIds(tripId: string, activityId: string) {
  const key = `activity_travelers_${tripId}_${activityId}`;
  const stored = localStorage.getItem(key);
  return { data: stored ? JSON.parse(stored) : [], error: null };
}

export async function setDayActivityTravelers(tripId: string, activityId: string, travelerIds: string[]) {
  const key = `activity_travelers_${tripId}_${activityId}`;
  localStorage.setItem(key, JSON.stringify(travelerIds));
  return { data: travelerIds, error: null };
}

// Reservation travelers
export async function getReservationTravelerIds(tripId: string, reservationId: string) {
  const key = `reservation_travelers_${tripId}_${reservationId}`;
  const stored = localStorage.getItem(key);
  return { data: stored ? JSON.parse(stored) : [], error: null };
}

export async function setReservationTravelers(tripId: string, reservationId: string, travelerIds: string[]) {
  const key = `reservation_travelers_${tripId}_${reservationId}`;
  localStorage.setItem(key, JSON.stringify(travelerIds));
  return { data: travelerIds, error: null };
}
