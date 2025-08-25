import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Global set to track active subscriptions and prevent duplicates
const activeSubscriptions = new Set<string>();

export function useAccommodationsRealtime(tripId: string | undefined) {
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<any>(null);
  
  const subscriptionKey = `accommodations:${tripId}`;

  // Memoize the invalidation callback to prevent unnecessary re-subscriptions
  const handleAccommodationChange = useCallback((payload: any) => {
    queryClient.invalidateQueries({
      queryKey: ['trip', tripId],
    });
    // Also invalidate accommodation-specific queries
    queryClient.invalidateQueries({
      queryKey: ['accommodations', tripId],
    });
    // Invalidate TravelerAvatars queries
    queryClient.invalidateQueries({
      queryKey: ['trip-travelers:list', tripId],
    });
    queryClient.invalidateQueries({
      queryKey: ['trip-travelers:assigned', tripId],
    });
  }, [queryClient, tripId]);

  // Set up real-time subscription for accommodations
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
          table: 'accommodations',
          filter: `trip_id=eq.${tripId}`,
        },
        handleAccommodationChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accommodation_travelers',
          filter: `trip_id=eq.${tripId}`,
        },
        handleAccommodationChange
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      activeSubscriptions.delete(subscriptionKey);
      setIsSubscribed(false);
    };
  }, [tripId, subscriptionKey, handleAccommodationChange]);

  return { isSubscribed };
}