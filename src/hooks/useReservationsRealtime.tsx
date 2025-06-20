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

  // Set up real-time subscription for reservations - temporarily disabled for debugging
  useEffect(() => {
    if (!dayId || !tripId) return;


    setIsSubscribed(false);

    // Cleanup subscription on unmount
    return () => {

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