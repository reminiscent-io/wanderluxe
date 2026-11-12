import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HotelStay } from '@/types/trip';

/** A trip's accommodations in itinerary order, shared by every view under one query key. */
export function useTripStays(tripId: string | undefined) {
  const { data: stays, isLoading } = useQuery({
    queryKey: ['accommodations', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accommodations')
        .select('*')
        .eq('trip_id', tripId)
        .order('order_index');

      if (error) {
        console.error('Error fetching accommodations:', error);
        throw error;
      }
      return data as HotelStay[];
    },
    enabled: !!tripId,
  });

  return { stays, isLoading };
}
