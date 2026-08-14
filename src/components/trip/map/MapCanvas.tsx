import React, { useEffect, useMemo, useRef } from 'react';
import { InfoWindow, Map, useMap } from '@vis.gl/react-google-maps';
import { boundsOf, type DistanceUnits } from './geo';
import { MAP_COLORS, resolveMapId } from './mapTheme';
import RouteLayer from './RouteLayer';
import StopMarker from './StopMarker';
import StopPopup from './StopPopup';
import { dedupeMarkers, placeStops, type RouteSegment } from './routeSegments';
import { coordsFor, type PlaceCoordinateMap } from './usePlaceCoordinates';
import type { LatLng, MapStop } from './stopModel';
import './mapTheme.css';

export interface MapCanvasProps {
  stops: MapStop[];
  /** Faded neighbouring-day stops, so a day never appears to start from nowhere. */
  ghosts?: MapStop[];
  coords: PlaceCoordinateMap | undefined;
  dates: string[];
  focusedDate: string | null;
  segments: RouteSegment[];
  mapId?: string | null;
  satellite: boolean;
  compact: boolean;
  selectedStopId: string | null;
  hoveredStopId: string | null;
  units: DistanceUnits;
  canEdit: boolean;
  /** Bumping this refits the camera to the current stops. */
  fitToken: string;
  onSelect: (stop: MapStop | null) => void;
  onHover: (stopId: string | null) => void;
  onEdit: (stop: MapStop) => void;
}

/** Fits the camera to the visible stops whenever the day or mode changes. */
function useFitBounds(positions: LatLng[], token: string) {
  const map = useMap();

  useEffect(() => {
    if (!map || positions.length === 0) return;

    if (positions.length === 1) {
      map.setCenter(positions[0]);
      map.setZoom(14);
      return;
    }

    // A bounds literal rather than `new google.maps.LatLngBounds()`: it needs no
    // global, so a render before the Maps script settles cannot throw and take
    // the whole view down. boundsOf already picks the short way round the globe.
    const bounds = boundsOf(positions);
    if (bounds) map.fitBounds(bounds, 64);
    // `token` intentionally drives refitting; positions alone would refit on
    // every coordinate arrival and fight the user's camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, token]);
}

const MapInner: React.FC<MapCanvasProps> = (props) => {
  const {
    stops,
    ghosts = [],
    coords,
    dates,
    focusedDate,
    segments,
    satellite,
    compact,
    selectedStopId,
    hoveredStopId,
    units,
    canEdit,
    fitToken,
    onSelect,
    onHover,
    onEdit,
  } = props;

  const placed = useMemo(() => placeStops(stops, coords), [stops, coords]);
  const markers = useMemo(() => dedupeMarkers(placed), [placed]);
  const placedGhosts = useMemo(() => placeStops(ghosts, coords), [ghosts, coords]);

  useFitBounds(
    useMemo(() => placed.map((p) => p.pos), [placed]),
    fitToken,
  );

  const selected = useMemo(
    () => stops.find((s) => s.id === selectedStopId) ?? null,
    [stops, selectedStopId],
  );
  const selectedPos = selected ? coordsFor(selected, coords) : null;

  // Label only the leg leading into whatever the reader is looking at; one
  // label per segment is noise.
  const labelledSegmentIds = useMemo(() => {
    const focus = selectedStopId ?? hoveredStopId;
    if (!focus) return new Set<string>();
    return new Set(segments.filter((s) => s.to.id === focus || s.from.id === focus).map((s) => s.id));
  }, [segments, selectedStopId, hoveredStopId]);

  const incoming = useMemo(
    () => segments.find((s) => s.to.id === selectedStopId) ?? null,
    [segments, selectedStopId],
  );

  return (
    <>
      <RouteLayer
        segments={segments}
        dates={dates}
        focusedDate={focusedDate}
        labelledSegmentIds={labelledSegmentIds}
        units={units}
      />

      {placedGhosts.map(({ stop, pos }) => (
        <StopMarker key={`ghost-${stop.id}`} stop={stop} position={pos} visits={[stop]} ghost compact />
      ))}

      {markers.map(({ primary, visits }) => (
        <StopMarker
          key={primary.stop.id}
          stop={primary.stop}
          position={primary.pos}
          visits={visits}
          compact={compact}
          selected={visits.some((v) => v.id === selectedStopId)}
          hovered={visits.some((v) => v.id === hoveredStopId)}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}

      {selected && selectedPos && (
        <InfoWindow
          position={{ lat: selectedPos.lat, lng: selectedPos.lng }}
          onCloseClick={() => onSelect(null)}
          headerDisabled
          pixelOffset={[0, -18]}
        >
          <StopPopup
            stop={selected}
            photoRef={selectedPos.photoRef}
            sequenceLabel={
              selected.sequence != null
                ? `Stop ${selected.sequence} of ${stops.filter((s) => !s.synthetic).length}`
                : null
            }
            fromPrevious={
              incoming ? { km: incoming.distanceKm, title: incoming.from.title } : null
            }
            units={units}
            canEdit={canEdit}
            onEdit={onEdit}
          />
        </InfoWindow>
      )}
    </>
  );
};

/**
 * Owns the single `<Map>` instance.
 *
 * Dynamic Maps bills per map instantiation, not per pan, zoom or marker — so the
 * element is created once and only its props and children change. Nothing here
 * may branch the `<Map>` element itself on a value that flips after mount
 * (`useIsMobile` returns false on first render), or every viewer mints two
 * billable loads.
 */
const MapCanvas: React.FC<MapCanvasProps> = (props) => {
  const { mapId, satellite, onSelect } = props;
  const defaultCenterRef = useRef<LatLng>({ lat: 20, lng: 0 });

  return (
    <div className="wl-map h-full w-full">
      <Map
        mapId={resolveMapId(mapId)}
        mapTypeId={satellite ? 'hybrid' : 'roadmap'}
        defaultCenter={defaultCenterRef.current}
        defaultZoom={2}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        clickableIcons={false}
        reuseMaps
        style={{ width: '100%', height: '100%', background: MAP_COLORS.cream }}
        onClick={() => onSelect(null)}
      >
        <MapInner {...props} />
      </Map>
    </div>
  );
};

export default MapCanvas;
