import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listTravelers } from "@/services/travelers";

export interface Traveler {
  id: string;
  first_name: string;
  last_name?: string;
  shared_with_email?: string;
  permission_level: "edit" | "read";
  created_at: string;
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
      return (data || []) as Traveler[];
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
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['travelers', tripId] });
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