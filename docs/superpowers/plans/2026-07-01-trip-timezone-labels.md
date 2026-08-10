# Trip Timezone Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the timezone of every trip time legible (auto-resolved zone badges on timeline, calendar, PDF, and iCal feed) without ever converting or migrating a time value.

**Architecture:** Timezone is display metadata layered on unchanged floating wall-clock times. Three separated responsibilities: **Resolve** (`timezone-proxy` Edge Function: `place_id → IANA tz`, cached in `timezone_cache`), **Store** (nullable `timezone` columns; `NULL` = inherit trip default), **Present** (`src/utils/timezoneLabel.ts` pure helpers → compact zone badges only when an entity's effective zone differs from the trip default).

**Tech Stack:** Supabase Edge Function (Deno) + Google Places/Time Zone APIs, React Query hooks, shadcn Popover+Command combobox, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-01-trip-timezone-labels-design.md`

## Global Constraints

- **No time value is ever converted or migrated.** Timezone is a label, not a conversion.
- All six new columns are **nullable, no backfill**: `trips.timezone`, `day_activities.timezone`, `reservations.timezone`, `accommodations.timezone`, `transportation.departure_timezone`, `transportation.arrival_timezone`. `NULL` = inherit trip default.
- The iCal feed stays **floating** (no `TZID`, no `Z`); zone text goes only into `SUMMARY` text. The FullCalendar view keeps `timeZone` **unset**.
- Every `Intl` call is guarded; an invalid/unknown zone yields `''`, never a throw. Resolution never blocks a save; `timezone-proxy` soft-fails with `{ timeZoneId: null }`.
- Badges show **only when the effective zone differs from the trip zone** (or a flight's two zones differ) — the feature must be invisible on single-destination trips.
- `bun` is NOT on PATH — use `npx vitest run <file>` and `npx tsc --noEmit`.
- Work on branch `feat/trip-timezones` (already checked out). Commit after every task.
- The migration file is committed in Task 1 but **applied to the live DB only at the end** (via MCP `apply_migration`, needs user OK). Type-checks and unit tests never hit the live DB, so all tasks run fine before it's applied.
- Google Cloud: the **Time Zone API must be enabled** on the project behind `GOOGLE_PLACES_API_KEY` (user action, flagged in Task 15).

**Testing deviations from spec (accepted):** there is no Deno test harness for Edge Functions in this repo (none exist for the other 10 functions), so `timezone-proxy` is covered by the `useResolveTimezone` hook tests (soft-failure paths) + manual verification after deploy. Form auto-fill is covered by the pure precedence rule (`placeTz ?? tripTz`, tested via `effectiveTz`) and manual verification; full form component tests would require heavy supabase/autocomplete mocking with little added signal.

---

### Task 1: Migration + hand-edited types

**Files:**
- Create: `supabase/migrations/20260701000000_trip_timezones.sql`
- Modify: `src/integrations/supabase/types/database.ts` (5 table blocks + new `timezone_cache` block)
- Modify: `src/types/trip.ts:21-203` (5 interfaces)

**Interfaces:**
- Consumes: nothing.
- Produces: DB columns named exactly as in Global Constraints; `Tables<'timezone_cache'>` with `place_id: string`, `timezone_id: string`, `fetched_at: string`; TS entity fields `timezone?: string | null` (activity/dining/hotel/trip) and `departure_timezone?: string | null` / `arrival_timezone?: string | null` (transportation).

- [ ] **Step 1: Write the migration**

```sql
-- Trip timezone labels: display metadata only. All columns nullable, no backfill,
-- no existing time value changes. NULL = inherit the trip default zone.
ALTER TABLE trips ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE day_activities ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE transportation ADD COLUMN IF NOT EXISTS departure_timezone text;
ALTER TABLE transportation ADD COLUMN IF NOT EXISTS arrival_timezone text;

-- place_id -> IANA timezone cache for the timezone-proxy Edge Function.
-- place_ids are stable, so entries are effectively permanent (no TTL).
CREATE TABLE IF NOT EXISTS timezone_cache (
  place_id text PRIMARY KEY,
  timezone_id text NOT NULL,
  fetched_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE timezone_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read timezone cache"
  ON timezone_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage timezone cache"
  ON timezone_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

- [ ] **Step 2: Hand-edit `database.ts`** (types are normally auto-generated but are hand-maintained here per project memory). In each of the `trips`, `day_activities`, `reservations`, `accommodations` table blocks add — alphabetically within each of Row/Insert/Update:

```typescript
// Row:
timezone: string | null
// Insert and Update:
timezone?: string | null
```

In the `transportation` block add (Row / Insert+Update respectively):

```typescript
arrival_timezone: string | null
departure_timezone: string | null
// Insert/Update:
arrival_timezone?: string | null
departure_timezone?: string | null
```

Add a new `timezone_cache` block in alphabetical position (between `trip_view_status`-ish and `transportation` neighbors — match existing alphabetical order; `weather_cache` at `database.ts:1262-1291` is the shape template):

```typescript
timezone_cache: {
  Row: {
    fetched_at: string
    place_id: string
    timezone_id: string
  }
  Insert: {
    fetched_at?: string
    place_id: string
    timezone_id: string
  }
  Update: {
    fetched_at?: string
    place_id?: string
    timezone_id?: string
  }
  Relationships: []
}
```

- [ ] **Step 3: Edit `src/types/trip.ts`**
  - `DayActivity` (line 21): add `timezone?: string | null;`
  - `HotelStay` (line 89): add `timezone?: string | null;`
  - `Transportation` (line 108): add `departure_timezone?: string | null;` and `arrival_timezone?: string | null;`
  - `RestaurantReservation` (line 127): add `timezone?: string | null;`
  - `Trip` (line 184): add `timezone?: string | null;`

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260701000000_trip_timezones.sql src/integrations/supabase/types/database.ts src/types/trip.ts
git commit -m "feat(timezones): nullable timezone columns + timezone_cache table"
```

---

### Task 2: `timezoneLabel` presentation helper (TDD)

**Files:**
- Create: `src/utils/timezoneLabel.ts`
- Test: `src/utils/timezoneLabel.test.ts`

**Interfaces:**
- Consumes: nothing (pure; no imports beyond `Intl`).
- Produces (used by Tasks 5, 7–14):
  - `effectiveTz(entityTz: string | null | undefined, tripTz: string | null | undefined): string | null`
  - `tzAbbrev(tz: string, onDate: string): string` — DST-correct short label at noon UTC on `onDate` (`YYYY-MM-DD`); `''` on invalid input.
  - `shouldShowBadge(entityTz: string | null | undefined, tripTz: string | null | undefined): boolean`
  - `transportTzLabels(depTz, arrTz, tripTz: string | null | undefined, onDate: string): { dep: string; arr: string }` — both labels when the two effective zones differ; both = same label when the leg's single zone differs from the trip; both `''` otherwise.
  - `getTimezoneOptions(): string[]` — full IANA list via `Intl.supportedValuesOf('timeZone')`, curated fallback otherwise.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { effectiveTz, tzAbbrev, shouldShowBadge, transportTzLabels, getTimezoneOptions } from './timezoneLabel';

describe('effectiveTz', () => {
  it('prefers the entity zone', () => {
    expect(effectiveTz('Europe/London', 'America/New_York')).toBe('Europe/London');
  });
  it('falls back to the trip zone on null/undefined', () => {
    expect(effectiveTz(null, 'America/New_York')).toBe('America/New_York');
    expect(effectiveTz(undefined, 'America/New_York')).toBe('America/New_York');
  });
  it('is null when both are unset', () => {
    expect(effectiveTz(null, null)).toBeNull();
  });
});

describe('tzAbbrev', () => {
  it('is DST-correct for America/New_York (EST in Jan, EDT in Jul)', () => {
    expect(tzAbbrev('America/New_York', '2026-01-15')).toBe('EST');
    expect(tzAbbrev('America/New_York', '2026-07-15')).toBe('EDT');
  });
  it('handles fixed-offset GMT+N zones', () => {
    // Etc/GMT+5 is UTC-5 (POSIX sign inversion); en-US renders "GMT-5"
    expect(tzAbbrev('Etc/GMT+5', '2026-07-15')).toBe('GMT-5');
  });
  it('changes across DST for Europe/London without throwing', () => {
    const jan = tzAbbrev('Europe/London', '2026-01-15');
    const jul = tzAbbrev('Europe/London', '2026-07-15');
    expect(jan).not.toBe('');
    expect(jul).not.toBe('');
    expect(jan).not.toBe(jul);
  });
  it('returns empty string on invalid zone or date', () => {
    expect(tzAbbrev('Not/AZone', '2026-07-15')).toBe('');
    expect(tzAbbrev('America/New_York', 'garbage')).toBe('');
    expect(tzAbbrev('', '2026-07-15')).toBe('');
  });
});

describe('shouldShowBadge', () => {
  it('is true when the effective zone differs from the trip zone', () => {
    expect(shouldShowBadge('Europe/London', 'America/New_York')).toBe(true);
  });
  it('is false when the entity inherits the trip zone', () => {
    expect(shouldShowBadge(null, 'America/New_York')).toBe(false);
  });
  it('is false when entity zone equals trip zone', () => {
    expect(shouldShowBadge('America/New_York', 'America/New_York')).toBe(false);
  });
  it('is true when only the entity zone is set (trip unresolved)', () => {
    expect(shouldShowBadge('Europe/London', null)).toBe(true);
  });
  it('is false when nothing is set', () => {
    expect(shouldShowBadge(null, null)).toBe(false);
  });
});

describe('transportTzLabels', () => {
  const trip = 'America/New_York';
  it('labels both endpoints when the two zones differ', () => {
    const r = transportTzLabels('America/New_York', 'Europe/London', trip, '2026-07-15');
    expect(r.dep).toBe('EDT');
    expect(r.arr).not.toBe('');
    expect(r.arr).not.toBe(r.dep);
  });
  it('labels both with the same abbrev when one foreign zone covers the leg', () => {
    const r = transportTzLabels('Europe/Paris', 'Europe/Paris', trip, '2026-07-15');
    expect(r.dep).not.toBe('');
    expect(r.arr).toBe(r.dep);
  });
  it('is empty when the leg inherits the trip zone', () => {
    expect(transportTzLabels(null, null, trip, '2026-07-15')).toEqual({ dep: '', arr: '' });
    expect(transportTzLabels(trip, trip, trip, '2026-07-15')).toEqual({ dep: '', arr: '' });
  });
});

describe('getTimezoneOptions', () => {
  it('returns a non-empty list containing common zones', () => {
    const zones = getTimezoneOptions();
    expect(zones.length).toBeGreaterThan(10);
    expect(zones).toContain('America/New_York');
    expect(zones).toContain('Europe/London');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/timezoneLabel.test.ts`
Expected: FAIL — cannot resolve `./timezoneLabel`.

- [ ] **Step 3: Write the implementation**

```typescript
/**
 * Timezone display helpers. Timezone here is a LABEL layered on floating
 * wall-clock times — nothing in this module converts a time value.
 */

export function effectiveTz(
  entityTz: string | null | undefined,
  tripTz: string | null | undefined,
): string | null {
  return entityTz ?? tripTz ?? null;
}

/** DST-correct short zone label (EST vs EDT) evaluated at noon UTC on `onDate`. */
export function tzAbbrev(tz: string, onDate: string): string {
  if (!tz || !onDate) return '';
  const m = onDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  try {
    const probe = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(probe);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

export function shouldShowBadge(
  entityTz: string | null | undefined,
  tripTz: string | null | undefined,
): boolean {
  const eff = effectiveTz(entityTz, tripTz);
  return !!eff && eff !== (tripTz ?? null);
}

/**
 * Zone labels for a transport leg. Both labels when the two effective zones
 * differ; both = one shared label when the leg sits in a single zone that
 * differs from the trip; empty otherwise (no badge).
 */
export function transportTzLabels(
  depTz: string | null | undefined,
  arrTz: string | null | undefined,
  tripTz: string | null | undefined,
  onDate: string,
): { dep: string; arr: string } {
  const effDep = effectiveTz(depTz, tripTz);
  const effArr = effectiveTz(arrTz, tripTz);
  if (effDep && effArr && effDep !== effArr) {
    return { dep: tzAbbrev(effDep, onDate), arr: tzAbbrev(effArr, onDate) };
  }
  if (shouldShowBadge(depTz ?? arrTz, tripTz)) {
    const label = tzAbbrev(effectiveTz(depTz ?? arrTz, tripTz)!, onDate);
    return { dep: label, arr: label };
  }
  return { dep: '', arr: '' };
}

const FALLBACK_ZONES = [
  'UTC',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage',
  'Pacific/Honolulu', 'America/Toronto', 'America/Mexico_City', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
  'Europe/Amsterdam', 'Europe/Zurich', 'Europe/Lisbon', 'Europe/Athens', 'Europe/Istanbul', 'Europe/Moscow',
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Nairobi', 'Africa/Lagos',
  'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore',
  'Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth', 'Pacific/Auckland', 'Pacific/Fiji',
];

export function getTimezoneOptions(): string[] {
  try {
    const zones = Intl.supportedValuesOf?.('timeZone');
    if (zones && zones.length > 0) return zones as string[];
  } catch {
    // fall through to the curated list
  }
  return FALLBACK_ZONES;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/timezoneLabel.test.ts`
Expected: PASS (all). If the `Etc/GMT+5` assertion renders differently under the local ICU (e.g. `GMT-05:00`), relax that one assertion to `expect(tzAbbrev('Etc/GMT+5', '2026-07-15')).toMatch(/^GMT-0?5/)` — record the actual value in the test.

- [ ] **Step 5: Commit**

```bash
git add src/utils/timezoneLabel.ts src/utils/timezoneLabel.test.ts
git commit -m "feat(timezones): pure timezone label helpers (effectiveTz, tzAbbrev, badges)"
```

---

### Task 3: `timezone-proxy` Edge Function

**Files:**
- Create: `supabase/functions/timezone-proxy/index.ts`

**Interfaces:**
- Consumes: `_shared/cors.ts` `getCorsHeaders(origin)`, `_shared/auth.ts` `requireAuth(req)`, env `GOOGLE_PLACES_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, table `timezone_cache` (Task 1).
- Produces: `POST /functions/v1/timezone-proxy` with body `{ placeId: string }` → `200 { timeZoneId: string | null }`. **Every resolution failure is a soft `{ timeZoneId: null }`**, never a 5xx (only auth is 401, wrong method 405).

- [ ] **Step 1: Write the function** (mirrors `weather-proxy`'s service-role cache pattern; no `config.toml` entry needed — matches the other proxies)

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);

  try {
    await requireAuth(req);
  } catch {
    return respond({ error: 'Unauthorized' }, 401);
  }

  // Soft-failure contract: any resolution problem yields { timeZoneId: null }
  // so the caller's form simply does not auto-fill.
  let placeId: unknown;
  try {
    ({ placeId } = await req.json());
  } catch {
    return respond({ timeZoneId: null });
  }
  if (typeof placeId !== 'string' || !placeId.trim()) return respond({ timeZoneId: null });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: cached } = await supabase
    .from('timezone_cache')
    .select('timezone_id')
    .eq('place_id', placeId)
    .maybeSingle();
  if (cached?.timezone_id) return respond({ timeZoneId: cached.timezone_id });

  const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!googleApiKey) return respond({ timeZoneId: null });

  try {
    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry&key=${googleApiKey}`,
    );
    const details = await detailsRes.json();
    const loc = details?.result?.geometry?.location;
    if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') {
      return respond({ timeZoneId: null });
    }

    // The timestamp only affects DST offsets in the response; timeZoneId itself
    // is stable, which is what makes the permanent cache safe.
    const timestamp = Math.floor(Date.now() / 1000);
    const tzRes = await fetch(
      `https://maps.googleapis.com/maps/api/timezone/json?location=${loc.lat},${loc.lng}&timestamp=${timestamp}&key=${googleApiKey}`,
    );
    const tz = await tzRes.json();
    if (tz?.status !== 'OK' || typeof tz?.timeZoneId !== 'string') {
      return respond({ timeZoneId: null });
    }

    await supabase.from('timezone_cache').upsert(
      { place_id: placeId, timezone_id: tz.timeZoneId, fetched_at: new Date().toISOString() },
      { onConflict: 'place_id' },
    );
    return respond({ timeZoneId: tz.timeZoneId });
  } catch (e) {
    console.error('timezone-proxy resolution error:', e instanceof Error ? e.message : e);
    return respond({ timeZoneId: null });
  }
});
```

- [ ] **Step 2: Verify** — no Deno test harness exists in this repo (per Global Constraints deviation note). Sanity-check by eye against `supabase/functions/weather-proxy/index.ts` (same client-creation, cache read `.maybeSingle()`, and upsert `onConflict` shapes). Confirm `npx tsc --noEmit` still passes (the Deno file is outside the tsconfig include, so it should be untouched).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/timezone-proxy/index.ts
git commit -m "feat(timezones): timezone-proxy edge function (place_id -> IANA tz, cached)"
```

