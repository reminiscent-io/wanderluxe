import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transportation } from '@/types/trip';
import { toast } from 'sonner';

export function useTransportationEvents(tripId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
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
      console.log('Fetched transportation data:', data);
      return data as Transportation[];
    },
    enabled: !!tripId,
  });

  const refreshTransportation = async () => {
    await queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
  };

  useEffect(() => {
    if (!tripId) return;
    const channel = supabase
      .channel('transportation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transportation',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          refreshTransportation();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [tripId, queryClient, refreshTransportation]);

  return { transportations: data, isLoading, refreshTransportation };
}
