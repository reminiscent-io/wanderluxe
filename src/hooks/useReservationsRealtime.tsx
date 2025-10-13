import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Global subscription tracking to prevent duplicates
const activeSubscriptions = new Set<string>();

/**
 * Custom hook for fetching restaurant reservations with real-time updates
 * 
 * @param dayId - The ID of the day to fetch reservations for
 * @param tripId - The ID of the trip the day belongs to
 * @returns Reservation data with real-time updates
 */
export function useReservationsRealtime(dayId: string, tripId: string | undefined) {
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<any>(null);
  
  const subscriptionKey = `reservations:${dayId}`;

  // Memoize the invalidation callback to prevent unnecessary re-subscriptions
  const handleReservationChange = useCallback((payload: any) => {
    queryClient.invalidateQueries({
      queryKey: ['reservations', tripId, dayId],
    });
    // Invalidate trip-level reservations queries (for sidebar)
    queryClient.invalidateQueries({
      queryKey: ['reservations', tripId],
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
  }, [queryClient, tripId, dayId]);

  // Set up real-time subscription for reservations
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
          table: 'reservations',
          filter: `day_id=eq.${dayId}`,
        },
        handleReservationChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservation_travelers',
          filter: `trip_id=eq.${tripId}`,
        },
        handleReservationChange
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
  }, [dayId, tripId, subscriptionKey, handleReservationChange]);

  // Query for reservations
  const { 
    data, 
    isLoading, 
    error 
  } = useQuery({
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
    enabled: !!dayId && !!tripId
  });

  return {
    reservations: data || [],
    isLoading,
    error,
    isSubscribed
  };
}