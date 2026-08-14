import type { LatLng, PlaceLocator } from './stopModel';

/*
 * These read only the location fields, not whole entities, so callers can pass
 * Supabase row shapes straight through without casting nested query results.
 */
export interface ActivityLocatable {
  location_place_id?: string | null;
  location_address?: string | null;
}
export interface DiningLocatable {
  place_id?: string | null;
  address?: string | null;
}
export interface StayLocatable {
  hotel_place_id?: string | null;
  hotel_address?: string | null;
}
export interface TransportLocatable {
  type?: string | null;
  departure_location?: string | null;
  arrival_location?: string | null;
}

/**
 * Normalized form used to build the shared cache key for text lookups, so
 * "Gare de Lyon", "gare de lyon" and "Gare  de  Lyon " are one cache entry.
 * Must stay byte-identical to the server's normalization.
 */
export function normalizeQuery(raw: string): string {
  return raw.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

const IATA_SUFFIX = /\(([A-Z]{3})\)\s*$/;
const BARE_IATA = /^[A-Z]{3}$/;

/**
 * Flight lookups store `"Charles de Gaulle Airport (CDG)"`. The IATA code is far
 * more reliable to geocode than the airport's marketing name, which varies by
 * language and often collides with a nearby town.
 */
export function extractIata(location: string): string | null {
  const trimmed = location.trim();
  const suffixed = trimmed.match(IATA_SUFFIX);
  if (suffixed) return suffixed[1];
  if (BARE_IATA.test(trimmed)) return trimmed;
  return null;
}

/**
 * Turn a free-text transportation endpoint into a geocodable query.
 * Airports resolve by IATA; everything else goes through as typed.
 */
export function transportQuery(location: string): string {
  const iata = extractIata(location);
  return iata ? `${iata} airport` : location.trim();
}

function placeOr(
  placeId: string | null | undefined,
  address: string | null | undefined,
  bias?: LatLng | null,
): PlaceLocator | null {
  if (placeId?.trim()) return { kind: 'place', placeId: placeId.trim() };
  if (address?.trim()) {
    return bias
      ? { kind: 'text', query: address.trim(), bias }
      : { kind: 'text', query: address.trim() };
  }
  return null;
}

/**
 * Deliberately conservative: a name with no address and no place_id yields
 * null rather than a name-only text search, which happily returns the wrong
 * "Joe's Pizza" in the wrong country. Such items surface in the map's
 * "Not on the map" group with an affordance to add a location.
 */
export function activityLocator(a: ActivityLocatable, bias?: LatLng | null): PlaceLocator | null {
  return placeOr(a.location_place_id, a.location_address, bias);
}

export function diningLocator(r: DiningLocatable, bias?: LatLng | null): PlaceLocator | null {
  return placeOr(r.place_id, r.address, bias);
}

export function stayLocator(s: StayLocatable, bias?: LatLng | null): PlaceLocator | null {
  return placeOr(s.hotel_place_id, s.hotel_address, bias);
}

/**
 * Transportation has no place_id column, so both endpoints are text lookups.
 *
 * Flights are never biased: nudging "CDG" toward a Tokyo trip's centre actively
 * hurts. Ground transport is biased to the destination, where "Gare de Lyon"
 * genuinely is ambiguous without it.
 */
export function transportLocator(
  t: TransportLocatable,
  end: 'departure' | 'arrival',
  bias?: LatLng | null,
): PlaceLocator | null {
  const raw = end === 'departure' ? t.departure_location : t.arrival_location;
  if (!raw?.trim()) return null;

  const query = transportQuery(raw);
  const isAir = t.type === 'flight' || extractIata(raw) !== null;

  return isAir || !bias ? { kind: 'text', query } : { kind: 'text', query, bias };
}

/** Stable identity for a locator — used to dedupe lookups within a batch. */
export function locatorKey(locator: PlaceLocator): string {
  return locator.kind === 'place'
    ? `place:${locator.placeId}`
    : `text:${normalizeQuery(locator.query)}`;
}
