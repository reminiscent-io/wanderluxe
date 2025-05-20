import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  // Set up real-time subscription for reservations
  useEffect(() => {
    if (!dayId || !tripId) return;

    // Subscribe to changes on the reservations table
    const channel = supabase
      .channel(`reservations-${tripId}-${dayId}`)
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'reservations',
          filter: `trip_id=eq.${tripId}` 
        }, 
        () => {
          console.log('Reservation changed, refreshing data...');
          queryClient.invalidateQueries({queryKey: ['reservations', dayId]});
          queryClient.invalidateQueries({queryKey: ['trip', tripId]});
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for reservations (${dayId}):`, status);
        setIsSubscribed(status === 'SUBSCRIBED');
      });

    // Cleanup subscription on unmount
    return () => {
      console.log(`Cleaning up reservation subscription for day ${dayId}`);
      channel.unsubscribe();
    };
  }, [dayId, tripId, queryClient]);

  // Query for reservations
  const { 
    data, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['reservations', dayId, tripId],
    queryFn: async () => {
      if (!dayId || !tripId) return [];
      
      console.log(`Loading reservations for day ${dayId} in trip ${tripId}`);
      
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
      
      console.log(`Loaded ${data?.length || 0} reservations for day ${dayId} in trip ${tripId}`);
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