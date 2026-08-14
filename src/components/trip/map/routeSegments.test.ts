import { describe, it, expect } from 'vitest';
import {
  buildSegments,
  dedupeMarkers,
  placeStops,
  totalDistanceKm,
  unplacedStops,
} from './routeSegments';
import type { PlaceCoordinateMap, ResolvedPlace } from './usePlaceCoordinates';
import type { MapStop, PlaceLocator, StopKind } from './stopModel';
import { TIER_TIMED } from './stopModel';

const PARIS = { lat: 48.8566, lng: 2.3522 };
const LONDON = { lat: 51.5074, lng: -0.1278 };
const NEW_YORK = { lat: 40.7128, lng: -74.006 };

function stop(over: Partial<MapStop> & { id: string }): MapStop {
  return {
    entityType: 'activity',
    kind: 'activity' as StopKind,
    recordId: over.id,
    record: {},
    title: over.id,
    date: '2026-05-04',
    time: '10:00',
    sortTier: TIER_TIMED,
    sortMinutes: 600,
    timed: true,
    orderIndex: 0,
    sequence: 1,
    locator: { kind: 'place', placeId: `p-${over.id}` } as PlaceLocator,
    synthetic: false,
    ...over,
  } as MapStop;
}

const at = (lat: number, lng: number): ResolvedPlace => ({
  lat,
  lng,
  placeId: null,
  name: null,
  address: null,
  photoRef: null,
});

function coordsOf(entries: [string, { lat: number; lng: number } | null][]): PlaceCoordinateMap {
  return new Map(entries.map(([id, pos]) => [`place:p-${id}`, pos ? at(pos.lat, pos.lng) : null]));
}

describe('placeStops / unplacedStops', () => {
  const stops = [
    stop({ id: 'a' }),
    stop({ id: 'b', locator: null }),
    stop({ id: 'c' }),
  ];
  const coords = coordsOf([
    ['a', PARIS],
    ['c', null],
  ]);

  it('keeps only stops that resolved, in order', () => {
    expect(placeStops(stops, coords).map((p) => p.stop.id)).toEqual(['a']);
  });

  it('separates "no location given" from "could not resolve"', () => {
    expect(unplacedStops(stops, coords)).toEqual([
      { stop: stops[1], reason: 'no-location' },
      { stop: stops[2], reason: 'unresolved' },
    ]);
  });

  it('treats everything as unplaced before coordinates arrive', () => {
    expect(unplacedStops(stops, undefined)).toHaveLength(3);
    expect(placeStops(stops, undefined)).toEqual([]);
  });
});