---

### Task 4: `useResolveTimezone` client hook (TDD)

**Files:**
- Create: `src/hooks/useResolveTimezone.ts`
- Test: `src/hooks/useResolveTimezone.test.tsx`

**Interfaces:**
- Consumes: `timezone-proxy` endpoint (Task 3), `supabase.auth.getSession()` from `@/integrations/supabase/client`.
- Produces: `useResolveTimezone(placeId: string | null | undefined): { timeZoneId: string | null; isLoading: boolean }` — returns `{ timeZoneId: null, isLoading: false }` when `placeId` is falsy; never throws (soft null on any failure). Query key `['timezone', placeId]`, `staleTime: Infinity`.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useResolveTimezone } from './useResolveTimezone';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    },
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useResolveTimezone', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('does not fetch when placeId is null', async () => {
    const { result } = renderHook(() => useResolveTimezone(null), { wrapper });
    expect(result.current.timeZoneId).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('resolves a timezone id via timezone-proxy', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ timeZoneId: 'Europe/Paris' }),
    });
    const { result } = renderHook(() => useResolveTimezone('place-1'), { wrapper });
    await waitFor(() => expect(result.current.timeZoneId).toBe('Europe/Paris'));
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/functions/v1/timezone-proxy');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ placeId: 'place-1' });
  });

  it('soft-fails to null on a non-OK response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, json: async () => ({}) });
    const { result } = renderHook(() => useResolveTimezone('place-2'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.timeZoneId).toBeNull();
  });

  it('soft-fails to null when fetch rejects', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useResolveTimezone('place-3'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.timeZoneId).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useResolveTimezone.test.tsx`
Expected: FAIL — cannot resolve `./useResolveTimezone`.

- [ ] **Step 3: Write the hook** (invocation pattern copied from `src/hooks/useWeather.ts:39-50`)

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resolve a Google place_id to an IANA timezone via the timezone-proxy Edge
 * Function. Soft-fails to null (no auto-fill) — resolution never blocks a save.
 */
export function useResolveTimezone(placeId: string | null | undefined): {
  timeZoneId: string | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ['timezone', placeId],
    enabled: !!placeId,
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<string | null> => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/timezone-proxy`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
            },
            body: JSON.stringify({ placeId }),
          },
        );
        if (!response.ok) return null;
        const json = await response.json();
        return typeof json?.timeZoneId === 'string' ? json.timeZoneId : null;
      } catch {
        return null;
      }
    },
  });
  return { timeZoneId: data ?? null, isLoading: !!placeId && isLoading };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useResolveTimezone.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useResolveTimezone.ts src/hooks/useResolveTimezone.test.tsx
