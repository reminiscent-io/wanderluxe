import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ViewingStatus {
  id: string;
  trip_id: string;
  user_id: string;
  last_viewed_at: string;
  currently_viewing: boolean;
  presence_updated_at: string;
}

export interface ViewingStatusWithProfile extends ViewingStatus {
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  tripShare?: {
    first_name: string;
    last_name: string | null;
    shared_with_email: string | null;
    is_owner: boolean;
  };
}

// Presence is considered stale after 2 minutes without update
const PRESENCE_STALE_MS = 2 * 60 * 1000;
// Update presence every 30 seconds while viewing
const PRESENCE_UPDATE_INTERVAL_MS = 30 * 1000;

export function useTripViewingStatus(tripId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasMarkedViewingRef = useRef(false);

  const invalidateViewingStatus = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["trip-view-status", tripId] });
  }, [queryClient, tripId]);

  // Fetch all viewing statuses for this trip with user profiles
  const { data: viewingStatuses = [], isLoading } = useQuery({
    queryKey: ["trip-view-status", tripId],
    queryFn: async () => {
      if (!tripId) return [];

      // Get viewing statuses
      const { data: statuses, error } = await supabase
        .from("trip_view_status")
        .select("*")
        .eq("trip_id", tripId);

      if (error) {
        console.error("Error fetching viewing statuses:", error);
        throw error;
      }

      if (!statuses || statuses.length === 0) return [];

      // Get user IDs to fetch profiles
      const userIds = statuses.map((s) => s.user_id);

      // Fetch profiles for these users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      // Fetch trip_shares for these users (for names and owner status)
      const { data: tripShares } = await supabase
        .from("trip_shares")
        .select("shared_with_user_id, first_name, last_name, shared_with_email, is_owner")
        .eq("trip_id", tripId)
        .in("shared_with_user_id", userIds);

      // Combine the data
      const now = new Date();
      return statuses.map((status) => {
        const profile = profiles?.find((p) => p.id === status.user_id);
        const tripShare = tripShares?.find((ts) => ts.shared_with_user_id === status.user_id);

        // Check if presence is stale
        const presenceUpdatedAt = new Date(status.presence_updated_at);
        const isStale = now.getTime() - presenceUpdatedAt.getTime() > PRESENCE_STALE_MS;

        return {
          ...status,
          // Override currently_viewing if presence is stale
          currently_viewing: status.currently_viewing && !isStale,
          profile: profile ? {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          } : undefined,
          tripShare: tripShare ? {
            first_name: tripShare.first_name,
            last_name: tripShare.last_name,
            shared_with_email: tripShare.shared_with_email,
            is_owner: tripShare.is_owner,
          } : undefined,
        } as ViewingStatusWithProfile;
      });
    },
    enabled: !!tripId,
    staleTime: 10_000,
    refetchInterval: 15_000, // Refetch every 15s as fallback for missed real-time events
  });

  // Mark current user as viewing
  const markAsViewing = useCallback(async () => {
    if (!tripId || !user?.id) return;

    try {
      const { error } = await supabase
        .from("trip_view_status")
        .upsert(
          {
            trip_id: tripId,
            user_id: user.id,
            currently_viewing: true,
            last_viewed_at: new Date().toISOString(),
            presence_updated_at: new Date().toISOString(),
          },
          {
            onConflict: "trip_id,user_id",
          }
        );

      if (error) {
        console.error("Error marking as viewing:", error);
      } else {
        hasMarkedViewingRef.current = true;
        // Immediately invalidate the query so the UI reflects the new status
        // without waiting for the real-time subscription to fire
        invalidateViewingStatus();
      }
    } catch (err) {
      console.error("Error in markAsViewing:", err);
    }
  }, [tripId, user?.id, invalidateViewingStatus]);

  // Update presence timestamp (heartbeat)
  const updatePresence = useCallback(async () => {
    if (!tripId || !user?.id || !hasMarkedViewingRef.current) return;

    try {
      const { error } = await supabase
        .from("trip_view_status")
        .update({
          presence_updated_at: new Date().toISOString(),
          currently_viewing: true,
        })
        .eq("trip_id", tripId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating presence:", error);
      }
    } catch (err) {
      console.error("Error in updatePresence:", err);
    }
  }, [tripId, user?.id]);

  // Mark current user as not viewing
  const markAsNotViewing = useCallback(async () => {
    if (!tripId || !user?.id) return;

    try {
      const { error } = await supabase
        .from("trip_view_status")
        .update({
          currently_viewing: false,
          presence_updated_at: new Date().toISOString(),
        })
        .eq("trip_id", tripId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error marking as not viewing:", error);
      }
    } catch (err) {
      console.error("Error in markAsNotViewing:", err);
    }
  }, [tripId, user?.id]);

  // Set up presence tracking on mount/unmount
  useEffect(() => {
    if (!tripId || !user?.id) return;

    // Mark as viewing when component mounts
    markAsViewing();

    // Set up periodic presence update
    presenceIntervalRef.current = setInterval(updatePresence, PRESENCE_UPDATE_INTERVAL_MS);

    // Handle visibility change (tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markAsViewing();
      } else {
        markAsNotViewing();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Mark as not viewing when leaving
      markAsNotViewing();
      hasMarkedViewingRef.current = false;
    };
  }, [tripId, user?.id, markAsViewing, markAsNotViewing, updatePresence]);

  // Set up real-time subscription for viewing status changes
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`trip-view-status:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_view_status",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          // Invalidate query to refetch data
          queryClient.invalidateQueries({ queryKey: ["trip-view-status", tripId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

  // Get viewing status category for a user
  const getViewingCategory = useCallback(
    (userId: string): "active" | "viewed" | "never" => {
      const status = viewingStatuses.find((s) => s.user_id === userId);
      if (!status) return "never";
      if (status.currently_viewing) return "active";
      return "viewed";
    },
    [viewingStatuses]
  );

  return {
    viewingStatuses,
    isLoading,
    getViewingCategory,
    markAsViewing,
    markAsNotViewing,
  };
}
