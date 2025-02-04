import React, { useEffect } from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTripDays } from '@/hooks/use-trip-days';
import { supabase } from '@/integrations/supabase/client';
import AccommodationsSection from "./AccommodationsSection";
import TransportationSection from "./TransportationSection";
import { generateDaysBetweenDates } from '@/utils/dateUtils';
import { useTimelineGroups } from '@/hooks/use-timeline-groups';
import AccommodationGaps from './timeline/AccommodationGaps';
import TimelineContent from './timeline/TimelineContent';
import { toast } from 'sonner';

interface TimelineViewProps {
  tripId: string | undefined;
}

const TimelineView: React.FC<TimelineViewProps> = ({ tripId }) => {
  const { events, isLoading: eventsLoading, refetch } = useTimelineEvents(tripId);
  const { days, isLoading: daysLoading, addDay } = useTripDays(tripId);
  const { findAccommodationGaps, groupDaysByAccommodation } = useTimelineGroups(days, events);

  useEffect(() => {
    const initializeDays = async () => {
      if (!tripId) return;
      
      const { data: trip } = await supabase
        .from('trips')
        .select('arrival_date, departure_date')
        .eq('id', tripId)
        .single();

      if (!trip?.arrival_date || !trip?.departure_date) return;

      const daysList = generateDaysBetweenDates(trip.arrival_date, trip.departure_date);
      
      for (const day of daysList) {
        await addDay.mutateAsync({
          tripId,
          date: day.date,
          title: day.title
        });
      }
    };

    if (!days?.length) {
      initializeDays();
    }
  }, [tripId, days, addDay]);

  // Set up real-time subscriptions for timeline events and transportation
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel('timeline-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_events',
          filter: `trip_id=eq.${tripId}`
        },
        (payload) => {
          console.log('Timeline event changed:', payload);
          refetch();
          toast.success('Timeline updated');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transportation_events',
          filter: `trip_id=eq.${tripId}`
        },
        (payload) => {
          console.log('Transportation event changed:', payload);
          refetch();
          toast.success('Transportation updated');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, refetch]);

  if (eventsLoading || daysLoading) {
    return <div>Loading timeline...</div>;
  }

  const uniqueHotelStays = events?.reduce((acc: any[], event) => {
    if (event.hotel && event.hotel_checkin_date) {
      const stayKey = `${event.hotel}-${event.hotel_checkin_date}`;
      if (!acc.find(stay => `${stay.hotel}-${stay.hotel_checkin_date}` === stayKey)) {
        acc.push(event);
      }
    }
    return acc;
  }, []) || [];

  const accommodationGaps = findAccommodationGaps();
  const groups = groupDaysByAccommodation();

  return (
    <div className="space-y-8">
      <AccommodationsSection 
        tripId={tripId || ''} 
        onAccommodationChange={refetch}
        hotelStays={uniqueHotelStays}
      />

      <TransportationSection
        tripId={tripId || ''}
        onTransportationChange={refetch}
      />

      <AccommodationGaps gaps={accommodationGaps} />
      <TimelineContent groups={groups} />
    </div>
  );
};

export default TimelineView;