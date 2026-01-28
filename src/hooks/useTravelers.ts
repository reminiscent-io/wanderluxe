import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listTravelers } from "@/services/travelers";

export interface Traveler {
  id: string;
  first_name: string;
  last_name?: string;
  shared_with_email?: string;
  shared_with_user_id?: string | null;
  permission_level?: "edit" | "read";
  created_at: string;
  is_owner?: boolean;
  avatar_url?: string | null;
}

export function useTravelers(tripId: string) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: travelers = [], isLoading } = useQuery({
    queryKey: ['travelers', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      
      const { data, error } = await listTravelers(tripId);
      
      if (error) {
        console.error('Error fetching travelers:', error);
        setError(error.message);
        throw error;
      }
      
      setError(null);
      
      // Return travelers including the owner
      return (data || []).map(traveler => ({
        id: traveler.id,
        first_name: traveler.first_name || 'Traveler',
        last_name: traveler.last_name || '',
        shared_with_email: traveler.shared_with_email,
        shared_with_user_id: (traveler as any).shared_with_user_id || null,
        permission_level: (traveler as any).permission_level || 'read',
        created_at: traveler.created_at,
        is_owner: traveler.is_owner || false,
        avatar_url: (traveler as any).avatar_url || null,
      } as Traveler));
    },
    enabled: !!tripId,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['travelers', tripId] });
  }, [queryClient, tripId]);

  // Set up real-time subscription for travelers
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`travelers:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_shares',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          // Invalidate travelers list
          queryClient.invalidateQueries({ queryKey: ['travelers', tripId] });
          // Also invalidate TravelerAvatars queries for timeline
          queryClient.invalidateQueries({ queryKey: ['trip-travelers:list', tripId] });
          queryClient.invalidateQueries({ queryKey: ['trip-travelers:assigned', tripId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

  return {
    travelers,
    loading: isLoading,
    error,
    refresh,
  };
}