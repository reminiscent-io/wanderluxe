import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  coordsFor,
  distinctLocators,
  resolvePlaceCoordinates,
  type ResolvedPlace,
} from './usePlaceCoordinates';
import type { MapStop, PlaceLocator } from './stopModel';
import { TIER_TIMED } from './stopModel';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    supabaseUrl: 'https://example.supabase.co',
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
  },
}));

function stop(id: string, locator: PlaceLocator | null): MapStop {
  return {
    id,
    entityType: 'activity',
    kind: 'activity',
    recordId: id,
    record: {},
    title: id,
    date: '2026-05-04',
    time: '10:00',
    sortTier: TIER_TIMED,
    sortMinutes: 600,
    timed: true,
    orderIndex: 0,
    sequence: 1,
    locator,
    synthetic: false,
  };
}

const hit = (lat: number, lng: number): ResolvedPlace => ({
  lat,
  lng,
  placeId: null,
  name: null,
  address: null,
  photoRef: null,
});

const bodyOf = (call: unknown[]) => JSON.parse((call[1] as { body: string }).body);

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('distinctLocators', () => {
  it('collapses a hotel repeated across many days into one entry', () => {
    const hotel: PlaceLocator = { kind: 'place', placeId: 'ChIJ_hotel' };
    const entries = distinctLocators([
      stop('n1', hotel),
      stop('n2', hotel),
      stop('n3', { kind: 'place', placeId: 'ChIJ_hotel' }),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0][0]).toBe('place:ChIJ_hotel');
  });

  it('collapses text variants onto one entry', () => {
    const entries = distinctLocators([
      stop('a', { kind: 'text', query: 'JFK airport' }),
      stop('b', { kind: 'text', query: '  jfk  AIRPORT ' }),
    ]);

    expect(entries).toHaveLength(1);
  });

  it('skips stops with no locator', () => {
    expect(distinctLocators([stop('a', null), stop('b', null)])).toEqual([]);
  });

  it('sorts so the query key is stable regardless of stop order', () => {
    const a = stop('a', { kind: 'place', placeId: 'ChIJ_A' });
    const b = stop('b', { kind: 'place', placeId: 'ChIJ_B' });

    expect(distinctLocators([a, b]).map(([k]) => k)).toEqual(
      distinctLocators([b, a]).map(([k]) => k),
    );
  });
});

describe('resolvePlaceCoordinates', () => {
  it('sends one item per distinct place and maps results back by key', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [hit(1, 2), hit(3, 4)] }),
    });

    const result = await resolvePlaceCoordinates([
      stop('a', { kind: 'place', placeId: 'ChIJ_A' }),
      stop('b', { kind: 'text', query: 'Gare de Lyon' }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Sorted: 'place:ChIJ_A' before 'text:gare de lyon'.
    expect(bodyOf(fetchMock.mock.calls[0]).items).toEqual([
      { placeId: 'ChIJ_A' },
      { text: 'Gare de Lyon' },
    ]);
    expect(result.get('place:ChIJ_A')).toEqual(hit(1, 2));
    expect(result.get('text:gare de lyon')).toEqual(hit(3, 4));
  });

  it('forwards the destination bias for text lookups that carry one', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [hit(1, 2)] }) });
    const bias = { lat: 48.85, lng: 2.35 };

    await resolvePlaceCoordinates([stop('a', { kind: 'text', query: 'Soho', bias })]);

    expect(bodyOf(fetchMock.mock.calls[0]).items).toEqual([{ text: 'Soho', bias }]);
  });

  it('sends the bearer token when a session exists', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results: [hit(1, 2)] }) });

    await resolvePlaceCoordinates([stop('a', { kind: 'place', placeId: 'ChIJ_A' })]);

    const init = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('chunks past the 100-item server cap', async () => {
    fetchMock.mockImplementation(async (_url: string, init: { body: string }) => {
      const count = JSON.parse(init.body).items.length;
      return {
        ok: true,
        json: async () => ({ results: Array.from({ length: count }, () => hit(0, 0)) }),
      };
    });

    const stops = Array.from({ length: 150 }, (_, i) =>
      stop(`s${i}`, { kind: 'place', placeId: `ChIJ_${String(i).padStart(3, '0')}` }),
    );
    const result = await resolvePlaceCoordinates(stops);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bodyOf(fetchMock.mock.calls[0]).items).toHaveLength(100);
    expect(bodyOf(fetchMock.mock.calls[1]).items).toHaveLength(50);
    expect(result.size).toBe(150);
  });

  it('soft-fails to nulls on a non-200 rather than blanking the map', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });

    const result = await resolvePlaceCoordinates([stop('a', { kind: 'place', placeId: 'ChIJ_A' })]);

    expect(result.get('place:ChIJ_A')).toBeNull();
  });

  it('tolerates a malformed response body', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ nonsense: true }) });

    const result = await resolvePlaceCoordinates([stop('a', { kind: 'place', placeId: 'ChIJ_A' })]);

    expect(result.get('place:ChIJ_A')).toBeNull();
  });

  it('preserves a null in the middle of a batch', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [hit(1, 2), null, hit(5, 6)] }),
    });

    const result = await resolvePlaceCoordinates([
      stop('a', { kind: 'place', placeId: 'ChIJ_A' }),
      stop('b', { kind: 'place', placeId: 'ChIJ_B' }),
      stop('c', { kind: 'place', placeId: 'ChIJ_C' }),
    ]);

    expect(result.get('place:ChIJ_A')).toEqual(hit(1, 2));
    expect(result.get('place:ChIJ_B')).toBeNull();
    expect(result.get('place:ChIJ_C')).toEqual(hit(5, 6));
  });

  it('makes no request when nothing has a locator', async () => {
    const result = await resolvePlaceCoordinates([stop('a', null)]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.size).toBe(0);
  });
});

describe('coordsFor', () => {
  const coords = new Map([['place:ChIJ_A', hit(1, 2)]]);

  it('finds a stop by its locator key', () => {
    expect(coordsFor(stop('a', { kind: 'place', placeId: 'ChIJ_A' }), coords)).toEqual(hit(1, 2));
  });

  it('returns null for a stop with no locator, no resolution, or no data yet', () => {
    expect(coordsFor(stop('a', null), coords)).toBeNull();
    expect(coordsFor(stop('b', { kind: 'place', placeId: 'ChIJ_missing' }), coords)).toBeNull();
    expect(coordsFor(stop('a', { kind: 'place', placeId: 'ChIJ_A' }), undefined)).toBeNull();
  });
});
