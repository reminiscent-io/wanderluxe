import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RestaurantReservation } from '@/types/trip';

/**
 * Fetch restaurant reservations for a given day + trip.
 */
export function useReservations(dayId: string, tripId?: string) {
  const {
    data: reservations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['reservations', tripId, dayId],
    enabled: !!dayId && !!tripId,
    queryFn: async () => {
      const { data: supabaseData, error: supabaseError } = await supabase
        .from('reservations')
        .select('*')
        .eq('day_id', dayId)
        .eq('trip_id', tripId!)
        .order('reservation_time');

      if (supabaseError) {
        console.error('Error fetching reservations:', supabaseError);
        toast.error('Failed to load restaurant reservations');
        throw supabaseError;
      }

      return supabaseData ?? [];
    },
  });

  return {
    reservations: reservations as RestaurantReservation[],
    isLoading,
    error,
  };
}
