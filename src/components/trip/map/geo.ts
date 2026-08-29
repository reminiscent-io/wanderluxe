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

/** Peak sideways bow of an arc, as a fraction of its great-circle length. */
const ARC_BOW_RATIO = 0.15;

type Vec3 = [number, number, number];

const toVec = (p: LatLng): Vec3 => {
  const lat = toRad(p.lat);
  const lng = toRad(p.lng);
  return [Math.cos(lat) * Math.cos(lng), Math.cos(lat) * Math.sin(lng), Math.sin(lat)];
};

const toLatLng = (v: Vec3): LatLng => ({
  lat: toDeg(Math.asin(Math.max(-1, Math.min(1, v[2])))),
  lng: normalizeLng(toDeg(Math.atan2(v[1], v[0]))),
});

/**
 * A gently bowed arc from `a` to `b`, sampled as a polyline path.
 *
 * The bow is always to the left of the direction of travel, so an out-and-back
 * pair (hotel → dinner, dinner → hotel) curves to opposite sides instead of
 * retracing one line — direction stays readable even where arrowheads crowd.
 * `bowScale` widens the bow for repeat passes over the same pair of points.
 *
 * Built on the unit sphere (slerp plus a perpendicular rotation), so it behaves
 * across the antimeridian and on long-haul legs alike. Identical or antipodal
 * endpoints have no defined side to bow toward and fall back to the chord.
 */
export function arcPath(a: LatLng, b: LatLng, bowScale = 1, samples = 32): LatLng[] {
  const va = toVec(a);
  const vb = toVec(b);

  const cross: Vec3 = [
    va[1] * vb[2] - va[2] * vb[1],
    va[2] * vb[0] - va[0] * vb[2],
    va[0] * vb[1] - va[1] * vb[0],
  ];
  const sinOmega = Math.hypot(...cross);
  if (sinOmega < 1e-9) return [{ ...a }, { ...b }];

  const omega = Math.atan2(sinOmega, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]);
  const n: Vec3 = [cross[0] / sinOmega, cross[1] / sinOmega, cross[2] / sinOmega];
  const bow = omega * ARC_BOW_RATIO * bowScale;

  const path: LatLng[] = [{ ...a }];
  for (let i = 1; i < samples; i += 1) {
    const t = i / samples;
    const ka = Math.sin((1 - t) * omega) / sinOmega;
    const kb = Math.sin(t * omega) / sinOmega;
    const p: Vec3 = [
      va[0] * ka + vb[0] * kb,
      va[1] * ka + vb[1] * kb,
      va[2] * ka + vb[2] * kb,
    ];
    // n is normal to the great-circle plane, hence perpendicular to p: rotating
    // p toward it by ε tilts the point sideways while staying on the sphere.
    const eps = Math.sin(Math.PI * t) * bow;
    const cosE = Math.cos(eps);
    const sinE = Math.sin(eps);
    path.push(toLatLng([p[0] * cosE + n[0] * sinE, p[1] * cosE + n[1] * sinE, p[2] * cosE + n[2] * sinE]));
  }
  path.push({ ...b });
  return path;
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
