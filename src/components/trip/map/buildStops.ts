import { addDays, format, parse } from 'date-fns';
import type {
  RestaurantReservation,
  HotelStay,
  Transportation,
} from '@/types/trip';
import { transportationTitle } from '../calendar/eventMapping';
import {
  activityLocator,
  diningLocator,
  stayLocator,
  transportLocator,
} from './placeLocator';
import {
  makeAnchorId,
  makeStopId,
  TIER_ANCHOR_END,
  TIER_ANCHOR_START,
  TIER_TIMED,
  TIER_UNTIMED,
  type DayFrame,
  type LatLng,
  type MapStop,
  type StopKind,
} from './stopModel';

/**
 * Hotels routinely store no check-in/check-out time. Placing them at the
 * industry-standard hours keeps them in the right part of the day, but the
 * stop is flagged `timed: false` so the UI never presents a guess as fact.
 */
const DEFAULT_CHECKIN_MINUTES = 15 * 60;
const DEFAULT_CHECKOUT_MINUTES = 11 * 60;

/**
 * Tie-break for stops from *different* rows landing on the same minute.
 * You must land before you can do anything, and you leave last.
 */
const KIND_PRIORITY: Record<StopKind, number> = {
  'transport-arrival': 0,
  'accommodation-checkout': 1,
  'accommodation-anchor': 2,
  dining: 3,
  activity: 4,
  'accommodation-checkin': 5,
  'transport-departure': 6,
};

/** Within a single row, the first half always precedes the second. */
const ROLE_ORDER: Partial<Record<StopKind, number>> = {
  'transport-departure': 0,
  'transport-arrival': 1,
  'accommodation-checkin': 0,
  'accommodation-checkout': 1,
};

/** `HH:mm` / `HH:mm:ss` → minutes past midnight. Never converts zones. */
export function toMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = time.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hours = Number(m[1]);
  const mins = Number(m[2]);
  if (hours > 23 || mins > 59) return null;
  return hours * 60 + mins;
}

/** `checkin_time` is typed as string but stores '' when unset — treat as absent. */
function hhmm(time: string | null | undefined): string | null {
  if (!time) return null;
  return time.length >= 5 ? time.slice(0, 5) : time;
}

const MAX_SPAN_DAYS = 400;

