import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTripDays } from '@/hooks/use-trip-days';
import { supabase } from '@/integrations/supabase/client';
import TimelineContent from './timeline/TimelineContent';
import ExportPdfButton from './ExportPdfButton';
import { Button } from '@/components/ui/button';
// Aliased: a bare `Map` import shadows the global Map constructor used below.
import { CalendarDays, ListTree, CalendarPlus, FileDown, Map as MapIcon, Palette } from 'lucide-react';
import PrintStudioDialog from './print-studio/PrintStudioDialog';
import { useSearchParams } from 'react-router-dom';
import CalendarSyncSheet from './calendar/CalendarSyncSheet';
import { toast } from 'sonner';
import { useTransportationEvents } from '@/hooks/use-transportation-events';
import { useSessionKeepAlive } from '@/hooks/useSessionKeepAlive';
import { AIAssistantPanel } from './ai-assistant';
import AssistantDock from './ai-assistant/AssistantDock';
import { useWeather } from '@/hooks/useWeather';
import ViewingStatusAvatars from './timeline/ViewingStatusAvatars';
import DiscoverHint from '@/components/discovery/DiscoverHint';
import { useFirstRun } from '@/hooks/useFirstRun';
import { useTravelers } from '@/hooks/useTravelers';

const TripCalendarView = lazy(() => import('./calendar/TripCalendarView'));
const TripMapView = lazy(() => import('./map/TripMapView'));

type ItineraryView = 'timeline' | 'calendar' | 'map';

