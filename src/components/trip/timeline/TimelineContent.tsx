
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

  return (
    <div className="space-y-8">
      {groups.map((group, groupIndex) => {
        const relevantFlights = transportationEvents?.filter(flight => {
          const flightDate = new Date(flight.start_date);
          const checkinDate = group.checkinDate ? new Date(group.checkinDate) : null;
          const checkoutDate = group.checkoutDate ? new Date(group.checkoutDate) : null;
          
          if (!checkinDate || !checkoutDate) {
            return group.days.some(day => {
              const dayDate = new Date(day.date);
              return flightDate.toDateString() === dayDate.toDateString();
            });
          }
          
          return flightDate >= checkinDate && flightDate <= checkoutDate;
        });

        return (
          <motion.fieldset
            key={`${group.hotel || 'standalone'}-${groupIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: groupIndex * 0.1 }}
            className="border-0 p-0 m-0"
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
                    tripId={tripId || ''}
                    date={day.date}
                    title={day.title || ''}
                    activities={day.activities || []}
                    imageUrl={day.image_url}
                    defaultImageUrl={tripData?.cover_image_url}
                    index={dayIndexMap.get(day.day_id) || 0}
                    onDelete={handleDayDelete}
                  />
                ))}
              </AccommodationGroup>
            ) : (
              <fieldset className="space-y-6 border-0 p-0 m-0">
                {group.days.map((day) => (
                  <DayCard
                    key={day.day_id}
                    id={day.day_id}
                    tripId={tripId || ''}
                    date={day.date}
                    title={day.title || ''}
                    activities={day.activities || []}
                    imageUrl={day.image_url}
                    defaultImageUrl={tripData?.cover_image_url}
                    index={dayIndexMap.get(day.day_id) || 0}
                    onDelete={handleDayDelete}
                  />
                ))}
              </fieldset>
            )}
          </motion.fieldset>
        );
      })}
    </div>
  );
};

export default TimelineContent;
