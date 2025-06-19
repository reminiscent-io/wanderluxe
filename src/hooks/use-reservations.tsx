import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RestaurantReservation } from '@/types/trip';

/**
 * Custom hook for fetching restaurant reservations with real-time updates
 * 
 * @param dayId - The ID of the day to fetch reservations for
 * @param tripId - The ID of the trip the day belongs to
 * @returns An object containing the reservations array
 */
export function useReservations(dayId: string, tripId: string | undefined) {
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Set up real-time subscription - temporarily disabled for debugging
  useEffect(() => {
    if (!dayId || !tripId) return;

    console.log(`Reservation subscription temporarily disabled for day ${dayId}`);
    setIsSubscribed(false);

    // Clean up subscription on unmount
    return () => {
      console.log('Subscription cleanup - no active reservations subscriptions');
    };
  }, [dayId, tripId]);

  // Query for reservations
  const { data, isLoading, error } = useQuery({
    queryKey: ['reservations', dayId, tripId],
    queryFn: async () => {
      if (!dayId || !tripId) return [];
      
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('day_id', dayId)
        .eq('trip_id', tripId)  // Include tripId for proper RLS policy evaluation
        .order('reservation_time');
      
      if (error) {
        console.error('Error fetching reservations:', error);
        toast.error('Failed to load restaurant reservations');
        throw error;
      }
      
      console.log(`Loaded ${data?.length || 0} reservations for day ${dayId}`);
      return data || [];
    },
    enabled: !!dayId && !!tripId
  });

  return {
    reservations: data as RestaurantReservation[] || [],
    isLoading,
    error,
    isSubscribed
  };
}