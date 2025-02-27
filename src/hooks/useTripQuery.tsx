
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trip } from '@/types/trip';
import { useNavigate } from 'react-router-dom';

export const useTripQuery = (tripId: string | undefined) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const previousTrip = queryClient.getQueryData<Trip>(['trip', tripId]);

  const { 
    data: trip, 
    isLoading: tripLoading, 
    error: tripError 
  } = useQuery<Trip>({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      if (!tripId) {
        console.error('No trip ID provided');
        throw new Error('No trip ID provided');
      }
      
      console.log('Fetching trip data for ID:', tripId);
      
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          accommodations(
            stay_id,
            hotel,
            hotel_details,
            hotel_url,
            hotel_checkin_date,
            hotel_checkout_date,
            cost,
            currency,
            hotel_address,
            hotel_phone,
            hotel_place_id,
            hotel_website
          )
        `)
        .eq('trip_id', tripId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching trip:', error);
        toast.error('Failed to load trip details');
        throw error;
      }
      
      if (!data) {
        console.error('Trip not found:', tripId);
        toast.error('Trip not found');
        navigate('/my-trips');
        throw new Error('Trip not found');
      }

      console.log('Trip data fetched successfully:', data);
      return data as Trip;
    },
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    retry: 2,
    enabled: !!tripId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    placeholderData: previousTrip,
  });

  return {
    trip,
    tripLoading,
    tripError,
    previousTrip
  };
};
