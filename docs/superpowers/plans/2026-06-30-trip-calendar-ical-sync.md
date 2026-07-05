# Trip Calendar iCal Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Sequencing:** This is Phase 2 of the trip calendar feature. It is independent of and can ship after `2026-06-30-trip-calendar-view.md` (Phase 1). Task 6 adds a button to the same `TimelineView` header row Phase 1 touches; do Phase 1 first to avoid a merge conflict, or reconcile the header block if done out of order.

**Goal:** Let a user subscribe a trip's itinerary into Google / Apple / Outlook via a token-gated, auto-refreshing iCalendar feed, with a one-time `.ics` download fallback and a revoke/reset action.

**Architecture:** One-way (trip → calendar). A pure `server/lib/icalFeed.ts` builds the ICS text with stable per-entity UIDs and floating (timezone-less) times. An Express route serves `GET /api/trips/:tripId/calendar.ics?token=…` using the service-role Supabase client, authorizing the request itself by comparing the query token to `trips.calendar_feed_token` (service role bypasses RLS, so the route must do its own check). A client hook provisions/resets the token by updating the owner's own trip row (RLS-guarded); a sheet UI surfaces the subscribe URL, instructions, download, and reset.

**Tech Stack:** Express 5, `@supabase/supabase-js` (service role), `ical-generator` v8, Vitest, React + TanStack Query, Supabase JS (client, owner session).

## Global Constraints

- **Package manager:** `bun` is NOT on PATH. Use `npm install <pkgs>` to add deps; `npx tsc --noEmit` and `npx vitest run <file>` for tooling.
- **Service-role secrecy:** `SUPABASE_SERVICE_ROLE_KEY` is server-only and bypasses RLS. It must never reach the client. The feed route MUST validate the token itself before returning any data.
- **Floating times:** the feed emits times with NO `Z` and NO `TZID` so they display in destination-local time on any device. There is no per-trip timezone. Build floating datetimes via `Date.UTC(...)` so ICS output is deterministic regardless of server timezone.
- **Stable UIDs:** every VEVENT UID is `` `${entityType}-${recordId}@wanderluxe.io` `` so calendar clients update in place instead of duplicating.
- **All-day / multi-day** events use DATE values with an EXCLUSIVE end (last inclusive date + 1 day), matching iCal semantics.
- **Entities in the feed:** activities, dining, accommodations, transportation. Expenses are excluded.
- **Copy:** no em dashes.
- **URL scheme:** subscribe links use `webcal://<host>/...`; download links use `https://<host>/...`. Host comes from `window.location.host` on the client (no new env var).

---

### Task 1: Migration — add feed columns to `trips`

**Files:**
- Create: `supabase/migrations/20260630000000_calendar_feed.sql`
- Modify: `src/integrations/supabase/types/database.ts` (trips Row/Insert/Update)

**Interfaces:**
- Produces: `trips.calendar_feed_token text` (nullable) and `trips.calendar_feed_enabled boolean NOT NULL DEFAULT false`. No RLS change: owners already select/update their own trips; the feed route reads via service role.

- [ ] **Step 1: Write the migration**

`supabase/migrations/20260630000000_calendar_feed.sql`:
```sql
-- Calendar sync: token-gated iCal feed per trip
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS calendar_feed_token text,
  ADD COLUMN IF NOT EXISTS calendar_feed_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN trips.calendar_feed_token IS 'Unguessable token gating the public iCal feed; null until enabled. Reset to revoke subscriptions.';
COMMENT ON COLUMN trips.calendar_feed_enabled IS 'When true, GET /api/trips/:id/calendar.ics?token= serves the feed.';

-- Optional: index for token lookups (feed route queries by trip_id, so this is a safety net for token-based debugging).
CREATE INDEX IF NOT EXISTS idx_trips_calendar_feed_token ON trips (calendar_feed_token) WHERE calendar_feed_token IS NOT NULL;
```

- [ ] **Step 2: Apply the migration**

