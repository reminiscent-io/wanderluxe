import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { locatorKey } from './placeLocator';
import type { LatLng, MapStop, PlaceLocator } from './stopModel';

/** The proxy caps a batch at 100 items. */
const CHUNK_SIZE = 100;

export interface ResolvedPlace extends LatLng {
  placeId: string | null;
  name: string | null;
  address: string | null;
  photoRef: string | null;
}

/** Key → coordinates, or null when the place could not be resolved. */
export type PlaceCoordinateMap = Map<string, ResolvedPlace | null>;

interface ProxyResult {
  lat: number;
  lng: number;
  placeId: string | null;
  name: string | null;
  address: string | null;
  photoRef: string | null;
}

function functionsBaseUrl(): string | null {
  const viteUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : undefined;
  const clientUrl = (supabase as unknown as { supabaseUrl?: string })?.supabaseUrl;
  return viteUrl || clientUrl || null;
}

async function resolveChunk(
  locators: PlaceLocator[],
  token: string | undefined,
): Promise<(ProxyResult | null)[]> {
  const base = functionsBaseUrl();
  if (!base) return locators.map((): ProxyResult | null => null);

  const items = locators.map((l) =>
    l.kind === 'place' ? { placeId: l.placeId } : { text: l.query, bias: l.bias },
  );

  const res = await fetch(`${base}/functions/v1/place-coordinates-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) {
    // Soft-fail: an unresolvable batch leaves stops in the "not on the map"
    // group rather than blanking the view.
    console.warn(`place-coordinates-proxy returned ${res.status}`);
    return locators.map((): ProxyResult | null => null);
  }

  const json = (await res.json()) as { results?: (ProxyResult | null)[] };
  return Array.isArray(json.results) ? json.results : locators.map((): ProxyResult | null => null);
}

/**
 * The distinct places a set of stops points at, sorted so the query key is
 * stable regardless of stop ordering.
 *
 * Deduping client-side as well as in the proxy keeps the request small: a hotel
 * anchored across five nights is one entry, not five.
 */
export function distinctLocators(stops: MapStop[]): [string, PlaceLocator][] {
  return Array.from(
    new Map(
      stops
        .filter((s) => s.locator)
        .map((s) => [locatorKey(s.locator!), s.locator!] as const),
    ),
  ).sort(([a], [b]) => a.localeCompare(b));
}

/**
 * Resolve every distinct place in as few round trips as possible.
 * Plain async — deliberately free of React, so it is testable on its own.
 */
export async function resolvePlaceCoordinates(stops: MapStop[]): Promise<PlaceCoordinateMap> {
  const entries = distinctLocators(stops);
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const out: PlaceCoordinateMap = new Map();

  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const slice = entries.slice(i, i + CHUNK_SIZE);
    const results = await resolveChunk(
      slice.map(([, locator]) => locator),
      token,
    );
    slice.forEach(([key], idx) => out.set(key, results[idx] ?? null));
  }

  return out;
}

export function usePlaceCoordinates(tripId: string, stops: MapStop[]) {
  const entries = distinctLocators(stops);
  const signature = entries.map(([k]) => k).join('|');

  return useQuery<PlaceCoordinateMap>({
    queryKey: ['place-coordinates', tripId, signature],
    // Coordinates of a place do not move, and the server caches globally.
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    enabled: entries.length > 0,
    queryFn: () => resolvePlaceCoordinates(stops),
  });
}

/** Coordinates for one stop, or null when it has no locator or did not resolve. */
export function coordsFor(
  stop: MapStop,
  coords: PlaceCoordinateMap | undefined,
): ResolvedPlace | null {
  if (!stop.locator || !coords) return null;
  return coords.get(locatorKey(stop.locator)) ?? null;
}
