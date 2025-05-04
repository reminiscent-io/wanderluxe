
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export const useTripSubscription = (tripId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tripId) return;

    console.log('Setting up real-time subscription for trip:', tripId);

    const channel = supabase
      .channel(`trip-${tripId}`)
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
          // Analyze the payload for critical changes
          const newData = payload.new;
          
          // Only invalidate the query if we're getting meaningful data
          // This prevents null values from being pulled in erroneously
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
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);
};
