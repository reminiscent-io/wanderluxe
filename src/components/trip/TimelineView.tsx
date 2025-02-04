import React, { useEffect } from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTimelineGroups } from '@/hooks/use-timeline-groups';
import { useTripDays } from '@/hooks/use-trip-days';
import TimelineContent from './timeline/TimelineContent';
import AccommodationGaps from './timeline/AccommodationGaps';
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
      <TimelineContent groups={groups} />
      <AccommodationGaps gaps={gaps} onAddAccommodation={onAddAccommodation || (() => {})} />
    </div>
  );
};

export default TimelineView;