The Supabase CLI is linked in this repo (`supabase/.temp/linked-project.json`, project ref `arnengxblsfnezrqcsxw`).

Run: `npx supabase db push`
Expected: the CLI reports `20260630000000_calendar_feed.sql` applied, no errors.

Verify the columns exist — Run:
```bash
npx supabase db execute --linked "select column_name from information_schema.columns where table_name = 'trips' and column_name in ('calendar_feed_token','calendar_feed_enabled');"
```
Expected: two rows (`calendar_feed_token`, `calendar_feed_enabled`). If your CLI version lacks `db execute`, run the same SQL in the Supabase dashboard SQL editor.

- [ ] **Step 3: Regenerate the generated types**

Run: `npx supabase gen types typescript --linked > src/integrations/supabase/types/database.ts`
Expected: `git diff src/integrations/supabase/types/database.ts` shows ONLY the two new fields added to the `trips` table's `Row`/`Insert`/`Update` (`calendar_feed_token`, `calendar_feed_enabled`). If the diff includes unrelated schema drift, discard it (`git checkout -- src/integrations/supabase/types/database.ts`) and hand-edit the `trips` block instead:
- `Row`: add `calendar_feed_token: string | null` and `calendar_feed_enabled: boolean`
- `Insert`: add `calendar_feed_token?: string | null` and `calendar_feed_enabled?: boolean`
- `Update`: add `calendar_feed_token?: string | null` and `calendar_feed_enabled?: boolean`

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260630000000_calendar_feed.sql src/integrations/supabase/types/database.ts
git commit -m "feat(calendar): add calendar_feed_token/enabled columns to trips"
```

---

### Task 2: Add `ical-generator` dependency

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: importable `ical-generator` at `^8.0.1` (server-only).

- [ ] **Step 1: Install**

Run:
```bash
cd /Users/reminiscent/wanderluxe
npm install ical-generator@^8.0.1
```

- [ ] **Step 2: Verify import resolves**

Create `server/lib/_ical_check.ts`:
```ts
import ical from 'ical-generator';
export const _c = typeof ical;
```
Run: `npx tsc --noEmit`
Expected: PASS. Then delete: `rm server/lib/_ical_check.ts`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json 2>/dev/null; git add package.json
git commit -m "build(calendar): add ical-generator for the iCal feed"
```

---

### Task 3: `icalFeed` — pure ICS builder + authorization guard

**Files:**
- Create: `server/lib/icalFeed.ts`
- Test: `server/lib/icalFeed.test.ts`

**Interfaces:**
- Consumes: `ical` from `ical-generator`.
- Produces:
  - Feed input types `FeedTrip`, `FeedActivity`, `FeedReservation`, `FeedAccommodation`, `FeedTransportation`, `FeedInput` (shapes below).
  - `buildTripCalendarICS(input: FeedInput): string`
  - `isFeedAuthorized(trip: { calendar_feed_enabled: boolean | null; calendar_feed_token: string | null }, token: string): boolean`

- [ ] **Step 1: Write the failing test**

