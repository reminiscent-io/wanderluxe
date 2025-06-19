
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export const useTripSubscription = (tripId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tripId) return;

    console.log('Setting up real-time subscription for trip:', tripId);

    // Use a unique channel name with timestamp to prevent conflicts
    const channelName = `trip-${tripId}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Check if channel is already subscribed to prevent duplicate subscriptions
    if (channel.state === 'subscribed') {
      console.log('Channel already subscribed, skipping');
      return;
    }

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log('Trip update received:', payload);
          const newData = payload.new;
          
          if (newData && 
              (newData.arrival_date !== null || 
               newData.departure_date !== null)) {
            console.log('Valid trip update detected, invalidating query');
            queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
          } else {
            console.log('Ignoring subscription update with null dates');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accommodations',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log('Accommodation update received:', payload);
          queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      if (channel.state === 'subscribed') {
        channel.unsubscribe();
      }
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);
};
