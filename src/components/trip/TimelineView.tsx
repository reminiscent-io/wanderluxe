import React, { useState, useCallback, useEffect } from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTripDays } from '@/hooks/use-trip-days';
import { supabase } from '@/integrations/supabase/client';
import TimelineContent from './timeline/TimelineContent';
import ExportPdfButton from './ExportPdfButton';
import { toast } from 'sonner';
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';
import { useTransportationEvents } from '@/hooks/use-transportation-events';
import { useSessionKeepAlive } from '@/hooks/useSessionKeepAlive';

interface TimelineViewProps {
  tripId: string;
  tripDates: {
    arrival_date: string | null;
    departure_date: string | null;
  };
}

const TimelineView: React.FC<TimelineViewProps> = ({ tripId, tripDates: initialTripDates }) => {
  // Keep the session alive while working on the timeline
  useSessionKeepAlive(10 * 60 * 1000); // 10 minutes - increased to prevent frequent refreshes
  
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

  const handleDayDelete = async (dayId: string) => {
    try {
      const { error } = await supabase
        .from('trip_days')
        .delete()
        .eq('day_id', dayId);
      
      if (error) throw error;
      
      toast.success('Day deleted successfully');
      refreshDays();
    } catch (error) {
      console.error('Error deleting day:', error);
      toast.error('Failed to delete day');
    }
  };





  return (
    <div className="relative space-y-8 max-w-5xl mx-auto px-4 md:px-6">
      {isRefreshing && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20" />
      )}


      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Trip Timeline</h2>
        <ExportPdfButton 
          tripId={tripId} 
          className="bg-earth-500 hover:bg-earth-600 text-white"
        />
      </div>
      <TimelineContent
        days={days}
        dayIndexMap={new Map(days?.map((day, index) => [day.day_id, index + 1]) || [])}
        onDayDelete={handleDayDelete}
        tripArrivalDate={localTripDates.arrival_date || undefined}
        tripDepartureDate={localTripDates.departure_date || undefined}
      />
    </div>
  );
};

export default TimelineView;