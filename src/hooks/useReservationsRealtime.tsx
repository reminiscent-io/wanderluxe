import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRealtimeSubscription, RealtimeSubscriptionConfig } from './useRealtimeSubscription';

export function useReservationsRealtime(dayId: string, tripId: string | undefined) {
  const config: RealtimeSubscriptionConfig = useMemo(() => ({
    channelKey: `reservations:${dayId}`,
    tables: [
      { table: 'reservations', filterColumn: 'day_id', filterValue: dayId },
      { table: 'reservation_travelers', filterColumn: 'trip_id', filterValue: tripId! },
    ],
    invalidateKeys: [
      ['reservations', tripId, dayId],
      ['reservations', tripId],
      ['trip', tripId],
      ['trip-travelers:list', tripId],
      ['trip-travelers:assigned', tripId],
    ],
    enabled: !!dayId && !!tripId,
  }), [dayId, tripId]);

  const { isSubscribed } = useRealtimeSubscription(config);

  const { data, isLoading, error } = useQuery({
    queryKey: ['reservations', tripId, dayId],
    queryFn: async () => {
      if (!dayId || !tripId) return [];

      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('day_id', dayId)
        .eq('trip_id', tripId)
        .order('reservation_time');

      if (error) {
        console.error('Error fetching reservations:', error);
        toast.error('Failed to load reservations');
        throw error;
      }

      return data || [];
    },
    enabled: !!dayId && !!tripId,
  });

  return {
    reservations: data || [],
    isLoading,
    error,
    isSubscribed,
  };
}
