import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transportation } from '@/types/trip';
import { useRealtimeSubscription, buildTripEntityConfig } from './useRealtimeSubscription';

export function useTransportationEvents(tripId: string) {
  const queryClient = useQueryClient();

  const config = useMemo(
    () => buildTripEntityConfig('transportation', 'transportation_travelers', tripId),
    [tripId]
  );

  const { isSubscribed } = useRealtimeSubscription(config);

  const { data: transportationData, isLoading } = useQuery({
    queryKey: ['transportation', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('transportation')
        .select('*')
        .eq('trip_id', tripId)
        .order('start_date', { ascending: true });
      if (error) {
        console.error('Error fetching transportation data:', error);
        throw error;
      }
      return (data || []).map(item => ({
        ...item,
        is_paid: (item as { is_paid?: boolean }).is_paid ?? false,
      })) as Transportation[];
    },
    enabled: !!tripId,
  });

  const transportations = transportationData || [];

  const refreshTransportation = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
  }, [queryClient, tripId]);

  return { transportations, transportationData, isLoading, refreshTransportation, isSubscribed };
}
