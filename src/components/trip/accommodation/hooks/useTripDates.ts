import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTripDates = (tripId: string) => {
  const [tripDates, setTripDates] = useState<{ arrival_date: string | null; departure_date: string | null }>({
    arrival_date: null,
    departure_date: null
  });

  useEffect(() => {
    const fetchTripDates = async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('arrival_date, departure_date')
        .eq('id', tripId)
        .single();

      if (!error && data) {
        setTripDates({
          arrival_date: data.arrival_date,
          departure_date: data.departure_date
        });
      }
    };

    fetchTripDates();
  }, [tripId]);

  return tripDates;
};