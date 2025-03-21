import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import DayCard from '../day/DayCard';
import { TripDay } from '@/types/trip';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TimelineContentProps {
  groups: Array<{
    hotel?: string;
    hotelDetails?: string;
    checkinDate?: string;
    checkoutDate?: string;
    days: TripDay[];
  }>;
  dayIndexMap: Map<string, number>;
}

const TimelineContent: React.FC<TimelineContentProps> = ({ 
  groups,
  dayIndexMap
}) => {
  const tripId = groups[0]?.days[0]?.trip_id;

  // Fetch trip details to get the cover image
  const { data: tripData } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      if (!tripId) return null;

      const { data, error } = await supabase
        .from('trips')
        .select('cover_image_url')
        .eq('trip_id', tripId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!tripId
  });

  const { data: transportationEvents } = useQuery({
    queryKey: ['transportation-events', tripId],
    queryFn: async () => {
      if (!tripId) return [];

      const { data, error } = await supabase
        .from('transportation_events')
        .select('*')
        .eq('trip_id', tripId)
        .eq('type', 'flight')
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as TransportationEvent[];
    },
    enabled: !!tripId
  });

  const handleDayDelete = async (dayId: string) => {
    try {
      const { error } = await supabase
        .from('trip_days')
        .delete()
        .eq('day_id', dayId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting day:', error);
    }
  };

  // Add logging to debug accommodation data
  useEffect(() => {
    console.log('TimelineContent - accommodations:', accommodations);
    console.log('TimelineContent - validDays:', validDays);
  }, [accommodations, validDays]);

  return (
    <section className="w-full max-w-screen-xl mx-auto px-4 py-8 space-y-12">
      {/* Trip days timeline */}
      <div className="space-y-8">
        {validDays.map((day, index) => (
          <DayCard
            key={day.id}
            index={index}
            id={day.id}
            eventId={day.event_id}
            title={day.title}
            date={day.date}
            activities={day.activities || []}
            onTitleChange={(title) => handleDayTitleChange(day.id, title)}
            onImageChange={(imageUrl) => handleDayImageChange(day.id, imageUrl)}
            imageUrl={day.image_url}
            defaultImageUrl={getDefaultImageForTrip()}
            accommodations={accommodations || []}
          />
        ))}
      </div>
    </section>
  );
};

export default TimelineContent;