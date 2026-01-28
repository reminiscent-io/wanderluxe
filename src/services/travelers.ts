// /src/services/travelers.ts
import { supabase } from "@/integrations/supabase/client";

// Normalize DB value to 'read' | 'edit'
const normalizePerm = (p?: string | null): "read" | "edit" =>
  (p && p.toLowerCase() === "edit") ? "edit" : "read";

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
    const fullName = (profile?.full_name || 'Trip Owner').trim();
    const nameParts = fullName.split(' ').filter(Boolean);
    const firstName = nameParts[0] || 'Trip';
    const lastName = nameParts.slice(1).join(' ') || 'Owner';

    // Insert owner as a trip share record (owner always has edit)
    await supabase
      .from('trip_shares' as any)
      .insert({
        trip_id: tripId,
        shared_by_user_id: userId,
        shared_with_user_id: userId, // owner shares with themselves
        first_name: firstName,
        last_name: lastName,
        shared_with_email: null,
        permission_level: 'edit',     // <— ensure DB reflects edit
        created_at: new Date().toISOString(),
      });

    console.log('Successfully added owner to trip_shares');
  } catch (error) {
    console.error('Error adding owner to trip_shares:', error);
    // Do not throw; trip creation should still succeed
  }
}

// Add cache-busting to avatar URLs to ensure fresh images are loaded
const addCacheBusting = (url: string | null): string | null => {
  if (!url) return null;
  // If URL already has a query parameter, don't add another
  if (url.includes('?')) return url;
  return `${url}?t=${Date.now()}`;
};

export async function listTravelers(tripId: string) {
  try {
    // Pull ALL travelers (including owner row) with permission_level
    const { data: sharesData, error } = await supabase
      .from('trip_shares' as any)
      .select(
        'id, trip_id, first_name, last_name, shared_with_email, shared_by_user_id, shared_with_user_id, permission_level, created_at'
      )
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching travelers:", error);
      return { data: [], error };
    }

    const shares = sharesData ?? [];

    // Get unique user IDs that have profiles (for avatar lookup)
    const userIds = shares
      .map((s: any) => s.shared_with_user_id)
      .filter((id: string | null): id is string => !!id);

    // Fetch avatar URLs and full names for users who have profiles
    let avatarMap: Record<string, string | null> = {};
    let fullNameMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url, full_name')
        .in('id', userIds);

      if (profiles) {
        profiles.forEach((p: any) => {
          avatarMap[p.id] = addCacheBusting(p.avatar_url);
          fullNameMap[p.id] = p.full_name || null;
        });
      }
    }

    // Mark owner by user_id equality, normalize permission, attach avatar_url,
    // and use profile full_name if available, falling back to trip_shares name
    const travelers = shares.map((share: any) => {
      const isOwner = share.shared_by_user_id && share.shared_with_user_id
        ? share.shared_by_user_id === share.shared_with_user_id
        : false;

      // Name priority: profile full_name > trip_shares first_name/last_name
      // This ensures we show the user's actual name if they have a profile,
      // otherwise fall back to the name entered when sharing the trip
      let firstName = share.first_name;
      let lastName = share.last_name;

      if (share.shared_with_user_id && fullNameMap[share.shared_with_user_id]) {
        const profileName = fullNameMap[share.shared_with_user_id];
        const nameParts = profileName.trim().split(' ').filter(Boolean);
        firstName = nameParts[0] || share.first_name;
        lastName = nameParts.slice(1).join(' ') || share.last_name;
      }

      return {
        ...share,
        first_name: firstName,
        last_name: lastName,
        permission_level: normalizePerm(share.permission_level),
        is_owner: isOwner,
        avatar_url: share.shared_with_user_id ? avatarMap[share.shared_with_user_id] ?? null : null,
      };
    });

    return { data: travelers, error: null };
  } catch (err) {
    console.error("Error fetching travelers:", err);
    return { data: [], error: err as any };
  }
}

export async function upsertTraveler(
  tripId: string,
  payload: {
    id?: string;
    first_name: string;
    last_name?: string;
    shared_with_email?: string | null;
    permission_level?: "edit" | "read";
  }
) {
  const row = {
    trip_id: tripId,
    first_name: payload.first_name,
    last_name: payload.last_name ?? null,
    shared_with_email: payload.shared_with_email?.trim() || null,
    permission_level: normalizePerm(payload.permission_level), // keep DB tidy
    ...(payload.id && { id: payload.id }),
  };

  // Ensure RLS context
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const rowWithUser = {
    ...row,
    shared_by_user_id: user.id,
  };

  return supabase.from('trip_shares' as any).upsert(rowWithUser).select().single();
}

