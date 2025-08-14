import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Global set to track active subscriptions and prevent duplicates
const activeSubscriptions = new Set<string>();

export function useActivitiesRealtime(dayId: string, tripId: string | undefined) {
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<any>(null);
  
  const subscriptionKey = `activities:${dayId}`;

  // Memoize the invalidation callback to prevent unnecessary re-subscriptions
  const handleActivityChange = useCallback((payload: any) => {
    console.log(`Activity real-time change detected for day ${dayId}:`, payload);
    queryClient.invalidateQueries({
      queryKey: ['trip', tripId],
    });
    // Also invalidate day-specific queries if they exist
    queryClient.invalidateQueries({
      queryKey: ['activities', dayId],
    });
  }, [queryClient, tripId, dayId]);

  // Set up real-time subscription for activities
  useEffect(() => {
    if (!dayId || !tripId) return;

    // Check if subscription already exists for this day
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
          table: 'day_activities',
          filter: `day_id=eq.${dayId}`,
        },
        handleActivityChange
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED');
        
        // Handle channel errors with automatic reconnection
        if (status === 'CHANNEL_ERROR') {
          console.warn(`Activity channel error for day ${dayId}, retrying automatically`);
        }
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
  }, [dayId, tripId, subscriptionKey, handleActivityChange]);

  return { isSubscribed };
}