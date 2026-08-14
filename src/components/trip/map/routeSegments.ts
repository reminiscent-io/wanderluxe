import { coordKey, haversineKm } from './geo';
import type { PlaceCoordinateMap } from './usePlaceCoordinates';
import { coordsFor } from './usePlaceCoordinates';
import type { LatLng, MapStop } from './stopModel';

export type SegmentMode = 'ground' | 'air' | 'sea';

export interface RouteSegment {
  id: string;
  from: MapStop;
  to: MapStop;
  fromPos: LatLng;
  toPos: LatLng;
  mode: SegmentMode;
  /** True when either endpoint's time was inferred rather than stored. */
  inferred: boolean;
  distanceKm: number;
  /** The date this segment is attributed to, for the day colour ramp. */
  date: string;
}

/** A stop paired with its resolved position. */
export interface PlacedStop {
  stop: MapStop;
  pos: LatLng;
}

/** The stops that resolved to coordinates, in order. */
export function placeStops(stops: MapStop[], coords: PlaceCoordinateMap | undefined): PlacedStop[] {
  const out: PlacedStop[] = [];
  stops.forEach((stop) => {
    const hit = coordsFor(stop, coords);
    if (hit) out.push({ stop, pos: { lat: hit.lat, lng: hit.lng } });
  });
  return out;
}

/** Stops that will never appear on the map, for the "Not on the map" group. */
export function unplacedStops(
  stops: MapStop[],
  coords: PlaceCoordinateMap | undefined,
): { stop: MapStop; reason: 'no-location' | 'unresolved' }[] {
  return stops
    .filter((stop) => !coordsFor(stop, coords))
    .map((stop) => ({
      stop,
      reason: stop.locator ? ('unresolved' as const) : ('no-location' as const),
    }));
}

function modeFor(from: MapStop, to: MapStop): SegmentMode {
  // Only the two halves of one transportation row describe an actual vehicle
  // leg; everything else between stops is the traveler moving on the ground.
  const samePair =
    from.recordId === to.recordId &&
    from.kind === 'transport-departure' &&
    to.kind === 'transport-arrival';
  if (!samePair) return 'ground';

  const type = (from.record as { type?: string })?.type;
  if (type === 'flight') return 'air';
  if (type === 'ferry') return 'sea';
  return 'ground';
}

/**
 * Connect consecutive resolved stops.
 *
 * Stops that could not be placed are bridged rather than breaking the chain, so
 * an activity with no address never severs the day's path. Zero-length hops are
 * dropped — a hotel anchor sitting on its own check-in marker would otherwise
 * draw a segment to itself.
 *
 * The caller decides the scope: pass one day's stops (plus ghosts) for day mode,
 * or the whole trip for the overview.
 */
export function buildSegments(
  stops: MapStop[],
  coords: PlaceCoordinateMap | undefined,
): RouteSegment[] {
  const placed = placeStops(stops, coords);
  const segments: RouteSegment[] = [];

  for (let i = 1; i < placed.length; i += 1) {
    const a = placed[i - 1];
    const b = placed[i];

    if (coordKey(a.pos) === coordKey(b.pos)) continue;

    segments.push({
      id: `${a.stop.id}->${b.stop.id}`,
      from: a.stop,
      to: b.stop,
      fromPos: a.pos,
      toPos: b.pos,
      mode: modeFor(a.stop, b.stop),
      inferred: !a.stop.timed || !b.stop.timed,
      distanceKm: haversineKm(a.pos, b.pos),
      date: a.stop.date,
    });
  }

  return segments;
}

/** Total bird's-eye distance covered by a set of segments. */
export function totalDistanceKm(segments: RouteSegment[]): number {
  return segments.reduce((sum, s) => sum + s.distanceKm, 0);
}

/**
 * Collapse stops sharing a coordinate into one marker, keeping the first stop as
 * the marker's identity and counting the rest as repeat visits.
 */
export function dedupeMarkers(placed: PlacedStop[]): { primary: PlacedStop; visits: MapStop[] }[] {
  const byCoord = new Map<string, { primary: PlacedStop; visits: MapStop[] }>();

  placed.forEach((p) => {
    const key = coordKey(p.pos);
    const existing = byCoord.get(key);
    if (existing) existing.visits.push(p.stop);
    else byCoord.set(key, { primary: p, visits: [p.stop] });
  });

  return Array.from(byCoord.values());
}
