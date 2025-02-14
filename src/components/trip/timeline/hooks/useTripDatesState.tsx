
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useTripDatesState = (tripId: string) => {
  const [tripDates, setTripDates] = useState<{ 
    arrival_date: string | null; 
    departure_date: string | null; 
  }>({ arrival_date: null, departure_date: null });

  const fetchTripDates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('arrival_date, departure_date')
        .eq('trip_id', tripId)
        .single();

      if (error) throw error;
      setTripDates(data);
    } catch (error) {
      console.error('Error fetching trip dates:', error);
      toast.error('Failed to load trip dates');
    }
  }, [tripId]);

  return {
    tripDates,
    fetchTripDates
  };
};
