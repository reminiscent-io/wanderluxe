import React, { useCallback, useMemo, useState } from 'react';
import { APIProvider, useMap } from '@vis.gl/react-google-maps';
import { useQueryClient } from '@tanstack/react-query';
import { Layers, Map as MapIcon } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import ActivityDialog from '@/components/trip/day/activities/ActivityDialog';
import RestaurantReservationDialog from '@/components/trip/dining/RestaurantReservationDialog';
import AccommodationDialog from '@/components/trip/accommodation/AccommodationDialog';
import TransportationDialog from '@/components/trip/transportation/TransportationDialog';
import { defaultUnits, formatDistance, type DistanceUnits } from './geo';
import DayScrubber from './DayScrubber';
import MapCanvas from './MapCanvas';
import PlaybackControls from './PlaybackControls';
import StopList from './StopList';
import { buildSegments, totalDistanceKm, unplacedStops } from './routeSegments';
import { useMapRealtime } from './useMapRealtime';
import { useTripMapData } from './useTripMapData';
import { usePlaceCoordinates, coordsFor } from './usePlaceCoordinates';
import { useCameraTween } from './useCameraTween';
import { usePlayback, usePrefersReducedMotion, CAMERA_MS } from './usePlayback';
import type { MapStop } from './stopModel';

/** Read at render, not module scope, so tests and env changes are honoured. */
const mapsApiKey = () =>
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) || undefined;
const mapStyleId = () =>
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_MAP_ID) || undefined;

type EditTarget = { type: MapStop['entityType']; record: Record<string, unknown>; date: string };

export interface TripMapViewProps {
  tripId: string;
  tripDates: { arrival_date: string | null; departure_date: string | null };
  destination?: string;
  canEdit?: boolean;
}

/** Drives the camera from inside the Map subtree, where `useMap` resolves. */
const PlaybackDriver: React.FC<{
  register: (fn: (target: { lat: number; lng: number }) => Promise<void>) => void;
  onUserInterrupt: () => void;
  reducedMotion: boolean;
}> = ({ register, onUserInterrupt, reducedMotion }) => {
  const map = useMap();
  const { tweenTo } = useCameraTween({ map, reducedMotion, onUserInterrupt });

  React.useEffect(() => {
    register(async (center) => {
      await tweenTo({ center, zoom: Math.max(map?.getZoom() ?? 14, 14) }, CAMERA_MS);
    });
  }, [register, tweenTo, map]);

  return null;
};

