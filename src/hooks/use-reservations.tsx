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

  // Real-time subscription is now handled by useReservationsRealtime hook
  // This hook focuses only on data fetching
  useEffect(() => {
    setIsSubscribed(false); // This hook doesn't manage subscriptions
  }, []);

  // Query for reservations
  const { data, isLoading, error } = useQuery({
    queryKey: ['reservations', tripId, dayId],
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