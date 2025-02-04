import React, { useState } from 'react';
import { motion } from 'framer-motion';
import AccommodationGroup from '../accommodation/AccommodationGroup';
import DayCard from '../DayCard';
import { TripDay } from '@/types/trip';
import FlightIndicator from '../transportation/FlightIndicator';
import TransportationDialog from '../transportation/TransportationDialog';
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
  const [selectedTransportation, setSelectedTransportation] = useState<TransportationEvent>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: transportationEvents } = useQuery({
    queryKey: ['transportation-events', groups[0]?.days[0]?.trip_id],
    queryFn: async () => {
      const tripId = groups[0]?.days[0]?.trip_id;
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
    enabled: !!groups[0]?.days[0]?.trip_id
  });

  const handleTransportationClick = (event: TransportationEvent) => {
    setSelectedTransportation(event);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    setSelectedTransportation(undefined);
  };

  return (
    <div className="space-y-12">
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
                <div key={day.id}>
                  {transportationEvents?.map(event => 
                    event.start_date === day.date.split('T')[0] && (
                      <FlightIndicator
                        key={event.id}
                        event={event}
                        onClick={() => handleTransportationClick(event)}
                      />
                    )
                  )}
                  <DayCard
                    id={day.id}
                    date={day.date.split('T')[0]}
                    title={day.title}
                    description={day.description}
                    activities={day.activities || []}
                    onAddActivity={() => {}}
                    index={dayIndex}
                    onDelete={() => {}}
                  />
                </div>
              ))}
            </AccommodationGroup>
          ) : (
            <div className="space-y-6">
              {group.days.map((day, dayIndex) => (
                <div key={day.id}>
                  {transportationEvents?.map(event => 
                    event.start_date === day.date.split('T')[0] && (
                      <FlightIndicator
                        key={event.id}
                        event={event}
                        onClick={() => handleTransportationClick(event)}
                      />
                    )
                  )}
                  <DayCard
                    id={day.id}
                    date={day.date.split('T')[0]}
                    title={day.title}
                    description={day.description}
                    activities={day.activities || []}
                    onAddActivity={() => {}}
                    index={dayIndex}
                    onDelete={() => {}}
                  />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      ))}

      <TransportationDialog
        tripId={groups[0]?.days[0]?.trip_id || ''}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={selectedTransportation}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default TimelineContent;