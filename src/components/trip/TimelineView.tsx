import React, { useEffect, useState } from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTimelineGroups } from '@/hooks/use-timeline-groups';
import { useTripDays } from '@/hooks/use-trip-days';
import TimelineContent from './timeline/TimelineContent';
import AccommodationGaps from './timeline/AccommodationGaps';
import AccommodationsSection from './AccommodationsSection';
import TransportationSection from './TransportationSection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TimelineViewProps {
  tripId: string;
  onAddAccommodation?: (startDate: string, endDate: string) => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({ tripId, onAddAccommodation }) => {
  const { days, refreshDays } = useTripDays(tripId);
  const { events, refreshEvents } = useTimelineEvents(tripId);
  const { groups, gaps } = useTimelineGroups(days, events);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshEvents();
    refreshDays();
    setIsRefreshing(false);
  };

  useEffect(() => {
    const channel = supabase
      .channel('timeline-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_events',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          refreshEvents();
          toast.info('Timeline updated');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_days',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          refreshDays();
          toast.info('Trip days updated');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, refreshEvents, refreshDays]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4">
        <AccommodationsSection
          tripId={tripId}
          onAccommodationChange={handleRefresh}
          hotelStays={events.filter(event => event.hotel).map(event => ({
            id: event.id,
            hotel: event.hotel || '',
            hotel_details: event.hotel_details,
            hotel_url: event.hotel_url,
            hotel_checkin_date: event.hotel_checkin_date || '',
            hotel_checkout_date: event.hotel_checkout_date || '',
            expense_cost: event.expense_cost,
            expense_currency: event.expense_currency,
            hotel_address: event.hotel_address,
            hotel_phone: event.hotel_phone,
            hotel_place_id: event.hotel_place_id,
            hotel_website: event.hotel_website,
          }))}
        />
        <TransportationSection
          tripId={tripId}
          onTransportationChange={handleRefresh}
        />
      </div>
      <TimelineContent groups={groups} />
      <AccommodationGaps gaps={gaps} onAddAccommodation={onAddAccommodation || (() => {})} />
    </div>
  );
};

export default TimelineView;