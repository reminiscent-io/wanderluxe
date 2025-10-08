import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PermissionLevel } from '@/integrations/supabase/trip_shares_types';

interface TripPermissions {
  canEdit: boolean;
  canView: boolean;
  isOwner: boolean;
  permissionLevel: PermissionLevel | null;
  isLoading: boolean;
}

/**
 * Hook to check user permissions for a specific trip
 * @param tripId The ID of the trip to check permissions for
 * @returns Permission information and loading state
 */
export function useTripPermissions(tripId: string | undefined): TripPermissions {
  const [permissions, setPermissions] = useState<TripPermissions>({
    canEdit: false,
    canView: false,
    isOwner: false,
    permissionLevel: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!tripId) {
      setPermissions({
        canEdit: false,
        canView: false,
        isOwner: false,
        permissionLevel: null,
        isLoading: false,
      });
      return;
    }

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
          setPermissions({
            canEdit: false,
            canView: false,
            isOwner: false,
            permissionLevel: null,
            isLoading: false,
          });
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        
        // If trip is public and no user is logged in, allow view-only access
        if (tripData.is_public && !user) {
          setPermissions({
            canEdit: false,
            canView: true,
            isOwner: false,
            permissionLevel: 'read',
            isLoading: false,
          });
          return;
        }

        if (!user) {
          setPermissions({
            canEdit: false,
            canView: false,
            isOwner: false,
            permissionLevel: null,
            isLoading: false,
          });
          return;
        }

        const isOwner = tripData.user_id === user.id;

        // Check if user is admin (special admin access for public trips)
        // @ts-ignore - import.meta.env is available in Vite
        const adminEmail = (import.meta.env?.VITE_ADMIN_EMAIL as string | undefined)?.toLowerCase() || 'kevin@wanderluxe.io';
        const isKevin = user.email?.toLowerCase() === adminEmail;

        if (isOwner) {
          setPermissions({
            canEdit: true,
            canView: true,
            isOwner: true,
            permissionLevel: 'edit',
            isLoading: false,
          });
          return;
        }

        // If trip is public and user is Kevin, grant edit access
        if (tripData.is_public && isKevin) {
          setPermissions({
            canEdit: true,
            canView: true,
            isOwner: false,
            permissionLevel: 'edit',
            isLoading: false,
          });
          return;
        }

        // If trip is public (but user is not Kevin), allow view-only access
        if (tripData.is_public) {
          setPermissions({
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
          .select('permission_level')
          .eq('trip_id', tripId)
          .eq('shared_with_email', user.email)
          .single();

        if (shareError || !shareData) {
          // User has no access to this trip
          setPermissions({
            canEdit: false,
            canView: false,
            isOwner: false,
            permissionLevel: null,
            isLoading: false,
          });
          return;
        }

        const permissionLevel = shareData.permission_level as PermissionLevel;
        setPermissions({
          canEdit: permissionLevel === 'edit',
          canView: true,
          isOwner: false,
          permissionLevel,
          isLoading: false,
        });

      } catch (error) {
        console.error('Error checking trip permissions:', error);
        setPermissions({
          canEdit: false,
          canView: false,
          isOwner: false,
          permissionLevel: null,
          isLoading: false,
        });
      }
    };

    checkPermissions();
  }, [tripId]);

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
      .select('permission_level')
      .eq('trip_id', tripId)
      .eq('shared_with_email', user.email)
      .single();

    return shareData?.permission_level === 'edit';
  } catch (error) {
    console.error('Error checking edit permission:', error);
    return false;
  }
}