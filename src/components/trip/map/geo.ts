import type { LatLng } from './stopModel';

const EARTH_RADIUS_KM = 6371.0088;
const KM_PER_MI = 1.609344;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export type DistanceUnits = 'km' | 'mi';

/**
 * Great-circle distance in kilometres. This is deliberately bird's-eye — the
 * map never calls the Directions API, so no figure here is a travel distance.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The point halfway along the great circle — not the arithmetic mean, which
 * drifts off a long geodesic arc and would float the distance label away from
 * the line it labels.
 */
export function midpoint(a: LatLng, b: LatLng): LatLng {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const lng1 = toRad(a.lng);
  const dLng = toRad(b.lng - a.lng);

  const bx = Math.cos(lat2) * Math.cos(dLng);
  const by = Math.cos(lat2) * Math.sin(dLng);

  const lat = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + bx) ** 2 + by ** 2),
  );
  const lng = lng1 + Math.atan2(by, Math.cos(lat1) + bx);

  return { lat: toDeg(lat), lng: normalizeLng(toDeg(lng)) };
}

/** Wrap a longitude into [-180, 180). */
export function normalizeLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

export function kmToMi(km: number): number {
  return km / KM_PER_MI;
}

/**
 * Human distance label. Short hops read in metres/feet because "0.1 km" tells
 * a traveler nothing useful about a walk across a plaza.
 */
export function formatDistance(km: number, units: DistanceUnits = 'km'): string {
  if (!Number.isFinite(km) || km < 0) return '';

  if (units === 'mi') {
    const mi = kmToMi(km);
    if (mi < 0.1) return `${Math.round((mi * 5280) / 10) * 10} ft`;
    if (mi < 10) return `${mi.toFixed(1)} mi`;
    return `${Math.round(mi).toLocaleString()} mi`;
  }

  if (km < 1) return `${Math.round((km * 1000) / 10) * 10} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

/** Miles for US English, kilometres everywhere else. Overridable in the UI. */
export function defaultUnits(locale?: string): DistanceUnits {
  const tag = (locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US')) || 'en-US';
  return /^en-US\b/i.test(tag) ? 'mi' : 'km';
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Tight bounds around a set of points, choosing the shorter way around the
 * globe. A Tokyo→Honolulu trip spans the antimeridian; naive min/max longitude
 * would frame the entire planet the long way round instead of the Pacific.
 */
export function boundsOf(points: LatLng[]): Bounds | null {
  if (points.length === 0) return null;

  const north = Math.max(...points.map((p) => p.lat));
  const south = Math.min(...points.map((p) => p.lat));

  const lngs = points.map((p) => normalizeLng(p.lng)).sort((a, b) => a - b);

  // Widest gap between consecutive longitudes (wrapping past ±180) is the part
  // of the globe the trip does NOT cover; the bounds are its complement.
  let gapStart = lngs[lngs.length - 1];
  let gapEnd = lngs[0];
  let widest = gapEnd + 360 - gapStart;

  for (let i = 1; i < lngs.length; i += 1) {
    const gap = lngs[i] - lngs[i - 1];
    if (gap > widest) {
      widest = gap;
      gapStart = lngs[i - 1];
      gapEnd = lngs[i];
    }
  }

  return { north, south, west: gapEnd, east: gapStart };
}

/**
 * Dedupe key for markers sharing a location. Five decimals is ~1m, so it merges
 * only genuinely identical coordinates (the same place resolved twice) and
 * never two neighbouring restaurants.
 */
export function coordKey(point: LatLng, precision = 5): string {
  return `${point.lat.toFixed(precision)},${normalizeLng(point.lng).toFixed(precision)}`;
}