`server/lib/icalFeed.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildTripCalendarICS, isFeedAuthorized, type FeedInput } from './icalFeed';

const input: FeedInput = {
  trip: { destination: 'Paris' },
  activities: [{ id: 'a1', title: 'Louvre', date: '2026-06-30', start_time: '14:30:00', end_time: '16:00:00', description: 'Tickets booked', location_address: 'Rue de Rivoli' }],
  reservations: [{ id: 'r1', restaurant_name: 'Septime', date: '2026-07-01', reservation_time: '20:00:00', address: '80 Rue de Charonne', notes: null }],
  accommodations: [{ stay_id: 's1', hotel: 'Hotel Lutetia', hotel_checkin_date: '2026-06-30', hotel_checkout_date: '2026-07-03', hotel_address: '45 Bd Raspail', hotel_details: 'Deluxe room, breakfast included' }],
  transportation: [{ id: 't1', type: 'flight', start_date: '2026-06-30', start_time: '09:00:00', end_date: '2026-06-30', end_time: '11:30:00', departure_location: 'JFK', arrival_location: 'CDG', provider: 'Air France', details: 'AF17, seat 12A' }],
};

describe('buildTripCalendarICS', () => {
  const ics = buildTripCalendarICS(input);
  it('emits a VCALENDAR with the trip name', () => {
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
  });
  it('uses stable per-entity UIDs', () => {
    expect(ics).toContain('UID:activity-a1@wanderluxe.io');
    expect(ics).toContain('UID:dining-r1@wanderluxe.io');
    expect(ics).toContain('UID:accommodation-s1@wanderluxe.io');
    expect(ics).toContain('UID:transportation-t1@wanderluxe.io');
  });
  it('emits floating timed events (no Z, no TZID)', () => {
    expect(ics).toContain('DTSTART:20260630T143000');
    expect(ics).toContain('DTEND:20260630T160000');
    expect(ics).not.toMatch(/DTSTART:20260630T143000Z/);
  });
  it('emits all-day accommodation with exclusive end date', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20260630');
    expect(ics).toContain('DTEND;VALUE=DATE:20260704');
  });
  it('includes summaries', () => {
    expect(ics).toContain('SUMMARY:Louvre');
    expect(ics).toContain('SUMMARY:Septime');
    expect(ics).toContain('SUMMARY:Flight: JFK to CDG');
  });
  it('populates descriptions for accommodations and transportation where available', () => {
    expect(ics).toContain('DESCRIPTION:Deluxe room');
    expect(ics).toContain('DESCRIPTION:AF17');
  });
});

describe('isFeedAuthorized', () => {
  it('allows a matching enabled token', () => {
    expect(isFeedAuthorized({ calendar_feed_enabled: true, calendar_feed_token: 'abc' }, 'abc')).toBe(true);
  });
  it('rejects a wrong token', () => {
    expect(isFeedAuthorized({ calendar_feed_enabled: true, calendar_feed_token: 'abc' }, 'xyz')).toBe(false);
  });
  it('rejects when disabled even if the token matches', () => {
    expect(isFeedAuthorized({ calendar_feed_enabled: false, calendar_feed_token: 'abc' }, 'abc')).toBe(false);
  });
  it('rejects an empty token or a revoked (null) token', () => {
    expect(isFeedAuthorized({ calendar_feed_enabled: true, calendar_feed_token: 'abc' }, '')).toBe(false);
    expect(isFeedAuthorized({ calendar_feed_enabled: true, calendar_feed_token: null }, 'abc')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/lib/icalFeed.test.ts`
Expected: FAIL with "Cannot find module './icalFeed'".

- [ ] **Step 3: Write minimal implementation**