git commit -m "feat(timezones): useResolveTimezone hook over timezone-proxy"
```

---

### Task 5: `TimezoneSelect` combobox component

**Files:**
- Create: `src/components/trip/_shared/TimezoneSelect.tsx`
- Test: `src/components/trip/_shared/TimezoneSelect.test.tsx`

**Interfaces:**
- Consumes: `getTimezoneOptions()` (Task 2); shadcn `Popover`/`Command` primitives from `src/components/ui/`.
- Produces: default-exported `TimezoneSelect` with props `{ value: string | null; onChange: (tz: string) => void; placeholder?: string; className?: string }`. Searchable over the full IANA list; shows the raw zone id as the button label.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import TimezoneSelect from './TimezoneSelect';

beforeAll(() => {
  // cmdk + Radix need these in jsdom
  Element.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
});

describe('TimezoneSelect', () => {
  it('shows the current value on the trigger', () => {
    render(<TimezoneSelect value="America/New_York" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('America/New_York');
  });

  it('shows the placeholder when empty', () => {
    render(<TimezoneSelect value={null} onChange={() => {}} placeholder="Timezone" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Timezone');
  });

  it('filters and selects a zone', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimezoneSelect value={null} onChange={onChange} />);
    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByPlaceholderText(/search/i), 'Tokyo');
    await user.click(await screen.findByText('Asia/Tokyo'));
    expect(onChange).toHaveBeenCalledWith('Asia/Tokyo');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/trip/_shared/TimezoneSelect.test.tsx`
Expected: FAIL — cannot resolve `./TimezoneSelect`.

