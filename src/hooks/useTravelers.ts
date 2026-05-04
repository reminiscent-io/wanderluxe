import { useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listTravelers } from "@/services/travelers";
import { useRealtimeSubscription } from './useRealtimeSubscription';

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

  const config = useMemo(() => ({
    channelKey: `travelers:${tripId}`,
    tables: [
      { table: 'trip_shares', filterColumn: 'trip_id', filterValue: tripId },
    ],
    invalidateKeys: [
      ['travelers', tripId],
      ['trip-travelers:list', tripId],
      ['trip-travelers:assigned', tripId],
    ],
    enabled: !!tripId,
    dedup: false,
  }), [tripId]);

  useRealtimeSubscription(config);

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

      return (data || []).map(traveler => ({
        id: traveler.id,
        first_name: traveler.first_name || 'Traveler',
        last_name: traveler.last_name || '',
        shared_with_email: traveler.shared_with_email,
        shared_with_user_id: traveler.shared_with_user_id || null,
        permission_level: traveler.permission_level === 'edit' ? 'edit' : 'read',
        created_at: traveler.created_at,
        is_owner: traveler.is_owner || false,
        avatar_url: traveler.avatar_url || null,
      } satisfies Traveler));
    },
    enabled: !!tripId,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['travelers', tripId] });
  }, [queryClient, tripId]);

  return {
    travelers,
    loading: isLoading,
    error,
    refresh,
  };
}