`server/lib/icalFeed.ts`:
```ts
import ical from 'ical-generator';

export interface FeedTrip { destination: string; }
export interface FeedActivity { id: string; title: string; date: string; start_time: string | null; end_time: string | null; description: string | null; location_address: string | null; }
export interface FeedReservation { id: string; restaurant_name: string; date: string; reservation_time: string | null; address: string | null; notes: string | null; }
export interface FeedAccommodation { stay_id: string; hotel: string; hotel_checkin_date: string; hotel_checkout_date: string; hotel_address: string | null; hotel_details: string | null; }
export interface FeedTransportation { id: string; type: string; start_date: string; start_time: string | null; end_date: string | null; end_time: string | null; departure_location: string | null; arrival_location: string | null; provider: string | null; details: string | null; }
export interface FeedInput {
  trip: FeedTrip;
  activities: FeedActivity[];
  reservations: FeedReservation[];
  accommodations: FeedAccommodation[];
  transportation: FeedTransportation[];
}

export function isFeedAuthorized(
  trip: { calendar_feed_enabled: boolean | null; calendar_feed_token: string | null },
  token: string,
): boolean {
  return !!token && !!trip.calendar_feed_enabled && !!trip.calendar_feed_token && trip.calendar_feed_token === token;
}

/** Build a Date whose UTC fields equal the wall-clock; with `floating:true` this serialises without Z. */
function floatingDate(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.slice(0, 5).split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
}
function dateOnly(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function plusOneDay(date: string): Date {
  const base = dateOnly(date);
  return new Date(base.getTime() + 24 * 60 * 60 * 1000);
}
function transportTitle(t: FeedTransportation): string {
  const label = t.type ? t.type.charAt(0).toUpperCase() + t.type.slice(1) : 'Transport';
  if (t.departure_location && t.arrival_location) return `${label}: ${t.departure_location} to ${t.arrival_location}`;
  // Mirror the in-app calendar's fallback so a subscribed feed shows the same summary.
  return t.provider ? `${label} · ${t.provider}` : label;
}

export function buildTripCalendarICS(input: FeedInput): string {
  const cal = ical({ name: `${input.trip.destination} Itinerary` });
  cal.prodId({ company: 'WanderLuxe', product: 'Itinerary', language: 'EN' });

  for (const a of input.activities) {
    if (!a.date) continue;
    if (a.start_time) {
      cal.createEvent({
        id: `activity-${a.id}@wanderluxe.io`,
        start: floatingDate(a.date, a.start_time),
        end: a.end_time ? floatingDate(a.date, a.end_time) : floatingDate(a.date, a.start_time),
        floating: true,
        summary: a.title,
        location: a.location_address ?? undefined,
        description: a.description ?? undefined,
      });
    } else {
      cal.createEvent({ id: `activity-${a.id}@wanderluxe.io`, start: dateOnly(a.date), end: plusOneDay(a.date), allDay: true, summary: a.title, location: a.location_address ?? undefined, description: a.description ?? undefined });
    }
  }

  for (const r of input.reservations) {
    if (!r.date) continue;
    if (r.reservation_time) {
      cal.createEvent({ id: `dining-${r.id}@wanderluxe.io`, start: floatingDate(r.date, r.reservation_time), end: floatingDate(r.date, r.reservation_time), floating: true, summary: r.restaurant_name, location: r.address ?? undefined, description: r.notes ?? undefined });
    } else {
      cal.createEvent({ id: `dining-${r.id}@wanderluxe.io`, start: dateOnly(r.date), end: plusOneDay(r.date), allDay: true, summary: r.restaurant_name, location: r.address ?? undefined, description: r.notes ?? undefined });
    }
  }

  for (const s of input.accommodations) {
    if (!s.hotel_checkin_date || !s.hotel_checkout_date) continue;
    cal.createEvent({ id: `accommodation-${s.stay_id}@wanderluxe.io`, start: dateOnly(s.hotel_checkin_date), end: plusOneDay(s.hotel_checkout_date), allDay: true, summary: `Stay: ${s.hotel}`, location: s.hotel_address ?? undefined, description: s.hotel_details ?? undefined });
  }

  for (const t of input.transportation) {
    if (!t.start_date) continue;
    const sameDay = !t.end_date || t.end_date === t.start_date;
    if (sameDay && t.start_time) {
      cal.createEvent({ id: `transportation-${t.id}@wanderluxe.io`, start: floatingDate(t.start_date, t.start_time), end: t.end_time ? floatingDate(t.start_date, t.end_time) : floatingDate(t.start_date, t.start_time), floating: true, summary: transportTitle(t), location: t.departure_location ?? undefined, description: t.details ?? undefined });
    } else {
      cal.createEvent({ id: `transportation-${t.id}@wanderluxe.io`, start: dateOnly(t.start_date), end: plusOneDay(t.end_date ?? t.start_date), allDay: true, summary: transportTitle(t), location: t.departure_location ?? undefined, description: t.details ?? undefined });
    }
  }

  return cal.toString();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/lib/icalFeed.test.ts`
Expected: PASS. (If `ical-generator` v8's all-day serialization differs on the DATE format, adjust the assertions to match the library's exact `DTSTART;VALUE=DATE:` output; the floating and UID assertions are the load-bearing ones.)

- [ ] **Step 5: Commit**

