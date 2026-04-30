import React, { useState, useCallback, useEffect } from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTripDays } from '@/hooks/use-trip-days';
import { supabase } from '@/integrations/supabase/client';
import TimelineContent from './timeline/TimelineContent';
import ExportPdfButton from './ExportPdfButton';
import ShareTripDialog from './ShareTripDialog';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';
import { useTransportationEvents } from '@/hooks/use-transportation-events';
import { useSessionKeepAlive } from '@/hooks/useSessionKeepAlive';
import { AIAssistantPanel } from './ai-assistant';
import { useWeather } from '@/hooks/useWeather';
import ViewingStatusAvatars from './timeline/ViewingStatusAvatars';

interface TimelineViewProps {
  tripId: string;
  tripDates: {
    arrival_date: string | null;
    departure_date: string | null;
  };
  tripDestination?: string;
  primaryDestination?: string | null;
  canEdit?: boolean;
}

const TimelineView: React.FC<TimelineViewProps> = ({ tripId, tripDates: initialTripDates, tripDestination, primaryDestination, canEdit = true }) => {
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
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  // Fetch weather for the trip destination (only for current/upcoming trips)
  // Prefer primary_destination if available, fallback to trip name
  const weatherLocation = primaryDestination || tripDestination;
  const { data: weather } = useWeather(weatherLocation);

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

      refreshDays();
    } catch (error) {
      console.error('Error deleting day:', error);
      toast.error('Failed to delete day');
    }
  };

  // Process hotel stays for display in day cards
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
      created_at: event.created_at || new Date().toISOString(),
    })) || [];





  return (
    <div className="relative lg:flex lg:gap-6">
      {isRefreshing && (
        <div className="absolute inset-0 bg-background/40 z-20" aria-hidden="true" />
      )}

      {/* Timeline column: full width below lg, 58% from lg+ */}
      <div className="w-full lg:w-[58%] px-4 md:px-6 pt-4 md:pt-6 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex items-center gap-4 min-w-0">
            <h2 className="font-display text-2xl tracking-tight text-foreground shrink-0">
              Trip Timeline
            </h2>
            <ViewingStatusAvatars tripId={tripId} />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShareDialogOpen(true)}
            >
              <Share2 className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <ExportPdfButton tripId={tripId} className="" />
          </div>
        </header>

        <ShareTripDialog
          tripId={tripId}
          tripDestination={tripDestination || 'Trip'}
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
        />
        <TimelineContent
          days={days}
          dayIndexMap={new Map(days?.map((day, index) => [day.day_id, index + 1]) || [])}
          hotelStays={processedHotelStays}
          onDayDelete={handleDayDelete}
          tripArrivalDate={localTripDates.arrival_date || undefined}
          tripDepartureDate={localTripDates.departure_date || undefined}
          canEdit={canEdit}
          weather={weather}
          tripDestination={tripDestination}
        />
      </div>

      {/* AI Assistant column: hidden below lg; sticky bottom-anchored from lg+ */}
      <div className="hidden lg:block lg:w-[42%] lg:pr-6 lg:pt-6">
        <div
          className="sticky"
          style={{
            top: 'calc(var(--app-nav-h, 56px) + 0.5rem)',
            height: 'calc(100dvh - var(--app-nav-h, 56px) - 1rem)',
          }}
        >
          <AIAssistantPanel tripId={tripId} />
        </div>
      </div>
    </div>
  );
};

export default TimelineView;