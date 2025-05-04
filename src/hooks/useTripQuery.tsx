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

      // Data validation - protect against null dates overriding valid ones
      if (data) {
        // Only if the trip record exists
        const validatedData = { ...data };

        // If data has null dates but we have previous valid dates, preserve them
        if (previousTrip) {
          // Check arrival date
          if (!validatedData.arrival_date && previousTrip.arrival_date) {
            console.log('Protecting arrival_date from being nullified:', previousTrip.arrival_date);
            validatedData.arrival_date = previousTrip.arrival_date;
          }

          // Check departure date
          if (!validatedData.departure_date && previousTrip.departure_date) {
            console.log('Protecting departure_date from being nullified:', previousTrip.departure_date);
            validatedData.departure_date = previousTrip.departure_date;
          }
        }

        // Log detailed state for debugging
        console.log('Trip data fetched successfully:', validatedData);
        return validatedData as Trip;
      }

      // Fall back to previous data if the new data is completely null
      if (!data && previousTrip) {
        console.log('New data is null, using previous trip data:', previousTrip);
        return previousTrip;
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