```bash
git add server/lib/icalFeed.ts server/lib/icalFeed.test.ts
git commit -m "feat(calendar): pure iCal builder with floating times and stable UIDs"
```

---

### Task 4: Express route `/api/trips/:tripId/calendar.ics`

**Files:**
- Create: `server/routes/calendar.ts`
- Modify: `server/routes/index.ts`

**Interfaces:**
- Consumes: `createClient` from `@supabase/supabase-js`; `buildTripCalendarICS`, `isFeedAuthorized`, `FeedInput` from `../lib/icalFeed`.
- Produces: a `Router` serving `GET /api/trips/:tripId/calendar.ics?token=…` (200 `text/calendar` when authorized; 403 otherwise; 500 on error), registered in `server/routes/index.ts`.

- [ ] **Step 1: Write the route**

`server/routes/calendar.ts`:
```ts
import { Router, Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { buildTripCalendarICS, isFeedAuthorized, type FeedInput } from '../lib/icalFeed';

const router = Router();

let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase configuration is missing');
    supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  }
  return supabase;
}

router.get('/api/trips/:tripId/calendar.ics', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const token = String(req.query.token ?? '');
    const sb = getSupabase();

    const { data: trip, error } = await sb
      .from('trips')
      .select('destination, calendar_feed_token, calendar_feed_enabled')
      .eq('trip_id', tripId)
      .maybeSingle();
    if (error) throw error;
    if (!trip || !isFeedAuthorized(trip, token)) {
      return res.status(403).send('Forbidden');
    }

    const [daysRes, actsRes, accRes, transRes, resvRes] = await Promise.all([
      sb.from('trip_days').select('day_id, date').eq('trip_id', tripId),
      sb.from('day_activities').select('id, title, day_id, start_time, end_time, description, location_address').eq('trip_id', tripId),
      sb.from('accommodations').select('stay_id, hotel, hotel_checkin_date, hotel_checkout_date, hotel_address, hotel_details').eq('trip_id', tripId),
      sb.from('transportation').select('id, type, start_date, start_time, end_date, end_time, departure_location, arrival_location, provider, details').eq('trip_id', tripId),
      sb.from('reservations').select('id, restaurant_name, day_id, reservation_time, address, notes').eq('trip_id', tripId),
    ]);

    const dayDate = new Map<string, string>((daysRes.data ?? []).map((d: { day_id: string; date: string }) => [d.day_id, String(d.date).slice(0, 10)]));

    const input: FeedInput = {
      trip: { destination: trip.destination ?? 'Trip' },
      activities: (actsRes.data ?? [])
        .map((a: any) => ({ id: a.id, title: a.title, date: dayDate.get(a.day_id) ?? '', start_time: a.start_time, end_time: a.end_time, description: a.description, location_address: a.location_address }))
        .filter((a) => a.date),
      reservations: (resvRes.data ?? [])
        .map((r: any) => ({ id: r.id, restaurant_name: r.restaurant_name, date: dayDate.get(r.day_id) ?? '', reservation_time: r.reservation_time, address: r.address, notes: r.notes }))
        .filter((r) => r.date),
      accommodations: (accRes.data ?? [])
        .map((s: any) => ({ stay_id: s.stay_id, hotel: s.hotel ?? 'Accommodation', hotel_checkin_date: s.hotel_checkin_date, hotel_checkout_date: s.hotel_checkout_date, hotel_address: s.hotel_address, hotel_details: s.hotel_details }))
        .filter((s) => s.hotel_checkin_date && s.hotel_checkout_date),
      transportation: (transRes.data ?? [])
        .map((t: any) => ({ id: t.id, type: t.type, start_date: t.start_date, start_time: t.start_time, end_date: t.end_date, end_time: t.end_time, departure_location: t.departure_location, arrival_location: t.arrival_location, provider: t.provider, details: t.details }))
        .filter((t) => t.start_date),
    };

    const ics = buildTripCalendarICS(input);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Disposition', 'inline; filename="trip.ics"');
    return res.status(200).send(ics);
  } catch (e) {
    console.error('Calendar feed error:', e instanceof Error ? e.message : e);
    return res.status(500).send('Internal Server Error');
  }
});

export default router;
```

