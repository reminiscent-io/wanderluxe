import React, { useState, useCallback, useEffect } from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTimelineGroups } from '@/hooks/use-timeline-groups';
import { useTripDays } from '@/hooks/use-trip-days';
import { supabase } from '@/integrations/supabase/client';
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
  const [tripDates, setTripDates] = useState<{
    arrival_date: string | null;
    departure_date: string | null;
  }>({
    arrival_date: initialTripDates?.arrival_date || null,
    departure_date: initialTripDates?.departure_date || null
  });

  // Keep tripDates state in sync with props
  useEffect(() => {
    console.log('Initial trip dates received:', initialTripDates);
    setTripDates({
      arrival_date: initialTripDates?.arrival_date || null,
      departure_date: initialTripDates?.departure_date || null
    });
  }, [initialTripDates]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshEvents(), refreshDays()]);

      // Fetch updated trip dates
      const { data, error } = await supabase
        .from('trips')
        .select('arrival_date, departure_date')
        .eq('trip_id', tripId)
        .single();

      if (!error && data) {
        // Only update if we actually have dates
        if (data.arrival_date && data.departure_date) {
          console.log('Setting trip dates from refresh:', data);
          setTripDates({
            arrival_date: data.arrival_date,
            departure_date: data.departure_date
          });
        } else {
          console.log('Skipping trip dates update - missing dates in data:', data);
        }
      }

      toast.success('Timeline updated successfully');
    } catch (error) {
      console.error('Error refreshing timeline:', error);
      toast.error('Failed to refresh timeline');
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshEvents, refreshDays, tripId]);

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
        {console.log('Rendering TripDates with:', { 
          tripId, 
          arrivalDate: tripDates.arrival_date, 
          departureDate: tripDates.departure_date 
        })}
        <TripDates
          tripId={tripId}
          arrivalDate={tripDates.arrival_date}
          departureDate={tripDates.departure_date}
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