describe('buildSegments', () => {
  it('connects consecutive resolved stops', () => {
    const stops = [stop({ id: 'a' }), stop({ id: 'b' })];
    const segments = buildSegments(stops, coordsOf([['a', PARIS], ['b', LONDON]]));

    expect(segments).toHaveLength(1);
    expect(segments[0].id).toBe('a->b');
    expect(segments[0].distanceKm).toBeGreaterThan(330);
    expect(segments[0].mode).toBe('ground');
  });

  it('bridges an unresolvable stop rather than breaking the chain', () => {
    const stops = [stop({ id: 'a' }), stop({ id: 'beach', locator: null }), stop({ id: 'c' })];
    const segments = buildSegments(stops, coordsOf([['a', PARIS], ['c', LONDON]]));

    expect(segments).toHaveLength(1);
    expect(segments[0].id).toBe('a->c');
  });

  it('drops a zero-length hop between markers on the same coordinate', () => {
    const stops = [
      stop({ id: 'anchor', kind: 'accommodation-anchor', synthetic: true }),
      stop({ id: 'checkin', kind: 'accommodation-checkin' }),
    ];
    const segments = buildSegments(stops, coordsOf([['anchor', PARIS], ['checkin', PARIS]]));

    expect(segments).toEqual([]);
  });

  it('marks a flight leg as air but not the hops around it', () => {
    const dep = stop({
      id: 'f1',
      recordId: 'flight-1',
      kind: 'transport-departure',
      entityType: 'transportation',
      record: { type: 'flight' },
    });
    const arr = stop({
      id: 'f2',
      recordId: 'flight-1',
      kind: 'transport-arrival',
      entityType: 'transportation',
      record: { type: 'flight' },
    });
    const hotel = stop({ id: 'h', kind: 'accommodation-checkin' });

    const segments = buildSegments(
      [dep, arr, hotel],
      coordsOf([['f1', PARIS], ['f2', NEW_YORK], ['h', { lat: 40.75, lng: -73.99 }]]),
    );

    expect(segments.map((s) => s.mode)).toEqual(['air', 'ground']);
  });

  it('marks a ferry leg as sea and a train leg as ground', () => {
    const pair = (type: string) => [
      stop({ id: 'd', recordId: 'r', kind: 'transport-departure', record: { type } }),
      stop({ id: 'a', recordId: 'r', kind: 'transport-arrival', record: { type } }),
    ];
    const coords = coordsOf([['d', PARIS], ['a', LONDON]]);

    expect(buildSegments(pair('ferry'), coords)[0].mode).toBe('sea');
    expect(buildSegments(pair('train'), coords)[0].mode).toBe('ground');
  });

  it('does not treat two different flights as one air leg', () => {
    const arr = stop({ id: 'a', recordId: 'flight-1', kind: 'transport-arrival', record: { type: 'flight' } });
    const dep = stop({ id: 'd', recordId: 'flight-2', kind: 'transport-departure', record: { type: 'flight' } });

    const segments = buildSegments([arr, dep], coordsOf([['a', PARIS], ['d', LONDON]]));
    expect(segments[0].mode).toBe('ground');
  });

  it('flags a segment as inferred when either endpoint has a guessed time', () => {
    const stops = [stop({ id: 'a' }), stop({ id: 'b', timed: false })];
    const segments = buildSegments(stops, coordsOf([['a', PARIS], ['b', LONDON]]));

    expect(segments[0].inferred).toBe(true);
  });

  it('attributes a segment to the departing stop’s date', () => {
    const stops = [
      stop({ id: 'a', date: '2026-05-04' }),
      stop({ id: 'b', date: '2026-05-05' }),
    ];
    const segments = buildSegments(stops, coordsOf([['a', PARIS], ['b', LONDON]]));

    expect(segments[0].date).toBe('2026-05-04');
  });

  it('produces nothing from a single stop or an empty list', () => {
    expect(buildSegments([stop({ id: 'a' })], coordsOf([['a', PARIS]]))).toEqual([]);
    expect(buildSegments([], new Map())).toEqual([]);
  });
});

describe('totalDistanceKm', () => {
  it('sums the legs', () => {
    const stops = [stop({ id: 'a' }), stop({ id: 'b' }), stop({ id: 'c' })];
    const segments = buildSegments(
      stops,
      coordsOf([['a', PARIS], ['b', LONDON], ['c', PARIS]]),
    );

    expect(segments).toHaveLength(2);
    expect(totalDistanceKm(segments)).toBeCloseTo(
      segments[0].distanceKm + segments[1].distanceKm,
      6,
    );
  });

  it('is zero with no segments', () => {
    expect(totalDistanceKm([])).toBe(0);
  });
});

describe('dedupeMarkers', () => {
  it('collapses repeat visits to one marker', () => {
    const stops = [stop({ id: 'a' }), stop({ id: 'b' }), stop({ id: 'c' })];
    const placed = placeStops(stops, coordsOf([['a', PARIS], ['b', LONDON], ['c', PARIS]]));
    const markers = dedupeMarkers(placed);

    expect(markers).toHaveLength(2);
    const parisMarker = markers.find((m) => m.primary.stop.id === 'a')!;
    expect(parisMarker.visits.map((v) => v.id)).toEqual(['a', 'c']);
  });

  it('keeps distinct coordinates apart', () => {
    const placed = placeStops(
      [stop({ id: 'a' }), stop({ id: 'b' })],
      coordsOf([['a', PARIS], ['b', LONDON]]),
    );
    expect(dedupeMarkers(placed)).toHaveLength(2);
  });
});
