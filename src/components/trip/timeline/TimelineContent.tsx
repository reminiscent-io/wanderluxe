
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
  dayIndexMap: Map<string, number>;
}

const TimelineContent: React.FC<TimelineContentProps> = ({ 
  groups,
  dayIndexMap
}) => {
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

  return (
    <div className="space-y-8">
      {groups.map((group, groupIndex) => {
        const relevantFlights = transportationEvents?.filter(flight => {
          const flightDate = new Date(flight.start_date);
          const checkinDate = group.checkinDate ? new Date(group.checkinDate) : null;
          const checkoutDate = group.checkoutDate ? new Date(group.checkoutDate) : null;
          
          // If this is a standalone group (no hotel), show flights for that day
          if (!checkinDate || !checkoutDate) {
            return group.days.some(day => {
              const dayDate = new Date(day.date);
              return flightDate.toDateString() === dayDate.toDateString();
            });
          }
          
          return flightDate >= checkinDate && flightDate <= checkoutDate;
        });

        return (
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
                {relevantFlights?.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex justify-center mb-6"
                  >
                    <FlightIndicator
                      event={event}
                      onClick={() => {}}
                    />
                  </motion.div>
                ))}
                {group.days.map((day) => (
                  <DayCard
                    key={day.day_id}
                    id={day.day_id}
                    tripId={tripId || ''} // Added tripId property
                    date={day.date}
                    title={day.title || ''}
                    description={day.description}
                    activities={day.activities || []}
                    imageUrl={day.image_url}
                    onAddActivity={() => {}}
                    index={dayIndexMap.get(day.day_id) || 0}
                    onDelete={handleDayDelete}
                  />
                ))}
              </AccommodationGroup>
            ) : (
              <div className="space-y-6">
                {group.days.map((day) => (
                  <DayCard
                    key={day.day_id}
                    id={day.day_id}
                    tripId={tripId || ''} // Added tripId property
                    date={day.date}
                    title={day.title || ''}
                    description={day.description}
                    activities={day.activities || []}
                    imageUrl={day.image_url}
                    onAddActivity={() => {}}
                    index={dayIndexMap.get(day.day_id) || 0}
                    onDelete={handleDayDelete}
                  />
                ))}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default TimelineContent;