- [ ] **Step 2: Register the route**

In `server/routes/index.ts`, add the import alongside the others and register it:
```ts
import calendarRoutes from './calendar';
```
and inside `registerRoutes(app)`, add:
```ts
  app.use(calendarRoutes);
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual verification (dev server)**

Start the server (`npm run dev`). For a trip you own, temporarily set a token and enable the feed via SQL (`update trips set calendar_feed_token='testtoken', calendar_feed_enabled=true where trip_id='<id>';`). Then:
- `curl -i "http://localhost:8080/api/trips/<id>/calendar.ics?token=testtoken"` → `200` with `Content-Type: text/calendar` and a `BEGIN:VCALENDAR` body.
- `curl -i "http://localhost:8080/api/trips/<id>/calendar.ics?token=wrong"` → `403`.
- `curl -i "http://localhost:8080/api/trips/<id>/calendar.ics"` (no token) → `403`.

- [ ] **Step 5: Commit**

```bash
git add server/routes/calendar.ts server/routes/index.ts
git commit -m "feat(calendar): serve token-gated iCal feed route"
```

---

### Task 5: `useCalendarFeed` — provision / reset the token (client)

**Files:**
- Create: `src/components/trip/calendar/useCalendarFeed.ts`
- Test: `src/components/trip/calendar/useCalendarFeed.test.ts`

**Interfaces:**
- Consumes: `supabase` from `@/integrations/supabase/client`; `useQuery`, `useQueryClient` from `@tanstack/react-query`.
- Produces: `useCalendarFeed(tripId: string)` returning:
  ```ts
  {
    enabled: boolean;
    token: string | null;
    isLoading: boolean;
    subscribeUrl: string | null;   // webcal://host/api/trips/:id/calendar.ics?token=...
    downloadUrl: string | null;    // https://host/...
    enable: () => Promise<void>;   // provisions a token if absent and sets enabled=true
    reset: () => Promise<void>;    // regenerates the token (revokes old subscriptions)
    disable: () => Promise<void>;  // sets enabled=false
  }
  ```
- Note: the client updates the owner's own `trips` row (RLS permits). Token generated with `crypto.randomUUID()`.

- [ ] **Step 1: Write the failing test**

`src/components/trip/calendar/useCalendarFeed.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCalendarFeed } from './useCalendarFeed';