const TripMapView: React.FC<TripMapViewProps> = ({
  tripId,
  tripDates,
  destination,
  canEdit = false,
}) => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();

  useMapRealtime(tripId);

  const { stops, frames, dates, isLoading } = useTripMapData(tripId);
  const { data: coords, isLoading: coordsLoading } = usePlaceCoordinates(tripId, stops);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [hoveredStopId, setHoveredStopId] = useState<string | null>(null);
  const [satellite, setSatellite] = useState(false);
  const [units, setUnits] = useState<DistanceUnits>(() => defaultUnits());
  const [speed, setSpeed] = useState(1);
  const [editing, setEditing] = useState<EditTarget | null>(null);

  const frame = useMemo(
    () => frames.find((f) => f.date === selectedDate) ?? null,
    [frames, selectedDate],
  );

  // Whole-trip mode walks every stop; day mode walks one frame. Memoized so the
  // derived memos below don't recompute on every render.
  const visibleStops = useMemo(
    () => (selectedDate ? (frame?.stops ?? []) : stops),
    [selectedDate, frame, stops],
  );
  const ghosts = useMemo(
    () => (frame ? [frame.lead, frame.trail].filter(Boolean) as MapStop[] : []),
    [frame],
  );

  const segments = useMemo(() => buildSegments(visibleStops, coords), [visibleStops, coords]);
  const unplaced = useMemo(() => unplacedStops(visibleStops, coords), [visibleStops, coords]);

  const realStops = useMemo(() => visibleStops.filter((s) => !s.synthetic), [visibleStops]);
  const summary = useMemo(() => {
    if (visibleStops.length === 0) return null;
    const km = totalDistanceKm(segments);
    const count = `${realStops.length} ${realStops.length === 1 ? 'stop' : 'stops'}`;
    return km > 0 ? `${count} · ${formatDistance(km, units)} bird’s-eye` : count;
  }, [visibleStops, segments, realStops, units]);

  // Refit only when the day or mode changes — refitting on every coordinate
  // arrival would fight the reader's camera.
  const fitToken = `${selectedDate ?? 'all'}:${coordsLoading ? 'pending' : 'ready'}`;

  const cameraRef = React.useRef<((c: { lat: number; lng: number }) => Promise<void>) | null>(null);
  const registerCamera = useCallback(
    (fn: (c: { lat: number; lng: number }) => Promise<void>) => {
      cameraRef.current = fn;
    },
    [],
  );

  const playableStops = useMemo(
    () => visibleStops.filter((s) => coordsFor(s, coords)),
    [visibleStops, coords],
  );

  const playback = usePlayback({
    count: selectedDate ? playableStops.length : 0,
    speed,
    reducedMotion,
    onStep: async (index) => {
      const stop = playableStops[index];
      if (!stop) return;
      setSelectedStopId(stop.id);
      const pos = coordsFor(stop, coords);
      if (pos && cameraRef.current) await cameraRef.current({ lat: pos.lat, lng: pos.lng });
    },
    onComplete: () => setSelectedStopId(null),
  });

  const handleSelectDay = (date: string | null) => {
    playback.stop();
    setSelectedDate(date);
    setSelectedStopId(null);
  };

  const handleSelectStop = useCallback(
    (stop: MapStop | null) => {
      playback.pause();
      setSelectedStopId(stop?.id ?? null);
    },
    [playback],
  );

  const openEditor = useCallback((stop: MapStop) => {
    playback.pause();
    setEditing({ type: stop.entityType, record: stop.record, date: stop.date });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeAndRefresh = () => {
    setEditing(null);
    ['trip-days', 'accommodations', 'transportation', 'reservations', 'trip'].forEach((k) =>
      queryClient.invalidateQueries({ queryKey: [k, tripId] }),
    );
  };

  // ActivityDialog expects form-shaped initialData, unlike the other three.
  const activityInitial =
    editing?.type === 'activity'
      ? (() => {
          const r = editing.record as Tables<'day_activities'>;
          return {
            title: r.title ?? '',
            description: r.description ?? '',
            date: editing.date,
            start_time: r.start_time ? String(r.start_time).slice(0, 5) : '',
            end_time: r.end_time ? String(r.end_time).slice(0, 5) : '',
            cost: r.cost != null ? String(r.cost) : null,
            currency: (r.currency as string) ?? 'USD',
            location_address: r.location_address ?? null,
            location_place_id: r.location_place_id ?? null,
            location_phone: r.location_phone ?? null,
            location_website: r.location_website ?? null,
            location_rating: r.location_rating ?? null,
          };
        })()
      : null;

  const apiKey = mapsApiKey();
  if (!apiKey) {
    return (
      <div className="rounded-card border border-dashed border-border bg-card/60 p-10 text-center">
        <MapIcon className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 font-display text-xl text-foreground">Map unavailable</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Set VITE_GOOGLE_MAPS_API_KEY to enable the trip map.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="trip-map-view">
      <DayScrubber
        dates={dates}
        selectedDate={selectedDate}
        onSelect={handleSelectDay}
        summary={summary}
      />

      <div
        className={`relative overflow-hidden rounded-card border border-border ${
          isMobile ? 'h-[60vh]' : 'flex h-[calc(100vh-19rem)] min-h-[420px]'
        }`}
      >
        {!isMobile && (
          <aside className="w-72 shrink-0 border-r border-border bg-card/40">
            <StopList
              stops={visibleStops}
              unplaced={unplaced}
              selectedStopId={selectedStopId}
              hoveredStopId={hoveredStopId}
              playingIndex={playback.isPlaying ? playback.index : -1}
              canEdit={canEdit}
              onSelect={handleSelectStop}
              onHover={setHoveredStopId}
              onEdit={openEditor}
            />
          </aside>
        )}

        <div className="relative h-full flex-1">
          {/* The APIProvider and Map mount once and stay mounted: Dynamic Maps
              bills per instantiation, not per interaction. */}
          <APIProvider apiKey={apiKey}>
            <MapCanvas
              stops={visibleStops}
              ghosts={ghosts}
              coords={coords}
              dates={dates}
              focusedDate={selectedDate ?? (hoveredStopId ? null : null)}
              segments={segments}
              mapId={mapStyleId()}
              satellite={satellite}
              compact={!selectedDate}
              selectedStopId={selectedStopId}
              hoveredStopId={hoveredStopId}
              units={units}
              canEdit={canEdit}
              fitToken={fitToken}
              onSelect={handleSelectStop}
              onHover={setHoveredStopId}
              onEdit={openEditor}
            />
            <PlaybackDriver
              register={registerCamera}
              onUserInterrupt={playback.pause}
              reducedMotion={reducedMotion}
            />
          </APIProvider>

          <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
            <div className="pointer-events-auto">
              {selectedDate && (
                <PlaybackControls
                  isPlaying={playback.isPlaying}
                  index={playback.index}
                  count={playableStops.length}
                  speed={speed}
                  onToggle={playback.toggle}
                  onStep={playback.stepBy}
                  onSpeed={setSpeed}
                />
              )}
            </div>

            <div className="pointer-events-auto flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-9 bg-card/95 backdrop-blur"
                onClick={() => setUnits((u) => (u === 'km' ? 'mi' : 'km'))}
                aria-label={`Show distances in ${units === 'km' ? 'miles' : 'kilometres'}`}
              >
                {units}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 bg-card/95 backdrop-blur"
                onClick={() => setSatellite((v) => !v)}
                aria-pressed={satellite}
              >
                <Layers className="mr-1.5 h-3.5 w-3.5" />
                {satellite ? 'Map' : 'Satellite'}
              </Button>
            </div>
          </div>

          {(isLoading || coordsLoading) && (
            <div className="pointer-events-none absolute bottom-2 left-2 rounded-card border border-border bg-card/95 px-2.5 py-1.5 text-xs text-muted-foreground shadow-warm-sm">
              Locating places…
            </div>
          )}
        </div>
      </div>

      {isMobile && (
        <div className="max-h-72 overflow-hidden rounded-card border border-border bg-card/40">
          <StopList
            stops={visibleStops}
            unplaced={unplaced}
            selectedStopId={selectedStopId}
            hoveredStopId={hoveredStopId}
            playingIndex={playback.isPlaying ? playback.index : -1}
            canEdit={canEdit}
            onSelect={handleSelectStop}
            onHover={setHoveredStopId}
            onEdit={openEditor}
          />
        </div>
      )}

      {editing?.type === 'activity' && activityInitial && (
        <ActivityDialog
          open
          onOpenChange={(o) => {
            if (!o) closeAndRefresh();
          }}
          tripId={tripId}
          activityId={(editing.record as Tables<'day_activities'>).id}
          initialData={activityInitial as unknown as Partial<Tables<'day_activities'>>}
          tripDates={tripDates}
          destination={destination}
          onSuccess={closeAndRefresh}
        />
      )}
      {editing?.type === 'dining' && (
        <RestaurantReservationDialog
          open
          onOpenChange={(o) => {
            if (!o) closeAndRefresh();
          }}
          tripId={tripId}
          initialData={editing.record as Partial<Tables<'reservations'>>}
          tripArrivalDate={tripDates.arrival_date}
          tripDepartureDate={tripDates.departure_date}
          destination={destination}
          onSuccess={closeAndRefresh}
        />
      )}
      {editing?.type === 'accommodation' && (
        <AccommodationDialog
          open
          onOpenChange={(o) => {
            if (!o) closeAndRefresh();
          }}
          tripId={tripId}
          initialData={editing.record as unknown as Tables<'accommodations'>}
          destination={destination}
          onSuccess={closeAndRefresh}
        />
      )}
      {editing?.type === 'transportation' && (
        <TransportationDialog
          open
          onOpenChange={(o) => {
            if (!o) closeAndRefresh();
          }}
          tripId={tripId}
          initialData={editing.record as Partial<Tables<'transportation'>>}
          onSuccess={closeAndRefresh}
        />
      )}
    </div>
  );
};

export default TripMapView;
