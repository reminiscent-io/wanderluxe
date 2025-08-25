// /src/services/travelers.ts
import { supabase } from "@/integrations/supabase/client";

// Helper function to add owner to trip_shares when trip is created
export async function addOwnerToTripShares(tripId: string, userId: string) {
  try {
    // Get owner's profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    // Parse full_name into first_name and last_name
    const fullName = profile?.full_name || 'Trip Owner';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || 'Trip';
    const lastName = nameParts.slice(1).join(' ') || 'Owner';

    // Insert owner as a trip share record
    await supabase
      .from('trip_shares' as any)
      .insert({
        trip_id: tripId,
        shared_by_user_id: userId,
        shared_with_user_id: userId,  // Owner shares with themselves
        first_name: firstName,
        last_name: lastName,
        permission_level: 'edit',
        created_at: new Date().toISOString()
      });

    console.log('Successfully added owner to trip_shares');
  } catch (error) {
    console.error('Error adding owner to trip_shares:', error);
    // Don't throw - trip creation should still succeed even if this fails
  }
}

export async function listTravelers(tripId: string) {
  try {
    // Get all trip shares (including owner who is now in trip_shares)
    const { data: sharesData } = await supabase
      .from("trip_shares" as any)
      .select("id, first_name, last_name, shared_with_email, shared_by_user_id, shared_with_user_id, permission_level, created_at")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true });
    
    const shares = sharesData || [];
    
    // Mark owners (where shared_by_user_id = shared_with_user_id)
    const travelers = shares.map(share => ({
      ...share,
      is_owner: share.shared_by_user_id === share.shared_with_user_id
    }));
    
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

  return supabase.from("trip_shares" as any).upsert(rowWithUser).select().single();
}

export async function deleteTraveler(id: string) {
  try {
    return await supabase.from("trip_shares").delete().eq("id", id);
  } catch (error) {
    console.warn("Could not delete from trip_shares:", error);
    return { data: null, error: error as any };
  }
}

// Now using the real database junction tables

// Accommodation travelers
export async function getAccommodationTravelerIds(tripId: string, stayId: string) {
  try {
    const { data, error } = await supabase
      .from("accommodation_travelers" as any)
      .select("traveler_id")
      .match({ trip_id: tripId, stay_id: stayId });
    
    if (error) return { data: [], error };
    return { data: data?.map(row => row.traveler_id) || [], error: null };
  } catch (error) {
    console.error("Error loading accommodation travelers:", error);
    return { data: [], error: error as any };
  }
}

export async function setAccommodationTravelers(tripId: string, stayId: string, travelerIds: string[]) {
  try {
    // Delete existing associations
    await supabase.from("accommodation_travelers" as any).delete().match({ trip_id: tripId, stay_id: stayId });
    
    if (travelerIds.length === 0) return { data: [], error: null };
    
    // Insert new associations
    const rows = travelerIds.map((traveler_id) => ({ 
      trip_id: tripId, 
      stay_id: stayId, 
      traveler_id 
    }));
    
    const { data, error } = await supabase
      .from("accommodation_travelers" as any)
      .insert(rows)
      .select();
      
    return { data: data || [], error };
  } catch (error) {
    console.error("Error saving accommodation travelers:", error);
    return { data: [], error: error as any };
  }
}

// Transportation travelers
export async function getTransportationTravelerIds(tripId: string, transportationId: string) {
  try {
    const { data, error } = await supabase
      .from("transportation_travelers" as any)
      .select("traveler_id")
      .match({ trip_id: tripId, transportation_id: transportationId });
    
    if (error) return { data: [], error };
    return { data: data?.map(row => row.traveler_id) || [], error: null };
  } catch (error) {
    console.error("Error loading transportation travelers:", error);
    return { data: [], error: error as any };
  }
}

export async function setTransportationTravelers(tripId: string, transportationId: string, travelerIds: string[]) {
  try {
    // Delete existing associations
    await supabase.from("transportation_travelers" as any).delete().match({ trip_id: tripId, transportation_id: transportationId });
    
    if (travelerIds.length === 0) return { data: [], error: null };
    
    // Insert new associations
    const rows = travelerIds.map((traveler_id) => ({ 
      trip_id: tripId, 
      transportation_id: transportationId, 
      traveler_id 
    }));
    
    const { data, error } = await supabase
      .from("transportation_travelers" as any)
      .insert(rows)
      .select();
      
    return { data: data || [], error };
  } catch (error) {
    console.error("Error saving transportation travelers:", error);
    return { data: [], error: error as any };
  }
}

// Day activity travelers
export async function getDayActivityTravelerIds(tripId: string, activityId: string) {
  try {
    const { data, error } = await supabase
      .from("day_activity_travelers" as any)
      .select("traveler_id")
      .match({ trip_id: tripId, activity_id: activityId });
    
    if (error) return { data: [], error };
    return { data: data?.map(row => row.traveler_id) || [], error: null };
  } catch (error) {
    console.error("Error loading activity travelers:", error);
    return { data: [], error: error as any };
  }
}

export async function setDayActivityTravelers(tripId: string, activityId: string, travelerIds: string[]) {
  try {
    // Delete existing associations
    await supabase.from("day_activity_travelers" as any).delete().match({ trip_id: tripId, activity_id: activityId });
    
    if (travelerIds.length === 0) return { data: [], error: null };
    
    // Insert new associations
    const rows = travelerIds.map((traveler_id) => ({ 
      trip_id: tripId, 
      activity_id: activityId, 
      traveler_id 
    }));
    
    const { data, error } = await supabase
      .from("day_activity_travelers" as any)
      .insert(rows)
      .select();
      
    return { data: data || [], error };
  } catch (error) {
    console.error("Error saving activity travelers:", error);
    return { data: [], error: error as any };
  }
}

// Reservation travelers
export async function getReservationTravelerIds(tripId: string, reservationId: string) {
  try {
    const { data, error } = await supabase
      .from("reservation_travelers" as any)
      .select("traveler_id")
      .match({ trip_id: tripId, reservation_id: reservationId });
    
    if (error) return { data: [], error };
    return { data: data?.map(row => row.traveler_id) || [], error: null };
  } catch (error) {
    console.error("Error loading reservation travelers:", error);
    return { data: [], error: error as any };
  }
}

export async function setReservationTravelers(tripId: string, reservationId: string, travelerIds: string[]) {
  try {
    // Delete existing associations
    await supabase.from("reservation_travelers" as any).delete().match({ trip_id: tripId, reservation_id: reservationId });
    
    if (travelerIds.length === 0) return { data: [], error: null };
    
    // Insert new associations
    const rows = travelerIds.map((traveler_id) => ({ 
      trip_id: tripId, 
      reservation_id: reservationId, 
      traveler_id 
    }));
    
    const { data, error } = await supabase
      .from("reservation_travelers" as any)
      .insert(rows)
      .select();
      
    return { data: data || [], error };
  } catch (error) {
    console.error("Error saving reservation travelers:", error);
    return { data: [], error: error as any };
  }
}
