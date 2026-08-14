import type { CalendarEntityType } from '../calendar/eventMapping';

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * A stop is a (place, moment) pair — not an entity. One database row emits 0, 1
 * or 2 stops: a flight becomes a departure and an arrival, a hotel stay becomes
 * a check-in, a check-out, and a synthetic anchor on every night it covers.
 */
export type StopKind =
  | 'activity'
  | 'dining'
  | 'accommodation-checkin'
  | 'accommodation-checkout'
  | 'accommodation-anchor'
  | 'transport-departure'
  | 'transport-arrival';

/** Disambiguates the stops a single row emits. Encoded in the stop id. */
export type StopRole = 'main' | 'in' | 'out' | 'start' | 'end' | 'dep' | 'arr';

/**
 * How to turn this stop into coordinates. `place` resolves exactly; `text` goes
 * through Find Place From Text, optionally biased toward the trip destination.
 */
export type PlaceLocator =
  | { kind: 'place'; placeId: string; label?: string }
  | { kind: 'text'; query: string; bias?: LatLng };

/**
 * Ordering tiers. Sorting is tier-major so that untimed items can never
 * overtake the end-of-day anchor, and the anchors always bracket the day.
 */
export const TIER_ANCHOR_START = 0;
export const TIER_TIMED = 1;
export const TIER_UNTIMED = 2;
export const TIER_ANCHOR_END = 3;

export type SortTier =
  | typeof TIER_ANCHOR_START
  | typeof TIER_TIMED
  | typeof TIER_UNTIMED
  | typeof TIER_ANCHOR_END;

export interface MapStop {
  /** `${entityType}:${recordId}:${role}` — deterministic, stable across renders. */
  id: string;
  entityType: CalendarEntityType;
  kind: StopKind;
  recordId: string;
  /** The raw database row — feeds buildPeekFacts and the edit dialogs. */
  record: Record<string, unknown>;
  title: string;
  /** YYYY-MM-DD, floating wall clock. Never timezone-converted. */
  date: string;
  /** HH:mm as stored, or null when the row carries no time. */
  time: string | null;
  sortTier: SortTier;
  /** Minutes past midnight for tier-1 stops; null otherwise. */
  sortMinutes: number | null;
  /**
   * True only when the row stores a real time. A defaulted 15:00 check-in is
   * `false` so the UI can render it as inferred rather than assert it as fact.
   */
  timed: boolean;
  orderIndex: number;
  /** 1..N within the day, counting real stops only. Null for anchors. */
  sequence: number | null;
  locator: PlaceLocator | null;
  /** Anchors are display-only: no sequence badge, not counted in "6 stops". */
  synthetic: boolean;
}

/**
 * One day's worth of path, plus ghosts showing where the traveler came from and
 * where they go next, so a day never appears to start from nowhere.
 */
export interface DayFrame {
  date: string;
  lead: MapStop | null;
  stops: MapStop[];
  trail: MapStop | null;
}

const SEP = ':';

export function makeStopId(entityType: CalendarEntityType, recordId: string, role: StopRole): string {
  return `${entityType}${SEP}${recordId}${SEP}${role}`;
}

/**
 * Anchor ids carry the date because one stay anchors every night it covers:
 * without it, a five-night hotel would emit the same id five times and
 * whole-trip mode would render duplicate keys and ambiguous selection.
 */
export function makeAnchorId(stayId: string, end: 'start' | 'end', date: string): string {
  return `accommodation${SEP}${stayId}${SEP}${end}@${date}`;
}

export function parseStopId(stopId: string): {
  entityType: CalendarEntityType;
  recordId: string;
  role: StopRole;
} {
  const first = stopId.indexOf(SEP);
  const last = stopId.lastIndexOf(SEP);
  return {
    entityType: stopId.slice(0, first) as CalendarEntityType,
    recordId: stopId.slice(first + 1, last),
    role: stopId.slice(last + 1) as StopRole,
  };
}

/** True for the three kinds that put a hotel on the map. */
export function isStayKind(kind: StopKind): boolean {
  return (
    kind === 'accommodation-checkin' ||
    kind === 'accommodation-checkout' ||
    kind === 'accommodation-anchor'
  );
}