const VIEW_PARAM = 'view';

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
  const [isSyncSheetOpen, setIsSyncSheetOpen] = useState(false);
  const [isPdfExportOpen, setIsPdfExportOpen] = useState(false);
  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(false);
  // View lives in the URL so all three are deep-linkable and survive a refresh.
  // 'timeline' is the absent state, keeping existing bookmarks untouched.
  const [searchParams, setSearchParams] = useSearchParams();
  const rawView = searchParams.get(VIEW_PARAM);
  const itineraryView: ItineraryView =
    rawView === 'calendar' || rawView === 'map' ? rawView : 'timeline';

  const setItineraryView = useCallback(
    (next: ItineraryView) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === 'timeline') params.delete(VIEW_PARAM);
          else params.set(VIEW_PARAM, next);
          return params;
        },
        // Replace, so toggling views doesn't stack history between the reader
        // and the Back button.
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Deep links from the guide ("Show me") land with the feature already open.
  // The param is consumed and stripped so a refresh or a back-nav doesn't
  // reopen a dialog the user has already closed.
  useEffect(() => {
    const sync = searchParams.get('sync');
    const exportParam = searchParams.get('export');
    if (!sync && !exportParam) return;

    if (sync === '1') setIsSyncSheetOpen(true);
    if (exportParam === 'pdf') setIsPdfExportOpen(true);

    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.delete('sync');
        params.delete('export');
        return params;
      },
      { replace: true }
    );
  }, [searchParams, setSearchParams]);

  // Once opened, the map stays mounted and is hidden with CSS instead: Dynamic
  // Maps bills per map instantiation, and this also preserves camera state.
  const [mapMounted, setMapMounted] = useState(false);
  useEffect(() => {
    if (itineraryView === 'map') setMapMounted(true);
  }, [itineraryView]);
  // Desktop assistant visibility. Defaults open on every load (deliberately unpersisted).
  const [assistantOpen, setAssistantOpen] = useState(true);

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
    // Run once on mount to backfill dates if absent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ---- Discovery hints -------------------------------------------------
  // Three capabilities that exist but never announce themselves. Each fires
  // once, at the first moment it becomes relevant. Only ever one at a time —
  // stacked hints read as clutter and get dismissed as a batch.
  const { travelers } = useTravelers(tripId);

  const itemCount =
    (days?.reduce((sum, day) => sum + (day.activities?.length ?? 0), 0) ?? 0) +
    processedHotelStays.length +
    (transportationData?.length ?? 0);

  const hasTransportation = (transportationData?.length ?? 0) > 0;
  const isSharedTrip = (travelers?.length ?? 0) > 1;

  // Pick the first hint that is both relevant and still unseen, so dismissing
  // one lets the next take its place rather than silencing the whole chain.
  const onTimeline = itineraryView === 'timeline';
  const mapHint = useFirstRun('map-view', onTimeline && itemCount >= 3);
  const calendarHint = useFirstRun('calendar-sync', onTimeline && canEdit && hasTransportation);
  const collabHint = useFirstRun('live-collab', onTimeline && isSharedTrip);

  const activeHint = mapHint.isUnseen
    ? 'map-view'
    : calendarHint.isUnseen
      ? 'calendar-sync'
      : collabHint.isUnseen
        ? 'live-collab'
        : null;

  return (
    <div className="relative lg:flex lg:gap-6">
      {isRefreshing && (
        <div className="absolute inset-0 bg-background/40 z-20" aria-hidden="true" />
      )}

      {/* Itinerary column: full width below lg; from lg+ 58% beside the docked
          assistant, full width when it's collapsed or floating over the calendar */}
      <div
        data-testid="itinerary-column"
        className={`w-full px-0 sm:px-4 md:px-6 pt-4 md:pt-6 space-y-6 ${
          itineraryView === 'timeline' && assistantOpen ? 'lg:w-[58%]' : 'lg:w-full'
        }`}
      >
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex items-center gap-4 min-w-0">
            <h2 className="font-display text-2xl tracking-tight text-foreground shrink-0">
              Trip Timeline
            </h2>
            <ViewingStatusAvatars tripId={tripId} />
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <fieldset className="grid flex-1 min-w-0 grid-cols-3 rounded-md border border-border bg-card p-0.5 sm:inline-flex sm:flex-none">
              <legend className="sr-only">Itinerary view</legend>
              <button
                type="button"
                aria-pressed={itineraryView === 'timeline'}
                onClick={() => setItineraryView('timeline')}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 px-3 text-sm rounded-[0.4rem] transition-colors sm:min-h-0 sm:py-1 ${itineraryView === 'timeline' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <ListTree className="h-3.5 w-3.5" />Timeline
              </button>
              <button
                type="button"
                aria-pressed={itineraryView === 'calendar'}
                onClick={() => setItineraryView('calendar')}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 px-3 text-sm rounded-[0.4rem] transition-colors sm:min-h-0 sm:py-1 ${itineraryView === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <CalendarDays className="h-3.5 w-3.5" />Calendar
              </button>
              <button
                type="button"
                aria-pressed={itineraryView === 'map'}
                onClick={() => setItineraryView('map')}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 px-3 text-sm rounded-[0.4rem] transition-colors sm:min-h-0 sm:py-1 ${itineraryView === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <MapIcon className="h-3.5 w-3.5" />Map
              </button>
            </fieldset>
            {/* Desktop: rare actions stay as labeled buttons. */}
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => setIsSyncSheetOpen(true)}
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Add to calendar
              </Button>
            )}
            <ExportPdfButton
              tripId={tripId}
              className="hidden sm:inline-flex"
              open={isPdfExportOpen}
              onOpenChange={setIsPdfExportOpen}
            />
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setIsPrintStudioOpen(true)}
            >
              <Palette className="mr-2 h-4 w-4" />
              Print Studio
            </Button>
          </div>

          {/* Mobile: the same actions as labelled buttons rather than an
              unlabelled overflow icon — nobody taps a menu they can't read. */}
          <div className="grid w-full grid-cols-2 gap-2 sm:hidden">
            {canEdit && (
              <Button
                variant="outline"
                className="h-11"
                onClick={() => setIsSyncSheetOpen(true)}
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Add to calendar
              </Button>
            )}
            <Button
              variant="outline"
              className={`h-11 ${canEdit ? '' : 'col-span-2'}`}
              onClick={() => setIsPdfExportOpen(true)}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              className="col-span-2 h-11"
              onClick={() => setIsPrintStudioOpen(true)}
            >
              <Palette className="mr-2 h-4 w-4" />
              Print Studio
            </Button>
          </div>
        </header>

        {activeHint === 'map-view' && (
          <DiscoverHint
            hint="map-view"
            actionLabel="Show me"
            onAction={() => setItineraryView('map')}
          >
            Your days are filling up — see them laid out on a map, in the order you'll walk them.
          </DiscoverHint>
        )}
        {activeHint === 'calendar-sync' && (
          <DiscoverHint
            hint="calendar-sync"
            actionLabel="Set it up"
            onAction={() => setIsSyncSheetOpen(true)}
          >
            You can subscribe to this itinerary in your phone's calendar — it updates itself as the trip changes.
          </DiscoverHint>
        )}
        {activeHint === 'live-collab' && (
          <DiscoverHint hint="live-collab">
            Everyone on this trip sees your changes as you make them. The faces above show who's looking right now.
          </DiscoverHint>
        )}

        {canEdit && (
          <CalendarSyncSheet tripId={tripId} open={isSyncSheetOpen} onOpenChange={setIsSyncSheetOpen} />
        )}
        <PrintStudioDialog tripId={tripId} open={isPrintStudioOpen} onOpenChange={setIsPrintStudioOpen} />

        {mapMounted && (
          <div className={itineraryView === 'map' ? undefined : 'hidden'} data-testid="map-view-host">
            <Suspense fallback={<div className="py-16 text-center text-sm text-muted-foreground">Loading map…</div>}>
              <TripMapView
                tripId={tripId}
                tripDates={{ arrival_date: localTripDates.arrival_date, departure_date: localTripDates.departure_date }}
                destination={tripDestination}
                canEdit={canEdit}
              />
            </Suspense>
          </div>
        )}
        {itineraryView === 'calendar' ? (
          <Suspense fallback={<div className="py-16 text-center text-sm text-muted-foreground">Loading calendar…</div>}>
            <TripCalendarView
              tripId={tripId}
              tripDates={{ arrival_date: localTripDates.arrival_date, departure_date: localTripDates.departure_date }}
              destination={tripDestination}
              canEdit={canEdit}
            />
          </Suspense>
        ) : itineraryView === 'map' ? null : (
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
        )}
      </div>

      <AssistantDock
        open={assistantOpen}
        mode={itineraryView === 'timeline' ? 'docked' : 'overlay'}
        onOpen={() => setAssistantOpen(true)}
      >
        <AIAssistantPanel tripId={tripId} onCollapse={() => setAssistantOpen(false)} />
      </AssistantDock>
    </div>
  );
};

export default TimelineView;