import React, { useState, useCallback, useEffect } from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTripDays } from '@/hooks/use-trip-days';
import { supabase } from '@/integrations/supabase/client';
import TimelineContent from './timeline/TimelineContent';
import AccommodationsSection from './AccommodationsSection';
import TransportationSection from './TransportationSection';
import TripDates from './timeline/TripDates';
import { toast } from 'sonner';
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';
import { useTransportationEvents } from '@/hooks/use-transportation-events';

interface TimelineViewProps {
  tripId: string;
  tripDates: {
    arrival_date: string | null;
    departure_date: string | null;
  };
}

const TimelineView: React.FC<TimelineViewProps> = ({ tripId, tripDates: initialTripDates }) => {
  useEffect(() => {
    // Track timeline view
    window.gtag('event', 'view_timeline', {
      event_category: 'Trip',
      event_label: tripId
    });
  }, [tripId]);

  const trackTimelineAction = (action: string, details?: object) => {
    window.gtag('event', action, {
      event_category: 'Timeline',
      event_label: tripId,
      ...details
    });
  };

  const { days, refreshDays } = useTripDays(tripId);
  const { events, refreshEvents } = useTimelineEvents(tripId);
  const { transportationData, refreshTransportation } = useTransportationEvents(tripId);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [localTripDates, setLocalTripDates] = useState<{
    arrival_date: string | null;
    departure_date: string | null;
  }>({
    arrival_date: initialTripDates?.arrival_date || null,
    departure_date: initialTripDates?.departure_date || null,
  });

  //Load google maps api on the timeline page here
  useEffect(() => {
    loadGoogleMapsAPI();
  }, []);

  useEffect(() => {
    const newArrival = initialTripDates?.arrival_date;
    const newDeparture = initialTripDates?.departure_date;
    if (newArrival && newDeparture) {
      if (newArrival !== localTripDates.arrival_date || newDeparture !== localTripDates.departure_date) {
        console.log('Updating trip dates from props:', { newArrival, newDeparture });
        setLocalTripDates({
          arrival_date: newArrival,
          departure_date: newDeparture,
        });
      }
    }
  }, [initialTripDates, localTripDates]);

  useEffect(() => {
    if (!localTripDates.arrival_date || !localTripDates.departure_date) {
      console.log('Trip dates missing on mount, fetching fresh data');
      fetchTripData();
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshEvents(), refreshDays(), refreshTransportation()]);
      const { data, error } = await supabase
        .from('trips')
        .select('arrival_date, departure_date')
        .eq('trip_id', tripId)
        .single();

      if (!error && data) {
        if (data.arrival_date && data.departure_date) {
          console.log('Setting trip dates from refresh:', data);
          setLocalTripDates({
            arrival_date: data.arrival_date,
            departure_date: data.departure_date,
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
  }, [refreshEvents, refreshDays, refreshTransportation, tripId]);

  const fetchTripData = async () => {
    if (!tripId) return;
    console.log('Fetching trip data for ID:', tripId);
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('trip_id', tripId)
        .single();
      if (error) throw error;
      console.log('Trip data fetched successfully:', data);
      if (data.arrival_date && data.departure_date) {
        console.log('Setting valid dates from DB:', {
          arrival: data.arrival_date,
          departure: data.departure_date,
        });
        setLocalTripDates({
          arrival_date: data.arrival_date,
          departure_date: data.departure_date,
        });
      } else {
        console.log('DB returned incomplete date data, not updating state');
      }
    } catch (error) {
      console.error('Error fetching trip details:', error);
    }
  };

  const processedHotelStays =
    events?.filter((event) => event.hotel && event.stay_id).map((event) => ({
      stay_id: event.stay_id,
      trip_id: tripId,
      hotel: event.hotel || '',
      hotel_details: event.hotel_details,
      hotel_url: event.hotel_url,
      hotel_checkin_date: event.hotel_checkin_date || '',
      hotel_checkout_date: event.hotel_checkout_date || '',
      checkin_time: event.checkin_time || '',
      checkout_time: event.checkout_time || '',
      cost: event.cost ? Number(event.cost) : null,
      currency: event.currency || 'USD',
      hotel_address: event.hotel_address,
      hotel_phone: event.hotel_phone,
      hotel_place_id: event.hotel_place_id,
      hotel_website: event.hotel_website,
    })) || [];

  const processedTransportations =
    transportationData?.filter((transport) => transport.type && transport.id).map((transport) => ({
      id: transport.id,
      trip_id: tripId,
      type: transport.type,
      provider: transport.provider,
      details: transport.details,
      confirmation_number: transport.confirmation_number,
      start_date: transport.start_date,
      start_time: transport.start_time,
      end_date: transport.end_date,
      end_time: transport.end_time,
      departure_location: transport.departure_location,
      arrival_location: transport.arrival_location,
      cost: transport.cost ? Number(transport.cost) : null,
      currency: transport.currency || 'USD',
    })) || [];



  return (
    <div className="relative space-y-8 max-w-5xl mx-auto px-4 md:px-6">
      {isRefreshing && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20" />
      )}

      <div className="flex flex-col gap-4">
        {console.log('Rendering TripDates with:', {
          tripId,
          arrivalDate: localTripDates.arrival_date,
          departureDate: localTripDates.departure_date,
        })}
        {localTripDates.arrival_date && localTripDates.departure_date ? (
          <TripDates
            tripId={tripId}
            arrivalDate={localTripDates.arrival_date}
            departureDate={localTripDates.departure_date}
            onDatesChange={handleRefresh}
          />
        ) : (
          <p>Loading dates...</p>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="w-full md:w-1/2">
          <AccommodationsSection
            tripId={tripId}
            onAccommodationChange={handleRefresh}
            hotelStays={processedHotelStays}
          />
        </div>
        <div className="w-full md:w-1/2">
          <TransportationSection
            tripId={tripId}
            onTransportationChange={handleRefresh}
            transportations={processedTransportations}
          />
        </div>
      </div>
      <TimelineContent
        days={days}
        dayIndexMap={new Map(days?.map((day, index) => [day.day_id, index + 1]) || [])}
        hotelStays={processedHotelStays}
        transportations={processedTransportations}
        onTimelineAction={trackTimelineAction} // added prop for timeline action tracking
      />
    </div>
  );
};

export default TimelineView;