/** Inclusive YYYY-MM-DD range, capped so bad data can't spin forever. */
function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  let cursor = parse(start, 'yyyy-MM-dd', new Date());
  const last = parse(end, 'yyyy-MM-dd', new Date());
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) return out;

  while (cursor <= last && out.length < MAX_SPAN_DAYS) {
    out.push(format(cursor, 'yyyy-MM-dd'));
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** Only the activity fields the engine reads — accepts raw Supabase rows. */
export interface StopsActivity {
  id: string;
  title: string;
  start_time?: string | null;
  order_index?: number | null;
  location_place_id?: string | null;
  location_address?: string | null;
}

/** Only the day fields the engine reads — accepts raw Supabase rows. */
export interface StopsDay {
  day_id: string;
  date: string;
  activities?: StopsActivity[] | null;
}

export interface BuildStopsInput {
  days: StopsDay[];
  reservations: RestaurantReservation[];
  stays: HotelStay[];
  transportation: Transportation[];
  /** Trip destination coordinates, used to disambiguate ground text lookups. */
  destinationBias?: LatLng | null;
}

/**
 * Turn the trip's heterogeneous rows into one chronologically ordered list of
 * stops.
 *
 * This function never touches Google, never awaits, and never sees a LatLng.
 * Ordering and sequence numbers are therefore identical for every viewer
 * regardless of which coordinates happen to be cached — and the whole engine is
 * testable with no mocking.
 */
export function buildTripStops(input: BuildStopsInput): MapStop[] {
  const { days, reservations, stays, transportation, destinationBias = null } = input;
  const bias = destinationBias;

  const dayDate = new Map<string, string>();
  days.forEach((day) => dayDate.set(day.day_id, day.date));

  const real: MapStop[] = [];

  days.forEach((day) => {
    (day.activities ?? []).forEach((a: StopsActivity) => {
      const minutes = toMinutes(a.start_time);
      real.push({
        id: makeStopId('activity', a.id, 'main'),
        entityType: 'activity',
        kind: 'activity',
        recordId: a.id,
        record: a as unknown as Record<string, unknown>,
        title: a.title,
        date: day.date,
        time: hhmm(a.start_time),
        sortTier: minutes === null ? TIER_UNTIMED : TIER_TIMED,
        sortMinutes: minutes,
        timed: minutes !== null,
        orderIndex: a.order_index ?? 0,
        sequence: null,
        locator: activityLocator(a, bias),
        synthetic: false,
      });
    });
  });

  reservations.forEach((r: RestaurantReservation) => {
    const date = dayDate.get(r.day_id);
    if (!date) return;
    const minutes = toMinutes(r.reservation_time);
    real.push({
      id: makeStopId('dining', r.id, 'main'),
      entityType: 'dining',
      kind: 'dining',
      recordId: r.id,
      record: r as unknown as Record<string, unknown>,
      title: r.restaurant_name,
      date,
      time: hhmm(r.reservation_time),
      sortTier: minutes === null ? TIER_UNTIMED : TIER_TIMED,
      sortMinutes: minutes,
      timed: minutes !== null,
      orderIndex: r.order_index ?? 0,
      sequence: null,
      locator: diningLocator(r, bias),
      synthetic: false,
    });
  });

  stays.forEach((s: HotelStay) => {
    const locator = stayLocator(s, bias);

    if (s.hotel_checkin_date) {
      const stored = toMinutes(s.checkin_time);
      real.push({
        id: makeStopId('accommodation', s.stay_id, 'in'),
        entityType: 'accommodation',
        kind: 'accommodation-checkin',
        recordId: s.stay_id,
        record: s as unknown as Record<string, unknown>,
        title: s.hotel,
        date: s.hotel_checkin_date,
        time: hhmm(s.checkin_time),
        sortTier: TIER_TIMED,
        sortMinutes: stored ?? DEFAULT_CHECKIN_MINUTES,
        timed: stored !== null,
        orderIndex: 0,
        sequence: null,
        locator,
        synthetic: false,
      });
    }

    if (s.hotel_checkout_date) {
      const stored = toMinutes(s.checkout_time);
      real.push({
        id: makeStopId('accommodation', s.stay_id, 'out'),
        entityType: 'accommodation',
        kind: 'accommodation-checkout',
        recordId: s.stay_id,
        record: s as unknown as Record<string, unknown>,
        title: s.hotel,
        date: s.hotel_checkout_date,
        time: hhmm(s.checkout_time),
        sortTier: TIER_TIMED,
        sortMinutes: stored ?? DEFAULT_CHECKOUT_MINUTES,
        timed: stored !== null,
        orderIndex: 0,
        sequence: null,
        locator,
        synthetic: false,
      });
    }
  });

  transportation.forEach((t: Transportation) => {
    if (!t.start_date) return;
    const fallbackTitle = transportationTitle(t);
    const depMinutes = toMinutes(t.start_time);

    if (t.departure_location?.trim()) {
      real.push({
        id: makeStopId('transportation', t.id, 'dep'),
        entityType: 'transportation',
        kind: 'transport-departure',
        recordId: t.id,
        record: t as unknown as Record<string, unknown>,
        title: t.departure_location.trim() || fallbackTitle,
        date: t.start_date,
        time: hhmm(t.start_time),
        sortTier: depMinutes === null ? TIER_UNTIMED : TIER_TIMED,
        sortMinutes: depMinutes,
        timed: depMinutes !== null,
        orderIndex: 0,
        sequence: null,
        locator: transportLocator(t, 'departure', bias),
        synthetic: false,
      });
    }

    if (t.arrival_location?.trim()) {
      const arrivalDate = t.end_date ?? t.start_date;
      // With no stored arrival time, sit the arrival on the departure minute;
      // the same-record tie-break below still orders departure first.
      const stored = toMinutes(t.end_time);
      const arrMinutes = stored ?? (arrivalDate === t.start_date ? depMinutes : null);
      real.push({
        id: makeStopId('transportation', t.id, 'arr'),
        entityType: 'transportation',
        kind: 'transport-arrival',
        recordId: t.id,
        record: t as unknown as Record<string, unknown>,
        title: t.arrival_location.trim() || fallbackTitle,
        date: arrivalDate,
        time: hhmm(t.end_time),
        sortTier: arrMinutes === null ? TIER_UNTIMED : TIER_TIMED,
        sortMinutes: arrMinutes,
        timed: stored !== null,
        orderIndex: 0,
        sequence: null,
        locator: transportLocator(t, 'arrival', bias),
        synthetic: false,
      });
    }
  });

  const byDate = groupByDate(real);
  const out: MapStop[] = [];

  const dates = collectDates(days, real, stays);

  dates.forEach((date) => {
    const dayStops = (byDate.get(date) ?? []).slice().sort(compareStops);
    dayStops.forEach((stop, i) => {
      stop.sequence = i + 1;
    });

    const first = dayStops[0];
    const last = dayStops[dayStops.length - 1];

    const startStay = stays.find(
      (s) =>
        s.hotel_checkin_date &&
        s.hotel_checkout_date &&
        s.hotel_checkin_date < date &&
        date <= s.hotel_checkout_date,
    );
    const endStay = stays.find(
      (s) =>
        s.hotel_checkin_date &&
        s.hotel_checkout_date &&
        s.hotel_checkin_date <= date &&
        date < s.hotel_checkout_date,
    );

    // Suppressed when the adjacent real stop is already that same hotel, so no
    // duplicate star lands on top of the check-in / check-out marker.
    if (startStay && !(first && first.recordId === startStay.stay_id)) {
      out.push(anchorStop(startStay, date, 'start', bias));
    }

    out.push(...dayStops);

    // A day spent entirely at one hotel needs one star, not two stacked on the
    // same coordinate with a zero-length segment between them.
    const idleAtSameHotel =
      dayStops.length === 0 && !!startStay && startStay.stay_id === endStay?.stay_id;

    if (endStay && !idleAtSameHotel && !(last && last.recordId === endStay.stay_id)) {
      out.push(anchorStop(endStay, date, 'end', bias));
    }
  });

  return out;
}

function anchorStop(
  stay: HotelStay,
  date: string,
  end: 'start' | 'end',
  bias: LatLng | null,
): MapStop {
  return {
    id: makeAnchorId(stay.stay_id, end, date),
    entityType: 'accommodation',
    kind: 'accommodation-anchor',
    recordId: stay.stay_id,
    record: stay as unknown as Record<string, unknown>,
    title: stay.hotel,
    date,
    time: null,
    sortTier: end === 'start' ? TIER_ANCHOR_START : TIER_ANCHOR_END,
    sortMinutes: null,
    timed: false,
    orderIndex: 0,
    sequence: null,
    locator: stayLocator(stay, bias),
    synthetic: true,
  };
}

function groupByDate(stops: MapStop[]): Map<string, MapStop[]> {
  const map = new Map<string, MapStop[]>();
  stops.forEach((s) => {
    const list = map.get(s.date);
    if (list) list.push(s);
    else map.set(s.date, [s]);
  });
  return map;
}

/**
 * Tier-major ordering. Untimed items sort after every timed one — you cannot
 * draw a chronologically honest line through something with no time — and a
 * fully untimed day degrades to plain order_index, which is exactly right.
 */
export function compareStops(a: MapStop, b: MapStop): number {
  if (a.sortTier !== b.sortTier) return a.sortTier - b.sortTier;

  if (a.sortTier === TIER_TIMED) {
    const am = a.sortMinutes ?? 0;
    const bm = b.sortMinutes ?? 0;
    if (am !== bm) return am - bm;

    if (a.recordId === b.recordId) {
      const ar = ROLE_ORDER[a.kind] ?? 0;
      const br = ROLE_ORDER[b.kind] ?? 0;
      if (ar !== br) return ar - br;
    }

    const ap = KIND_PRIORITY[a.kind];
    const bp = KIND_PRIORITY[b.kind];
    if (ap !== bp) return ap - bp;
  }

  if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
  return a.id.localeCompare(b.id);
}

/**
 * Slice the ordered stops into per-day frames, each carrying ghosts of where
 * the traveler came from and where they head next, so a day never appears to
 * start from nowhere.
 */
export function buildDayFrames(stops: MapStop[], dates: string[]): DayFrame[] {
  const byDate = groupByDate(stops);
  const ordered = dates.slice().sort();

  return ordered.map((date, i) => {
    const dayStops = byDate.get(date) ?? [];
    const hasStartAnchor = dayStops[0]?.sortTier === TIER_ANCHOR_START;
    const hasEndAnchor = dayStops[dayStops.length - 1]?.sortTier === TIER_ANCHOR_END;

    let lead: MapStop | null = null;
    if (!hasStartAnchor) {
      for (let p = i - 1; p >= 0 && !lead; p -= 1) {
        const prev = byDate.get(ordered[p]) ?? [];
        lead = prev[prev.length - 1] ?? null;
      }
    }

    let trail: MapStop | null = null;
    if (!hasEndAnchor) {
      for (let n = i + 1; n < ordered.length && !trail; n += 1) {
        const next = byDate.get(ordered[n]) ?? [];
        trail = next[0] ?? null;
      }
    }

    return { date, lead, stops: dayStops, trail };
  });
}

/**
 * Every date the map should offer. Includes the nights a stay covers even when
 * `trip_days` has no row for them — if you sleep somewhere on the 5th, the 5th
 * is a day of the trip, and it needs its hotel anchors.
 */
function collectDates(days: StopsDay[], stops: MapStop[], stays: HotelStay[]): string[] {
  const dates = new Set<string>([
    ...days.map((d) => d.date),
    ...stops.map((s) => s.date),
  ]);

  stays.forEach((s) => {
    if (s.hotel_checkin_date && s.hotel_checkout_date) {
      datesBetween(s.hotel_checkin_date, s.hotel_checkout_date).forEach((d) => dates.add(d));
    }
  });

  return Array.from(dates).sort();
}

/** Every date the map should offer in the day scrubber. */
export function tripDatesFrom(days: StopsDay[], stops: MapStop[]): string[] {
  return Array.from(
    new Set([...days.map((d) => d.date), ...stops.map((s) => s.date)]),
  ).sort();
}
