# Trip Calendar View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a FullCalendar-based calendar view of a trip's itinerary, toggled alongside the existing vertical timeline, with Day / 3-Day / Week / Month views, drag-to-edit and click-to-create that reuse the existing entity dialogs and mutations, and a warm editorial theme.

**Architecture:** A new lazy-loaded module under `src/components/trip/calendar/`. A pure `eventMapping.ts` core converts entity records to/from FullCalendar events and is unit-tested in isolation. An adapter hook (`useCalendarEvents`) consumes the existing data hooks and returns `EventInput[]`; a realtime hook keeps the calendar fresh. Interactions call minimal Supabase mutations (drag/resize) or open the existing edit/add dialogs (click), so no new forms are introduced. `TimelineView` gains a Timeline↔Calendar toggle that swaps the rendered component.

**Tech Stack:** React 19 + TypeScript, TanStack Query, Supabase JS, FullCalendar v6 (MIT plugins: react, daygrid, timegrid, list, interaction), date-fns v4, Vitest.

## Global Constraints

- **Package manager:** `bun` is NOT on PATH in this environment. Use `npx` for tooling: type-check `npx tsc --noEmit`, tests `npx vitest run <file>`. To add dependencies use `npm install <pkgs>` (add `--legacy-peer-deps` only if a React 19 peer conflict blocks install). If `bun` is available, `bun add <pkgs>` is preferred.
- **FullCalendar edition:** MIT plugins only. The 3-day view is a custom `timeGrid` view with `duration: { days: 3 }`. Do NOT add any `@fullcalendar/*-premium` or scheduler plugin.
- **Lazy loading:** `TripCalendarView` and all FullCalendar imports must be reachable ONLY through a `React.lazy()` boundary so FullCalendar never enters the timeline's initial bundle.
- **Time/date model:** dates are `YYYY-MM-DD` strings; times are naive `HH:MM(:SS)` local strings with NO timezone. When combining into a datetime for FullCalendar, emit a local (floating) ISO-like string with no `Z` and no offset (e.g. `2026-06-30T14:30:00`). Persist times back as `HH:MM`.
- **Reuse, don't recreate:** the calendar creates no new entity forms. Editing opens the existing `ActivityDialog` / `AccommodationDialog` / `TransportationDialog` / `RestaurantReservationDialog`; drag/resize call minimal mutations or the existing `updateAccommodation` service.
- **Month view is a navigator:** read + navigate only (tap a day to jump to Day view). No drag, resize, or create in Month; timed items collapse into a per-day count ("+N more") while multi-day accommodation/transport bars stay visible. (Resolves the spec's open item: Month density is a **count**, not dots.)
- **v1 non-goals (explicit, so a reviewer signs off on the reduced scope):** traveler avatars on event chips are deferred (they would require a per-event `*_travelers` fetch; the chip leaves room to add them later). Drag-select creation of multi-day accommodation/transport spans is deferred (add those via the picker or their dialogs).
- **Out-of-range guarding:** cells outside `[arrival_date, departure_date]` are de-emphasized and non-droppable; a drop/resize whose result lands outside the trip range is rejected (revert + toast).
- **Defaults:** Week on desktop (viewport ≥ 768px), Day on mobile (< 768px).
- **Theme acceptance bar:** the calendar "does not read as default FullCalendar." Warm editorial palette from DESIGN.md; entity types distinguished by leading icon + tonal warm tint, NOT a saturated 4-color rainbow. Sunset accent (`#F97316`) reserved for the focused/selected event and the "now" indicator. Date/day-of-week headers in DM Serif Display; chips/times in DM Sans.
- **Copy:** no em dashes (use commas, colons, periods, or parentheses).
- **Event id namespacing:** every FullCalendar event id is `` `${entityType}:${recordId}` `` where `entityType ∈ {activity, dining, accommodation, transportation}`.

---

### Task 1: Add FullCalendar dependencies

**Files:**
- Modify: `package.json` (dependencies)

**Interfaces:**
- Produces: importable packages `@fullcalendar/react`, `@fullcalendar/core`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/list`, `@fullcalendar/interaction` at `^6.1.15`.

- [ ] **Step 1: Install the packages**

Run:
```bash
cd /Users/reminiscent/wanderluxe
npm install @fullcalendar/react@^6.1.15 @fullcalendar/core@^6.1.15 @fullcalendar/daygrid@^6.1.15 @fullcalendar/timegrid@^6.1.15 @fullcalendar/list@^6.1.15 @fullcalendar/interaction@^6.1.15
```
If install fails on a React 19 peer conflict, retry the same command with `--legacy-peer-deps` appended.

- [ ] **Step 2: Verify the packages resolve and types load**

Create a throwaway check file `src/components/trip/calendar/_deps_check.ts`:
```ts
import type { EventInput, EventClickArg, DateSelectArg, EventContentArg, EventApi } from '@fullcalendar/core';
export type _Check = EventInput & { _c?: EventClickArg | DateSelectArg | EventContentArg | EventApi };
```

Run: `npx tsc --noEmit`
Expected: PASS (no "Cannot find module '@fullcalendar/core'" errors).

- [ ] **Step 3: Delete the check file**

Run: `rm src/components/trip/calendar/_deps_check.ts`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json bun.lockb 2>/dev/null; git add package.json
git commit -m "build(calendar): add FullCalendar v6 MIT plugins"
```

---

### Task 2: eventMapping — ids, datetime helper, activity + dining forward mapping

**Files:**
- Create: `src/components/trip/calendar/eventMapping.ts`
- Test: `src/components/trip/calendar/eventMapping.test.ts`

**Interfaces:**
- Consumes: `DayActivity`, `RestaurantReservation` from `@/types/trip`; `EventInput` from `@fullcalendar/core`.
- Produces:
  - `type CalendarEntityType = 'activity' | 'dining' | 'accommodation' | 'transportation'`
  - `makeEventId(type: CalendarEntityType, recordId: string): string`
  - `parseEventId(eventId: string): { entityType: CalendarEntityType; recordId: string }`
  - `mapActivityToEvent(activity: DayActivity, dayDate: string): EventInput | null`
  - `mapReservationToEvent(reservation: RestaurantReservation, dayDate: string): EventInput | null`

- [ ] **Step 1: Write the failing test**

`src/components/trip/calendar/eventMapping.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  makeEventId,
  parseEventId,
  mapActivityToEvent,
  mapReservationToEvent,
} from './eventMapping';
import type { DayActivity, RestaurantReservation } from '@/types/trip';

const baseActivity: DayActivity = {
  id: 'a1', day_id: 'd1', trip_id: 't1', title: 'Louvre',
  start_time: '14:30:00', end_time: '16:00:00',
  cost: null, currency: null, order_index: 0, created_at: '', is_paid: false,
};

describe('event ids', () => {
  it('round-trips a namespaced id', () => {
    const id = makeEventId('activity', 'a1');
    expect(id).toBe('activity:a1');
    expect(parseEventId(id)).toEqual({ entityType: 'activity', recordId: 'a1' });
  });
  it('keeps colons that appear inside the record id', () => {
    expect(parseEventId('dining:x:y')).toEqual({ entityType: 'dining', recordId: 'x:y' });
  });
});

describe('mapActivityToEvent', () => {
  it('maps a timed activity to a floating time block', () => {
    const e = mapActivityToEvent(baseActivity, '2026-06-30');
    expect(e).toMatchObject({
      id: 'activity:a1', title: 'Louvre', allDay: false,
      start: '2026-06-30T14:30:00', end: '2026-06-30T16:00:00',
    });
    expect(e?.extendedProps).toMatchObject({ entityType: 'activity', record: baseActivity });
  });
  it('maps an untimed activity to an all-day chip', () => {
    const e = mapActivityToEvent({ ...baseActivity, start_time: undefined, end_time: undefined }, '2026-06-30');
    expect(e).toMatchObject({ id: 'activity:a1', start: '2026-06-30', allDay: true });
    expect(e?.end).toBeUndefined();
  });
  it('returns null when the day date is missing', () => {
    expect(mapActivityToEvent(baseActivity, '')).toBeNull();
  });
});

describe('mapReservationToEvent', () => {
  const res: RestaurantReservation = {
    id: 'r1', day_id: 'd1', trip_id: 't1', restaurant_name: 'Septime',
    reservation_time: '20:00:00', number_of_people: 2, notes: null,
    confirmation_number: null, cost: null, currency: null, is_paid: false,
    address: null, phone_number: null, place_id: null, rating: null,
    created_at: '', order_index: 0,
  };
  it('maps a timed reservation to a point-in-time block', () => {
    const e = mapReservationToEvent(res, '2026-07-01');
    expect(e).toMatchObject({ id: 'dining:r1', title: 'Septime', allDay: false, start: '2026-07-01T20:00:00' });
    expect(e?.end).toBeUndefined();
  });
  it('maps an untimed reservation to an all-day chip', () => {
    const e = mapReservationToEvent({ ...res, reservation_time: null }, '2026-07-01');
    expect(e).toMatchObject({ id: 'dining:r1', start: '2026-07-01', allDay: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/trip/calendar/eventMapping.test.ts`
Expected: FAIL with "Cannot find module './eventMapping'" or "is not a function".

- [ ] **Step 3: Write minimal implementation**

`src/components/trip/calendar/eventMapping.ts`:
```ts
import type { EventInput } from '@fullcalendar/core';
import type { DayActivity, RestaurantReservation } from '@/types/trip';

export type CalendarEntityType = 'activity' | 'dining' | 'accommodation' | 'transportation';

const UID_SEP = ':';

export function makeEventId(type: CalendarEntityType, recordId: string): string {
  return `${type}${UID_SEP}${recordId}`;
}

export function parseEventId(eventId: string): { entityType: CalendarEntityType; recordId: string } {
  const idx = eventId.indexOf(UID_SEP);
  return {
    entityType: eventId.slice(0, idx) as CalendarEntityType,
    recordId: eventId.slice(idx + 1),
  };
}

/** Combine `YYYY-MM-DD` + `HH:MM(:SS)` into a floating (no-timezone) local datetime string. */
export function combineDateTime(date: string, time: string): string {
  const hhmm = time.length >= 5 ? time.slice(0, 5) : time;
  return `${date}T${hhmm}:00`;
}

export function mapActivityToEvent(activity: DayActivity, dayDate: string): EventInput | null {
  if (!dayDate) return null;
  if (!activity.start_time) {
    return {
      id: makeEventId('activity', activity.id),
      title: activity.title,
      start: dayDate,
      allDay: true,
      extendedProps: { entityType: 'activity', record: activity },
    };
  }
  return {
    id: makeEventId('activity', activity.id),
    title: activity.title,
    start: combineDateTime(dayDate, activity.start_time),
    end: activity.end_time ? combineDateTime(dayDate, activity.end_time) : undefined,
    allDay: false,
    extendedProps: { entityType: 'activity', record: activity },
  };
}

export function mapReservationToEvent(reservation: RestaurantReservation, dayDate: string): EventInput | null {
  if (!dayDate) return null;
  if (!reservation.reservation_time) {
    return {
      id: makeEventId('dining', reservation.id),
      title: reservation.restaurant_name,
      start: dayDate,
      allDay: true,
      extendedProps: { entityType: 'dining', record: reservation },
    };
  }
  return {
    id: makeEventId('dining', reservation.id),
    title: reservation.restaurant_name,
    start: combineDateTime(dayDate, reservation.reservation_time),
    allDay: false,
    extendedProps: { entityType: 'dining', record: reservation },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/trip/calendar/eventMapping.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/calendar/eventMapping.ts src/components/trip/calendar/eventMapping.test.ts
git commit -m "feat(calendar): map activities and dining to calendar events"
```

---

### Task 3: eventMapping — accommodation + transportation forward mapping

**Files:**
- Modify: `src/components/trip/calendar/eventMapping.ts`
- Modify (append tests): `src/components/trip/calendar/eventMapping.test.ts`

**Interfaces:**
- Consumes: `HotelStay`, `Transportation` from `@/types/trip`; `addDays`, `format`, `parse` from `date-fns`.
- Produces:
  - `mapAccommodationToEvent(stay: HotelStay): EventInput | null`
  - `mapTransportationToEvent(t: Transportation): EventInput | null`
  - `transportationTitle(t: Transportation): string`
  - Rule: all-day spanning bars use an EXCLUSIVE end of `checkout/arrival date + 1 day`, so the bar visually covers the endpoints inclusively.

- [ ] **Step 1: Write the failing test (append to eventMapping.test.ts)**

```ts
import { mapAccommodationToEvent, mapTransportationToEvent, transportationTitle } from './eventMapping';
import type { HotelStay, Transportation } from '@/types/trip';

describe('mapAccommodationToEvent', () => {
  const stay: HotelStay = {
    stay_id: 's1', trip_id: 't1', hotel: 'Hotel Lutetia',
    hotel_checkin_date: '2026-06-30', hotel_checkout_date: '2026-07-03',
    checkin_time: '15:00', checkout_time: '11:00',
    hotel_details: null, hotel_url: null, cost: null, currency: null,
    hotel_address: null, hotel_phone: null, hotel_place_id: null, hotel_website: null, created_at: '',
  };
  it('spans check-in to check-out inclusive via exclusive end (+1 day)', () => {
    const e = mapAccommodationToEvent(stay);
    expect(e).toMatchObject({ id: 'accommodation:s1', title: 'Hotel Lutetia', allDay: true, start: '2026-06-30', end: '2026-07-04' });
    expect(e?.extendedProps).toMatchObject({ entityType: 'accommodation', record: stay });
  });
  it('returns null when dates are missing', () => {
    expect(mapAccommodationToEvent({ ...stay, hotel_checkin_date: '' })).toBeNull();
  });
});

describe('mapTransportationToEvent', () => {
  const base: Transportation = {
    id: 'tr1', trip_id: 't1', type: 'flight', provider: 'AF',
    details: null, confirmation_number: null,
    start_date: '2026-06-30', start_time: '09:00:00',
    end_date: '2026-06-30', end_time: '11:30:00',
    departure_location: 'JFK', arrival_location: 'CDG',
    cost: null, currency: null, is_paid: false, created_at: '',
  };
  it('renders a same-day timed flight as a time block', () => {
    const e = mapTransportationToEvent(base);
    expect(e).toMatchObject({ id: 'transportation:tr1', allDay: false, start: '2026-06-30T09:00:00', end: '2026-06-30T11:30:00' });
    expect(e?.title).toBe('Flight: JFK to CDG');
  });
  it('renders a multi-day trip as an all-day span with exclusive end', () => {
    const e = mapTransportationToEvent({ ...base, end_date: '2026-07-02' });
    expect(e).toMatchObject({ allDay: true, start: '2026-06-30', end: '2026-07-03' });
  });
  it('renders an all-day span when a same-day item has no start time', () => {
    const e = mapTransportationToEvent({ ...base, start_time: null, end_time: null });
    expect(e).toMatchObject({ allDay: true, start: '2026-06-30', end: '2026-07-01' });
  });
  it('titles by provider when locations are absent', () => {
    expect(transportationTitle({ ...base, departure_location: null, arrival_location: null })).toBe('Flight · AF');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/trip/calendar/eventMapping.test.ts`
Expected: FAIL with "mapAccommodationToEvent is not a function".

- [ ] **Step 3: Write minimal implementation (append to eventMapping.ts)**

Add the import at the top of the file:
```ts
import { addDays, format, parse } from 'date-fns';
import type { HotelStay, Transportation } from '@/types/trip';
```

Append:
```ts
/** Exclusive all-day end: last inclusive date + 1 day, as YYYY-MM-DD. */
function exclusiveEnd(lastInclusiveDate: string): string {
  return format(addDays(parse(lastInclusiveDate, 'yyyy-MM-dd', new Date()), 1), 'yyyy-MM-dd');
}

export function transportationTitle(t: Transportation): string {
  const label = t.type ? t.type.charAt(0).toUpperCase() + t.type.slice(1) : 'Transport';
  if (t.departure_location && t.arrival_location) {
    return `${label}: ${t.departure_location} to ${t.arrival_location}`;
  }
  return t.provider ? `${label} · ${t.provider}` : label;
}

export function mapAccommodationToEvent(stay: HotelStay): EventInput | null {
  if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return null;
  return {
    id: makeEventId('accommodation', stay.stay_id),
    title: stay.hotel,
    start: stay.hotel_checkin_date,
    end: exclusiveEnd(stay.hotel_checkout_date),
    allDay: true,
    extendedProps: { entityType: 'accommodation', record: stay },
  };
}

export function mapTransportationToEvent(t: Transportation): EventInput | null {
  if (!t.start_date) return null;
  const sameDay = !t.end_date || t.end_date === t.start_date;
  if (sameDay && t.start_time) {
    return {
      id: makeEventId('transportation', t.id),
      title: transportationTitle(t),
      start: combineDateTime(t.start_date, t.start_time),
      end: t.end_time ? combineDateTime(t.start_date, t.end_time) : undefined,
      allDay: false,
      extendedProps: { entityType: 'transportation', record: t },
    };
  }
  return {
    id: makeEventId('transportation', t.id),
    title: transportationTitle(t),
    start: t.start_date,
    end: exclusiveEnd(t.end_date ?? t.start_date),
    allDay: true,
    extendedProps: { entityType: 'transportation', record: t },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/trip/calendar/eventMapping.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/calendar/eventMapping.ts src/components/trip/calendar/eventMapping.test.ts
git commit -m "feat(calendar): map accommodations and transportation to spanning events"
```

---

### Task 4: eventMapping — reverse mapping (drag/resize result → field patch)

**Files:**
- Modify: `src/components/trip/calendar/eventMapping.ts`
- Modify (append tests): `src/components/trip/calendar/eventMapping.test.ts`

**Interfaces:**
- Produces:
  - `type EntityDropPatch` (discriminated union, see code)
  - `interface DropInput { eventId: string; newStart: Date; newEnd: Date | null; allDay: boolean }`
  - `buildDropPatch(input: DropInput): EntityDropPatch`
  - `isDateWithinTripRange(date: string, startInclusive: string, endInclusive: string): boolean` (inclusive `YYYY-MM-DD` range guard used by the drop handler in Task 12)
  - Rule: for all-day spans, `newEnd` is FullCalendar's EXCLUSIVE end, so the inclusive last date is `newEnd - 1 day`.

- [ ] **Step 1: Write the failing test (append to eventMapping.test.ts)**

```ts
import { buildDropPatch, isDateWithinTripRange } from './eventMapping';

describe('buildDropPatch', () => {
  it('retimes a timed activity and re-derives its date', () => {
    const patch = buildDropPatch({
      eventId: 'activity:a1',
      newStart: new Date(2026, 6, 2, 9, 15),   // 2026-07-02 09:15 local
      newEnd: new Date(2026, 6, 2, 10, 0),
      allDay: false,
    });
    expect(patch).toEqual({ entityType: 'activity', recordId: 'a1', date: '2026-07-02', startTime: '09:15', endTime: '10:00' });
  });
  it('moves an untimed activity to a new date with null times', () => {
    const patch = buildDropPatch({ eventId: 'activity:a1', newStart: new Date(2026, 6, 5), newEnd: null, allDay: true });
    expect(patch).toEqual({ entityType: 'activity', recordId: 'a1', date: '2026-07-05', startTime: null, endTime: null });
  });
  it('retimes dining to a point in time', () => {
    const patch = buildDropPatch({ eventId: 'dining:r1', newStart: new Date(2026, 6, 2, 19, 30), newEnd: null, allDay: false });
    expect(patch).toEqual({ entityType: 'dining', recordId: 'r1', date: '2026-07-02', time: '19:30' });
  });
  it('converts an all-day accommodation span back to inclusive checkout (exclusive end - 1)', () => {
    const patch = buildDropPatch({
      eventId: 'accommodation:s1',
      newStart: new Date(2026, 6, 1),
      newEnd: new Date(2026, 6, 5),   // exclusive
      allDay: true,
    });
    expect(patch).toEqual({ entityType: 'accommodation', recordId: 's1', checkinDate: '2026-07-01', checkoutDate: '2026-07-04' });
  });
  it('moves a multi-day transportation span (exclusive end - 1)', () => {
    const patch = buildDropPatch({ eventId: 'transportation:tr1', newStart: new Date(2026, 6, 1), newEnd: new Date(2026, 6, 3), allDay: true });
    expect(patch).toEqual({ entityType: 'transportation', recordId: 'tr1', startDate: '2026-07-01', startTime: null, endDate: '2026-07-02', endTime: null });
  });
});

describe('isDateWithinTripRange', () => {
  it('accepts dates on or within the inclusive range', () => {
    expect(isDateWithinTripRange('2026-06-30', '2026-06-30', '2026-07-06')).toBe(true);
    expect(isDateWithinTripRange('2026-07-06', '2026-06-30', '2026-07-06')).toBe(true);
    expect(isDateWithinTripRange('2026-07-03', '2026-06-30', '2026-07-06')).toBe(true);
  });
  it('rejects dates before or after the range', () => {
    expect(isDateWithinTripRange('2026-06-29', '2026-06-30', '2026-07-06')).toBe(false);
    expect(isDateWithinTripRange('2026-07-07', '2026-06-30', '2026-07-06')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/trip/calendar/eventMapping.test.ts`
Expected: FAIL with "buildDropPatch is not a function" (and "isDateWithinTripRange is not a function").

- [ ] **Step 3: Write minimal implementation (append to eventMapping.ts)**

```ts
export type EntityDropPatch =
  | { entityType: 'activity'; recordId: string; date: string; startTime: string | null; endTime: string | null }
  | { entityType: 'dining'; recordId: string; date: string; time: string | null }
  | { entityType: 'accommodation'; recordId: string; checkinDate: string; checkoutDate: string }
  | { entityType: 'transportation'; recordId: string; startDate: string; startTime: string | null; endDate: string; endTime: string | null };

export interface DropInput {
  eventId: string;
  newStart: Date;
  newEnd: Date | null;
  allDay: boolean;
}

const fmtDate = (d: Date) => format(d, 'yyyy-MM-dd');
const fmtTime = (d: Date) => format(d, 'HH:mm');

export function buildDropPatch(input: DropInput): EntityDropPatch {
  const { entityType, recordId } = parseEventId(input.eventId);
  switch (entityType) {
    case 'activity':
      return input.allDay
        ? { entityType, recordId, date: fmtDate(input.newStart), startTime: null, endTime: null }
        : { entityType, recordId, date: fmtDate(input.newStart), startTime: fmtTime(input.newStart), endTime: input.newEnd ? fmtTime(input.newEnd) : null };
    case 'dining':
      return { entityType, recordId, date: fmtDate(input.newStart), time: input.allDay ? null : fmtTime(input.newStart) };
    case 'accommodation': {
      const checkoutExclusive = input.newEnd ?? addDays(input.newStart, 1);
      return { entityType, recordId, checkinDate: fmtDate(input.newStart), checkoutDate: fmtDate(addDays(checkoutExclusive, -1)) };
    }
    case 'transportation': {
      if (input.allDay) {
        const endExclusive = input.newEnd ?? addDays(input.newStart, 1);
        return { entityType, recordId, startDate: fmtDate(input.newStart), startTime: null, endDate: fmtDate(addDays(endExclusive, -1)), endTime: null };
      }
      return {
        entityType, recordId,
        startDate: fmtDate(input.newStart), startTime: fmtTime(input.newStart),
        endDate: fmtDate(input.newEnd ?? input.newStart), endTime: input.newEnd ? fmtTime(input.newEnd) : null,
      };
    }
  }
}

/** Inclusive range check on YYYY-MM-DD strings (lexicographic order == chronological order). */
export function isDateWithinTripRange(date: string, startInclusive: string, endInclusive: string): boolean {
  return date >= startInclusive && date <= endInclusive;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/trip/calendar/eventMapping.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/calendar/eventMapping.ts src/components/trip/calendar/eventMapping.test.ts
git commit -m "feat(calendar): reverse-map drag/resize results to field patches"
```

---

### Task 5: `useTripReservations` — trip-wide reservations query

**Files:**
- Create: `src/components/trip/calendar/useTripReservations.ts`
- Test: `src/components/trip/calendar/useTripReservations.test.ts`

**Interfaces:**
- Consumes: `supabase` from `@/integrations/supabase/client`; `useQuery` from `@tanstack/react-query`.
- Produces: `useTripReservations(tripId: string)` returning a React Query result whose `data` is `RestaurantReservation[]`; query key `['reservations', tripId]`.
- Note: mirrors the existing trip-wide pattern in `src/components/trip/budget/hooks/useExpenses.ts:48` (`from('reservations').select('*').eq('trip_id', tripId)`).

- [ ] **Step 1: Write the failing test**

`src/components/trip/calendar/useTripReservations.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTripReservations } from './useTripReservations';

const eqMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: eqMock }) }) },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe('useTripReservations', () => {
  beforeEach(() => eqMock.mockReset());
  it('returns the trip reservations', async () => {
    eqMock.mockResolvedValue({ data: [{ id: 'r1', trip_id: 't1', restaurant_name: 'Septime' }], error: null });
    const { result } = renderHook(() => useTripReservations('t1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'r1', trip_id: 't1', restaurant_name: 'Septime' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/trip/calendar/useTripReservations.test.ts`
Expected: FAIL with "Cannot find module './useTripReservations'".

- [ ] **Step 3: Write minimal implementation**

`src/components/trip/calendar/useTripReservations.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RestaurantReservation } from '@/types/trip';

export function useTripReservations(tripId: string) {
  return useQuery({
    queryKey: ['reservations', tripId],
    queryFn: async (): Promise<RestaurantReservation[]> => {
      const { data, error } = await supabase.from('reservations').select('*').eq('trip_id', tripId);
      if (error) throw error;
      return (data ?? []) as unknown as RestaurantReservation[];
    },
    enabled: !!tripId,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/trip/calendar/useTripReservations.test.ts`
Expected: PASS.

If `@testing-library/react` is not installed, install it first: `npm install -D @testing-library/react` (it is used elsewhere in the repo's test suite; verify with `grep -rl "@testing-library/react" src` before adding).

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/calendar/useTripReservations.ts src/components/trip/calendar/useTripReservations.test.ts
git commit -m "feat(calendar): add trip-wide reservations query hook"
```

---

### Task 6: `useCalendarEvents` — adapter hook

**Files:**
- Create: `src/components/trip/calendar/useCalendarEvents.ts`
- Test: `src/components/trip/calendar/useCalendarEvents.test.ts`

**Interfaces:**
- Consumes: `useTripDays` (`@/hooks/use-trip-days`) returning `{ days: TripDay[] | undefined }` where each `TripDay` has `date` and `activities?: DayActivity[]`; `useTimelineEvents` (`@/hooks/use-timeline-events`) returning `{ events: HotelStay[] | undefined }`; `useTransportationEvents` (`@/hooks/use-transportation-events`) returning `{ transportationData: Transportation[] | undefined }`; `useTripReservations` (Task 5); all forward mappers from `eventMapping` (Tasks 2-3).
- Produces: `useCalendarEvents(tripId: string): { events: EventInput[]; isLoading: boolean }`.

- [ ] **Step 1: Write the failing test**

`src/components/trip/calendar/useCalendarEvents.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCalendarEvents } from './useCalendarEvents';

vi.mock('@/hooks/use-trip-days', () => ({
  useTripDays: () => ({ days: [{ day_id: 'd1', trip_id: 't1', date: '2026-06-30', title: null, description: null, image_url: null, created_at: '', activities: [{ id: 'a1', day_id: 'd1', trip_id: 't1', title: 'Louvre', start_time: '14:30:00', end_time: '16:00:00', cost: null, currency: null, order_index: 0, created_at: '', is_paid: false }] }] }),
}));
vi.mock('@/hooks/use-timeline-events', () => ({
  useTimelineEvents: () => ({ events: [{ stay_id: 's1', trip_id: 't1', hotel: 'Lutetia', hotel_checkin_date: '2026-06-30', hotel_checkout_date: '2026-07-02', checkin_time: '15:00', checkout_time: '11:00', hotel_details: null, hotel_url: null, cost: null, currency: null, hotel_address: null, hotel_phone: null, hotel_place_id: null, hotel_website: null, created_at: '' }] }),
}));
vi.mock('@/hooks/use-transportation-events', () => ({
  useTransportationEvents: () => ({ transportationData: [{ id: 'tr1', trip_id: 't1', type: 'flight', provider: null, details: null, confirmation_number: null, start_date: '2026-06-30', start_time: '09:00:00', end_date: '2026-06-30', end_time: '11:00:00', departure_location: 'JFK', arrival_location: 'CDG', cost: null, currency: null, is_paid: false, created_at: '' }] }),
}));
vi.mock('./useTripReservations', () => ({
  useTripReservations: () => ({ data: [{ id: 'r1', day_id: 'd1', trip_id: 't1', restaurant_name: 'Septime', reservation_time: '20:00:00', number_of_people: 2, notes: null, confirmation_number: null, cost: null, currency: null, is_paid: false, address: null, phone_number: null, place_id: null, rating: null, created_at: '', order_index: 0 }], isLoading: false }),
}));

describe('useCalendarEvents', () => {
  it('flattens all four entity sources into namespaced events', () => {
    const { result } = renderHook(() => useCalendarEvents('t1'));
    const ids = result.current.events.map((e) => e.id).sort();
    expect(ids).toEqual(['accommodation:s1', 'activity:a1', 'dining:r1', 'transportation:tr1']);
    const dining = result.current.events.find((e) => e.id === 'dining:r1');
    expect(dining).toMatchObject({ start: '2026-06-30T20:00:00', allDay: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/trip/calendar/useCalendarEvents.test.ts`
Expected: FAIL with "Cannot find module './useCalendarEvents'".

- [ ] **Step 3: Write minimal implementation**

`src/components/trip/calendar/useCalendarEvents.ts`:
```ts
import { useMemo } from 'react';
import type { EventInput } from '@fullcalendar/core';
import { useTripDays } from '@/hooks/use-trip-days';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTransportationEvents } from '@/hooks/use-transportation-events';
import { useTripReservations } from './useTripReservations';
import {
  mapActivityToEvent,
  mapReservationToEvent,
  mapAccommodationToEvent,
  mapTransportationToEvent,
} from './eventMapping';

export function useCalendarEvents(tripId: string): { events: EventInput[]; isLoading: boolean } {
  const { days } = useTripDays(tripId);
  const { events: stays } = useTimelineEvents(tripId);
  const { transportationData } = useTransportationEvents(tripId);
  const { data: reservations, isLoading: reservationsLoading } = useTripReservations(tripId);

  const events = useMemo(() => {
    const out: EventInput[] = [];
    const dayDate = new Map<string, string>();
    (days ?? []).forEach((day) => {
      dayDate.set(day.day_id, day.date);
      (day.activities ?? []).forEach((activity) => {
        const e = mapActivityToEvent(activity, day.date);
        if (e) out.push(e);
      });
    });
    (reservations ?? []).forEach((reservation) => {
      const e = mapReservationToEvent(reservation, dayDate.get(reservation.day_id) ?? '');
      if (e) out.push(e);
    });
    (stays ?? []).forEach((stay) => {
      const e = mapAccommodationToEvent(stay);
      if (e) out.push(e);
    });
    (transportationData ?? []).forEach((t) => {
      const e = mapTransportationToEvent(t);
      if (e) out.push(e);
    });
    return out;
  }, [days, reservations, stays, transportationData]);

  const isLoading = !days || reservationsLoading;
  return { events, isLoading };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/trip/calendar/useCalendarEvents.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/calendar/useCalendarEvents.ts src/components/trip/calendar/useCalendarEvents.test.ts
git commit -m "feat(calendar): adapter hook mapping trip data to calendar events"
```

---

### Task 7: `useCalendarRealtime` — trip-wide realtime subscription

**Files:**
- Create: `src/components/trip/calendar/useCalendarRealtime.ts`

**Interfaces:**
- Consumes: `useRealtimeSubscription`, `RealtimeSubscriptionConfig` from `@/hooks/useRealtimeSubscription`.
- Produces: `useCalendarRealtime(tripId: string | undefined): { isSubscribed: boolean }`. Subscribes to `day_activities`, `accommodations`, `transportation`, `reservations` (all filtered by `trip_id`) and invalidates the calendar's source query keys.

- [ ] **Step 1: Implement (no dedicated unit test — this is a thin wiring of the tested `useRealtimeSubscription`; verified by the smoke test in Task 11 and manual QA)**

`src/components/trip/calendar/useCalendarRealtime.ts`:
```ts
import { useMemo } from 'react';
import { useRealtimeSubscription, type RealtimeSubscriptionConfig } from '@/hooks/useRealtimeSubscription';

export function useCalendarRealtime(tripId: string | undefined) {
  const config: RealtimeSubscriptionConfig = useMemo(
    () => ({
      channelKey: `calendar:${tripId}`,
      tables: [
        { table: 'day_activities', filterColumn: 'trip_id', filterValue: tripId ?? '' },
        { table: 'accommodations', filterColumn: 'trip_id', filterValue: tripId ?? '' },
        { table: 'transportation', filterColumn: 'trip_id', filterValue: tripId ?? '' },
        { table: 'reservations', filterColumn: 'trip_id', filterValue: tripId ?? '' },
      ],
      invalidateKeys: [
        ['trip-days', tripId],
        ['accommodations', tripId],
        ['transportation', tripId],
        ['reservations', tripId],
        ['trip', tripId],
      ],
      enabled: !!tripId,
    }),
    [tripId],
  );
  return useRealtimeSubscription(config);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/trip/calendar/useCalendarRealtime.ts
git commit -m "feat(calendar): trip-wide realtime subscription for the calendar"
```

---

### Task 8: `calendarMutations` — apply a drop/resize patch

**Files:**
- Create: `src/components/trip/calendar/calendarMutations.ts`
- Test: `src/components/trip/calendar/calendarMutations.test.ts`

**Interfaces:**
- Consumes: `supabase` from `@/integrations/supabase/client`; `updateAccommodation`, `AccommodationFormData` from `@/services/accommodation/accommodationService`; `EntityDropPatch` from `./eventMapping`; `HotelStay` from `@/types/trip`.
- Produces: `applyDropPatch(patch: EntityDropPatch, tripId: string, original: unknown): Promise<void>`. Activity/dining resolve the target `day_id` from the date and update minimally; transportation updates dates/times directly; accommodation reconstructs `AccommodationFormData` from the original `HotelStay` and calls `updateAccommodation` (which re-syncs `accommodations_days`).

- [ ] **Step 1: Write the failing test**

`src/components/trip/calendar/calendarMutations.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const updateEq = vi.fn().mockResolvedValue({ error: null });
const updateFn = vi.fn(() => ({ eq: updateEq }));
const selectMaybeSingle = vi.fn();
const fromFn = vi.fn((table: string) => {
  if (table === 'trip_days') {
    return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: selectMaybeSingle }) }) }) };
  }
  return { update: updateFn };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: fromFn } }));