export async function deleteTraveler(id: string) {
  try {
    return await supabase.from('trip_shares' as any).delete().eq('id', id);
  } catch (error) {
    console.warn("Could not delete from trip_shares:", error);
    return { data: null, error: error as any };
  }
}

// ===== Junction table helpers =====

// Accommodation travelers
export async function getAccommodationTravelerIds(tripId: string, stayId: string) {
  try {
    const { data, error } = await supabase
      .from('accommodation_travelers' as any)
      .select('traveler_id')
      .match({ trip_id: tripId, stay_id: stayId });
    if (error) return { data: [], error };
    return { data: (data ?? []).map((r: any) => r.traveler_id), error: null };
  } catch (error) {
    console.error("Error loading accommodation travelers:", error);
    return { data: [], error: error as any };
  }
}

export async function setAccommodationTravelers(tripId: string, stayId: string, travelerIds: string[]) {
  try {
    await supabase.from('accommodation_travelers' as any).delete().match({ trip_id: tripId, stay_id: stayId });
    if (travelerIds.length === 0) return { data: [], error: null };
    const rows = travelerIds.map((traveler_id) => ({ trip_id: tripId, stay_id: stayId, traveler_id }));
    const { data, error } = await supabase.from('accommodation_travelers' as any).insert(rows).select();
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
      .from('transportation_travelers')
      .select('traveler_id')
      .match({ trip_id: tripId, transportation_id: transportationId });
    if (error) return { data: [], error };
    return { data: (data ?? []).map((r: any) => r.traveler_id), error: null };
  } catch (error) {
    console.error("Error loading transportation travelers:", error);
    return { data: [], error: error as any };
  }
}

export async function setTransportationTravelers(tripId: string, transportationId: string, travelerIds: string[]) {
  try {
    await supabase.from('transportation_travelers').delete().match({ trip_id: tripId, transportation_id: transportationId });
    if (travelerIds.length === 0) return { data: [], error: null };
    const rows = travelerIds.map((traveler_id) => ({ trip_id: tripId, transportation_id: transportationId, traveler_id }));
    const { data, error } = await supabase.from('transportation_travelers').insert(rows).select();
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
      .from('day_activity_travelers' as any)
      .select('traveler_id')
      .match({ trip_id: tripId, activity_id: activityId });
    if (error) return { data: [], error };
    return { data: (data ?? []).map((r: any) => r.traveler_id), error: null };
  } catch (error) {
    console.error("Error loading activity travelers:", error);
    return { data: [], error: error as any };
  }
}

export async function setDayActivityTravelers(tripId: string, activityId: string, travelerIds: string[]) {
  try {
    await supabase.from('day_activity_travelers' as any).delete().match({ trip_id: tripId, activity_id: activityId });
    if (travelerIds.length === 0) return { data: [], error: null };
    const rows = travelerIds.map((traveler_id) => ({ trip_id: tripId, activity_id: activityId, traveler_id }));
    const { data, error } = await supabase.from('day_activity_travelers' as any).insert(rows).select();
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
      .from('reservation_travelers' as any)
      .select('traveler_id')
      .match({ trip_id: tripId, reservation_id: reservationId });
    if (error) return { data: [], error };
    return { data: (data ?? []).map((r: any) => r.traveler_id), error: null };
  } catch (error) {
    console.error("Error loading reservation travelers:", error);
    return { data: [], error: error as any };
  }
}

export async function setReservationTravelers(tripId: string, reservationId: string, travelerIds: string[]) {
  try {
    await supabase.from('reservation_travelers' as any).delete().match({ trip_id: tripId, reservation_id: reservationId });
    if (travelerIds.length === 0) return { data: [], error: null };
    const rows = travelerIds.map((traveler_id) => ({ trip_id: tripId, reservation_id, traveler_id }));
    const { data, error } = await supabase.from('reservation_travelers' as any).insert(rows).select();
    return { data: data || [], error };
  } catch (error) {
    console.error("Error saving reservation travelers:", error);
    return { data: [], error: error as any };
  }
}