const single = vi.fn();
const updateEq = vi.fn().mockResolvedValue({ error: null });
const updateFn = vi.fn(() => ({ eq: updateEq }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: single }) }), update: updateFn }) },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe('useCalendarFeed', () => {
  beforeEach(() => { single.mockReset(); updateFn.mockClear(); updateEq.mockClear(); });

  it('exposes a subscribe url when enabled with a token', async () => {
    single.mockResolvedValue({ data: { calendar_feed_enabled: true, calendar_feed_token: 'tok123' }, error: null });
    const { result } = renderHook(() => useCalendarFeed('t1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(true);
    expect(result.current.subscribeUrl).toContain('/api/trips/t1/calendar.ics?token=tok123');
    expect(result.current.subscribeUrl?.startsWith('webcal://')).toBe(true);
  });

  it('provisions a token on enable', async () => {
    single.mockResolvedValue({ data: { calendar_feed_enabled: false, calendar_feed_token: null }, error: null });
    const { result } = renderHook(() => useCalendarFeed('t1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.enable(); });
    expect(updateFn).toHaveBeenCalledTimes(1);
    const payload = updateFn.mock.calls[0][0];
    expect(payload.calendar_feed_enabled).toBe(true);
    expect(typeof payload.calendar_feed_token).toBe('string');
    expect(payload.calendar_feed_token.length).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/trip/calendar/useCalendarFeed.test.ts`
Expected: FAIL with "Cannot find module './useCalendarFeed'".

- [ ] **Step 3: Write minimal implementation**

`src/components/trip/calendar/useCalendarFeed.ts`:
```ts
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FeedRow { calendar_feed_enabled: boolean | null; calendar_feed_token: string | null; }

function genToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID().replace(/-/g, '');
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export function useCalendarFeed(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['calendar-feed', tripId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<FeedRow> => {
      const { data, error } = await supabase
        .from('trips')
        .select('calendar_feed_enabled, calendar_feed_token')
        .eq('trip_id', tripId)
        .maybeSingle();
      if (error) throw error;
      return (data as FeedRow) ?? { calendar_feed_enabled: false, calendar_feed_token: null };
    },
    enabled: !!tripId,
  });

  const enabled = !!data?.calendar_feed_enabled;
  const token = data?.calendar_feed_token ?? null;

  const host = typeof window !== 'undefined' ? window.location.host : '';
  const path = token ? `/api/trips/${tripId}/calendar.ics?token=${token}` : null;
  const subscribeUrl = path && host ? `webcal://${host}${path}` : null;
  const downloadUrl = path && host ? `https://${host}${path}` : null;

  const patch = useCallback(async (values: Partial<FeedRow>) => {
    const { error } = await supabase.from('trips').update(values).eq('trip_id', tripId);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey });
  }, [tripId, queryClient]);

  const enable = useCallback(async () => {
    await patch({ calendar_feed_enabled: true, calendar_feed_token: token ?? genToken() });
  }, [patch, token]);

  const reset = useCallback(async () => {
    await patch({ calendar_feed_token: genToken(), calendar_feed_enabled: true });
  }, [patch]);

  const disable = useCallback(async () => {
    await patch({ calendar_feed_enabled: false });
  }, [patch]);

  return { enabled, token, isLoading, subscribeUrl, downloadUrl, enable, reset, disable };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/trip/calendar/useCalendarFeed.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/calendar/useCalendarFeed.ts src/components/trip/calendar/useCalendarFeed.test.ts
git commit -m "feat(calendar): client hook to provision and reset the feed token"
```

---

### Task 6: `CalendarSyncSheet` UI + "Add to calendar" trigger

**Files:**
- Create: `src/components/trip/calendar/CalendarSyncSheet.tsx`
- Modify: `src/components/trip/TimelineView.tsx`

**Interfaces:**
- Consumes: `useCalendarFeed` (Task 5); `Sheet` primitives from `@/components/ui/sheet`; `Button` from `@/components/ui/button`; `toast` from `sonner`.
- Produces: `CalendarSyncSheet({ tripId, open, onOpenChange })` and an "Add to calendar" button in the `TimelineView` header actions row that opens it.
- Note on placement: the spec asks for a "trip-level menu (not the calendar toolbar)". `TimelineView` has no kebab/overflow menu, so a standalone button in the trip-level header actions row (beside Share / Export PDF) is the deliberate, spec-compliant choice: it is trip-level and is NOT the calendar toolbar. If a trip-header overflow menu is later added, move this item into it.

- [ ] **Step 1: Write `CalendarSyncSheet`**

`src/components/trip/calendar/CalendarSyncSheet.tsx`:
```tsx
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Copy, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useCalendarFeed } from './useCalendarFeed';

interface CalendarSyncSheetProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CalendarSyncSheet: React.FC<CalendarSyncSheetProps> = ({ tripId, open, onOpenChange }) => {
  const { enabled, isLoading, subscribeUrl, downloadUrl, enable, reset } = useCalendarFeed(tripId);

  const copy = async () => {
    if (!subscribeUrl) return;
    await navigator.clipboard.writeText(subscribeUrl);
    toast.success('Subscribe link copied');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl sm:max-w-md sm:mx-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">Add trip to your calendar</SheetTitle>
          <SheetDescription>Subscribe once and your calendar updates as the trip changes. Times show in the destination's local time.</SheetDescription>
        </SheetHeader>

        {!enabled ? (
          <div className="py-6">
            <Button variant="sunset" disabled={isLoading} onClick={() => enable().then(() => toast.success('Calendar feed ready'))}>
              Create subscribe link
            </Button>
          </div>
        ) : (
          <div className="space-y-5 py-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Subscribe link</label>
              <div className="mt-1 flex gap-2">
                <input readOnly value={subscribeUrl ?? ''} className="flex-1 rounded-md border border-input bg-muted px-2 py-1.5 text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button variant="outline" size="icon" aria-label="Copy link" onClick={copy}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Google:</strong> Other calendars → From URL → paste the link.</p>
              <p><strong className="text-foreground">Apple:</strong> File → New Calendar Subscription → paste the link.</p>
              <p><strong className="text-foreground">Outlook:</strong> Add calendar → Subscribe from web → paste the link.</p>
              <p className="text-xs">Note: Google refreshes subscribed feeds on its own schedule (often hours), so edits are not instant for subscribers.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {downloadUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={downloadUrl} download="trip.ics"><Download className="mr-1.5 h-4 w-4" />Download .ics</a>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => reset().then(() => toast.success('Old links revoked'))}>
                <RefreshCw className="mr-1.5 h-4 w-4" />Reset link
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CalendarSyncSheet;
```

- [ ] **Step 2: Add the trigger to `TimelineView`**

In `src/components/trip/TimelineView.tsx`:
- Add imports:
  ```tsx
  import { CalendarPlus } from 'lucide-react';
  import CalendarSyncSheet from './calendar/CalendarSyncSheet';
  ```
- Add state near the other `useState` declarations:
  ```tsx
  const [isSyncSheetOpen, setIsSyncSheetOpen] = useState(false);
  ```
- In the header actions `div` (the group with Share + Export PDF, and the Phase-1 Timeline/Calendar toggle), add this button after the Share button:
  ```tsx
  <Button variant="outline" size="sm" onClick={() => setIsSyncSheetOpen(true)}>
    <CalendarPlus className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
    <span className="hidden sm:inline">Add to calendar</span>
  </Button>
  ```
- Render the sheet next to `ShareTripDialog` (after it):
  ```tsx
  <CalendarSyncSheet tripId={tripId} open={isSyncSheetOpen} onOpenChange={setIsSyncSheetOpen} />
  ```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual verification (end-to-end)**

Run `npm run dev`, open a trip. Click "Add to calendar" → "Create subscribe link". Copy the `webcal://` URL, open it in a calendar app (or `curl` the `https://` form), and confirm events appear. Edit an event, wait for the client's next refresh, and confirm the feed reflects the change. Click "Reset link" and confirm the old URL now returns 403.

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/calendar/CalendarSyncSheet.tsx src/components/trip/TimelineView.tsx
git commit -m "feat(calendar): add-to-calendar sheet with subscribe link, download, and reset"
```

---

## Self-Review Notes

- **Spec coverage:** storage columns (T1), `ical-generator` (T2), floating times + stable UIDs + all-day exclusive end (T3), LOCATION + DESCRIPTION populated for all four entity types (T3/T4), transport summary aligned with the in-app calendar's fallback (T3), token-gated service-role route with 200/403 (T3 `isFeedAuthorized` + T4), reset/revoke (T5), subscribe URL + copy + instructions + download + reset UI in the trip-level actions row (T6), Google slow-refresh caveat in copy (T6).
- **Security:** the route never trusts the client; `isFeedAuthorized` is unit-tested for match / wrong-token / disabled / empty / revoked. The service-role key stays server-side. The client hook only ever updates the owner's own trip row via RLS.
- **Determinism:** floating datetimes are built from `Date.UTC`, so ICS output does not depend on server timezone; tests assert on individual lines (not a full snapshot) to avoid `DTSTAMP` flakiness.
- **Open item to confirm at implementation time:** `ical-generator` v8's exact all-day `DTSTART;VALUE=DATE:` serialization. If it differs, keep the UID + floating-time assertions (load-bearing) and align the DATE assertions to the library's real output.
