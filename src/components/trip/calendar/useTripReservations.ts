import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RestaurantReservation } from '@/types/trip';

export function useTripReservations(tripId: string) {
  return useQuery({
    queryKey: ['reservations', tripId],
    queryFn: async (): Promise<RestaurantReservation[]> => {
      const { data, error } = await supabase.from('reservations').select('*').eq('trip_id', tripId);
      if (error) throw error;
      return (data ?? []) as unknown as RestaurantReservation[];
    },
    enabled: !!tripId,
  });
}
