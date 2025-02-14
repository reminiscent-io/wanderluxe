
import React, { useState, useMemo, useCallback } from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTimelineGroups } from '@/hooks/use-timeline-groups';
import { useTripDays } from '@/hooks/use-trip-days';
import TimelineContent from './timeline/TimelineContent';
import AccommodationGaps from './timeline/AccommodationGaps';
import { toast } from 'sonner';
import TimelineActions from './timeline/TimelineActions';
import TimelineSections from './timeline/TimelineSections';
import { useTimelineSubscription } from './timeline/hooks/useTimelineSubscription';
import { useTripDatesState } from './timeline/hooks/useTripDatesState';

interface TimelineViewProps {
  tripId: string;
  onAddAccommodation?: (dates: { startDate: string; endDate: string }) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({
  tripId,
  onAddAccommodation = () => {},
  onEdit,
  onDelete
}) => {
  const { days, refreshDays } = useTripDays(tripId);
  const { events, refreshEvents } = useTimelineEvents(tripId);
  const { groups, gaps } = useTimelineGroups(days, events);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { tripDates, fetchTripDates } = useTripDatesState(tripId);

  // Sort all days chronologically once to establish the correct day numbers
  const sortedDays = useMemo(() => {
    if (!days) return [];
    return [...days].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [days]);

  // Create a map of day_id to its index (1-based) in the chronological order
  const dayIndexMap = useMemo(() => {
    const map = new Map();
    sortedDays.forEach((day, index) => {
      map.set(day.day_id, index + 1); // Add 1 to make it 1-based
    });
    return map;
  }, [sortedDays]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshEvents(), refreshDays(), fetchTripDates()]);
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshEvents, refreshDays, fetchTripDates]);

  // Set up real-time subscriptions
  useTimelineSubscription(tripId, refreshEvents, refreshDays);

  // Convert events to HotelStay type with proper number conversion for cost
  const hotelStays = useMemo(() => 
    events?.filter(event => event.hotel && event.stay_id).map(event => ({
      stay_id: event.stay_id,
      trip_id: tripId,
      hotel: event.hotel || '',
      hotel_details: event.hotel_details,
      hotel_url: event.hotel_url,
      hotel_checkin_date: event.hotel_checkin_date || '',
      hotel_checkout_date: event.hotel_checkout_date || '',
      cost: event.cost ? Number(event.cost) : null,
      currency: event.currency || 'USD',
      hotel_address: event.hotel_address,
      hotel_phone: event.hotel_phone,
      hotel_place_id: event.hotel_place_id,
      hotel_website: event.hotel_website,
      created_at: event.created_at,
    })) || []
  , [events, tripId]);

  return (
    <div className="relative space-y-8">
      {isRefreshing && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20" />
      )}

      <TimelineActions
        onEdit={onEdit}
        onDelete={onDelete}
        isRefreshing={isRefreshing}
      />

      <TimelineSections
        tripId={tripId}
        tripDates={tripDates}
        onDatesChange={fetchTripDates}
        onAccommodationChange={handleRefresh}
        onTransportationChange={handleRefresh}
        hotelStays={hotelStays}
      />

      <TimelineContent groups={groups} dayIndexMap={dayIndexMap} />
      <AccommodationGaps 
        gaps={gaps} 
        onAddAccommodation={onAddAccommodation} 
      />
    </div>
  );
};

export default TimelineView;