const updateAccommodation = vi.fn().mockResolvedValue({});
vi.mock('@/services/accommodation/accommodationService', () => ({ updateAccommodation: (...a: unknown[]) => updateAccommodation(...a) }));

import { applyDropPatch } from './calendarMutations';

describe('applyDropPatch', () => {
  beforeEach(() => { updateFn.mockClear(); updateEq.mockClear(); updateAccommodation.mockClear(); selectMaybeSingle.mockReset(); });

  it('updates an activity day_id + times after resolving the day', async () => {
    selectMaybeSingle.mockResolvedValue({ data: { day_id: 'd2' }, error: null });
    await applyDropPatch({ entityType: 'activity', recordId: 'a1', date: '2026-07-02', startTime: '09:15', endTime: '10:00' }, 't1', null);
    expect(updateFn).toHaveBeenCalledWith({ day_id: 'd2', start_time: '09:15', end_time: '10:00' });
    expect(updateEq).toHaveBeenCalledWith('id', 'a1');
  });

  it('throws when the target date has no trip day', async () => {
    selectMaybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(applyDropPatch({ entityType: 'dining', recordId: 'r1', date: '2030-01-01', time: '20:00' }, 't1', null)).rejects.toThrow();
  });

  it('updates transportation dates/times directly', async () => {
    await applyDropPatch({ entityType: 'transportation', recordId: 'tr1', startDate: '2026-07-01', startTime: null, endDate: '2026-07-02', endTime: null }, 't1', null);
    expect(updateFn).toHaveBeenCalledWith({ start_date: '2026-07-01', start_time: null, end_date: '2026-07-02', end_time: null });
  });

  it('reconstructs form data and delegates accommodation to updateAccommodation', async () => {
    const stay = { stay_id: 's1', hotel: 'Lutetia', hotel_details: null, hotel_url: null, hotel_address: null, hotel_phone: null, hotel_website: null, hotel_place_id: null, checkin_time: '15:00', checkout_time: '11:00', cost: 300, currency: 'EUR' };
    await applyDropPatch({ entityType: 'accommodation', recordId: 's1', checkinDate: '2026-07-01', checkoutDate: '2026-07-04' }, 't1', stay);
    expect(updateAccommodation).toHaveBeenCalledWith('s1', expect.objectContaining({ hotel: 'Lutetia', hotel_checkin_date: '2026-07-01', hotel_checkout_date: '2026-07-04', cost: '300', currency: 'EUR' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/trip/calendar/calendarMutations.test.ts`
Expected: FAIL with "Cannot find module './calendarMutations'".

- [ ] **Step 3: Write minimal implementation**

`src/components/trip/calendar/calendarMutations.ts`:
```ts
import { supabase } from '@/integrations/supabase/client';
import { updateAccommodation, type AccommodationFormData } from '@/services/accommodation/accommodationService';
import type { EntityDropPatch } from './eventMapping';
import type { HotelStay } from '@/types/trip';

async function resolveDayId(tripId: string, date: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('trip_days')
    .select('day_id')
    .eq('trip_id', tripId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return (data as { day_id: string } | null)?.day_id ?? null;
}

export async function applyDropPatch(patch: EntityDropPatch, tripId: string, original: unknown): Promise<void> {
  switch (patch.entityType) {
    case 'activity': {
      const dayId = await resolveDayId(tripId, patch.date);
      if (!dayId) throw new Error('No trip day exists for that date');
      const { error } = await supabase
        .from('day_activities')
        .update({ day_id: dayId, start_time: patch.startTime, end_time: patch.endTime })
        .eq('id', patch.recordId);
      if (error) throw error;
      return;
    }
    case 'dining': {
      const dayId = await resolveDayId(tripId, patch.date);
      if (!dayId) throw new Error('No trip day exists for that date');
      const { error } = await supabase
        .from('reservations')
        .update({ day_id: dayId, reservation_time: patch.time })
        .eq('id', patch.recordId);
      if (error) throw error;
      return;
    }
    case 'transportation': {
      const { error } = await supabase
        .from('transportation')
        .update({ start_date: patch.startDate, start_time: patch.startTime, end_date: patch.endDate, end_time: patch.endTime })
        .eq('id', patch.recordId);
      if (error) throw error;
      return;
    }
    case 'accommodation': {
      const stay = original as HotelStay;
      const formData: AccommodationFormData = {
        hotel: stay.hotel,
        hotel_details: stay.hotel_details ?? undefined,
        hotel_address: stay.hotel_address ?? undefined,
        hotel_phone: stay.hotel_phone ?? undefined,
        hotel_website: stay.hotel_website ?? undefined,
        hotel_url: stay.hotel_url ?? undefined,
        hotel_checkin_date: patch.checkinDate,
        hotel_checkout_date: patch.checkoutDate,
        checkin_time: stay.checkin_time || null,
        checkout_time: stay.checkout_time || null,
        cost: stay.cost != null ? String(stay.cost) : null,
        currency: stay.currency ?? undefined,
        hotel_place_id: stay.hotel_place_id ?? undefined,
      };
      await updateAccommodation(stay.stay_id, formData);
      return;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/trip/calendar/calendarMutations.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/calendar/calendarMutations.ts src/components/trip/calendar/calendarMutations.test.ts
git commit -m "feat(calendar): apply drag/resize patches via minimal mutations"
```

---

### Task 9: `CalendarEventChip` — custom event renderer

**Files:**
- Create: `src/components/trip/calendar/CalendarEventChip.tsx`
- Test: `src/components/trip/calendar/CalendarEventChip.test.tsx`

**Interfaces:**
- Consumes: `EventContentArg` from `@fullcalendar/core`; `CalendarEntityType` from `./eventMapping`; lucide icons.
- Produces: `default` export `CalendarEventChip({ arg }: { arg: EventContentArg })`. Renders a leading type icon, the title, and (for timed events) the start time via FullCalendar's pre-formatted `arg.timeText`.

- [ ] **Step 1: Write the failing test**

`src/components/trip/calendar/CalendarEventChip.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CalendarEventChip from './CalendarEventChip';

function makeArg(overrides: Record<string, unknown>) {
  return {
    event: {
      title: 'Louvre',
      allDay: false,
      start: new Date(2026, 5, 30, 14, 30),
      extendedProps: { entityType: 'activity' },
      ...overrides,
    },
    timeText: '2:30pm',
  } as unknown as import('@fullcalendar/core').EventContentArg;
}

describe('CalendarEventChip', () => {
  it('renders the title and a type icon', () => {
    render(<CalendarEventChip arg={makeArg({})} />);
    expect(screen.getByText('Louvre')).toBeInTheDocument();
    expect(screen.getByTestId('chip-icon-activity')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/trip/calendar/CalendarEventChip.test.tsx`
Expected: FAIL with "Cannot find module './CalendarEventChip'".

- [ ] **Step 3: Write minimal implementation**

`src/components/trip/calendar/CalendarEventChip.tsx`:
```tsx
import React from 'react';
import type { EventContentArg } from '@fullcalendar/core';
import { MapPin, UtensilsCrossed, BedDouble, Plane } from 'lucide-react';
import type { CalendarEntityType } from './eventMapping';

const ICONS: Record<CalendarEntityType, React.ComponentType<{ className?: string }>> = {
  activity: MapPin,
  dining: UtensilsCrossed,
  accommodation: BedDouble,
  transportation: Plane,
};

const CalendarEventChip: React.FC<{ arg: EventContentArg }> = ({ arg }) => {
  const entityType = (arg.event.extendedProps as { entityType: CalendarEntityType }).entityType;
  const Icon = ICONS[entityType] ?? MapPin;
  return (
    <div className="flex items-center gap-1.5 px-1.5 py-0.5 min-w-0" data-entity-type={entityType}>
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden data-testid={`chip-icon-${entityType}`} />
      {!arg.event.allDay && arg.timeText && (
        <span className="text-[10px] font-medium tabular-nums opacity-70 shrink-0">{arg.timeText}</span>
      )}
      <span className="truncate font-sans text-xs">{arg.event.title}</span>
    </div>
  );
};

export default CalendarEventChip;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/trip/calendar/CalendarEventChip.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/calendar/CalendarEventChip.tsx src/components/trip/calendar/CalendarEventChip.test.tsx
git commit -m "feat(calendar): custom warm event chip renderer"
```

---

### Task 10: `CalendarToolbar` — view switcher + navigation

**Files:**
- Create: `src/components/trip/calendar/CalendarToolbar.tsx`
- Test: `src/components/trip/calendar/CalendarToolbar.test.tsx`

**Interfaces:**
- Consumes: `Button` from `@/components/ui/button`; `useIsMobile` from `@/hooks/use-mobile`.
- Produces: `default` export `CalendarToolbar` with props:
  ```ts
  export type CalendarViewName = 'timeGridDay' | 'timeGridThreeDay' | 'timeGridWeek' | 'dayGridMonth' | 'listDay';
  interface CalendarToolbarProps {
    title: string;
    activeView: CalendarViewName;
    onViewChange: (view: CalendarViewName) => void;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
  }
  ```
  Desktop shows a segmented control (Day / 3 Day / Week / Month); mobile shows a compact `<select>` (Day / 3 Day / Week / Month) where "Day" maps to `listDay`. `CalendarViewName` is the single source of truth for view names, imported by `TripCalendarView`.

- [ ] **Step 1: Write the failing test**

`src/components/trip/calendar/CalendarToolbar.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CalendarToolbar from './CalendarToolbar';

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

describe('CalendarToolbar (desktop)', () => {
  it('renders the title and switches views', () => {
    const onViewChange = vi.fn();
    render(<CalendarToolbar title="Jun 30 - Jul 6" activeView="timeGridWeek" onViewChange={onViewChange} onPrev={() => {}} onNext={() => {}} onToday={() => {}} />);
    expect(screen.getByText('Jun 30 - Jul 6')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Month' }));
    expect(onViewChange).toHaveBeenCalledWith('dayGridMonth');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/trip/calendar/CalendarToolbar.test.tsx`
Expected: FAIL with "Cannot find module './CalendarToolbar'".

- [ ] **Step 3: Write minimal implementation**

`src/components/trip/calendar/CalendarToolbar.tsx`:
```tsx
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

export type CalendarViewName = 'timeGridDay' | 'timeGridThreeDay' | 'timeGridWeek' | 'dayGridMonth' | 'listDay';

interface CalendarToolbarProps {
  title: string;
  activeView: CalendarViewName;
  onViewChange: (view: CalendarViewName) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

const DESKTOP_VIEWS: { label: string; view: CalendarViewName }[] = [
  { label: 'Day', view: 'timeGridDay' },
  { label: '3 Day', view: 'timeGridThreeDay' },
  { label: 'Week', view: 'timeGridWeek' },
  { label: 'Month', view: 'dayGridMonth' },
];

const MOBILE_VIEWS: { label: string; view: CalendarViewName }[] = [
  { label: 'Day', view: 'listDay' },
  { label: '3 Day', view: 'timeGridThreeDay' },
  { label: 'Week', view: 'timeGridWeek' },
  { label: 'Month', view: 'dayGridMonth' },
];

const CalendarToolbar: React.FC<CalendarToolbarProps> = ({ title, activeView, onViewChange, onPrev, onNext, onToday }) => {
  const isMobile = useIsMobile();
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Previous" onClick={onPrev}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={onToday}>Today</Button>
        <Button variant="ghost" size="icon" aria-label="Next" onClick={onNext}><ChevronRight className="h-4 w-4" /></Button>
        <h3 className="font-display text-lg tracking-tight text-foreground ml-1 truncate">{title}</h3>
      </div>
      {isMobile ? (
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          aria-label="Calendar view"
          value={activeView}
          onChange={(e) => onViewChange(e.target.value as CalendarViewName)}
        >
          {MOBILE_VIEWS.map((v) => <option key={v.view} value={v.view}>{v.label}</option>)}
        </select>
      ) : (
        <div className="inline-flex rounded-md border border-border bg-card p-0.5">
          {DESKTOP_VIEWS.map((v) => (
            <button
              key={v.view}
              type="button"
              onClick={() => onViewChange(v.view)}
              className={`px-3 py-1 text-sm rounded-[0.4rem] transition-colors ${activeView === v.view ? 'bg-sunset-500 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarToolbar;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/trip/calendar/CalendarToolbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/calendar/CalendarToolbar.tsx src/components/trip/calendar/CalendarToolbar.test.tsx
git commit -m "feat(calendar): responsive calendar toolbar and view switcher"
```

---

### Task 11: `TripCalendarView` render + theme (no interactions yet)

**Files:**
- Create: `src/components/trip/calendar/calendarTheme.css`
- Create: `src/components/trip/calendar/TripCalendarView.tsx`
- Test: `src/components/trip/calendar/TripCalendarView.test.tsx`

**Interfaces:**
- Consumes: FullCalendar plugins; `useCalendarEvents` (Task 6); `useCalendarRealtime` (Task 7); `CalendarToolbar` + `CalendarViewName` (Task 10); `CalendarEventChip` (Task 9); `addDays`, `format`, `parse` from `date-fns`. (The view title comes from FullCalendar's `arg.view.title` via `datesSet`; `CalendarToolbar` does its own `useIsMobile` internally.)
- Produces: `default` export `TripCalendarView` with props:
  ```ts
  interface TripCalendarViewProps {
    tripId: string;
    tripDates: { arrival_date: string | null; departure_date: string | null };
    destination?: string;
    canEdit?: boolean;
  }
  ```
  This task renders events read-only (drag/select disabled). Interactions are added in Task 12.

- [ ] **Step 1: Write the theme stylesheet**

`src/components/trip/calendar/calendarTheme.css`:
```css
/* Scoped warm editorial overrides for FullCalendar. Applied only under .wl-calendar. */
.wl-calendar {
  --fc-border-color: hsl(var(--border));
  --fc-page-bg-color: transparent;
  --fc-neutral-bg-color: hsl(var(--muted));
  --fc-today-bg-color: color-mix(in oklch, hsl(var(--sunset-500, 24 95% 53%)) 8%, transparent);
  --fc-now-indicator-color: hsl(24 95% 53%);
  --fc-event-border-color: transparent;
  --fc-small-font-size: 0.72rem;
  font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
}
.wl-calendar .fc .fc-col-header-cell-cushion,
.wl-calendar .fc .fc-list-day-text,
.wl-calendar .fc .fc-toolbar-title {
  font-family: 'DM Serif Display', ui-serif, Georgia, serif;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: hsl(var(--foreground));
}
.wl-calendar .fc .fc-daygrid-day-number,
.wl-calendar .fc .fc-timegrid-slot-label-cushion {
  color: hsl(var(--muted-foreground));
  font-size: 0.72rem;
}
.wl-calendar .fc-timegrid-slot { height: 2.6em; }
/* Warm tonal tints per entity type; sunset reserved for selected/focused. */
.wl-calendar .fc-event { border-radius: 0.375rem; box-shadow: var(--tw-shadow, 0 1px 2px rgba(80, 50, 20, 0.08)); }
.wl-calendar [data-entity-type="activity"] { background: #EEE7DA; color: hsl(var(--foreground)); }
.wl-calendar [data-entity-type="dining"] { background: #EDDDC8; color: hsl(var(--foreground)); }
.wl-calendar [data-entity-type="accommodation"] { background: #EDE8DD; color: hsl(var(--foreground)); }
.wl-calendar [data-entity-type="transportation"] { background: #FDFCF8; color: hsl(var(--foreground)); border: 1px solid hsl(var(--border)); }
.wl-calendar .fc-event.fc-event-selected [data-entity-type],
.wl-calendar .fc-event:focus [data-entity-type] { outline: 2px solid #F97316; outline-offset: 1px; }
/* Out-of-range day cells (outside the trip dates): de-emphasized and read as non-droppable. */
.wl-calendar .wl-out-of-range { background: hsl(var(--muted)); opacity: 0.5; }
/* Month density: warm "+N more" count link instead of default blue; multi-day bars stay visible. */
.wl-calendar .fc-daygrid-more-link { color: #F97316; font-weight: 500; font-size: 0.7rem; }
```
Note: the FullCalendar event background is set on the chip element (via `data-entity-type`), which fills the event box; the `.fc-event` container itself stays transparent through `--fc-event-border-color: transparent`.

- [ ] **Step 2: Write the failing smoke test**

`src/components/trip/calendar/TripCalendarView.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TripCalendarView from './TripCalendarView';

vi.mock('./useCalendarRealtime', () => ({ useCalendarRealtime: () => ({ isSubscribed: true }) }));
vi.mock('./useCalendarEvents', () => ({
  useCalendarEvents: () => ({
    isLoading: false,
    events: [{ id: 'activity:a1', title: 'Louvre', start: '2026-06-30T14:30:00', end: '2026-06-30T16:00:00', allDay: false, extendedProps: { entityType: 'activity', record: { id: 'a1' } } }],
  }),
}));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

describe('TripCalendarView', () => {
  it('renders a mapped event title', async () => {
    render(<TripCalendarView tripId="t1" tripDates={{ arrival_date: '2026-06-30', departure_date: '2026-07-06' }} />);
    expect(await screen.findByText('Louvre')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/trip/calendar/TripCalendarView.test.tsx`
Expected: FAIL with "Cannot find module './TripCalendarView'".

- [ ] **Step 4: Write minimal implementation**

`src/components/trip/calendar/TripCalendarView.tsx`:
```tsx
import React, { useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { addDays, format, parse } from 'date-fns';
import { useCalendarEvents } from './useCalendarEvents';
import { useCalendarRealtime } from './useCalendarRealtime';
import CalendarToolbar, { type CalendarViewName } from './CalendarToolbar';
import CalendarEventChip from './CalendarEventChip';
import './calendarTheme.css';

interface TripCalendarViewProps {
  tripId: string;
  tripDates: { arrival_date: string | null; departure_date: string | null };
  destination?: string;
  canEdit?: boolean;
}

/** FullCalendar validRange.end is exclusive; add a day so the departure date is visible. */
function exclusiveRangeEnd(departure: string): string {
  return format(addDays(parse(departure, 'yyyy-MM-dd', new Date()), 1), 'yyyy-MM-dd');
}

const TripCalendarView: React.FC<TripCalendarViewProps> = ({ tripId, tripDates }) => {
  const calendarRef = useRef<FullCalendar>(null);
  const { events, isLoading } = useCalendarEvents(tripId);
  useCalendarRealtime(tripId);

  // Lazy initializer reads viewport width on the FIRST render so the mobile default
  // (Day agenda) is correct at mount. useIsMobile() returns false on first render, so
  // seeding from it would mount Week even on phones.
  const [activeView, setActiveView] = useState<CalendarViewName>(
    () => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'listDay' : 'timeGridWeek'),
  );
  const [title, setTitle] = useState('');

  const api = () => calendarRef.current?.getApi();
  const changeView = (view: CalendarViewName) => { setActiveView(view); api()?.changeView(view); };

  const validRange = tripDates.arrival_date && tripDates.departure_date
    ? { start: tripDates.arrival_date, end: exclusiveRangeEnd(tripDates.departure_date) }
    : undefined;

  const isEmpty = !isLoading && events.length === 0;

  return (
    <div className="wl-calendar space-y-3">
      <CalendarToolbar
        title={title}
        activeView={activeView}
        onViewChange={changeView}
        onPrev={() => api()?.prev()}
        onNext={() => api()?.next()}
        onToday={() => api()?.today()}
      />
      {isEmpty && (
        <div className="rounded-card border border-dashed border-border bg-card/60 p-10 text-center">
          <p className="font-display text-xl text-foreground">Your itinerary is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Add your first stop from the timeline, then it will appear here.</p>
        </div>
      )}
      <div className={isEmpty ? 'opacity-40 pointer-events-none' : ''}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={activeView}
          headerToolbar={false}
          height="auto"
          firstDay={1}
          allDaySlot
          nowIndicator
          editable={false}
          selectable={false}
          validRange={validRange}
          events={events}
          eventContent={(arg) => <CalendarEventChip arg={arg} />}
          datesSet={(arg) => setTitle(arg.view.title)}
          dayCellClassNames={(arg) => {
            if (!tripDates.arrival_date || !tripDates.departure_date) return [];
            const d = format(arg.date, 'yyyy-MM-dd');
            return d < tripDates.arrival_date || d > tripDates.departure_date ? ['wl-out-of-range'] : [];
          }}
          views={{
            timeGridThreeDay: { type: 'timeGrid', duration: { days: 3 }, buttonText: '3 day' },
            dayGridMonth: { dayMaxEvents: 3 },
          }}
        />
      </div>
    </div>
  );
};

export default TripCalendarView;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/trip/calendar/TripCalendarView.test.tsx`
Expected: PASS. (FullCalendar renders in jsdom; if the event text is virtualized, the test asserts on `findByText` which waits for async render.)

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/trip/calendar/calendarTheme.css src/components/trip/calendar/TripCalendarView.tsx src/components/trip/calendar/TripCalendarView.test.tsx
git commit -m "feat(calendar): render themed FullCalendar with trip events (read-only)"
```

---

### Task 12: `TripCalendarView` interactions + `AddEntityPicker` + dialog wiring

**Files:**
- Create: `src/components/trip/calendar/AddEntityPicker.tsx`
- Modify: `src/components/trip/calendar/TripCalendarView.tsx`

**Interfaces:**
- Consumes: `applyDropPatch` (Task 8); `buildDropPatch`, `parseEventId`, `CalendarEntityType` (Task 4/2); the four existing dialogs — `ActivityDialog` (`@/components/trip/day/activities/ActivityDialog`), `AccommodationDialog` (`@/components/trip/accommodation/AccommodationDialog`), `TransportationDialog` (`@/components/trip/transportation/TransportationDialog`), `RestaurantReservationDialog` (`@/components/trip/dining/RestaurantReservationDialog`); `useQueryClient`; `toast` from `sonner`; `Tables` from `@/integrations/supabase/types`; `EventClickArg`, `DateSelectArg`, `EventApi` from `@fullcalendar/core`.
- Produces: `AddEntityPicker` (a small sheet of four "add" buttons) and a fully interactive `TripCalendarView`. Editing opens the matching existing dialog; empty-slot selection opens `AddEntityPicker`; drag/resize call `applyDropPatch` and invalidate the calendar's source queries, reverting on failure. Month view is navigate-only.

Contract facts verified in the codebase (do not deviate):
- `ActivityDialog` edit mode is triggered by a non-null `activityId`; it prefills its form from `initialData` treated as an `ActivityFormData`-shaped object (fields: `title`, `description`, `date` = `YYYY-MM-DD`, `start_time`/`end_time` = `HH:MM`, `cost` = string, `currency`, `location_*`). With no `onSubmit`, it persists itself by resolving `day_id` from `date`. For ADD, pass `preselectedDate` (date) and optionally `initialData` with `start_time`.
- `RestaurantReservationDialog` edit mode is triggered by `initialData.id`; pass the raw reservation row as `initialData`, plus `tripArrivalDate`/`tripDepartureDate`. It persists itself.
- `AccommodationDialog` / `TransportationDialog` take the raw row as `initialData` (edit) or nothing (add) and persist themselves; both auto-resolve trip dates.

- [ ] **Step 1: Write `AddEntityPicker`**

`src/components/trip/calendar/AddEntityPicker.tsx`:
```tsx
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MapPin, UtensilsCrossed, BedDouble, Plane } from 'lucide-react';
import type { CalendarEntityType } from './eventMapping';

interface AddEntityPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (type: CalendarEntityType) => void;
}

const OPTIONS: { type: CalendarEntityType; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'activity', label: 'Activity', Icon: MapPin },
  { type: 'dining', label: 'Dining', Icon: UtensilsCrossed },
  { type: 'accommodation', label: 'Hotel', Icon: BedDouble },
  { type: 'transportation', label: 'Transport', Icon: Plane },
];

const AddEntityPicker: React.FC<AddEntityPickerProps> = ({ open, onOpenChange, onPick }) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="rounded-t-2xl">
      <SheetHeader><SheetTitle className="font-display">Add to this date</SheetTitle></SheetHeader>
      <div className="grid grid-cols-2 gap-3 py-4">
        {OPTIONS.map(({ type, label, Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onPick(type)}
            className="flex flex-col items-center gap-2 rounded-card border border-border bg-card p-4 hover:border-sunset-400 transition-colors"
          >
            <Icon className="h-5 w-5 text-sunset-500" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </SheetContent>
  </Sheet>
);

export default AddEntityPicker;
```

- [ ] **Step 2: Wire interactions into `TripCalendarView`**

Replace the imports block and the component body of `src/components/trip/calendar/TripCalendarView.tsx` with the following (keeps `exclusiveRangeEnd` and props from Task 11):
```tsx
import React, { useCallback, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DateSelectArg, EventApi } from '@fullcalendar/core';
import { addDays, format, parse } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import { useCalendarEvents } from './useCalendarEvents';
import { useCalendarRealtime } from './useCalendarRealtime';
import CalendarToolbar, { type CalendarViewName } from './CalendarToolbar';
import CalendarEventChip from './CalendarEventChip';
import AddEntityPicker from './AddEntityPicker';
import { buildDropPatch, isDateWithinTripRange, type CalendarEntityType } from './eventMapping';
import { applyDropPatch } from './calendarMutations';
import ActivityDialog from '@/components/trip/day/activities/ActivityDialog';
import AccommodationDialog from '@/components/trip/accommodation/AccommodationDialog';
import TransportationDialog from '@/components/trip/transportation/TransportationDialog';
import RestaurantReservationDialog from '@/components/trip/dining/RestaurantReservationDialog';
import './calendarTheme.css';

interface TripCalendarViewProps {
  tripId: string;
  tripDates: { arrival_date: string | null; departure_date: string | null };
  destination?: string;
  canEdit?: boolean;
}

function exclusiveRangeEnd(departure: string): string {
  return format(addDays(parse(departure, 'yyyy-MM-dd', new Date()), 1), 'yyyy-MM-dd');
}

interface DropLikeArg { event: EventApi; revert: () => void; view: { type: string }; }
type EditState = { type: CalendarEntityType; record: Record<string, unknown>; date: string } | null;
type AddState = { date: string; time?: string } | null;

const TripCalendarView: React.FC<TripCalendarViewProps> = ({ tripId, tripDates, destination, canEdit = true }) => {
  const calendarRef = useRef<FullCalendar>(null);
  const queryClient = useQueryClient();
  const { events, isLoading } = useCalendarEvents(tripId);
  useCalendarRealtime(tripId);

  // Lazy initializer: read viewport width on first render so the mobile default (Day agenda)
  // is correct at mount (useIsMobile() would return false on the first render).
  const [activeView, setActiveView] = useState<CalendarViewName>(
    () => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'listDay' : 'timeGridWeek'),
  );
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState<EditState>(null);
  const [picker, setPicker] = useState<AddState>(null);
  const [adding, setAdding] = useState<{ type: CalendarEntityType; date: string; time?: string } | null>(null);

  const api = () => calendarRef.current?.getApi();
  const changeView = (view: CalendarViewName) => { setActiveView(view); api()?.changeView(view); };

  const invalidateAll = useCallback(() => {
    ['trip-days', 'accommodations', 'transportation', 'reservations', 'trip'].forEach((k) =>
      queryClient.invalidateQueries({ queryKey: [k, tripId] }));
    queryClient.invalidateQueries({ queryKey: ['reservations', tripId] });
  }, [queryClient, tripId]);

  const handleDrop = useCallback(async (info: DropLikeArg) => {
    if (!canEdit || !info.event.start) { info.revert(); return; }
    // Month is navigate-only; never mutate from a Month drag/resize (belt-and-suspenders alongside the per-view editable:false).
    if (info.view.type === 'dayGridMonth') { info.revert(); return; }
    // Reject drops/resizes that land outside the trip range (belt-and-suspenders alongside eventConstraint).
    const startDate = format(info.event.start, 'yyyy-MM-dd');
    if (tripDates.arrival_date && tripDates.departure_date && !isDateWithinTripRange(startDate, tripDates.arrival_date, tripDates.departure_date)) {
      toast.error('That date is outside the trip');
      info.revert();
      return;
    }
    const record = (info.event.extendedProps as { record: Record<string, unknown> }).record;
    try {
      const patch = buildDropPatch({ eventId: info.event.id, newStart: info.event.start, newEnd: info.event.end ?? null, allDay: info.event.allDay });
      await applyDropPatch(patch, tripId, record);
      invalidateAll();
    } catch (e) {
      console.error(e);
      toast.error('Could not move that item');
      info.revert();
    }
  }, [canEdit, tripId, tripDates, invalidateAll]);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const date = info.event.start ? format(info.event.start, 'yyyy-MM-dd') : '';
    if (info.view.type === 'dayGridMonth') { if (info.event.start) api()?.changeView('timeGridDay', info.event.start); return; }
    const { entityType, record } = info.event.extendedProps as { entityType: CalendarEntityType; record: Record<string, unknown> };
    setEditing({ type: entityType, record, date });
  }, []);

  const handleSelect = useCallback((info: DateSelectArg) => {
    if (!canEdit) return;
    if (info.view.type === 'dayGridMonth') { api()?.changeView('timeGridDay', info.start); return; }
    setPicker({ date: format(info.start, 'yyyy-MM-dd'), time: info.allDay ? undefined : format(info.start, 'HH:mm') });
  }, [canEdit]);

  const validRange = tripDates.arrival_date && tripDates.departure_date
    ? { start: tripDates.arrival_date, end: exclusiveRangeEnd(tripDates.departure_date) }
    : undefined;
  const dialogTripDates = { arrival_date: tripDates.arrival_date ?? '', departure_date: tripDates.departure_date ?? '' };
  const isEmpty = !isLoading && events.length === 0;

  const closeAndRefresh = () => { setEditing(null); setAdding(null); invalidateAll(); };

  // Build ActivityFormData-shaped initialData for the activity edit dialog.
  const activityInitial = editing?.type === 'activity' ? (() => {
    const r = editing.record as Tables<'day_activities'>;
    return {
      title: r.title ?? '', description: r.description ?? '', date: editing.date,
      start_time: r.start_time ? String(r.start_time).slice(0, 5) : '',
      end_time: r.end_time ? String(r.end_time).slice(0, 5) : '',
      cost: r.cost != null ? String(r.cost) : null,
      currency: (r.currency as string) ?? 'USD',
      location_address: r.location_address ?? null, location_place_id: r.location_place_id ?? null,
      location_phone: r.location_phone ?? null, location_website: r.location_website ?? null, location_rating: r.location_rating ?? null,
    };
  })() : null;

  return (
    <div className="wl-calendar space-y-3">
      <CalendarToolbar title={title} activeView={activeView} onViewChange={changeView} onPrev={() => api()?.prev()} onNext={() => api()?.next()} onToday={() => api()?.today()} />
      {isEmpty && (
        <div className="rounded-card border border-dashed border-border bg-card/60 p-10 text-center">
          <p className="font-display text-xl text-foreground">Your itinerary is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Tap a day to add your first stop.</p>
        </div>
      )}
      <div className={isEmpty ? 'opacity-40' : ''}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={activeView}
          headerToolbar={false}
          height="auto"
          firstDay={1}
          allDaySlot
          nowIndicator
          editable={canEdit}
          eventStartEditable={canEdit}
          eventDurationEditable={canEdit}
          selectable={canEdit}
          selectMirror
          validRange={validRange}
          events={events}
          eventContent={(arg) => <CalendarEventChip arg={arg} />}
          datesSet={(arg) => setTitle(arg.view.title)}
          eventClick={handleEventClick}
          eventDrop={handleDrop}
          eventResize={handleDrop}
          select={handleSelect}
          eventConstraint={validRange}
          selectConstraint={validRange}
          dayCellClassNames={(arg) => {
            if (!tripDates.arrival_date || !tripDates.departure_date) return [];
            const d = format(arg.date, 'yyyy-MM-dd');
            return d < tripDates.arrival_date || d > tripDates.departure_date ? ['wl-out-of-range'] : [];
          }}
          views={{
            timeGridThreeDay: { type: 'timeGrid', duration: { days: 3 }, buttonText: '3 day' },
            dayGridMonth: { editable: false, selectable: false, dayMaxEvents: 3 },
          }}
        />
      </div>

      <AddEntityPicker
        open={!!picker}
        onOpenChange={(o) => { if (!o) setPicker(null); }}
        onPick={(type) => { if (picker) setAdding({ type, date: picker.date, time: picker.time }); setPicker(null); }}
      />

      {/* Edit dialogs */}
      {editing?.type === 'activity' && activityInitial && (
        <ActivityDialog open onOpenChange={(o) => { if (!o) closeAndRefresh(); }} tripId={tripId} activityId={(editing.record as Tables<'day_activities'>).id}
          initialData={activityInitial as unknown as Partial<Tables<'day_activities'>>} tripDates={dialogTripDates} destination={destination}
          onSuccess={closeAndRefresh} />
      )}
      {editing?.type === 'dining' && (
        <RestaurantReservationDialog open onOpenChange={(o) => { if (!o) closeAndRefresh(); }} tripId={tripId}
          initialData={editing.record as Partial<Tables<'reservations'>>} tripArrivalDate={dialogTripDates.arrival_date} tripDepartureDate={dialogTripDates.departure_date}
          destination={destination} onSuccess={closeAndRefresh} />
      )}
      {editing?.type === 'accommodation' && (
        <AccommodationDialog open onOpenChange={(o) => { if (!o) closeAndRefresh(); }} tripId={tripId}
          initialData={editing.record as unknown as Tables<'accommodations'>} destination={destination} onSuccess={closeAndRefresh} />
      )}
      {editing?.type === 'transportation' && (
        <TransportationDialog open onOpenChange={(o) => { if (!o) closeAndRefresh(); }} tripId={tripId}
          initialData={editing.record as Partial<Tables<'transportation'>>} onSuccess={closeAndRefresh} />
      )}

      {/* Add dialogs */}
      {adding?.type === 'activity' && (
        <ActivityDialog open onOpenChange={(o) => { if (!o) closeAndRefresh(); }} tripId={tripId} preselectedDate={adding.date}
          initialData={(adding.time ? { start_time: adding.time } : {}) as unknown as Partial<Tables<'day_activities'>>}
          tripDates={dialogTripDates} destination={destination} onSuccess={closeAndRefresh} />
      )}
      {adding?.type === 'dining' && (
        <RestaurantReservationDialog open onOpenChange={(o) => { if (!o) closeAndRefresh(); }} tripId={tripId}
          initialData={adding.time ? ({ reservation_time: `${adding.time}:00` } as Partial<Tables<'reservations'>>) : undefined}
          tripArrivalDate={dialogTripDates.arrival_date} tripDepartureDate={dialogTripDates.departure_date} destination={destination} onSuccess={closeAndRefresh} />
      )}
      {adding?.type === 'accommodation' && (
        <AccommodationDialog open onOpenChange={(o) => { if (!o) closeAndRefresh(); }} tripId={tripId} destination={destination} onSuccess={closeAndRefresh} />
      )}
      {adding?.type === 'transportation' && (
        <TransportationDialog open onOpenChange={(o) => { if (!o) closeAndRefresh(); }} tripId={tripId} onSuccess={closeAndRefresh} />
      )}
    </div>
  );
};

export default TripCalendarView;
```

- [ ] **Step 3: Type-check and run the existing calendar tests**

Run: `npx tsc --noEmit && npx vitest run src/components/trip/calendar/`
Expected: PASS. The Task 11 smoke test still passes (it does not exercise interactions).

- [ ] **Step 4: Manual verification checklist (dev server)**

Run `npm run dev`, open a trip, switch to Calendar. Verify: an event opens the correct edit dialog; dragging a timed activity to a new time persists (survives refresh); dragging a hotel bar to new dates persists and the accommodation days re-sync; selecting an empty slot opens the Add picker and the chosen dialog prefills the date/time; Month view taps jump to Day; dragging or resizing in Month does NOT mutate (it reverts); dragging an event onto a date outside the trip range is rejected with a toast and reverts; on a phone-width viewport the calendar opens in the Day agenda list by default; Month view shows multi-day bars plus a warm "+N more" count on busy days.

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/calendar/AddEntityPicker.tsx src/components/trip/calendar/TripCalendarView.tsx
git commit -m "feat(calendar): drag/resize mutations, click-to-edit, and add picker"
```

---

### Task 13: Mobile bottom-sheet variant for reused dialogs

**Files:**
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/trip/day/activities/ActivityDialog.tsx:260`
- Modify: `src/components/trip/accommodation/AccommodationDialog.tsx:135`
- Modify: `src/components/trip/transportation/TransportationDialog.tsx:141`
- Modify: `src/components/trip/dining/RestaurantReservationDialog.tsx:126`

**Interfaces:**
- Produces: `DialogContent` gains an optional `mobileSheet?: boolean` prop (default `false` → unchanged centered modal). When `true`, on viewports `< 640px` the content docks to the bottom as a rounded sheet and slides up; at `sm:` and above it is the normal centered dialog. The four reused entity dialogs pass `mobileSheet`.

- [ ] **Step 1: Add the `mobileSheet` prop to `DialogContent`**

In `src/components/ui/dialog.tsx`, change the `DialogContent` definition so it accepts `mobileSheet` and selects a class set. Replace the component (lines 30-56) with:
```tsx
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { mobileSheet?: boolean }
>(({ className, children, onOpenAutoFocus, mobileSheet = false, ...props }, ref) => {
  const centered =
    "fixed left-[50%] top-[50%] z-[250] flex flex-col w-[95vw] max-w-[95vw] sm:max-w-[600px] max-h-[90dvh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-4 sm:p-6 shadow-warm-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg";
  const sheet =
    "fixed inset-x-0 bottom-0 top-auto z-[250] flex flex-col w-full max-w-full max-h-[92dvh] gap-4 border border-b-0 bg-background p-4 shadow-warm-lg duration-200 rounded-t-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:inset-x-auto sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-[95vw] sm:max-w-[600px] sm:p-6 sm:rounded-lg sm:border-b sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95";
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        onOpenAutoFocus={(e) => { e.preventDefault(); onOpenAutoFocus?.(e); }}
        className={cn(mobileSheet ? sheet : centered, className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;
```

- [ ] **Step 2: Opt the four entity dialogs into the sheet**

Add `mobileSheet` to each dialog's `<DialogContent ...>` opening tag:
- `ActivityDialog.tsx:260` — `<DialogContent mobileSheet onPointerDownOutside={(e) => e.preventDefault()}>`
- `AccommodationDialog.tsx:135` — add `mobileSheet` as the first attribute of the `<DialogContent` element.
- `TransportationDialog.tsx:141` — `<DialogContent mobileSheet onPointerDownOutside={(e) => e.preventDefault()}>`
- `RestaurantReservationDialog.tsx:126` — `<DialogContent mobileSheet onPointerDownOutside={(e) => e.preventDefault()}>`

- [ ] **Step 3: Type-check and run the full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS (the default `mobileSheet=false` keeps every other dialog in the app unchanged).

- [ ] **Step 4: Manual verification**

In the browser device toolbar at 390px width, open each of the four dialogs from the calendar. Confirm each docks to the bottom with a rounded top and slides up; at desktop width each is the normal centered dialog.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/dialog.tsx src/components/trip/day/activities/ActivityDialog.tsx src/components/trip/accommodation/AccommodationDialog.tsx src/components/trip/transportation/TransportationDialog.tsx src/components/trip/dining/RestaurantReservationDialog.tsx
git commit -m "feat(ui): opt-in bottom-sheet dialog variant for mobile entity dialogs"
```

---

### Task 14: Timeline↔Calendar toggle in `TimelineView` (lazy-load + defaults)

**Files:**
- Modify: `src/components/trip/TimelineView.tsx`

**Interfaces:**
- Consumes: `TripCalendarView` (Task 11/12) via `React.lazy`; `useIsMobile`; existing `TimelineContent` render path.
- Produces: a segmented Timeline / Calendar toggle in the existing header actions row; when Calendar is active, `TimelineContent` is replaced by a `Suspense`-wrapped lazy `TripCalendarView`. The AI assistant column is unchanged. Default active view: Calendar off (Timeline) on first load; toggling to Calendar mounts the lazy chunk.

- [ ] **Step 1: Add lazy import + state**

At the top of `src/components/trip/TimelineView.tsx`, add to the React import and new imports:
```tsx
import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { CalendarDays, ListTree } from 'lucide-react';
const TripCalendarView = lazy(() => import('./calendar/TripCalendarView'));
```

Inside the component, after the existing `useState` declarations (near line 53), add:
```tsx
const [itineraryView, setItineraryView] = useState<'timeline' | 'calendar'>('timeline');
```

- [ ] **Step 2: Add the toggle to the header actions**

In the header actions `div` (currently containing Share + `ExportPdfButton`, lines 209-219), insert this segmented toggle as the FIRST child of that `div`:
```tsx
<div className="inline-flex rounded-md border border-border bg-card p-0.5 mr-1">
  <button
    type="button"
    aria-pressed={itineraryView === 'timeline'}
    onClick={() => setItineraryView('timeline')}
    className={`flex items-center gap-1 px-2.5 py-1 text-sm rounded-[0.4rem] transition-colors ${itineraryView === 'timeline' ? 'bg-sunset-500 text-white' : 'text-muted-foreground hover:text-foreground'}`}
  >
    <ListTree className="h-3.5 w-3.5" /><span className="hidden sm:inline">Timeline</span>
  </button>
  <button
    type="button"
    aria-pressed={itineraryView === 'calendar'}
    onClick={() => setItineraryView('calendar')}
    className={`flex items-center gap-1 px-2.5 py-1 text-sm rounded-[0.4rem] transition-colors ${itineraryView === 'calendar' ? 'bg-sunset-500 text-white' : 'text-muted-foreground hover:text-foreground'}`}
  >
    <CalendarDays className="h-3.5 w-3.5" /><span className="hidden sm:inline">Calendar</span>
  </button>
</div>
```

- [ ] **Step 3: Conditionally render calendar vs timeline**

Replace the `<TimelineContent .../>` element (lines 228-238) with:
```tsx
{itineraryView === 'calendar' ? (
  <Suspense fallback={<div className="py-16 text-center text-sm text-muted-foreground">Loading calendar…</div>}>
    <TripCalendarView
      tripId={tripId}
      tripDates={{ arrival_date: localTripDates.arrival_date, departure_date: localTripDates.departure_date }}
      destination={tripDestination}
      canEdit={canEdit}
    />
  </Suspense>
) : (
  <TimelineContent
    days={days}
    dayIndexMap={new Map(days?.map((day, index) => [day.day_id, index + 1]) || [])}
    hotelStays={processedHotelStays}
    onDayDelete={handleDayDelete}
    tripArrivalDate={localTripDates.arrival_date || undefined}
    tripDepartureDate={localTripDates.departure_date || undefined}
    canEdit={canEdit}
    weather={weather}
    tripDestination={tripDestination}
  />
)}
```

- [ ] **Step 4: Type-check and build**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run build`
Expected: build succeeds and produces a separate chunk for FullCalendar (its modules are only reachable through the `lazy(() => import('./calendar/TripCalendarView'))` boundary). Confirm the build output lists a distinct async chunk.

- [ ] **Step 5: Manual verification**

Load a trip's timeline: it shows the vertical timeline by default. Toggle Calendar: the FullCalendar chunk loads and events appear. Toggle back to Timeline: no reload of the calendar chunk needed. On a mobile viewport the default calendar view is the Day agenda list.

- [ ] **Step 6: Commit**

```bash
git add src/components/trip/TimelineView.tsx
git commit -m "feat(calendar): Timeline/Calendar toggle with lazy-loaded calendar view"
```

---

## Self-Review Notes

- **Spec coverage:** Toggle (T14), Day/3-Day/Week/Month (T10/T11), mobile agenda `listDay` (T10/T11/T14) with a first-render-correct default (T11/T12 lazy initializer), full drag-to-edit + create (T8/T12), all four entity types mapped (T2/T3), month-as-navigator with no-edit + count density (T11/T12), validRange clamp + out-of-range de-emphasis + drop rejection with unit-tested `isDateWithinTripRange` (T4/T11/T12), warm theme + editorial type + icons (T9/T11), empty state (T11/T12), reuse of existing dialogs and mutations (T12), mobile bottom sheets (T13), lazy loading (T14), realtime (T7). Expenses correctly excluded (no mapper).
- **Deferred to Plan 2 (iCal sync):** the "Add to calendar" action and feed are a separate, independently shippable subsystem.
- **Explicit v1 non-goals (see Global Constraints):** traveler avatars on chips and drag-select creation of multi-day spans are deferred by design, recorded up front so a reviewer signs off on the reduced scope rather than discovering it in a footnote.
