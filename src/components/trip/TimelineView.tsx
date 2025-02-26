
import React, { useState, useCallback } from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTimelineGroups } from '@/hooks/use-timeline-groups';
import { useTripDays } from '@/hooks/use-trip-days';
import TimelineContent from './timeline/TimelineContent';
import AccommodationGaps from './timeline/AccommodationGaps';
import AccommodationsSection from './AccommodationsSection';
import TransportationSection from './TransportationSection';
import TripDates from './timeline/TripDates';
import { toast } from 'sonner';

interface TimelineViewProps {
  tripId: string;
  tripDates: {
    arrival_date: string | null;
    departure_date: string | null;
  };
}

const TimelineView: React.FC<TimelineViewProps> = ({
  tripId,
  tripDates: initialTripDates
}) => {
  const { days, refreshDays } = useTripDays(tripId);
  const { events, refreshEvents } = useTimelineEvents(tripId);
  const { groups, gaps } = useTimelineGroups(days, events);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshEvents(), refreshDays()]);
      toast.success('Timeline updated successfully');
    } catch (error) {
      console.error('Error refreshing timeline:', error);
      toast.error('Failed to refresh timeline');
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshEvents, refreshDays]);

  // Convert events to hotel stays
  const hotelStays = React.useMemo(() => 
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
    })) || []
  , [events, tripId]);

  return (
    <div className="relative space-y-8">
      {isRefreshing && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20" />
      )}

      <div className="grid gap-4">
        <TripDates
          tripId={tripId}
          arrivalDate={initialTripDates.arrival_date}
          departureDate={initialTripDates.departure_date}
          onDatesChange={handleRefresh}
        />
        <AccommodationsSection
          tripId={tripId}
          onAccommodationChange={handleRefresh}
          hotelStays={hotelStays}
        />
        <TransportationSection
          tripId={tripId}
          onTransportationChange={handleRefresh}
        />
      </div>

      <TimelineContent 
        groups={groups} 
        dayIndexMap={new Map(days?.map((day, index) => [day.day_id, index + 1]) || [])}
      />
      <AccommodationGaps 
        gaps={gaps} 
        onAddAccommodation={() => {}}
      />
    </div>
  );
};

export default TimelineView;
