import React from 'react';
import { motion } from 'framer-motion';
import AccommodationGroup from '../accommodation/AccommodationGroup';
import DayCard from '../day/DayCard';
import FlightIndicator from '../transportation/FlightIndicator';
import { TripDay } from '@/types/trip';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type TransportationEvent = Tables<'transportation_events'>;

interface TimelineContentProps {
  groups: Array<{
    hotel?: string;
    hotelDetails?: string;
    checkinDate?: string;
    checkoutDate?: string;
    days: TripDay[];
  }>;
}

const TimelineContent: React.FC<TimelineContentProps> = ({ groups }) => {
  // Get the trip ID from the first day of the first group
  const tripId = groups[0]?.days[0]?.trip_id;

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

  // Group days by date to match with flights
  const daysByDate = groups.reduce((acc, group) => {
    group.days.forEach(day => {
      const date = day.date.split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(day);
    });
    return acc;
  }, {} as Record<string, TripDay[]>);

  return (
    <div className="space-y-8">
      {/* Render flights first */}
      {transportationEvents?.map((event, index) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="flex justify-center"
        >
          <FlightIndicator
            event={event}
            onClick={() => {}}
          />
        </motion.div>
      ))}

      {/* Then render accommodation groups */}
      {groups.map((group, groupIndex) => (
        <motion.div
          key={`${group.hotel || 'standalone'}-${groupIndex}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: groupIndex * 0.1 }}
        >
          {group.hotel ? (
            <AccommodationGroup
              hotel={group.hotel}
              hotelDetails={group.hotelDetails}
              checkinDate={group.checkinDate!}
              checkoutDate={group.checkoutDate!}
            >
              {group.days.map((day, dayIndex) => (
                <DayCard
                  key={day.id}
                  id={day.id}
                  date={day.date.split('T')[0]}
                  title={day.title}
                  description={day.description}
                  activities={day.activities || []}
                  onAddActivity={() => {}}
                  index={dayIndex}
                  onDelete={() => {}}
                />
              ))}
            </AccommodationGroup>
          ) : (
            <div className="space-y-6">
              {group.days.map((day, dayIndex) => (
                <DayCard
                  key={day.id}
                  id={day.id}
                  date={day.date.split('T')[0]}
                  title={day.title}
                  description={day.description}
                  activities={day.activities || []}
                  onAddActivity={() => {}}
                  index={dayIndex}
                  onDelete={() => {}}
                />
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default TimelineContent;