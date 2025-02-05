import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import TripCard from './trip/TripCard';
import { Trip } from '@/types/trip';

const FeaturedTrips = () => {
  const { data: trips, isLoading } = useQuery({
    queryKey: ['featured-trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          accommodations (
            *,
            accommodations_days (
              day_id,
              date,
              trip_days (
                *,
                day_activities (*)
              )
            )
          )
        `)
        .limit(3)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Trip[];
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
          onHide={() => {}}
        />
      ))}
    </div>
  );
};

export default FeaturedTrips;