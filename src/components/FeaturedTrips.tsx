import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import TripCard from './trip/TripCard';

const FeaturedTrips = () => {
  const { data: trips, isLoading } = useQuery({
    queryKey: ['featured-trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .limit(3)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-64 bg-gray-100 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {trips?.map((trip) => (
        <TripCard
          key={trip.trip_id}
          trip={trip}
          href={`/trips/${trip.trip_id}`}
        />
      ))}
    </div>
  );
};

export default FeaturedTrips;