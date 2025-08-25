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

// Now using the real database junction tables

// Accommodation travelers
export async function getAccommodationTravelerIds(tripId: string, stayId: string) {
  try {
    const { data, error } = await supabase
      .from("accommodation_travelers")
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
    await supabase.from("accommodation_travelers").delete().match({ trip_id: tripId, stay_id: stayId });
    
    if (travelerIds.length === 0) return { data: [], error: null };
    
    // Insert new associations (filter out owner IDs that are not UUIDs)
    const validTravelerIds = travelerIds.filter(id => 
      !id.startsWith('owner_') && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    );
    
    if (validTravelerIds.length === 0) return { data: [], error: null };
    
    const rows = validTravelerIds.map((traveler_id) => ({ 
      trip_id: tripId, 
      stay_id: stayId, 
      traveler_id 
    }));
    
    const { data, error } = await supabase
      .from("accommodation_travelers")
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
      .from("transportation_travelers")
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
    await supabase.from("transportation_travelers").delete().match({ trip_id: tripId, transportation_id: transportationId });
    
    if (travelerIds.length === 0) return { data: [], error: null };
    
    // Insert new associations (filter out owner IDs that are not UUIDs)
    const validTravelerIds = travelerIds.filter(id => 
      !id.startsWith('owner_') && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    );
    
    if (validTravelerIds.length === 0) return { data: [], error: null };
    
    const rows = validTravelerIds.map((traveler_id) => ({ 
      trip_id: tripId, 
      transportation_id: transportationId, 
      traveler_id 
    }));
    
    const { data, error } = await supabase
      .from("transportation_travelers")
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
      .from("day_activity_travelers")
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
    await supabase.from("day_activity_travelers").delete().match({ trip_id: tripId, activity_id: activityId });
    
    if (travelerIds.length === 0) return { data: [], error: null };
    
    // Insert new associations (filter out owner IDs that are not UUIDs)
    const validTravelerIds = travelerIds.filter(id => 
      !id.startsWith('owner_') && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    );
    
    if (validTravelerIds.length === 0) return { data: [], error: null };
    
    const rows = validTravelerIds.map((traveler_id) => ({ 
      trip_id: tripId, 
      activity_id: activityId, 
      traveler_id 
    }));
    
    const { data, error } = await supabase
      .from("day_activity_travelers")
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
      .from("reservation_travelers")
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
    await supabase.from("reservation_travelers").delete().match({ trip_id: tripId, reservation_id: reservationId });
    
    if (travelerIds.length === 0) return { data: [], error: null };
    
    // Insert new associations (filter out owner IDs that are not UUIDs)
    const validTravelerIds = travelerIds.filter(id => 
      !id.startsWith('owner_') && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    );
    
    if (validTravelerIds.length === 0) return { data: [], error: null };
    
    const rows = validTravelerIds.map((traveler_id) => ({ 
      trip_id: tripId, 
      reservation_id: reservationId, 
      traveler_id 
    }));
    
    const { data, error } = await supabase
      .from("reservation_travelers")
      .insert(rows)
      .select();
      
    return { data: data || [], error };
  } catch (error) {
    console.error("Error saving reservation travelers:", error);
    return { data: [], error: error as any };
  }
}
