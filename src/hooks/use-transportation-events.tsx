import { useEffect, useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transportation } from '@/types/trip';

// Global set to track active subscriptions and prevent duplicates
const activeSubscriptions = new Set<string>();

export function useTransportationEvents(tripId: string) {
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<any>(null);

  const subscriptionKey = `transportation:${tripId}`;

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
      // Map the data to ensure all required fields are present
      return (data || []).map(item => ({
        ...item,
        is_paid: (item as any).is_paid ?? false,
      })) as Transportation[];
    },
    enabled: !!tripId,
  });

  const transportations = transportationData || [];

  // Memoize refresh function to avoid re-creating it on each render.
  const refreshTransportation = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
  }, [queryClient, tripId]);

  // Memoize the invalidation callback to prevent unnecessary re-subscriptions
  const handleTransportationChange = useCallback((payload: any) => {
    queryClient.invalidateQueries({
      queryKey: ['transportation', tripId],
    });
    // Also invalidate trip queries
    queryClient.invalidateQueries({
      queryKey: ['trip', tripId],
    });
    // Invalidate TravelerAvatars queries
    queryClient.invalidateQueries({
      queryKey: ['trip-travelers:list', tripId],
    });
    queryClient.invalidateQueries({
      queryKey: ['trip-travelers:assigned', tripId],
    });
  }, [queryClient, tripId]);

  // Real-time subscription for transportation changes
  useEffect(() => {
    if (!tripId) return;

    // Check if subscription already exists for this trip
    if (activeSubscriptions.has(subscriptionKey)) {
      return;
    }

    activeSubscriptions.add(subscriptionKey);

    const channel = supabase
      .channel(subscriptionKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transportation',
          filter: `trip_id=eq.${tripId}`,
        },
        handleTransportationChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transportation_travelers',
          filter: `trip_id=eq.${tripId}`,
        },
        handleTransportationChange
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      activeSubscriptions.delete(subscriptionKey);
      setIsSubscribed(false);
    };
  }, [tripId, handleTransportationChange]);

  return { transportations, transportationData, isLoading, refreshTransportation, isSubscribed };
}