- [ ] **Step 3: Write the component** (first check `src/components/ui/command.tsx`'s export list — if `CommandList` is not exported there, wrap items in the exported scroll container the file provides instead)

```tsx
import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { getTimezoneOptions } from '@/utils/timezoneLabel';

type Props = {
  value: string | null;
  onChange: (tz: string) => void;
  placeholder?: string;
  className?: string;
};

const TimezoneSelect: React.FC<Props> = ({ value, onChange, placeholder = 'Timezone', className }) => {
  const [open, setOpen] = useState(false);
  const zones = useMemo(() => getTimezoneOptions(), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground', className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{value ?? placeholder}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search timezones..." />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {zones.map((tz) => (
                <CommandItem
                  key={tz}
                  value={tz}
                  onSelect={() => { onChange(tz); setOpen(false); }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === tz ? 'opacity-100' : 'opacity-0')} />
                  {tz}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default TimezoneSelect;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/trip/_shared/TimezoneSelect.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/_shared/TimezoneSelect.tsx src/components/trip/_shared/TimezoneSelect.test.tsx
git commit -m "feat(timezones): searchable IANA TimezoneSelect combobox"
```

---

### Task 6: `useTripTimezone` — trip default + lazy self-healing resolution

**Files:**
- Create: `src/hooks/useTripTimezone.ts`

**Interfaces:**
- Consumes: `useResolveTimezone` (Task 4), `useTripPermissions` from `src/hooks/use-trip-permissions.tsx` (returns `{ canEdit }`), `trips.timezone` + `trips.primary_destination_place_id` columns.
- Produces (used by Tasks 7–12): `useTripTimezone(tripId: string | undefined): { tripTimezone: string | null; isLoading: boolean }`. When `trips.timezone` is `NULL` and a `primary_destination_place_id` exists it resolves once; **persists only when `canEdit`** (view-only viewers get the in-memory value — the trips UPDATE RLS policy would reject the write anyway). Query key `['trip-timezone', tripId]`.

- [ ] **Step 1: Write the hook**

```typescript
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResolveTimezone } from './useResolveTimezone';
import { useTripPermissions } from './use-trip-permissions';

/**
 * The trip's default timezone. Lazily self-heals: a trip with timezone NULL
 * and a primary destination place resolves once on view; the result persists
 * only when the viewer can edit (owner/edit-share) — view-only viewers keep
 * the resolved value in memory for display.
 */
export function useTripTimezone(tripId: string | undefined): {
  tripTimezone: string | null;
  isLoading: boolean;
} {
  const queryClient = useQueryClient();
  const { canEdit } = useTripPermissions(tripId);

  const { data: row, isLoading } = useQuery({
    queryKey: ['trip-timezone', tripId],
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('timezone, primary_destination_place_id')
        .eq('trip_id', tripId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const needsResolve = !!row && !row.timezone && !!row.primary_destination_place_id;
  const { timeZoneId: resolved } = useResolveTimezone(
    needsResolve ? row!.primary_destination_place_id : null,
  );

  const persistedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!tripId || !needsResolve || !resolved || !canEdit) return;
    if (persistedFor.current === tripId) return;
    persistedFor.current = tripId;
    supabase
      .from('trips')
      .update({ timezone: resolved })
      .eq('trip_id', tripId)
      .then(({ error }) => {
        if (error) {
          persistedFor.current = null; // allow a later retry
          return;
        }
        queryClient.invalidateQueries({ queryKey: ['trip-timezone', tripId] });
        queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      });
  }, [tripId, needsResolve, resolved, canEdit, queryClient]);

  return { tripTimezone: row?.timezone ?? resolved ?? null, isLoading };
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npx vitest run`
Expected: type-check clean; all existing tests still pass. (The persist path is exercised end-to-end in Task 15's manual verification.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTripTimezone.ts
git commit -m "feat(timezones): useTripTimezone with lazy self-healing resolution"
```

---

### Task 7: Activity form + persistence

**Files:**
- Modify: `src/components/trip/ActivityForm.tsx` (form state at lines 4-18, place handler at 268-289)
- Modify: `src/components/trip/day/activities/ActivityDialog.tsx:193-206` (`dbData` field list)

**Interfaces:**
- Consumes: `TimezoneSelect` (Task 5), `useResolveTimezone` (Task 4), `useTripTimezone` (Task 6). `ActivityForm` already has props `tripId` and controlled `activity` + `onActivityChange`.
- Produces: `ActivityFormData.timezone?: string | null` flows through `onSubmit(activityData)` into `dbData.timezone`.

- [ ] **Step 1: Extend `ActivityFormData`** (top of `ActivityForm.tsx`): add `timezone?: string | null;` to the interface.

- [ ] **Step 2: Add auto-fill + select to `ActivityForm.tsx`.** Inside the component:

```tsx
const { tripTimezone } = useTripTimezone(tripId);
const { timeZoneId: placeTz } = useResolveTimezone(activity.location_place_id ?? null);
// Existing zone on an edited activity counts as a manual choice.
const [tzTouched, setTzTouched] = useState(() => !!activity.timezone);

// Pre-fill order: the place's own zone, else the trip default. Auto-updates on
// place change unless the user has manually overridden the zone.
useEffect(() => {
  if (tzTouched) return;
  const auto = placeTz ?? tripTimezone ?? null;
  if (auto !== (activity.timezone ?? null)) {
    onActivityChange({ ...activity, timezone: auto });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [placeTz, tripTimezone, tzTouched]);
```

Add the control in a collapsed advanced section directly below the location field (reuse the `Collapsible` trigger styling from `AccommodationForm.tsx:371-446`):

```tsx
<Collapsible open={tzOpen} onOpenChange={setTzOpen}>
  <CollapsibleTrigger asChild>
    <button
      type="button"
      className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-foreground bg-muted hover:bg-accent rounded-md border border-border transition-colors"
    >
      <span className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        Timezone{activity.timezone ? `: ${activity.timezone}` : ''}
      </span>
      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${tzOpen ? 'rotate-180' : ''}`} />
    </button>
  </CollapsibleTrigger>
  <CollapsibleContent className="pt-3">
    <TimezoneSelect
      value={activity.timezone ?? null}
      onChange={(tz) => { setTzTouched(true); onActivityChange({ ...activity, timezone: tz }); }}
    />
  </CollapsibleContent>
</Collapsible>
```

with `const [tzOpen, setTzOpen] = useState(false);` and imports for `useEffect`, `Collapsible*` from `@/components/ui/collapsible`, `Globe`/`ChevronDown` from `lucide-react`, `TimezoneSelect`, `useResolveTimezone`, `useTripTimezone`.

- [ ] **Step 3: Persist.** In `ActivityDialog.tsx` `dbData` (line 193), after `location_rating`:

```typescript
timezone: dataToSave.timezone || null,
```

(also add `timezone?: string | null` to that dialog's local activity-data type if it declares one — grep the file for the shape `dataToSave` is typed with).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/ActivityForm.tsx src/components/trip/day/activities/ActivityDialog.tsx
git commit -m "feat(timezones): activity form timezone auto-fill + persistence"
```

---

### Task 8: Dining form + persistence

**Files:**
- Modify: `src/components/trip/dining/RestaurantReservationForm.tsx` (zod schema at lines 68-82, place handler at 309-343)

**Interfaces:**
- Consumes: `TimezoneSelect`, `useResolveTimezone`, `useTripTimezone`. Form is react-hook-form + zod; `place_id` lives in form state; the dialog (`RestaurantReservationDialog.tsx`) passes `processedData` through untouched, so a new schema field persists automatically.
- Produces: `reservations.timezone` saved from the form.

- [ ] **Step 1: Schema + defaults.** Add to `formSchema`:

```typescript
timezone: z.string().optional().nullable(),
```

and to the form's `defaultValues`: `timezone: defaultValues?.timezone ?? null,`.

- [ ] **Step 2: Auto-fill.** Inside the component:

```tsx
const { tripTimezone } = useTripTimezone(tripId || defaultValues?.trip_id);
const watchedPlaceId = form.watch('place_id');
const { timeZoneId: placeTz } = useResolveTimezone(watchedPlaceId ?? null);
const [tzTouched, setTzTouched] = useState(() => !!defaultValues?.timezone);

useEffect(() => {
  if (tzTouched) return;
  const auto = placeTz ?? tripTimezone ?? null;
  if (auto !== (form.getValues('timezone') ?? null)) {
    form.setValue('timezone', auto);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [placeTz, tripTimezone, tzTouched]);
```

- [ ] **Step 3: Control.** Add the same collapsed `Collapsible` block as Task 7 Step 2 (trigger label `Timezone{form.watch('timezone') ? `: ${form.watch('timezone')}` : ''}`), with:

```tsx
<TimezoneSelect
  value={form.watch('timezone') ?? null}
  onChange={(tz) => { setTzTouched(true); form.setValue('timezone', tz); }}
/>
```

- [ ] **Step 4: Verify persistence path.** In `handleSubmitForm` (lines 216-281) `timezone` is included in `dataWithout` (the spread of `data` minus `reservation_date`/`travelers`), so `processedData.timezone` reaches the dialog's `supabase.from('reservations')` insert/update with no further change. Confirm by reading `RestaurantReservationDialog.tsx:57-94` — it passes `processedData` straight through.

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run` → clean.

```bash
git add src/components/trip/dining/RestaurantReservationForm.tsx
git commit -m "feat(timezones): dining form timezone auto-fill + persistence"
```

---

### Task 9: Accommodation form + persistence

**Files:**
- Modify: `src/components/trip/accommodation/AccommodationForm.tsx` (zod schema at lines 48-72, place handler at 334-363, "Location Details" collapsible at 371-446)
- Modify: `src/services/accommodation/accommodationService.ts` (`addAccommodation` insert at 99-149, `updateAccommodation` at 152-215, plus its `AccommodationFormData` type)

**Interfaces:**
- Consumes: `TimezoneSelect`, `useResolveTimezone`, `useTripTimezone`; the form has `tripId` and `initialData` props.
- Produces: `accommodations.timezone` saved on create and update.

- [ ] **Step 1: Schema + defaults.** Add `timezone: z.string().optional().nullable(),` to the schema; `timezone: initialData?.timezone ?? null,` to defaults.

- [ ] **Step 2: Auto-fill** (same pattern as Task 8, watching `hotel_place_id`):

```tsx
const { tripTimezone } = useTripTimezone(tripId);
const watchedPlaceId = form.watch('hotel_place_id');
const { timeZoneId: placeTz } = useResolveTimezone(watchedPlaceId || null);
const [tzTouched, setTzTouched] = useState(() => !!initialData?.timezone);

useEffect(() => {
  if (tzTouched) return;
  const auto = placeTz ?? tripTimezone ?? null;
  if (auto !== (form.getValues('timezone') ?? null)) {
    form.setValue('timezone', auto);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [placeTz, tripTimezone, tzTouched]);
```

- [ ] **Step 3: Control.** Place the `TimezoneSelect` inside the **existing** "Location Details" `CollapsibleContent` (lines 371-446), after the phone/website fields:

```tsx
<div>
  <Label className="text-sm text-muted-foreground">Timezone</Label>
  <TimezoneSelect
    value={form.watch('timezone') ?? null}
    onChange={(tz) => { setTzTouched(true); form.setValue('timezone', tz); }}
  />
</div>
```

- [ ] **Step 4: Persist.** In `accommodationService.ts`: add `timezone?: string | null;` to its `AccommodationFormData` type; add `timezone: formData.timezone || null,` to the `.insert({...})` object in `addAccommodation` and to the `.update({...})` object in `updateAccommodation`.

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run` → clean.

```bash
git add src/components/trip/accommodation/AccommodationForm.tsx src/services/accommodation/accommodationService.ts
git commit -m "feat(timezones): accommodation form timezone auto-fill + persistence"
```

---

### Task 10: Transportation form — per-leg departure/arrival zones

**Files:**
- Modify: `src/components/trip/transportation/TransportationForm.tsx` (zod schema at 42-56, payload at 130-174)
- Modify: `src/components/trip/transportation/TransportationFormFields.tsx` (render the two selects next to the location inputs)
- Modify: `src/components/trip/transportation/TransportationDialog.tsx:60-76` (`basePayload`)

**Interfaces:**
- Consumes: `TimezoneSelect`, `useTripTimezone`. Endpoints are free text (no place_id), so **both zones default to the trip zone** with per-leg override; no place resolution here.
- Produces: `transportation.departure_timezone` / `transportation.arrival_timezone` saved.

- [ ] **Step 1: Schema + defaults.** In `TransportationForm.tsx` add to the zod schema:

```typescript
departure_timezone: z.string().nullable().optional(),
arrival_timezone: z.string().nullable().optional(),
```

Defaults: `departure_timezone: initialData?.departure_timezone ?? null, arrival_timezone: initialData?.arrival_timezone ?? null,`. Then pre-fill from the trip zone once it loads (only for untouched, empty fields — a saved leg keeps its zones):

```tsx
const { tripTimezone } = useTripTimezone(tripId);
useEffect(() => {
  if (!tripTimezone) return;
  if (!form.getValues('departure_timezone') && !initialData?.departure_timezone) {
    form.setValue('departure_timezone', tripTimezone);
  }
  if (!form.getValues('arrival_timezone') && !initialData?.arrival_timezone) {
    form.setValue('arrival_timezone', tripTimezone);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tripTimezone]);
```

- [ ] **Step 2: Payload.** In `handleSubmit`'s `payload` (lines 130-174) add:

```typescript
departure_timezone: data.departure_timezone ?? null,
arrival_timezone: data.arrival_timezone ?? null,
```

- [ ] **Step 3: Fields.** In `TransportationFormFields.tsx`, in a collapsed "Timezones" `Collapsible` (Task 7 Step 2 trigger styling) below the departure/arrival location inputs, render two labeled selects via `Controller`:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div>
    <Label className="text-sm text-muted-foreground">Departure timezone</Label>
    <Controller
      name="departure_timezone"
      control={control}
      render={({ field }) => (
        <TimezoneSelect value={field.value ?? null} onChange={field.onChange} placeholder="Trip default" />
      )}
    />
  </div>
  <div>
    <Label className="text-sm text-muted-foreground">Arrival timezone</Label>
    <Controller
      name="arrival_timezone"
      control={control}
      render={({ field }) => (
        <TimezoneSelect value={field.value ?? null} onChange={field.onChange} placeholder="Trip default" />
      )}
    />
  </div>
</div>
```

(`TransportationFormFields` already uses `Controller` for other fields at lines 253-260 — match how it receives `control`.)

- [ ] **Step 4: Persist.** In `TransportationDialog.tsx` `basePayload` (line 60) add:

```typescript
departure_timezone: data.departure_timezone ?? null,
arrival_timezone: data.arrival_timezone ?? null,
```

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run` → clean.

```bash
git add src/components/trip/transportation/TransportationForm.tsx src/components/trip/transportation/TransportationFormFields.tsx src/components/trip/transportation/TransportationDialog.tsx
git commit -m "feat(timezones): per-leg departure/arrival timezone selects on transport"
```

---

### Task 11: Timeline badges (TDD)

**Files:**
- Modify: `src/components/trip/day/components/timeline-utils.ts` (`TimelineItem` at 14-23, `formatTimeRange` at 36-42)
- Modify: `src/components/trip/day/components/useDayTimeline.ts` (input type at 23-29, builders at 53-206, hook at 347+)
- Modify: `src/components/trip/day/CompactDayCard.tsx` (call site of `useDayTimeline` at line 173)
- Test: create `src/components/trip/day/components/timeline-utils.test.ts`

**Interfaces:**
- Consumes: `timezoneLabel` helpers (Task 2), `useTripTimezone` (Task 6), entity `timezone` fields (Task 1).
- Produces: `TimelineItem` gains `tzSuffix?: string` / `endTzSuffix?: string` (already-resolved abbrevs, `''`/absent when no badge); `formatTimeRange(startTime?, endTime?, useArrow?, startSuffix?, endSuffix?)` appends each suffix after its time; `UseDayTimelineInput` gains `tripTimezone?: string | null`.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { formatTimeRange } from './timeline-utils';

describe('formatTimeRange with zone suffixes', () => {
  it('is unchanged with no suffixes', () => {
    expect(formatTimeRange('09:00', '14:30')).toBe('9:00 AM – 2:30 PM');
    expect(formatTimeRange('09:20', '11:45', true)).toBe('9:20 AM → 11:45 AM');
  });
  it('appends a suffix to a lone start time', () => {
    expect(formatTimeRange('09:00', undefined, false, 'EDT')).toBe('9:00 AM EDT');
  });
  it('appends per-endpoint suffixes on a range', () => {
    expect(formatTimeRange('23:00', '11:00', true, 'EDT', 'BST')).toBe('11:00 PM EDT → 11:00 AM BST');
  });
  it('appends only the end suffix when start suffix is empty', () => {
    expect(formatTimeRange('09:00', '14:30', false, '', 'EDT')).toBe('9:00 AM – 2:30 PM EDT');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/trip/day/components/timeline-utils.test.ts`
Expected: FAIL — extra arguments have no effect / assertions on suffixed output fail.

- [ ] **Step 3: Implement `formatTimeRange`** (replace lines 36-42; existing 3-arg callers are unaffected):

```typescript
// "9:00 AM – 2:30 PM" or "9:20 AM → 11:45 AM" (arrow for transport).
// Optional per-endpoint zone suffixes: "11:00 PM EDT → 11:00 AM BST".
export const formatTimeRange = (
  startTime?: string,
  endTime?: string,
  useArrow?: boolean,
  startSuffix = '',
  endSuffix = '',
): string => {
  if (!startTime) return '';
  const start = formatTime12(startTime) + (startSuffix ? ` ${startSuffix}` : '');
  if (!endTime) return start;
  const end = formatTime12(endTime) + (endSuffix ? ` ${endSuffix}` : '');
  return useArrow ? `${start} → ${end}` : `${start} – ${end}`;
};
```

And extend `TimelineItem` (line 14):

```typescript
tzSuffix?: string;      // zone abbrev for `time` ('' / absent = no badge)
endTzSuffix?: string;   // zone abbrev for `endTime`
```

- [ ] **Step 4: Thread the trip zone through `useDayTimeline.ts`.**

Add `tripTimezone?: string | null;` to `UseDayTimelineInput` and pass it (plus `normalizedDay`) into the builders. Import at top:

```typescript
import { effectiveTz, shouldShowBadge, tzAbbrev, transportTzLabels } from '@/utils/timezoneLabel';
```

Add one shared helper above the builders:

```typescript
/** Abbrev suffix for a single-zone item; '' when it inherits the trip zone. */
function entityTzSuffix(entityTz: string | null | undefined, tripTz: string | null | undefined, onDate: string): string {
  return shouldShowBadge(entityTz, tripTz) ? tzAbbrev(effectiveTz(entityTz, tripTz)!, onDate) : '';
}
```

Builder changes (each builder gains `tripTz: string | null | undefined` and — where missing — `normalizedDay: string` params; update the call sites in the `timelineItems` memo at lines 396-405 accordingly):

- `buildActivityItems`: compute `const suffix = entityTzSuffix(activity.timezone, tripTz, normalizedDay);` and set on the pushed item: `tzSuffix: activity.end_time ? '' : suffix, endTzSuffix: activity.end_time ? suffix : undefined,` (a range shows the zone once, after the end time).
- `buildHotelItems`: `tzSuffix: entityTzSuffix(stay.timezone, tripTz, normalizedDay)` on both check-in and check-out items.
- `buildDiningItems`: `tzSuffix: entityTzSuffix(r.timezone, tripTz, normalizedDay)`.
- `buildTransportationItems` (lines 165-189): compute

```typescript
const labels = transportTzLabels(t.departure_timezone, t.arrival_timezone, tripTz, normalizedDay);
const { displayTime, title, isStartDay, isEndDay, isMultiDay } = getTransportDisplayInfo(t, normalizedDay);
```

and on the pushed item: `tzSuffix: isMultiDay && isEndDay && !isStartDay ? labels.arr : labels.dep, endTzSuffix: labels.arr,` (the primary time is the departure on start/same-day rows and the arrival on arrival-only rows; `endTime` is always the same-day arrival).

Finally add `tripTimezone` to the hook signature and the `timelineItems` memo dependency array.

- [ ] **Step 5: Render in `TimelineRow.tsx:137-139`:**

```typescript
const timeLabel = item.time
  ? formatTimeRange(item.time, item.endTime, item.type === 'transportation', item.tzSuffix ?? '', item.endTzSuffix ?? '')
  : '';
```

- [ ] **Step 6: Supply the trip zone in `CompactDayCard.tsx`.** Add `const { tripTimezone } = useTripTimezone(tripId);` (import from `@/hooks/useTripTimezone`) and pass `tripTimezone` into the `useDayTimeline({ ... })` call at line 173. (Grouped rows keep their existing zone-less `timeRange` — groups bundle same-zone nearby events; acceptable per spec's badge-on-divergence rule.)

- [ ] **Step 7: Run all tests**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, including the new `timeline-utils.test.ts`.

- [ ] **Step 8: Commit**

```bash
git add src/components/trip/day/components/timeline-utils.ts src/components/trip/day/components/timeline-utils.test.ts src/components/trip/day/components/useDayTimeline.ts src/components/trip/day/components/TimelineRow.tsx src/components/trip/day/CompactDayCard.tsx
git commit -m "feat(timezones): zone badges on timeline rows"
```

---

### Task 12: Calendar chip badges (TDD)

**Files:**
- Modify: `src/components/trip/calendar/eventMapping.ts` (mappers at 27-114)
- Modify: `src/components/trip/calendar/useCalendarEvents.ts` (mapper calls at 20-43)
- Modify: `src/components/trip/calendar/CalendarEventChip.tsx:13-25`
- Test: extend `src/components/trip/calendar/eventMapping.test.ts`

**Interfaces:**
- Consumes: `timezoneLabel` helpers, `useTripTimezone` (called inside `useCalendarEvents` — it already receives `tripId`, so `TripCalendarView.tsx:43` needs no change).
- Produces: each timed mapper gains an optional trailing `tripTz?: string | null` param and sets `extendedProps.tzBadge: string` (`''` when no badge; transport uses `"EDT→BST"` when its zones differ). The calendar's `timeZone` option stays unset — floating preserved.

- [ ] **Step 1: Write the failing tests** (add to `eventMapping.test.ts`; reuse its existing `baseActivity`-style fixtures):

```typescript
describe('timezone badges', () => {
  const tripTz = 'America/New_York';

  it('sets no badge when the activity inherits the trip zone', () => {
    const e = mapActivityToEvent({ ...baseActivity, timezone: null }, '2026-06-30', tripTz);
    expect(e?.extendedProps).toMatchObject({ tzBadge: '' });
  });

  it('sets an abbrev badge when the activity zone diverges', () => {
    const e = mapActivityToEvent({ ...baseActivity, timezone: 'Europe/Paris' }, '2026-06-30', tripTz);
    expect((e?.extendedProps as { tzBadge: string }).tzBadge).not.toBe('');
  });

  it('labels both zones on a cross-zone flight', () => {
    const t = {
      id: 't1', trip_id: 'trip1', type: 'flight', provider: null, details: null,
      confirmation_number: null, start_date: '2026-06-30', start_time: '23:00',
      end_date: '2026-06-30', end_time: '11:00', departure_location: 'JFK',
      arrival_location: 'LHR', cost: null, currency: null, is_paid: false, created_at: '',
      departure_timezone: 'America/New_York', arrival_timezone: 'Europe/London',
    };
    const e = mapTransportationToEvent(t as Transportation, tripTz);
    const badge = (e?.extendedProps as { tzBadge: string }).tzBadge;
    expect(badge).toContain('EDT');
    expect(badge).toContain('→');
  });

  it('keeps events floating (no zone in the datetime string)', () => {
    const e = mapActivityToEvent({ ...baseActivity, timezone: 'Europe/Paris' }, '2026-06-30', tripTz);
    expect(e?.start).toBe('2026-06-30T14:30:00');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/trip/calendar/eventMapping.test.ts`
Expected: FAIL — `tzBadge` undefined / extra args ignored.

- [ ] **Step 3: Implement in `eventMapping.ts`.** Import the helpers:

```typescript
import { effectiveTz, shouldShowBadge, tzAbbrev, transportTzLabels } from '@/utils/timezoneLabel';

function entityTzBadge(entityTz: string | null | undefined, tripTz: string | null | undefined, onDate: string): string {
  return shouldShowBadge(entityTz, tripTz) ? tzAbbrev(effectiveTz(entityTz, tripTz)!, onDate) : '';
}
```

- `mapActivityToEvent(activity, dayDate, tripTz?: string | null)`: in the **timed** branch set `extendedProps: { entityType: 'activity', record: activity, tzBadge: entityTzBadge(activity.timezone, tripTz ?? null, dayDate) }`; all-day branch sets `tzBadge: ''`.
- `mapReservationToEvent(reservation, dayDate, tripTz?: string | null)`: same with `reservation.timezone`.
- `mapAccommodationToEvent(stay)`: unchanged signature; add `tzBadge: ''` (all-day chips never show a time).
- `mapTransportationToEvent(t, tripTz?: string | null)`: in the timed branch:

```typescript
const labels = transportTzLabels(t.departure_timezone, t.arrival_timezone, tripTz ?? null, t.start_date);
const tzBadge = labels.dep && labels.arr && labels.dep !== labels.arr
  ? `${labels.dep}→${labels.arr}`
  : labels.dep;
```

set `extendedProps: { entityType: 'transportation', record: t, tzBadge }`; all-day branch `tzBadge: ''`.

- [ ] **Step 4: Wire `useCalendarEvents.ts`:**

```typescript
import { useTripTimezone } from '@/hooks/useTripTimezone';
// inside the hook:
const { tripTimezone } = useTripTimezone(tripId);
```

Pass it: `mapActivityToEvent(activity, day.date, tripTimezone)`, `mapReservationToEvent(reservation, dayDate.get(reservation.day_id) ?? '', tripTimezone)`, `mapTransportationToEvent(t, tripTimezone)`; add `tripTimezone` to the `useMemo` deps.

- [ ] **Step 5: Render in `CalendarEventChip.tsx`.** Read the badge and append it to the time text:

```tsx
const { entityType, tzBadge } = arg.event.extendedProps as { entityType: CalendarEntityType; tzBadge?: string };
// in the timed-event span:
{!arg.event.allDay && arg.timeText && (
  <span className="text-[10px] font-medium tabular-nums opacity-70 shrink-0">
    {arg.timeText}{tzBadge ? ` ${tzBadge}` : ''}
  </span>
)}
```

- [ ] **Step 6: Run all tests**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS (existing eventMapping tests must still pass — the new param is optional).

- [ ] **Step 7: Commit**

```bash
git add src/components/trip/calendar/eventMapping.ts src/components/trip/calendar/eventMapping.test.ts src/components/trip/calendar/useCalendarEvents.ts src/components/trip/calendar/CalendarEventChip.tsx
git commit -m "feat(timezones): zone badges on calendar event chips"
```

---

### Task 13: PDF export badges

**Files:**
- Modify: `src/services/pdfmake-export.ts` (trip select at line 339; time call sites at 417-427, 445-460, 469-477, 499-508)

**Interfaces:**
- Consumes: `timezoneLabel` helpers; `trips.timezone` (Task 1). Rows are typed via `Tables<>`-derived row types, so the new columns are already on `AccommodationRow`/`TransportationRow`/`DayActivityRow`/`ReservationRow` after Task 1.
- Produces: PDF `time` cells like `"11:00 PM EDT – 11:00 AM BST"`; no layout/logic change otherwise.

- [ ] **Step 1: Fetch the trip zone.** Change line 339 `.select('budget')` → `.select('budget, timezone')`, and where the budget result is unpacked, capture `const tripTz: string | null = (tripRow?.timezone as string | null) ?? null;` (match the actual variable name used for that query's result in the surrounding code). Import at top:

```typescript
import { effectiveTz, shouldShowBadge, tzAbbrev, transportTzLabels } from '@/utils/timezoneLabel';
```

Add one local helper next to `fmtTime` (line 170):

```typescript
/** Append a zone abbrev to a formatted time when the entity zone diverges. */
function withTzSuffix(formatted: string, entityTz: string | null | undefined, tripTz: string | null, onDate: string): string {
  if (!formatted) return formatted;
  const suffix = shouldShowBadge(entityTz, tripTz) ? tzAbbrev(effectiveTz(entityTz, tripTz)!, onDate) : '';
  return suffix ? `${formatted} ${suffix}` : formatted;
}
```

- [ ] **Step 2: Accommodation (line 417):** `const t = fmtTime(when);` → keep, then use `time: withTzSuffix(t, s.timezone, tripTz, String(day.date)) || 'All-day',` (leave `sortKey: minsFromTime(t || '8:00 am')` on the **unsuffixed** `t`).

- [ ] **Step 3: Transportation (lines 445-447):**

```typescript
const labels = transportTzLabels(t.departure_timezone, t.arrival_timezone, tripTz, String(day.date));
const startStr = fmtTime(t.start_time);
const endStr = fmtTime(t.end_time);
const startLabeled = startStr && labels.dep ? `${startStr} ${labels.dep}` : startStr;
const endLabeled = endStr && labels.arr ? `${endStr} ${labels.arr}` : endStr;
const timeStr = startLabeled && endLabeled ? `${startLabeled} – ${endLabeled}` : (startLabeled || endLabeled || 'All-day');
```

(`sortKey` stays on the plain `startStr`.)

- [ ] **Step 4: Activities (line 469)** and **dining (line 499):** same as Step 2 with `a.timezone` / `r.timezone` and the plain `t` kept for `sortKey`.

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run` → clean.

```bash
git add src/services/pdfmake-export.ts
git commit -m "feat(timezones): zone labels in PDF itinerary times"
```

---

### Task 14: iCal feed zone text (TDD — feed stays floating)

**Files:**
- Modify: `server/lib/icalFeed.ts` (interfaces at 3-14, builder at 44-96)
- Modify: `server/routes/calendar.ts` (selects + mapping at 25-66)
- Test: extend `server/lib/icalFeed.test.ts`

**Interfaces:**
- Consumes: `timezoneLabel` helpers via relative import `../../src/utils/timezoneLabel` (the route already imports from `../../src/...`; `timezoneLabel.ts` is dependency-free so it's safe in the Express bundle).
- Produces: `FeedTrip.timezone: string | null`; `FeedActivity.timezone`, `FeedReservation.timezone`, `FeedTransportation.departure_timezone`/`arrival_timezone` (all `string | null`). Cross-zone items get the zone in `SUMMARY` text only — **no `TZID`, no `Z`**.

- [ ] **Step 1: Write the failing tests.** In `icalFeed.test.ts`, extend the fixture `input` with the new fields (`trip: { destination: ..., timezone: 'America/New_York' }`, `timezone: null` on existing activity/reservation fixtures, `departure_timezone: null, arrival_timezone: null` on the existing transport fixture) and add:

```typescript
it('appends the zone to the SUMMARY of a cross-zone activity', () => {
  const crossZone = buildTripCalendarICS({
    ...input,
    activities: [{ ...input.activities[0], timezone: 'Europe/London' }],
  });
  expect(crossZone).toMatch(/SUMMARY:.*\((GMT\+1|BST)\)/);
});

it('labels both zones on a cross-zone flight summary', () => {
  const crossZone = buildTripCalendarICS({
    ...input,
    transportation: [{
      ...input.transportation[0],
      start_time: '23:00', end_time: '11:00',
      departure_timezone: 'America/New_York', arrival_timezone: 'Europe/London',
    }],
  });
  expect(crossZone).toMatch(/SUMMARY:.*\(EDT [→\\-] ?.*\)/);
});

it('stays floating for cross-zone items (no TZID, no Z)', () => {
  const crossZone = buildTripCalendarICS({
    ...input,
    activities: [{ ...input.activities[0], timezone: 'Europe/London' }],
  });
  expect(crossZone).not.toContain('TZID');
  expect(crossZone).not.toMatch(/DTSTART:\d{8}T\d{6}Z/);
});
```

Adjust the expected abbrev in the first/second assertions to what `tzAbbrev` actually returns under Node's ICU (Task 2 established it; London may render `GMT+1` rather than `BST` — pin the real value). Note the summary arrow: use a plain ASCII `->` in the implementation to avoid ICS escaping surprises, and assert on `->`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run server/lib/icalFeed.test.ts`
Expected: FAIL — first on missing fixture fields (type error), then on missing summary text.

- [ ] **Step 3: Implement `icalFeed.ts`.**

Interface additions (lines 3-7): `FeedTrip` gains `timezone: string | null;`; `FeedActivity` and `FeedReservation` gain `timezone: string | null;`; `FeedTransportation` gains `departure_timezone: string | null; arrival_timezone: string | null;`.

Import + helper:

```typescript
import { effectiveTz, shouldShowBadge, tzAbbrev, transportTzLabels } from '../../src/utils/timezoneLabel';

/** "Louvre (BST)" when the entity zone diverges from the trip zone; title otherwise. */
function summaryWithTz(title: string, entityTz: string | null, tripTz: string | null, onDate: string): string {
  const suffix = shouldShowBadge(entityTz, tripTz) ? tzAbbrev(effectiveTz(entityTz, tripTz)!, onDate) : '';
  return suffix ? `${title} (${suffix})` : title;
}
```

In `buildTripCalendarICS`: `const tripTz = input.trip.timezone;`. Timed activity events: `summary: summaryWithTz(a.title, a.timezone, tripTz, a.date)`. Timed reservation events: `summary: summaryWithTz(r.restaurant_name, r.timezone, tripTz, r.date)`. Timed transportation events:

```typescript
const labels = transportTzLabels(t.departure_timezone, t.arrival_timezone, tripTz, t.start_date);
const tzNote = labels.dep && labels.arr && labels.dep !== labels.arr
  ? ` (${labels.dep} -> ${labels.arr})`
  : (labels.dep ? ` (${labels.dep})` : '');
// summary: transportTitle(t) + tzNote
```

All-day events unchanged (no times, no badges). `floating: true` untouched everywhere.

- [ ] **Step 4: Wire the route (`calendar.ts`).** Selects: trips → `'destination, calendar_feed_token, calendar_feed_enabled, timezone'`; `day_activities` and `reservations` selects each append `, timezone`; `transportation` select appends `, departure_timezone, arrival_timezone`. `FeedInput` mapping: `trip: { destination: trip.destination ?? 'Trip', timezone: trip.timezone ?? null }`; activity/reservation maps add `timezone: a.timezone` / `timezone: r.timezone`; transportation map adds `departure_timezone: t.departure_timezone, arrival_timezone: t.arrival_timezone`.

- [ ] **Step 5: Run all tests**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS — including the pre-existing floating assertions (`emits floating timed events (no Z, no TZID)`).

- [ ] **Step 6: Commit**

```bash
git add server/lib/icalFeed.ts server/lib/icalFeed.test.ts server/routes/calendar.ts
git commit -m "feat(timezones): zone text in iCal feed summaries (feed stays floating)"
```

---

### Task 15: Full verification + deployment checklist

**Files:** none (verification only).

- [ ] **Step 1: Full local gates**

Run: `npx tsc --noEmit && npx vitest run && npx eslint . --max-warnings=0 2>/dev/null || bun run lint 2>/dev/null || npx eslint src server`
Expected: type-check clean, all tests pass, no new lint errors (compare against `main-agent` if the repo has pre-existing warnings).

- [ ] **Step 2: Deployment steps (each needs user confirmation — do not run unprompted):**
  1. Apply `supabase/migrations/20260701000000_trip_timezones.sql` via MCP `apply_migration` (CLI is unauthenticated per project memory).
  2. Deploy the Edge Function via MCP `deploy_edge_function` (`timezone-proxy`).
  3. **User action:** enable the **Time Zone API** in the Google Cloud project that owns `GOOGLE_PLACES_API_KEY` (Places API is already enabled; Time Zone API is new usage).

- [ ] **Step 3: Manual verification once deployed** (or via the `/verify` skill): open a trip with a resolvable primary destination → `trips.timezone` self-heals on view (check the row); add an activity with a place in another zone → timezone pre-fills and a badge appears on the timeline row and calendar chip; add a flight, override the arrival zone → both labels render ("11:00 PM EDT → 11:00 AM BST"); export the PDF and fetch `calendar.ics` → zone text present, `TZID`/`Z` absent; confirm a single-destination trip shows **zero** badges anywhere.

- [ ] **Step 4: Finish the branch** — use the superpowers:finishing-a-development-branch skill (merge/PR decision), noting the branch stacks on `feat/trip-calendar-view`.

---

## Self-Review (completed at planning time)

- **Spec coverage:** Unit 1 → Task 3; Unit 2 → Task 4; Unit 3 → Task 1; Unit 4 → Task 2; Unit 5 → Tasks 11 (timeline), 12 (calendar), 13 (PDF), 14 (feed); Unit 6 → Tasks 5, 7–10; lazy trip resolution + edit-gated persist → Task 6; error handling (soft failures, guarded Intl) → Tasks 2, 3, 4; scope exclusions respected (no conversion, no transport autocomplete, no hero editor, no backfill).
- **Known deviations:** Edge Function has no automated test (no Deno harness in repo — soft-failure contract covered by hook tests); form auto-fill verified manually + via the pure precedence rule; grouped timeline rows keep zone-less time ranges.
- **Type consistency check:** `tripTimezone` (hook return) vs `tripTz` (helper params) naming is intentional; helper signatures match across Tasks 2/11/12/13/14; `tzBadge`/`tzSuffix`/`endTzSuffix` names consistent between producer and consumer tasks.
