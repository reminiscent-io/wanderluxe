import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transportation } from '@/types/trip';

export function useTransportationEvents(tripId: string) {
  const queryClient = useQueryClient();

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
      return data as Transportation[];
    },
    enabled: !!tripId,
  });

  const transportations = transportationData || [];

  // Memoize refresh function to avoid re-creating it on each render.
  const refreshTransportation = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
  }, [queryClient, tripId]);

  useEffect(() => {
    if (!tripId) return;



    return () => {

    };
  }, [tripId]);
  
  return { transportations, transportationData, isLoading, refreshTransportation };
}
