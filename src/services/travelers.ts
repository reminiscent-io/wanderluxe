// /src/services/travelers.ts
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type TripShareRow = Tables<'trip_shares'>;
type ProfileRow = Tables<'profiles'>;

// Normalize DB value to 'read' | 'edit'
const normalizePerm = (p?: string | null): "read" | "edit" =>
  (p && p.toLowerCase() === "edit") ? "edit" : "read";

// Helper function to add owner to trip_shares when trip is created
export async function addOwnerToTripShares(tripId: string, userId: string) {
  try {
    // Get owner's profile info and email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    // Get owner's email from auth
    const { data: { user } } = await supabase.auth.getUser();
    const ownerEmail = user?.email?.toLowerCase() || null;

    // Parse full_name into first_name and last_name
    // Fallback to email prefix if no profile name (not "Trip Owner")
    let firstName: string;
    let lastName: string | null = null;

    if (profile?.full_name?.trim()) {
      const nameParts = profile.full_name.trim().split(' ').filter(Boolean);
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ') || null;
    } else if (ownerEmail) {
      // Derive name from email prefix as fallback
      const emailPrefix = ownerEmail.split('@')[0] || 'User';
      firstName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    } else {
      firstName = 'User';
    }

    // Insert owner as a trip share record (owner always has edit)
    await supabase
      .from('trip_shares')
      .insert({
        trip_id: tripId,
        shared_by_user_id: userId,
        shared_with_user_id: userId, // owner shares with themselves
        first_name: firstName,
        last_name: lastName,
        shared_with_email: ownerEmail, // Store owner's email too
        permission_level: 'edit',
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

export type TravelerWithMeta = TripShareRow & {
  is_owner: boolean;
  avatar_url: string | null;
};

export async function listTravelers(tripId: string): Promise<{ data: TravelerWithMeta[]; error: { message: string } | null }> {
  try {
    // Pull ALL travelers (including owner row) with permission_level
    const { data: sharesData, error } = await supabase
      .from('trip_shares')
      .select(
        'id, trip_id, first_name, last_name, shared_with_email, shared_by_user_id, shared_with_user_id, permission_level, created_at, share_status, is_owner'
      )
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching travelers:", error);
      return { data: [], error };
    }

    const shares = (sharesData ?? []) as TripShareRow[];

    // Get unique user IDs that have profiles (for avatar lookup)
    const userIds = shares
      .map((s) => s.shared_with_user_id)
      .filter((id: string | null): id is string => !!id);

    // Fetch avatar URLs and full names for users who have profiles
    const avatarMap: Record<string, string | null> = {};
    const fullNameMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url, full_name')
        .in('id', userIds);

      if (profiles) {
        profiles.forEach((p: Pick<ProfileRow, 'id' | 'avatar_url' | 'full_name'>) => {
          avatarMap[p.id] = addCacheBusting(p.avatar_url);
          fullNameMap[p.id] = p.full_name || null;
        });
      }
    }

    // Mark owner by user_id equality, normalize permission, attach avatar_url,
    // and use profile full_name if available, falling back to trip_shares name
    const travelers: TravelerWithMeta[] = shares.map((share) => {
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
        const nameParts = (profileName ?? '').trim().split(' ').filter(Boolean);
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
    return { data: [], error: { message: err instanceof Error ? err.message : String(err) } };
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

  return supabase.from('trip_shares').upsert(rowWithUser).select().single();
}

export async function deleteTraveler(id: string) {
  try {
    return await supabase.from('trip_shares').delete().eq('id', id);
  } catch (error) {
    console.warn("Could not delete from trip_shares:", error);
    return { data: null, error: { message: error instanceof Error ? error.message : String(error) } };
  }
}

// ===== Junction table helpers =====

export type JunctionType = "accommodation" | "transportation" | "activity" | "reservation";

type JunctionTableName =
  | 'accommodation_travelers'
  | 'transportation_travelers'
  | 'day_activity_travelers'
  | 'reservation_travelers';

const JUNCTION_CONFIG: Record<JunctionType, { table: JunctionTableName; fkColumn: string }> = {
  accommodation: { table: "accommodation_travelers", fkColumn: "stay_id" },
  transportation: { table: "transportation_travelers", fkColumn: "transportation_id" },
  activity: { table: "day_activity_travelers", fkColumn: "activity_id" },
  reservation: { table: "reservation_travelers", fkColumn: "reservation_id" },
};

export async function getJunctionTravelerIds(
  type: JunctionType,
  tripId: string,
  entityId: string
): Promise<{ data: string[]; error: { message: string } | null }> {
  try {
    const { table, fkColumn } = JUNCTION_CONFIG[type];
    const { data, error } = await supabase
      .from(table)
      .select("traveler_id")
      .match({ trip_id: tripId, [fkColumn]: entityId });
    if (error) return { data: [], error };
    return { data: (data ?? []).map((r: { traveler_id: string }) => r.traveler_id), error: null };
  } catch (error) {
    console.error(`Error loading ${type} travelers:`, error);
    return { data: [], error: { message: error instanceof Error ? error.message : String(error) } };
  }
}

export async function setJunctionTravelers(
  type: JunctionType,
  tripId: string,
  entityId: string,
  travelerIds: string[]
): Promise<{ data: { traveler_id: string }[]; error: { message: string } | null }> {
  try {
    const { table, fkColumn } = JUNCTION_CONFIG[type];
    await supabase.from(table).delete().match({ trip_id: tripId, [fkColumn]: entityId });
    if (travelerIds.length === 0) return { data: [], error: null };
    const rows = travelerIds.map((traveler_id) => ({
      trip_id: tripId,
      [fkColumn]: entityId,
      traveler_id,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic table requires loose insert payload; runtime shape matches all four junction tables
    const { data, error } = await supabase.from(table).insert(rows as any).select();
    return { data: (data || []) as { traveler_id: string }[], error };
  } catch (error) {
    console.error(`Error saving ${type} travelers:`, error);
    return { data: [], error: { message: error instanceof Error ? error.message : String(error) } };
  }
}
