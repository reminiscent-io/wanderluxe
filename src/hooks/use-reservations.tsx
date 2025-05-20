import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Custom hook for fetching restaurant reservations with real-time updates
export const useReservations = (dayId: string, tripId: string | undefined) => {
  const queryClient = useQueryClient();
  const [shouldRefetch, setShouldRefetch] = useState(false);

  // Set up real-time subscription for reservations
  useEffect(() => {
    if (!dayId || !tripId) return;

    // Subscribe to changes on the reservations table
    const subscription = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'reservations',
          filter: `trip_id=eq.${tripId}` 
        }, 
        () => {
          // Invalidate and refetch when data changes
          console.log('Reservation changed, refreshing data...');
          queryClient.invalidateQueries(['reservations', dayId]);
          setShouldRefetch(prev => !prev); // Toggle to force refetch
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [dayId, tripId, queryClient]);

  // Query for reservations
  const { 
    data: reservations, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['reservations', dayId, shouldRefetch], // Include shouldRefetch to force refresh
    queryFn: async () => {
      if (!dayId) return [];
      
      console.log(`Loading reservations for day ${dayId} in trip ${tripId}`);
      
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('day_id', dayId)
        .order('reservation_time');
      
      if (error) {
        toast.error('Failed to load reservations');
        throw error;
      }
      
      console.log(`Loaded ${data.length} reservations for day ${dayId} in trip ${tripId}`);
      return data;
    },
    enabled: !!dayId
  });

  return {
    reservations: reservations || [],
    isLoading,
    error
  };
};