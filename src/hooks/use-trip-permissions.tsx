import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PermissionLevel } from '@/integrations/supabase/trip_shares_types';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from './useIsAdmin';

interface TripPermissions {
  canEdit: boolean;
  canView: boolean;
  isOwner: boolean;
  permissionLevel: PermissionLevel | null;
  isLoading: boolean;
}

const NO_ACCESS: Omit<TripPermissions, 'isLoading'> = {
  canEdit: false,
  canView: false,
  isOwner: false,
  permissionLevel: null,
};

/**
 * Hook to check user permissions for a specific trip
 *
 * The check re-runs whenever the signed-in user changes. Someone arriving from
 * a reminder or share email lands on a cold page whose auth state is still
 * being restored; answering once, early, would deny the owner their own trip
 * and never correct itself.
 *
 * @param tripId The ID of the trip to check permissions for
 * @returns Permission information and loading state
 */
export function useTripPermissions(tripId: string | undefined): TripPermissions {
  const [permissions, setPermissions] = useState<TripPermissions>({
    ...NO_ACCESS,
    isLoading: true,
  });
  const { isAdmin } = useIsAdmin();
  // Identity comes from the auth context rather than a per-mount
  // supabase.auth.getUser() round trip: that call can fail transiently while a
  // token is being refreshed, which used to read as "no access" permanently.
  const { user, profileLoaded } = useAuth();
  const userId = user?.id;
  const userEmail = user?.email;

  useEffect(() => {
    if (!tripId) {
      setPermissions({ ...NO_ACCESS, isLoading: false });
      return;
    }

    // Auth has not settled yet, so we cannot tell a logged-out visitor from a
    // signed-in one. Stay loading; this effect re-runs once it resolves.
    if (!profileLoaded) {
      setPermissions({ ...NO_ACCESS, isLoading: true });
      return;
    }

    let cancelled = false;
    const apply = (next: TripPermissions) => {
      if (!cancelled) setPermissions(next);
    };

    const checkPermissions = async () => {
      try {
        // First, check if trip is public and get trip data
        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .select('user_id, is_public')
          .eq('trip_id', tripId)
          .single();

        if (tripError) {
          console.error('Error checking trip data:', tripError);
          apply({ ...NO_ACCESS, isLoading: false });
          return;
        }

        // If trip is public and no user is logged in, allow view-only access
        if (tripData.is_public && !userId) {
          apply({
            canEdit: false,
            canView: true,
            isOwner: false,
            permissionLevel: 'read',
            isLoading: false,
          });
          return;
        }

        if (!userId) {
          apply({ ...NO_ACCESS, isLoading: false });
          return;
        }

        const isOwner = tripData.user_id === userId;

        if (isOwner) {
          apply({
            canEdit: true,
            canView: true,
            isOwner: true,
            permissionLevel: 'edit',
            isLoading: false,
          });
          return;
        }

        // If trip is public and user is a database-verified admin, grant edit access
        if (tripData.is_public && isAdmin) {
          apply({
            canEdit: true,
            canView: true,
            isOwner: false,
            permissionLevel: 'edit',
            isLoading: false,
          });
          return;
        }

        // If trip is public (but user is not admin), allow view-only access
        if (tripData.is_public) {
          apply({
            canEdit: false,
            canView: true,
            isOwner: false,
            permissionLevel: 'read',
            isLoading: false,
          });
          return;
        }

        // Check if trip is shared with this user
        const { data: shareData, error: shareError } = await supabase
          .from('trip_shares')
          .select('permission_level, share_status')
          .eq('trip_id', tripId)
          .eq('shared_with_email', userEmail)
          .single();

        if (shareError || !shareData) {
          // User has no access to this trip
          apply({ ...NO_ACCESS, isLoading: false });
          return;
        }

        // Require explicit acceptance for shared trips
        if (shareData.share_status === 'pending') {
          apply({ ...NO_ACCESS, isLoading: false });
          return;
        }

        const permissionLevel = shareData.permission_level as PermissionLevel;
        apply({
          canEdit: permissionLevel === 'edit',
          canView: true,
          isOwner: false,
          permissionLevel,
          isLoading: false,
        });

      } catch (error) {
        console.error('Error checking trip permissions:', error);
        apply({ ...NO_ACCESS, isLoading: false });
      }
    };

    checkPermissions();
    // A check started for the previous user must not land after this one.
    return () => { cancelled = true; };
  }, [tripId, isAdmin, profileLoaded, userId, userEmail]);

  return permissions;
}

/**
 * Utility function to check if user can edit a specific trip
 * @param tripId The ID of the trip to check
 * @returns Promise<boolean> indicating if user has edit access
 */
export async function canEditTrip(tripId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if user is the owner
    const { data: tripData } = await supabase
      .from('trips')
      .select('user_id')
      .eq('trip_id', tripId)
      .single();

    if (tripData?.user_id === user.id) return true;

    // Check if trip is shared with edit permission
    const { data: shareData } = await supabase
      .from('trip_shares')
      .select('permission_level, share_status')
      .eq('trip_id', tripId)
      .eq('shared_with_email', user.email)
      .single();

    if (!shareData || shareData.share_status === 'pending') return false;
    return shareData.permission_level === 'edit';
  } catch (error) {
    console.error('Error checking edit permission:', error);
    return false;
  }
}