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

const TimelineView: React.FC<TimelineViewProps> = ({ tripId, tripDates: initialTripDates }) => {
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const { days } = useTripDays(tripId);
  const { data: events, isLoading: isLoadingEvents } = useTimelineEvents(tripId);
  const { groups, gaps } = useTimelineGroups(days, events);
  const [tripDates, setTripDates] = useState<{
    arrival_date: string | null;
    departure_date: string | null;
  }>({
    arrival_date: initialTripDates?.arrival_date || null,
    departure_date: initialTripDates?.departure_date || null
  });


  useEffect(() => {
    const fetchTripData = async () => {
      if (!tripDates.arrival_date || !tripDates.departure_date) {
        setIsLoadingDates(true);
        const { data, error } = await supabase
          .from('trips')
          .select('arrival_date, departure_date')
          .eq('trip_id', tripId)
          .single();

        if (error) {
          console.error('Error fetching trip dates:', error);
          toast.error('Failed to load trip dates');
        } else if (data) {
          setTripDates({
            arrival_date: data.arrival_date,
            departure_date: data.departure_date
          });
        }
        setIsLoadingDates(false);
      }
    };

    if (!tripDates.arrival_date || !tripDates.departure_date) {
      console.log('Trip dates missing on mount, fetching fresh data');
      fetchTripData();
    }
  }, [tripId, setTripDates, tripDates]);

  useEffect(() => {
    const newArrival = initialTripDates?.arrival_date;
    const newDeparture = initialTripDates?.departure_date;
    if (newArrival && newDeparture) {
      if (newArrival !== tripDates.arrival_date || newDeparture !== tripDates.departure_date) {
        console.log('Updating trip dates from props:', { newArrival, newDeparture });
        setTripDates({
          arrival_date: newArrival,
          departure_date: newDeparture
        });
      }
    }
  }, [initialTripDates, tripDates, setTripDates]);


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

  if (isLoadingEvents || isLoadingDates) {
    return <div>Loading timeline...</div>;
  }

  return (
    <div className="relative space-y-8">
      <TripDates
        tripId={tripId}
        arrivalDate={tripDates.arrival_date}
        departureDate={tripDates.departure_date}
      />
      <TimelineContent groups={groups} dayIndexMap={new Map(days?.map((day, index) => [day.day_id, index + 1]) || [])} />
      <AccommodationGaps gaps={gaps || []} onAddAccommodation={() => {}} />
      <AccommodationsSection tripId={tripId} hotelStays={hotelStays} />
      <TransportationSection tripId={tripId} />
    </div>
  );
};

export default TimelineView;