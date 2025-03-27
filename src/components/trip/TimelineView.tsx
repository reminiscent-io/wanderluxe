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

const TimelineView: React.FC<TimelineViewProps> = ({
  tripId,
  tripDates: initialTripDates,
}) => {
  const { days, refreshDays } = useTripDays(tripId);
  const { events, refreshEvents } = useTimelineEvents(tripId);
  const { transportations, refreshTransportation } = useTransportationEvents(tripId);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [tripDates, setTripDates] = useState<{
    arrival_date: string | null;
    departure_date: string | null;
  }>({
    arrival_date: initialTripDates?.arrival_date || null,
    departure_date: initialTripDates?.departure_date || null,
  });

  useEffect(() => {
    loadGoogleMapsAPI();
  }, []);

  useEffect(() => {
    const newArrival = initialTripDates?.arrival_date;
    const newDeparture = initialTripDates?.departure_date;
    if (newArrival && newDeparture) {
      if (newArrival !== tripDates.arrival_date || newDeparture !== tripDates.departure_date) {
        console.log('Updating trip dates from props:', { newArrival, newDeparture });
        setTripDates({
          arrival_date: newArrival,
          departure_date: newDeparture,
        });
      }
    }
  }, [initialTripDates]);

  useEffect(() => {
    if (!tripDates.arrival_date || !tripDates.departure_date) {
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
          setTripDates({
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
        setTripDates({
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
      cost: event.cost ? Number(event.cost) : null,
      currency: event.currency || 'USD',
      hotel_address: event.hotel_address,
      hotel_phone: event.hotel_phone,
      hotel_place_id: event.hotel_place_id,
      hotel_website: event.hotel_website,
    })) || [];

  const handleDayDelete = async (dayId: string) => {
    try {
      const { error } = await supabase
        .from('trip_days')
        .delete()
        .eq('day_id', dayId);

      if (error) throw error;

      toast.success('Day deleted successfully');
      if (refreshDays) refreshDays();
    } catch (error) {
      console.error('Error deleting day:', error);
      toast.error('Failed to delete day');
    }
  };

  return (
    <div className="relative space-y-8">
      {isRefreshing && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20" />
      )}

      <div className="flex flex-col gap-4">
        {console.log('Rendering TripDates with:', {
          tripId,
          arrivalDate: tripDates.arrival_date,
          departureDate: tripDates.departure_date,
        })}
        {tripDates.arrival_date && tripDates.departure_date ? (
          <TripDates
            tripId={tripId}
            arrivalDate={tripDates.arrival_date}
            departureDate={tripDates.departure_date}
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
            transportations={transportations}
          />
        </div>
      </div>
      <TimelineContent
        days={days}
        dayIndexMap={new Map(days?.map((day, index) => [day.day_id, index + 1]) || [])}
        hotelStays={processedHotelStays}
        transportations={transportations || []}
        onDayDelete={handleDayDelete}
      />
    </div>
  );
};

export default TimelineView;
