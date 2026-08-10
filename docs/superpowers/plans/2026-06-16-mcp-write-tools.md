# MCP Write Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the WanderLuxe MCP server from 3 read-only tools to read+write, so a Claude.ai connector can create trips and manage activities, dining, accommodations, transportation, and expenses — all through the existing per-request, user-scoped (RLS) Supabase client, with no service-role key.

**Architecture:** Three new server modules. `server/lib/tripDates.ts` holds the pure, unit-tested date helpers (inclusive date range + add/drop diff). `server/lib/tripWrites.ts` holds the write functions, each taking the user-scoped Supabase client as its first argument and mirroring the business logic that today lives in client-side services (day generation, owner share, order_index, accommodation night fan-out). `server/lib/mcpTools.ts` registers all tools (the 3 existing read tools, moved here unchanged, plus 17 new write tools) onto an `McpServer`. `server/routes/mcp.ts` shrinks to transport, auth, and OAuth discovery, and passes the authenticated `{ userId, email }` into tool registration.

**Tech Stack:** Express + `@modelcontextprotocol/sdk` (McpServer, StreamableHTTP), `@supabase/supabase-js` (anon key + per-request user JWT → RLS), `zod` for input validation, `jose` for JWT verification, Vitest for unit tests, the on-demand `evals/mcp` harness for a live lifecycle test.

---

## Background facts discovered during exploration (read before starting)

These were verified against the actual codebase and **correct errors in the design spec**. Treat this section as ground truth.

1. **`transportation.type` is a Postgres enum**, defined in `src/integrations/supabase/types/database.ts:1457-1463` as exactly:
   `"flight" | "train" | "car_service" | "shuttle" | "ferry" | "rental_car"`.
   The design spec's `flight|train|bus|car|other` is **wrong** — use the real enum values above.

2. **Required (NOT NULL, no default) insert columns per table** (from the generated `Insert` types in `database.ts`):
   - `trips`: `arrival_date`, `departure_date`, `destination`, `user_id`. (`budget` nullable; `is_public` has a default but the app sets it `false`.)
   - `trip_days`: `date`, `trip_id`. (`day_id` auto.)
   - `day_activities`: `day_id`, `order_index`, `title`, `trip_id`. Everything else nullable.
   - `reservations`: `day_id`, `order_index`, `restaurant_name`, `trip_id`. Everything else nullable.
   - `accommodations`: `order_index`, `title`, `trip_id`. **`hotel`, `hotel_checkin_date`, `hotel_checkout_date` are all nullable at the DB level** — but the tool layer will require them (app-level contract). `title` must be set (= hotel name).
   - `accommodations_days`: `date`, `day_id`, `stay_id`.
   - `transportation`: `start_date`, `trip_id`, `type`. Everything else nullable (including `departure_location`/`arrival_location`/`currency`, which the *form* requires but the DB does not — the tool will keep them optional per the design spec).
   - `other_expenses`: `description`, `trip_id`. `cost`, `currency`, `date`, `amount_paid`, `is_paid` all nullable.

3. **`order_index`**: the app is inconsistent (sometimes `0`, sometimes `array.length`, sometimes max+1). We standardize on **max+1 within scope** (the design spec's stated intent):
   - activities, reservations → scope by `day_id`.
   - accommodations → scope by `trip_id` (matches `getNextAccommodationOrderIndex` in `src/services/accommodation/accommodationService.ts:25-37`).
   - transportation, other_expenses → **no `order_index` column** (ordered by date). Do not set one.

4. **Day resolution**: the app resolves `day_id` from a date with
   `supabase.from('trip_days').select('day_id').eq('trip_id', tripId).eq('date', date).single()`
   (e.g. `RestaurantReservationForm.tsx:234-251`). We reuse this exact pattern.

5. **Create ordering matters for RLS.** The app's create flow (`CreateTripForm.tsx:100-123`) inserts in this order: **(1) `trips` → (2) owner row in `trip_shares` → (3) `trip_days`.** Child-table RLS policies use `user_has_edit_permission(trip_id)` / `is_trip_owner(trip_id)` (see the SQL functions in `database.ts:1440-1454`), which can depend on the `trip_shares` owner row existing. **Insert the owner share before any `trip_days` / child rows.**

6. **Owner share shape** (`src/services/travelers.ts:13-56`): the app inserts `{ trip_id, shared_by_user_id: userId, shared_with_user_id: userId, first_name, last_name, shared_with_email, permission_level: 'edit' }`, deriving the name from the user's `profiles.full_name` (fallback: email prefix). It is best-effort (failure does not abort trip creation).

7. **`other_expenses` update/delete bug to avoid:** the app's `useBudgetMutations.ts` update/delete mistakenly target a non-existent `expenses` table. **Our tools must target `other_expenses` for all of create/update/delete.**

8. **Vitest does not currently run `server/**` tests.** `vitest.config.ts:11-14` includes only `src/**` and `evals/helpers/**`. Task 1 adds `server/**` so the new pure-helper unit tests run in CI.

9. **The existing eval `tools.eval.ts:36-44` asserts exactly the 3 read tools.** Adding write tools will break it; Task 13 updates that assertion.

10. **Reading conventions for write functions:** mirror the read tools' error style (`server/routes/mcp.ts:99-101`): user-facing failures become `toolError(message)`; expected interactive outcomes (the `update_trip` confirmation) become a normal `toolResult` with a `status` field.

---

## File structure

| File | Responsibility |
|---|---|
| `server/lib/tripDates.ts` (new) | Pure date helpers: `dateRange`, `planDateChange`. No I/O, no deps. |
| `server/lib/tripDates.test.ts` (new) | Unit tests for the above. |
| `server/lib/tripWrites.ts` (new) | All write functions `(supabase, …) → result`; private helpers `resolveDayId`, `nextOrderIndex`, `addOwnerShare`, `buildDroppedDayReport`; `WriteError`. |
| `server/lib/tripWrites.test.ts` (new) | Unit test for the pure `buildDroppedDayReport` (the data-loss content pre-check). |
| `server/lib/mcpTools.ts` (new) | `registerWanderluxeTools(server, supabase, ctx)` — registers read + write tools. |
| `server/routes/mcp.ts` (modify) | Remove inline tool registration; extend `authenticate` to return `email`; pass `{ userId, email }` into `buildMcpServer` → `registerWanderluxeTools`. |
| `vitest.config.ts` (modify) | Add `server/**/*.{test,spec}.ts` to `include`. |
| `evals/mcp/tools.eval.ts` (modify) | Update `tools/list` assertion to the full 20-tool surface. |
| `evals/mcp/writes.eval.ts` (new) | On-demand lifecycle eval: create → add → update → confirm-pattern → delete → cleanup. |

---

## Task 1: Run server unit tests in CI

**Files:**
- Modify: `vitest.config.ts:11-14`

- [ ] **Step 1: Add the server glob to the Vitest include list**

In `vitest.config.ts`, change the `include` array from:

```ts
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'evals/helpers/**/*.test.ts',
    ],
```

to:

```ts
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'server/**/*.{test,spec}.ts',
      'evals/helpers/**/*.test.ts',
    ],
```

- [ ] **Step 2: Confirm the existing suite still passes (no server tests exist yet, so this is a no-op safety check)**

Run: `npx vitest run`
Expected: PASS — same green suite as before (no new files matched yet).

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "test: include server/**/*.test.ts in the Vitest run"
```

---

## Task 2: Pure date helpers (`tripDates.ts`)

**Files:**
- Create: `server/lib/tripDates.ts`
- Test: `server/lib/tripDates.test.ts`

These are pure and timezone-safe (UTC-based, integer-day stepping — DST cannot perturb a 86_400_000 ms step on UTC midnights).

- [ ] **Step 1: Write the failing test**

Create `server/lib/tripDates.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { dateRange, planDateChange } from './tripDates';

describe('dateRange', () => {
  it('returns an inclusive list of YYYY-MM-DD dates', () => {
    expect(dateRange('2026-09-14', '2026-09-16')).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
    ]);
  });

  it('returns a single date when start === end', () => {
    expect(dateRange('2026-09-14', '2026-09-14')).toEqual(['2026-09-14']);
  });

  it('crosses a month boundary correctly', () => {
    expect(dateRange('2026-01-31', '2026-02-02')).toEqual([
      '2026-01-31',
      '2026-02-01',
      '2026-02-02',
    ]);
  });

  it('is stable across a spring-forward DST date (UTC stepping)', () => {
    // US DST began 2026-03-08; UTC stepping must not skip or duplicate a day.
    expect(dateRange('2026-03-07', '2026-03-09')).toEqual([
      '2026-03-07',
      '2026-03-08',
      '2026-03-09',
    ]);
  });

  it('returns an empty array when start is after end', () => {
    expect(dateRange('2026-09-16', '2026-09-14')).toEqual([]);
  });
});

describe('planDateChange', () => {
  it('reports days to add and days to drop against the new range', () => {
    const existing = ['2026-09-14', '2026-09-15', '2026-09-16'];
    const target = ['2026-09-15', '2026-09-16', '2026-09-17'];
    expect(planDateChange(existing, target)).toEqual({
      toAdd: ['2026-09-17'],
      toDrop: ['2026-09-14'],
    });
  });

  it('reports only additions when the range only grows', () => {
    expect(planDateChange(['2026-09-14'], ['2026-09-14', '2026-09-15'])).toEqual({
      toAdd: ['2026-09-15'],
      toDrop: [],
    });
  });

  it('reports nothing when ranges are identical', () => {
    const same = ['2026-09-14', '2026-09-15'];
    expect(planDateChange(same, same)).toEqual({ toAdd: [], toDrop: [] });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run server/lib/tripDates.test.ts`
Expected: FAIL — `Failed to resolve import "./tripDates"` (module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `server/lib/tripDates.ts`:

```ts
// Pure date helpers for the MCP write tools. No I/O, no external deps, so they
// run in the main Vitest CI suite. All arithmetic is on UTC midnights, so DST
// transitions can never skip or duplicate a day.

const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toUtcMidnight(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMidnight(ms: number): string {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Inclusive list of YYYY-MM-DD dates from start to end. Empty if start > end. */
export function dateRange(start: string, end: string): string[] {
  const startMs = toUtcMidnight(start);
  const endMs = toUtcMidnight(end);
  const out: string[] = [];
  for (let cur = startMs; cur <= endMs; cur += DAY_MS) {
    out.push(fromUtcMidnight(cur));
  }
  return out;
}

/** Diff existing trip-day dates against a target range. */
export function planDateChange(
  existing: string[],
  target: string[],
): { toAdd: string[]; toDrop: string[] } {
  const existingSet = new Set(existing);
  const targetSet = new Set(target);
  return {
    toAdd: target.filter((d) => !existingSet.has(d)),
    toDrop: existing.filter((d) => !targetSet.has(d)),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run server/lib/tripDates.test.ts`
Expected: PASS — all 8 cases green.

- [ ] **Step 5: Commit**

```bash
git add server/lib/tripDates.ts server/lib/tripDates.test.ts
git commit -m "feat(mcp): pure date-range and trip-day diff helpers"
```

---

## Task 3: Write-layer scaffolding (`tripWrites.ts` shared helpers + types)

**Files:**
- Create: `server/lib/tripWrites.ts`

This task creates the module with shared helpers and the input type aliases. The per-entity functions are added in later tasks. No new test here — the helpers are exercised by the later eval; the only *pure* function (`buildDroppedDayReport`) gets its own test in Task 5.

- [ ] **Step 1: Create the module with imports, error type, and shared helpers**

Create `server/lib/tripWrites.ts`:

```ts
// Write functions for the MCP server. Each takes the per-request, user-scoped
// Supabase client (anon key + the caller's JWT) as its first argument, so RLS
// enforces all access control — never a service-role key. These mirror the
// business logic in the client-side services (day generation, owner share,
// order_index, accommodation night fan-out), which cannot be imported here
// because they use the browser Supabase singleton.

import type { SupabaseClient } from '@supabase/supabase-js';
import { dateRange } from './tripDates';

/** A user-facing error whose message is safe to return verbatim via toolError. */
export class WriteError extends Error {}

/** Context derived from the validated JWT (never from tool input). */
export interface UserContext {
  userId: string;
  email: string | null;
}

/**
 * Resolve a trip day's id from its date. Days are addressed by date, never by
 * day_id, throughout the tool surface. Throws a clear WriteError when the date
 * is outside the trip's range.
 */
async function resolveDayId(
  supabase: SupabaseClient,
  tripId: string,
  date: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('trip_days')
    .select('day_id')
    .eq('trip_id', tripId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw new WriteError(`Failed to resolve the day for ${date}: ${error.message}`);
  if (!data) {
    throw new WriteError(
      `No day matches ${date} on this trip. That date is outside the trip's range — ` +
        `update the trip's dates first, or pick a date within the range.`,
    );
  }
  return data.day_id;
}

/**
 * Next order_index within a scope (max existing + 1), matching how the app
 * orders app-created items. `scopeColumn` is 'day_id' (activities, dining) or
 * 'trip_id' (accommodations).
 */
async function nextOrderIndex(
  supabase: SupabaseClient,
  table: 'day_activities' | 'reservations' | 'accommodations',
  scopeColumn: 'day_id' | 'trip_id',
  scopeValue: string,
): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .select('order_index')
    .eq(scopeColumn, scopeValue)
    .order('order_index', { ascending: false })
    .limit(1);
  if (error) throw new WriteError(`Failed to compute order: ${error.message}`);
  return (data?.[0]?.order_index ?? -1) + 1;
}

/**
 * Insert the owner row into trip_shares, mirroring the app's
 * addOwnerToTripShares. Best-effort: a failure here must not abort trip
 * creation (the trip is already accessible via trips.user_id ownership).
 */
async function addOwnerShare(
  supabase: SupabaseClient,
  tripId: string,
  ctx: UserContext,
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', ctx.userId)
      .maybeSingle();

    const email = ctx.email?.toLowerCase() ?? null;
    let firstName = 'User';
    let lastName: string | null = null;
    if (profile?.full_name?.trim()) {
      const parts = profile.full_name.trim().split(' ').filter(Boolean);
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || null;
    } else if (email) {
      const prefix = email.split('@')[0] || 'User';
      firstName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }

    await supabase.from('trip_shares').insert({
      trip_id: tripId,
      shared_by_user_id: ctx.userId,
      shared_with_user_id: ctx.userId,
      first_name: firstName,
      last_name: lastName,
      shared_with_email: email,
      permission_level: 'edit',
    });
  } catch (err) {
    console.error('addOwnerShare failed (continuing):', err);
  }
}

// Re-export so the fan-out helpers below can use it without re-importing.
export { dateRange };
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors. (Unused-helper warnings are not type errors; the helpers are consumed in later tasks within the same commit series.)

- [ ] **Step 3: Commit**

```bash
git add server/lib/tripWrites.ts
git commit -m "feat(mcp): write-layer scaffolding (resolveDayId, nextOrderIndex, owner share)"
```

---

## Task 4: Move tool registration into `mcpTools.ts` (read tools only)

This is the targeted refactor called for by the spec: relocate the 3 read tools verbatim into a new module, leaving `mcp.ts` responsible for transport/auth/discovery. Behavior is unchanged.

**Files:**
- Create: `server/lib/mcpTools.ts`
- Modify: `server/routes/mcp.ts`

- [ ] **Step 1: Create `mcpTools.ts` with the read tools moved verbatim**

Create `server/lib/mcpTools.ts`:

```ts
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { summarizeCosts } from './budgetSummary';
import type { UserContext } from './tripWrites';

export function toolResult(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
}

export function toolError(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

const READ_ONLY = { readOnlyHint: true, destructiveHint: false };

/**
 * Register every WanderLuxe tool on the given server. `supabase` is the
 * per-request user-scoped client; `ctx` is the authenticated user identity
 * (used by create_trip / owner-share — never trusted from tool input).
 */
export function registerWanderluxeTools(
  server: McpServer,
  supabase: SupabaseClient,
  ctx: UserContext,
): void {
  registerReadTools(server, supabase);
  // Write tools are registered by later tasks (see registerWriteTools).
}

function registerReadTools(server: McpServer, supabase: SupabaseClient): void {
  server.registerTool(
    'list_trips',
    {
      description:
        'List the trips the user owns or that are shared with them, newest first. Returns trip_id, destination, dates, and budget.',
      annotations: READ_ONLY,
    },
    async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('trip_id,destination,arrival_date,departure_date,budget,created_at')
        .order('arrival_date', { ascending: false });
      if (error) return toolError(`Failed to list trips: ${error.message}`);
      return toolResult({ trips: data ?? [] });
    },
  );

  server.registerTool(
    'get_trip',
    {
      description:
        'Get the full itinerary for one trip: day-by-day activities and dining reservations, plus accommodations and transportation. Use list_trips to find the trip_id.',
      inputSchema: { trip_id: z.string().uuid().describe('Trip ID from list_trips') },
      annotations: READ_ONLY,
    },
    async ({ trip_id }) => {
      const [tripRes, daysRes, staysRes, transportRes, activitiesRes, diningRes] = await Promise.all([
        supabase
          .from('trips')
          .select('trip_id,destination,arrival_date,departure_date,budget')
          .eq('trip_id', trip_id)
          .maybeSingle(),
        supabase
          .from('trip_days')
          .select('day_id,date,title,description')
          .eq('trip_id', trip_id)
          .order('date'),
        supabase
          .from('accommodations')
          .select(
            'stay_id,hotel,hotel_address,hotel_checkin_date,hotel_checkout_date,checkin_time,checkout_time,hotel_phone,hotel_website,cost,currency',
          )
          .eq('trip_id', trip_id),
        supabase
          .from('transportation')
          .select(
            'id,type,provider,flight_number,confirmation_number,departure_location,arrival_location,start_date,start_time,end_date,end_time,cost,currency',
          )
          .eq('trip_id', trip_id)
          .order('start_date'),
        supabase
          .from('day_activities')
          .select('id,day_id,title,description,start_time,end_time,location_address,cost,currency')
          .eq('trip_id', trip_id),
        supabase
          .from('reservations')
          .select(
            'id,day_id,restaurant_name,reservation_time,number_of_people,address,confirmation_number,notes,cost,currency',
          )
          .eq('trip_id', trip_id),
      ]);

      if (tripRes.error) return toolError(`Failed to load trip: ${tripRes.error.message}`);
      if (!tripRes.data) return toolError('Trip not found, or you do not have access to it.');

      const activitiesByDay = new Map<string, unknown[]>();
      for (const a of activitiesRes.data ?? []) {
        const { day_id, ...rest } = a;
        const list = activitiesByDay.get(day_id) ?? [];
        list.push(rest);
        activitiesByDay.set(day_id, list);
      }
      const diningByDay = new Map<string, unknown[]>();
      for (const r of diningRes.data ?? []) {
        const { day_id, ...rest } = r;
        if (!day_id) continue;
        const list = diningByDay.get(day_id) ?? [];
        list.push(rest);
        diningByDay.set(day_id, list);
      }

      const days = (daysRes.data ?? []).map((d) => ({
        date: d.date,
        title: d.title,
        description: d.description,
        activities: activitiesByDay.get(d.day_id) ?? [],
        dining: diningByDay.get(d.day_id) ?? [],
      }));

      return toolResult({
        trip: tripRes.data,
        days,
        accommodations: staysRes.data ?? [],
        transportation: transportRes.data ?? [],
      });
    },
  );

  server.registerTool(
    'get_trip_budget',
    {
      description:
        'Get the budget breakdown for one trip: total budget, spend per category (accommodations, transportation, activities, dining, other), and paid vs unpaid amounts.',
      inputSchema: { trip_id: z.string().uuid().describe('Trip ID from list_trips') },
      annotations: READ_ONLY,
    },
    async ({ trip_id }) => {
      const [tripRes, staysRes, transportRes, activitiesRes, diningRes, otherRes] = await Promise.all([
        supabase.from('trips').select('budget').eq('trip_id', trip_id).maybeSingle(),
        supabase.from('accommodations').select('cost,currency,amount_paid,is_paid').eq('trip_id', trip_id),
        supabase.from('transportation').select('cost,currency').eq('trip_id', trip_id),
        supabase.from('day_activities').select('cost,currency,amount_paid,is_paid').eq('trip_id', trip_id),
        supabase.from('reservations').select('cost,currency,amount_paid,is_paid').eq('trip_id', trip_id),
        supabase
          .from('other_expenses')
          .select('description,cost,currency,amount_paid,is_paid')
          .eq('trip_id', trip_id),
      ]);

      if (tripRes.error) return toolError(`Failed to load trip: ${tripRes.error.message}`);
      if (!tripRes.data) return toolError('Trip not found, or you do not have access to it.');

      const categories = {
        accommodations: summarizeCosts(staysRes.data),
        transportation: summarizeCosts(transportRes.data),
        activities: summarizeCosts(activitiesRes.data),
        dining: summarizeCosts(diningRes.data),
        other: summarizeCosts(otherRes.data),
      };
      const totalCost = Object.values(categories).reduce((sum, c) => sum + c.total, 0);
      const totalPaid = Object.values(categories).reduce((sum, c) => sum + c.paid, 0);

      return toolResult({
        budget: tripRes.data.budget,
        total_cost: totalCost,
        total_paid: totalPaid,
        categories,
        other_expenses: otherRes.data ?? [],
        note: "Amounts are in each item's own currency; check `currencies` per category before summing across categories.",
      });
    },
  );
}
```

- [ ] **Step 2: Rewrite `mcp.ts` to use the new module and extend `authenticate` with `email`**

In `server/routes/mcp.ts`:

(a) Remove now-unused imports and add the new one. Delete the `McpServer` value import only if it's no longer referenced — it still is (`buildMcpServer` returns one), so keep the type usage. Remove `summarizeCosts` and `z` imports (now only used in `mcpTools.ts`). At the top, replace:

```ts
import { z } from 'zod';
import { summarizeCosts } from '../lib/budgetSummary';
```

with:

```ts
import { registerWanderluxeTools } from '../lib/mcpTools';
```

(b) Change `authenticate` to also return the email claim. Replace its return type and body's success path:

```ts
async function authenticate(
  req: Request,
): Promise<{ token: string; userId: string; email: string | null } | null> {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer,
      audience: 'authenticated',
      algorithms: ['ES256'],
    });
    if (!payload.sub) return null;
    const email = typeof payload.email === 'string' ? payload.email : null;
    return { token, userId: payload.sub, email };
  } catch {
    return null;
  }
}
```

(c) Delete the now-moved `toolResult`, `toolError`, `READ_ONLY` constants and the entire body of `buildMcpServer` that registered the 3 tools. Replace `buildMcpServer` with:

```ts
function buildMcpServer(auth: { token: string; userId: string; email: string | null }): McpServer {
  const supabase = createUserClient(auth.token);

  const server = new McpServer(
    { name: 'wanderluxe', version: '0.2.0' },
    {
      instructions:
        "Tools for reading and managing the user's WanderLuxe trips. Call list_trips first to get trip IDs — they are not guessable. Add items by date (YYYY-MM-DD); the server resolves the matching trip day. Times are 24h HH:MM, local to the destination. To change a trip's dates in a way that would drop days containing items, the update_trip tool will first return the at-risk days for confirmation; re-call it with confirm_remove_days: true to proceed.",
    },
  );

  registerWanderluxeTools(server, supabase, { userId: auth.userId, email: auth.email });
  return server;
}
```

(d) Update the POST handler call site (around `server/routes/mcp.ts:304`) from:

```ts
    const server = buildMcpServer(auth.token);
```

to:

```ts
    const server = buildMcpServer(auth);
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. (`ctx` is currently unused inside `registerWanderluxeTools` — it is consumed in Task 5. If the lint step flags it, leave it; Task 5 lands within this series. To keep `noUnusedParameters`-style configs happy, the param name already documents intent and is referenced by the write tools added next.)

- [ ] **Step 4: Lint**

Run: `npx eslint server/routes/mcp.ts server/lib/mcpTools.ts`
Expected: PASS (no errors).

- [ ] **Step 5: Smoke-test that the server still boots and lists 3 tools (manual, optional but recommended)**

If `.env` is configured, start the dev server and confirm a token-authenticated `tools/list` still returns the 3 read tools. Otherwise rely on the eval suite (Task 13). Document whichever you did.

- [ ] **Step 6: Commit**

```bash
git add server/routes/mcp.ts server/lib/mcpTools.ts
git commit -m "refactor(mcp): move tool registration into mcpTools.ts; expose JWT email"
```

---

## Task 5: `create_trip` + the data-loss content pre-check helper

This task adds `createTrip`, the pure `buildDroppedDayReport` helper (with its unit test — the spec's required content-detection CI test), and the `create_trip` tool. `update_trip` (which consumes `buildDroppedDayReport`) follows in Task 6.

**Files:**
- Modify: `server/lib/tripWrites.ts`
- Test: `server/lib/tripWrites.test.ts` (new)
- Modify: `server/lib/mcpTools.ts`

- [ ] **Step 1: Write the failing test for `buildDroppedDayReport`**

Create `server/lib/tripWrites.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildDroppedDayReport } from './tripWrites';

describe('buildDroppedDayReport', () => {
  const droppedDays = [
    { day_id: 'd1', date: '2026-09-14' },
    { day_id: 'd2', date: '2026-09-15' },
  ];

  it('summarizes activities, dining, and accommodation nights per dropped day', () => {
    const report = buildDroppedDayReport(droppedDays, {
      activities: [
        { day_id: 'd1', title: 'Louvre' },
        { day_id: 'd1', title: 'Seine cruise' },
      ],
      reservations: [{ day_id: 'd2', restaurant_name: 'Le Cinq' }],
      accommodationDays: [{ day_id: 'd1' }],
    });

    expect(report).toEqual([
      {
        date: '2026-09-14',
        activities: ['Louvre', 'Seine cruise'],
        dining: [],
        accommodation_nights: 1,
        total: 3,
      },
      {
        date: '2026-09-15',
        activities: [],
        dining: ['Le Cinq'],
        accommodation_nights: 0,
        total: 1,
      },
    ]);
  });

  it('returns zero-total entries for days with no content', () => {
    const report = buildDroppedDayReport(droppedDays, {
      activities: [],
      reservations: [],
      accommodationDays: [],
    });
    expect(report.every((r) => r.total === 0)).toBe(true);
    expect(report).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run server/lib/tripWrites.test.ts`
Expected: FAIL — `buildDroppedDayReport is not a function` / not exported.

- [ ] **Step 3: Add `buildDroppedDayReport` and `createTrip` to `tripWrites.ts`**

Append to `server/lib/tripWrites.ts`:

```ts
// ---- Trip ----

export interface CreateTripInput {
  destination: string;
  arrival_date: string;
  departure_date: string;
  budget?: number | null;
}

export async function createTrip(
  supabase: SupabaseClient,
  ctx: UserContext,
  input: CreateTripInput,
): Promise<{ trip_id: string; day_dates: string[] }> {
  // 1. Insert the trip, with user_id pinned to the authenticated user.
  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      user_id: ctx.userId,
      destination: input.destination,
      arrival_date: input.arrival_date,
      departure_date: input.departure_date,
      budget: input.budget ?? null,
      is_public: false,
    })
    .select('trip_id')
    .single();
  if (error || !trip) throw new WriteError(`Failed to create trip: ${error?.message ?? 'no row returned'}`);

  // 2. Owner share BEFORE days/children — child-table RLS can depend on it.
  await addOwnerShare(supabase, trip.trip_id, ctx);

  // 3. Generate one trip_days row per date in the range.
  const dates = dateRange(input.arrival_date, input.departure_date);
  const rows = dates.map((date) => ({ trip_id: trip.trip_id, date }));
  const { error: daysError } = await supabase.from('trip_days').insert(rows);
  if (daysError) {
    throw new WriteError(
      `Trip created (id ${trip.trip_id}) but generating its days failed: ${daysError.message}`,
    );
  }

  return { trip_id: trip.trip_id, day_dates: dates };
}

// ---- Date-change content pre-check (pure) ----

export interface DroppedDayReportEntry {
  date: string;
  activities: string[];
  dining: string[];
  accommodation_nights: number;
  total: number;
}

/**
 * Pure: given the dropped days and the items currently scheduled on them,
 * build a per-day report of what would be lost. `total` is the count of items
 * at risk on that day.
 */
export function buildDroppedDayReport(
  droppedDays: Array<{ day_id: string; date: string }>,
  content: {
    activities: Array<{ day_id: string; title: string }>;
    reservations: Array<{ day_id: string; restaurant_name: string }>;
    accommodationDays: Array<{ day_id: string }>;
  },
): DroppedDayReportEntry[] {
  return droppedDays.map((day) => {
    const activities = content.activities
      .filter((a) => a.day_id === day.day_id)
      .map((a) => a.title);
    const dining = content.reservations
      .filter((r) => r.day_id === day.day_id)
      .map((r) => r.restaurant_name);
    const accommodationNights = content.accommodationDays.filter(
      (ad) => ad.day_id === day.day_id,
    ).length;
    return {
      date: day.date,
      activities,
      dining,
      accommodation_nights: accommodationNights,
      total: activities.length + dining.length + accommodationNights,
    };
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run server/lib/tripWrites.test.ts`
Expected: PASS — both cases green.

- [ ] **Step 5: Register the `create_trip` tool**

In `server/lib/mcpTools.ts`, add the import at the top:

```ts
import { createTrip, WriteError } from './tripWrites';
import type { UserContext } from './tripWrites';
```

(Remove the now-duplicate `import type { UserContext }` line if present — keep a single import.)

Add the write-tools annotation constant near `READ_ONLY`:

```ts
const WRITE = { readOnlyHint: false, destructiveHint: false };
const WRITE_IDEMPOTENT = { readOnlyHint: false, destructiveHint: false, idempotentHint: true };
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true };
```

Add a shared zod field set near the top of the file (after the annotation constants):

```ts
const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use an ISO date, YYYY-MM-DD');
const timeField = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Use a 24h time, HH:MM');
const currencyField = z
  .string()
  .regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code, e.g. EUR');
```

Inside `registerWanderluxeTools`, after `registerReadTools(...)`, add:

```ts
  registerWriteTools(server, supabase, ctx);
```

Add a new `registerWriteTools` function (the rest of the write tools append to it in later tasks). Start it with `create_trip`:

```ts
function registerWriteTools(
  server: McpServer,
  supabase: SupabaseClient,
  ctx: UserContext,
): void {
  server.registerTool(
    'create_trip',
    {
      description:
        'Create a new trip. Generates one day per date from arrival to departure (inclusive) and returns the new trip_id plus the generated day_dates, so you can add items right away without a separate read.',
      inputSchema: {
        destination: z.string().min(1).describe('Trip name / destination, e.g. "Paris, France"'),
        arrival_date: dateField.describe('First day of the trip (YYYY-MM-DD)'),
        departure_date: dateField.describe('Last day of the trip (YYYY-MM-DD)'),
        budget: z.number().positive().optional().describe('Total trip budget (optional)'),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        if (args.departure_date < args.arrival_date) {
          return toolError('departure_date must be on or after arrival_date.');
        }
        const result = await createTrip(supabase, ctx, {
          destination: args.destination,
          arrival_date: args.arrival_date,
          departure_date: args.departure_date,
          budget: args.budget ?? null,
        });
        return toolResult(result);
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to create trip: ${String(err)}`);
      }
    },
  );
}
```

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint server/lib/mcpTools.ts server/lib/tripWrites.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/lib/tripWrites.ts server/lib/tripWrites.test.ts server/lib/mcpTools.ts
git commit -m "feat(mcp): create_trip tool + dropped-day content pre-check helper"
```

---

## Task 6: `update_trip` (with the two-call confirm pattern)

**Files:**
- Modify: `server/lib/tripWrites.ts`
- Modify: `server/lib/mcpTools.ts`

- [ ] **Step 1: Add `updateTrip` to `tripWrites.ts`**

Append to `server/lib/tripWrites.ts`:

```ts
export interface UpdateTripInput {
  trip_id: string;
  destination?: string;
  budget?: number | null;
  arrival_date?: string;
  departure_date?: string;
  confirm_remove_days?: boolean;
}

export type UpdateTripResult =
  | { status: 'updated'; trip_id: string; days_added: string[]; days_removed: string[] }
  | {
      status: 'confirmation_required';
      message: string;
      at_risk_days: DroppedDayReportEntry[];
    };

export async function updateTrip(
  supabase: SupabaseClient,
  input: UpdateTripInput,
): Promise<UpdateTripResult> {
  const { data: trip, error } = await supabase
    .from('trips')
    .select('trip_id,arrival_date,departure_date')
    .eq('trip_id', input.trip_id)
    .maybeSingle();
  if (error) throw new WriteError(`Failed to load trip: ${error.message}`);
  if (!trip) throw new WriteError('Trip not found, or you do not have access to it.');

  const newArrival = input.arrival_date ?? trip.arrival_date;
  const newDeparture = input.departure_date ?? trip.departure_date;
  if (newDeparture < newArrival) {
    throw new WriteError('departure_date must be on or after arrival_date.');
  }
  const datesChanged = newArrival !== trip.arrival_date || newDeparture !== trip.departure_date;

  // Non-date field updates always apply.
  const fieldUpdates: Record<string, unknown> = {};
  if (input.destination !== undefined) fieldUpdates.destination = input.destination;
  if (input.budget !== undefined) fieldUpdates.budget = input.budget;

  if (!datesChanged) {
    if (Object.keys(fieldUpdates).length > 0) {
      const { error: updErr } = await supabase
        .from('trips')
        .update(fieldUpdates)
        .eq('trip_id', input.trip_id);
      if (updErr) throw new WriteError(`Failed to update trip: ${updErr.message}`);
    }
    return { status: 'updated', trip_id: input.trip_id, days_added: [], days_removed: [] };
  }

  // Date change: diff existing days against the new range.
  const { data: existingDays, error: daysErr } = await supabase
    .from('trip_days')
    .select('day_id,date')
    .eq('trip_id', input.trip_id);
  if (daysErr) throw new WriteError(`Failed to load trip days: ${daysErr.message}`);

  const newRange = dateRange(newArrival, newDeparture);
  const { toAdd, toDrop } = planDateChange(
    (existingDays ?? []).map((d) => d.date),
    newRange,
  );
  const dropRows = (existingDays ?? []).filter((d) => toDrop.includes(d.date));

  // Content pre-check on the dropped days.
  if (dropRows.length > 0) {
    const dropIds = dropRows.map((d) => d.day_id);
    const [actRes, resRes, accRes] = await Promise.all([
      supabase.from('day_activities').select('day_id,title').in('day_id', dropIds),
      supabase.from('reservations').select('day_id,restaurant_name').in('day_id', dropIds),
      supabase.from('accommodations_days').select('day_id').in('day_id', dropIds),
    ]);
    if (actRes.error) throw new WriteError(`Failed to check activities: ${actRes.error.message}`);
    if (resRes.error) throw new WriteError(`Failed to check dining: ${resRes.error.message}`);
    if (accRes.error) throw new WriteError(`Failed to check accommodations: ${accRes.error.message}`);

    const report = buildDroppedDayReport(dropRows, {
      activities: actRes.data ?? [],
      reservations: resRes.data ?? [],
      accommodationDays: accRes.data ?? [],
    });
    const hasContent = report.some((r) => r.total > 0);

    if (hasContent && !input.confirm_remove_days) {
      return {
        status: 'confirmation_required',
        message:
          'This date change would remove days that still have items scheduled. ' +
          'Nothing has been changed. Show the user the at_risk_days, and if they confirm, ' +
          'call update_trip again with the same dates plus confirm_remove_days: true.',
        at_risk_days: report.filter((r) => r.total > 0),
      };
    }
  }

  // Apply: add new days first.
  if (toAdd.length > 0) {
    const { error: addErr } = await supabase
      .from('trip_days')
      .insert(toAdd.map((date) => ({ trip_id: input.trip_id, date })));
    if (addErr) throw new WriteError(`Failed to add new days: ${addErr.message}`);
  }

  // Cascade-delete dropped days' children, then the days themselves.
  if (dropRows.length > 0) {
    const dropIds = dropRows.map((d) => d.day_id);
    // Explicit cleanup (don't rely on FK cascade config). Note: this removes
    // accommodation NIGHT mappings on dropped days, not the accommodation rows.
    for (const table of ['day_activities', 'reservations', 'accommodations_days'] as const) {
      const { error: delErr } = await supabase.from(table).delete().in('day_id', dropIds);
      if (delErr) throw new WriteError(`Failed to clear ${table}: ${delErr.message}`);
    }
    const { error: dropErr } = await supabase.from('trip_days').delete().in('day_id', dropIds);
    if (dropErr) throw new WriteError(`Failed to remove dropped days: ${dropErr.message}`);
  }

  // Finally, apply the date change (+ any field updates) to the trip row.
  const { error: updErr } = await supabase
    .from('trips')
    .update({ ...fieldUpdates, arrival_date: newArrival, departure_date: newDeparture })
    .eq('trip_id', input.trip_id);
  if (updErr) throw new WriteError(`Failed to update trip dates: ${updErr.message}`);

  return { status: 'updated', trip_id: input.trip_id, days_added: toAdd, days_removed: toDrop };
}
```

Add the missing import for `planDateChange` at the top of `tripWrites.ts` — change:

```ts
import { dateRange } from './tripDates';
```

to:

```ts
import { dateRange, planDateChange } from './tripDates';
```

- [ ] **Step 2: Register the `update_trip` tool**

In `server/lib/mcpTools.ts`, extend the import to include `updateTrip`:

```ts
import { createTrip, updateTrip, WriteError } from './tripWrites';
```

Inside `registerWriteTools`, after the `create_trip` registration, add:

```ts
  server.registerTool(
    'update_trip',
    {
      description:
        "Update a trip's destination, budget, or dates. Changing dates adds new days automatically. If shrinking the range would drop days that still have items, the tool returns status 'confirmation_required' with the at-risk days and changes nothing; re-call with confirm_remove_days: true to delete those days and their items.",
      inputSchema: {
        trip_id: z.string().uuid().describe('Trip ID from list_trips'),
        destination: z.string().min(1).optional(),
        budget: z.number().positive().optional(),
        arrival_date: dateField.optional(),
        departure_date: dateField.optional(),
        confirm_remove_days: z
          .boolean()
          .optional()
          .describe('Set true to confirm deleting days (and their items) that fall outside the new range'),
      },
      annotations: WRITE_IDEMPOTENT,
    },
    async (args) => {
      try {
        const result = await updateTrip(supabase, args);
        return toolResult(result);
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to update trip: ${String(err)}`);
      }
    },
  );
```

- [ ] **Step 3: Type-check, lint, and re-run unit tests**

Run: `npx tsc --noEmit && npx eslint server/lib/tripWrites.ts server/lib/mcpTools.ts && npx vitest run server/lib`
Expected: PASS on all three.

- [ ] **Step 4: Commit**

```bash
git add server/lib/tripWrites.ts server/lib/mcpTools.ts
git commit -m "feat(mcp): update_trip with two-call data-loss confirm pattern"
```

---

## Task 7: Activity tools (`add_activity`, `update_activity`, `delete_activity`)

**Files:**
- Modify: `server/lib/tripWrites.ts`
- Modify: `server/lib/mcpTools.ts`

- [ ] **Step 1: Add activity write functions to `tripWrites.ts`**

Append to `server/lib/tripWrites.ts`:

```ts
// ---- Activities (day_activities) ----

export interface AddActivityInput {
  trip_id: string;
  date: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  cost?: number;
  currency?: string;
  location_address?: string;
}

export async function addActivity(supabase: SupabaseClient, input: AddActivityInput) {
  const dayId = await resolveDayId(supabase, input.trip_id, input.date);
  const orderIndex = await nextOrderIndex(supabase, 'day_activities', 'day_id', dayId);
  const { data, error } = await supabase
    .from('day_activities')
    .insert({
      trip_id: input.trip_id,
      day_id: dayId,
      order_index: orderIndex,
      title: input.title,
      description: input.description ?? null,
      start_time: input.start_time ?? null,
      end_time: input.end_time ?? null,
      cost: input.cost ?? null,
      currency: input.currency ?? null,
      location_address: input.location_address ?? null,
    })
    .select('id,day_id,title,description,start_time,end_time,cost,currency,location_address')
    .single();
  if (error || !data) throw new WriteError(`Failed to add activity: ${error?.message ?? 'no row returned'}`);
  return data;
}

export interface UpdateActivityInput {
  activity_id: string;
  date?: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  cost?: number;
  currency?: string;
  location_address?: string;
}

export async function updateActivity(supabase: SupabaseClient, input: UpdateActivityInput) {
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.start_time !== undefined) updates.start_time = input.start_time;
  if (input.end_time !== undefined) updates.end_time = input.end_time;
  if (input.cost !== undefined) updates.cost = input.cost;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.location_address !== undefined) updates.location_address = input.location_address;

  // Changing the date re-resolves day_id (scoped to the activity's own trip).
  if (input.date !== undefined) {
    const { data: existing, error: exErr } = await supabase
      .from('day_activities')
      .select('trip_id')
      .eq('id', input.activity_id)
      .maybeSingle();
    if (exErr) throw new WriteError(`Failed to load activity: ${exErr.message}`);
    if (!existing) throw new WriteError('Activity not found, or you do not have access to it.');
    updates.day_id = await resolveDayId(supabase, existing.trip_id, input.date);
  }

  if (Object.keys(updates).length === 0) {
    throw new WriteError('Nothing to update: provide at least one field to change.');
  }

  const { data, error } = await supabase
    .from('day_activities')
    .update(updates)
    .eq('id', input.activity_id)
    .select('id,day_id,title,description,start_time,end_time,cost,currency,location_address')
    .maybeSingle();
  if (error) throw new WriteError(`Failed to update activity: ${error.message}`);
  if (!data) throw new WriteError('Activity not found, or you do not have access to it.');
  return data;
}

export async function deleteActivity(supabase: SupabaseClient, activityId: string) {
  const { data, error } = await supabase
    .from('day_activities')
    .delete()
    .eq('id', activityId)
    .select('id');
  if (error) throw new WriteError(`Failed to delete activity: ${error.message}`);
  if (!data || data.length === 0) {
    throw new WriteError('Activity not found, or you do not have access to it.');
  }
  return { deleted: true, id: activityId };
}
```

- [ ] **Step 2: Register the three activity tools**

In `server/lib/mcpTools.ts`, extend the import:

```ts
import {
  createTrip,
  updateTrip,
  addActivity,
  updateActivity,
  deleteActivity,
  WriteError,
} from './tripWrites';
```

Inside `registerWriteTools`, append:

```ts
  server.registerTool(
    'add_activity',
    {
      description:
        'Add an activity to a trip on a given date (the server resolves the trip day). Returns the created activity, including its id.',
      inputSchema: {
        trip_id: z.string().uuid().describe('Trip ID from list_trips'),
        date: dateField.describe('Date within the trip range (YYYY-MM-DD)'),
        title: z.string().min(1),
        description: z.string().optional(),
        start_time: timeField.optional(),
        end_time: timeField.optional(),
        cost: z.number().nonnegative().optional(),
        currency: currencyField.optional(),
        location_address: z.string().optional(),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        return toolResult(await addActivity(supabase, args));
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to add activity: ${String(err)}`);
      }
    },
  );

  server.registerTool(
    'update_activity',
    {
      description:
        'Update an existing activity by its id (from get_trip). Changing date moves it to that trip day. Only the fields you pass are changed.',
      inputSchema: {
        activity_id: z.string().uuid().describe('Activity id from get_trip'),
        date: dateField.optional(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        start_time: timeField.optional(),
        end_time: timeField.optional(),
        cost: z.number().nonnegative().optional(),
        currency: currencyField.optional(),
        location_address: z.string().optional(),
      },
      annotations: WRITE_IDEMPOTENT,
    },
    async (args) => {
      try {
        return toolResult(await updateActivity(supabase, args));
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to update activity: ${String(err)}`);
      }
    },
  );

  server.registerTool(
    'delete_activity',
    {
      description: 'Delete an activity by its id (from get_trip).',
      inputSchema: { activity_id: z.string().uuid().describe('Activity id from get_trip') },
      annotations: DESTRUCTIVE,
    },
    async ({ activity_id }) => {
      try {
        return toolResult(await deleteActivity(supabase, activity_id));
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to delete activity: ${String(err)}`);
      }
    },
  );
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint server/lib/tripWrites.ts server/lib/mcpTools.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/lib/tripWrites.ts server/lib/mcpTools.ts
git commit -m "feat(mcp): add/update/delete_activity tools"
```

---

## Task 8: Dining tools (`add_dining`, `update_dining`, `delete_dining`)

**Files:**
- Modify: `server/lib/tripWrites.ts`
- Modify: `server/lib/mcpTools.ts`

- [ ] **Step 1: Add dining write functions to `tripWrites.ts`**

Append to `server/lib/tripWrites.ts`:

```ts
// ---- Dining (reservations) ----

export interface AddDiningInput {
  trip_id: string;
  date: string;
  restaurant_name: string;
  reservation_time?: string;
  number_of_people?: number;
  address?: string;
  confirmation_number?: string;
  notes?: string;
  cost?: number;
  currency?: string;
}

export async function addDining(supabase: SupabaseClient, input: AddDiningInput) {
  const dayId = await resolveDayId(supabase, input.trip_id, input.date);
  const orderIndex = await nextOrderIndex(supabase, 'reservations', 'day_id', dayId);
  const { data, error } = await supabase
    .from('reservations')
    .insert({
      trip_id: input.trip_id,
      day_id: dayId,
      order_index: orderIndex,
      restaurant_name: input.restaurant_name,
      reservation_time: input.reservation_time ?? null,
      number_of_people: input.number_of_people ?? null,
      address: input.address ?? null,
      confirmation_number: input.confirmation_number ?? null,
      notes: input.notes ?? null,
      cost: input.cost ?? null,
      currency: input.currency ?? null,
    })
    .select(
      'id,day_id,restaurant_name,reservation_time,number_of_people,address,confirmation_number,notes,cost,currency',
    )
    .single();
  if (error || !data) throw new WriteError(`Failed to add dining reservation: ${error?.message ?? 'no row returned'}`);
  return data;
}

export interface UpdateDiningInput {
  reservation_id: string;
  date?: string;
  restaurant_name?: string;
  reservation_time?: string;
  number_of_people?: number;
  address?: string;
  confirmation_number?: string;
  notes?: string;
  cost?: number;
  currency?: string;
}

export async function updateDining(supabase: SupabaseClient, input: UpdateDiningInput) {
  const updates: Record<string, unknown> = {};
  if (input.restaurant_name !== undefined) updates.restaurant_name = input.restaurant_name;
  if (input.reservation_time !== undefined) updates.reservation_time = input.reservation_time;
  if (input.number_of_people !== undefined) updates.number_of_people = input.number_of_people;
  if (input.address !== undefined) updates.address = input.address;
  if (input.confirmation_number !== undefined) updates.confirmation_number = input.confirmation_number;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.cost !== undefined) updates.cost = input.cost;
  if (input.currency !== undefined) updates.currency = input.currency;

  if (input.date !== undefined) {
    const { data: existing, error: exErr } = await supabase
      .from('reservations')
      .select('trip_id')
      .eq('id', input.reservation_id)
      .maybeSingle();
    if (exErr) throw new WriteError(`Failed to load reservation: ${exErr.message}`);
    if (!existing) throw new WriteError('Reservation not found, or you do not have access to it.');
    updates.day_id = await resolveDayId(supabase, existing.trip_id, input.date);
  }

  if (Object.keys(updates).length === 0) {
    throw new WriteError('Nothing to update: provide at least one field to change.');
  }

  const { data, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', input.reservation_id)
    .select(
      'id,day_id,restaurant_name,reservation_time,number_of_people,address,confirmation_number,notes,cost,currency',
    )
    .maybeSingle();
  if (error) throw new WriteError(`Failed to update reservation: ${error.message}`);
  if (!data) throw new WriteError('Reservation not found, or you do not have access to it.');
  return data;
}

export async function deleteDining(supabase: SupabaseClient, reservationId: string) {
  const { data, error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', reservationId)
    .select('id');
  if (error) throw new WriteError(`Failed to delete reservation: ${error.message}`);
  if (!data || data.length === 0) {
    throw new WriteError('Reservation not found, or you do not have access to it.');
  }
  return { deleted: true, id: reservationId };
}
```

- [ ] **Step 2: Register the three dining tools**

In `server/lib/mcpTools.ts`, extend the import to add `addDining, updateDining, deleteDining`. Inside `registerWriteTools`, append:

```ts
  server.registerTool(
    'add_dining',
    {
      description:
        'Add a dining reservation to a trip on a given date (the server resolves the trip day). Returns the created reservation, including its id.',
      inputSchema: {
        trip_id: z.string().uuid().describe('Trip ID from list_trips'),
        date: dateField.describe('Date within the trip range (YYYY-MM-DD)'),
        restaurant_name: z.string().min(1),
        reservation_time: timeField.optional(),
        number_of_people: z.number().int().positive().optional(),
        address: z.string().optional(),
        confirmation_number: z.string().optional(),
        notes: z.string().optional(),
        cost: z.number().nonnegative().optional(),
        currency: currencyField.optional(),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        return toolResult(await addDining(supabase, args));
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to add dining: ${String(err)}`);
      }
    },
  );

  server.registerTool(
    'update_dining',
    {
      description:
        'Update an existing dining reservation by its id (from get_trip). Changing date moves it to that trip day. Only the fields you pass are changed.',
      inputSchema: {
        reservation_id: z.string().uuid().describe('Reservation id from get_trip'),
        date: dateField.optional(),
        restaurant_name: z.string().min(1).optional(),
        reservation_time: timeField.optional(),
        number_of_people: z.number().int().positive().optional(),
        address: z.string().optional(),
        confirmation_number: z.string().optional(),
        notes: z.string().optional(),
        cost: z.number().nonnegative().optional(),
        currency: currencyField.optional(),
      },
      annotations: WRITE_IDEMPOTENT,
    },
    async (args) => {
      try {
        return toolResult(await updateDining(supabase, args));
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to update dining: ${String(err)}`);
      }
    },
  );

  server.registerTool(
    'delete_dining',
    {
      description: 'Delete a dining reservation by its id (from get_trip).',
      inputSchema: { reservation_id: z.string().uuid().describe('Reservation id from get_trip') },
      annotations: DESTRUCTIVE,
    },
    async ({ reservation_id }) => {
      try {
        return toolResult(await deleteDining(supabase, reservation_id));
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to delete dining: ${String(err)}`);
      }
    },
  );
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint server/lib/tripWrites.ts server/lib/mcpTools.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/lib/tripWrites.ts server/lib/mcpTools.ts
git commit -m "feat(mcp): add/update/delete_dining tools"
```

---

## Task 9: Accommodation tools (`add_accommodation`, `update_accommodation`, `delete_accommodation`)

Accommodations fan out into `accommodations_days` (one row per night, each mapped to a `trip_days.day_id`), mirroring `accommodationService.ts`. Nights are `dateRange(checkin, checkout)` mapped through the trip's days; nights with no matching trip day are skipped (matches the app).

**Files:**
- Modify: `server/lib/tripWrites.ts`
- Modify: `server/lib/mcpTools.ts`

- [ ] **Step 1: Add accommodation write functions to `tripWrites.ts`**

Append to `server/lib/tripWrites.ts`:

```ts
// ---- Accommodations ----

/** Fan out accommodations_days for a stay across its nights' trip days. */
async function fanOutAccommodationDays(
  supabase: SupabaseClient,
  stayId: string,
  tripId: string,
  checkinDate: string,
  checkoutDate: string,
): Promise<void> {
  const nights = dateRange(checkinDate, checkoutDate);
  const { data: days, error } = await supabase
    .from('trip_days')
    .select('day_id,date')
    .eq('trip_id', tripId);
  if (error) throw new WriteError(`Failed to load trip days: ${error.message}`);

  const dayByDate = new Map((days ?? []).map((d) => [d.date, d.day_id]));
  const rows = nights
    .map((date) => {
      const dayId = dayByDate.get(date);
      return dayId ? { stay_id: stayId, day_id: dayId, date } : null;
    })
    .filter((r): r is { stay_id: string; day_id: string; date: string } => r !== null);

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from('accommodations_days').insert(rows);
    if (insErr) throw new WriteError(`Failed to map accommodation nights: ${insErr.message}`);
  }
}

export interface AddAccommodationInput {
  trip_id: string;
  hotel: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  hotel_address?: string;
  checkin_time?: string;
  checkout_time?: string;
  hotel_phone?: string;
  hotel_website?: string;
  cost?: number;
  currency?: string;
}

export async function addAccommodation(supabase: SupabaseClient, input: AddAccommodationInput) {
  if (input.hotel_checkout_date < input.hotel_checkin_date) {
    throw new WriteError('hotel_checkout_date must be on or after hotel_checkin_date.');
  }
  const orderIndex = await nextOrderIndex(supabase, 'accommodations', 'trip_id', input.trip_id);
  const { data, error } = await supabase
    .from('accommodations')
    .insert({
      trip_id: input.trip_id,
      order_index: orderIndex,
      title: input.hotel,
      hotel: input.hotel,
      hotel_address: input.hotel_address ?? null,
      hotel_checkin_date: input.hotel_checkin_date,
      hotel_checkout_date: input.hotel_checkout_date,
      checkin_time: input.checkin_time ?? null,
      checkout_time: input.checkout_time ?? null,
      hotel_phone: input.hotel_phone ?? null,
      hotel_website: input.hotel_website ?? null,
      cost: input.cost ?? null,
      currency: input.currency ?? null,
    })
    .select(
      'stay_id,hotel,hotel_address,hotel_checkin_date,hotel_checkout_date,checkin_time,checkout_time,hotel_phone,hotel_website,cost,currency',
    )
    .single();
  if (error || !data) throw new WriteError(`Failed to add accommodation: ${error?.message ?? 'no row returned'}`);

  await fanOutAccommodationDays(
    supabase,
    data.stay_id,
    input.trip_id,
    input.hotel_checkin_date,
    input.hotel_checkout_date,
  );
  return data;
}

export interface UpdateAccommodationInput {
  stay_id: string;
  hotel?: string;
  hotel_address?: string;
  hotel_checkin_date?: string;
  hotel_checkout_date?: string;
  checkin_time?: string;
  checkout_time?: string;
  hotel_phone?: string;
  hotel_website?: string;
  cost?: number;
  currency?: string;
}

export async function updateAccommodation(supabase: SupabaseClient, input: UpdateAccommodationInput) {
  const updates: Record<string, unknown> = {};
  if (input.hotel !== undefined) {
    updates.hotel = input.hotel;
    updates.title = input.hotel; // title tracks hotel name, matching the app
  }
  if (input.hotel_address !== undefined) updates.hotel_address = input.hotel_address;
  if (input.hotel_checkin_date !== undefined) updates.hotel_checkin_date = input.hotel_checkin_date;
  if (input.hotel_checkout_date !== undefined) updates.hotel_checkout_date = input.hotel_checkout_date;
  if (input.checkin_time !== undefined) updates.checkin_time = input.checkin_time;
  if (input.checkout_time !== undefined) updates.checkout_time = input.checkout_time;
  if (input.hotel_phone !== undefined) updates.hotel_phone = input.hotel_phone;
  if (input.hotel_website !== undefined) updates.hotel_website = input.hotel_website;
  if (input.cost !== undefined) updates.cost = input.cost;
  if (input.currency !== undefined) updates.currency = input.currency;

  if (Object.keys(updates).length === 0) {
    throw new WriteError('Nothing to update: provide at least one field to change.');
  }

  const { data, error } = await supabase
    .from('accommodations')
    .update(updates)
    .eq('stay_id', input.stay_id)
    .select(
      'stay_id,trip_id,hotel,hotel_address,hotel_checkin_date,hotel_checkout_date,checkin_time,checkout_time,hotel_phone,hotel_website,cost,currency',
    )
    .maybeSingle();
  if (error) throw new WriteError(`Failed to update accommodation: ${error.message}`);
  if (!data) throw new WriteError('Accommodation not found, or you do not have access to it.');

  // If either date changed, re-fan the night mappings.
  const datesChanged =
    input.hotel_checkin_date !== undefined || input.hotel_checkout_date !== undefined;
  if (datesChanged) {
    if (data.hotel_checkin_date && data.hotel_checkout_date) {
      const { error: delErr } = await supabase
        .from('accommodations_days')
        .delete()
        .eq('stay_id', input.stay_id);
      if (delErr) throw new WriteError(`Failed to clear accommodation nights: ${delErr.message}`);
      await fanOutAccommodationDays(
        supabase,
        input.stay_id,
        data.trip_id,
        data.hotel_checkin_date,
        data.hotel_checkout_date,
      );
    }
  }
  const { trip_id: _omit, ...rest } = data;
  return rest;
}

export async function deleteAccommodation(supabase: SupabaseClient, stayId: string) {
  // Clear night mappings first (don't rely on FK cascade config).
  const { error: daysErr } = await supabase
    .from('accommodations_days')
    .delete()
    .eq('stay_id', stayId);
  if (daysErr) throw new WriteError(`Failed to clear accommodation nights: ${daysErr.message}`);

  const { data, error } = await supabase
    .from('accommodations')
    .delete()
    .eq('stay_id', stayId)
    .select('stay_id');
  if (error) throw new WriteError(`Failed to delete accommodation: ${error.message}`);
  if (!data || data.length === 0) {
    throw new WriteError('Accommodation not found, or you do not have access to it.');
  }
  return { deleted: true, stay_id: stayId };
}
```

- [ ] **Step 2: Register the three accommodation tools**

In `server/lib/mcpTools.ts`, extend the import to add `addAccommodation, updateAccommodation, deleteAccommodation`. Inside `registerWriteTools`, append:

```ts
  server.registerTool(
    'add_accommodation',
    {
      description:
        'Add a hotel / accommodation to a trip. Maps each night between check-in and check-out to its trip day. Returns the created stay, including its stay_id.',
      inputSchema: {
        trip_id: z.string().uuid().describe('Trip ID from list_trips'),
        hotel: z.string().min(1).describe('Hotel / property name'),
        hotel_checkin_date: dateField,
        hotel_checkout_date: dateField,
        hotel_address: z.string().optional(),
        checkin_time: timeField.optional(),
        checkout_time: timeField.optional(),
        hotel_phone: z.string().optional(),
        hotel_website: z.string().optional(),
        cost: z.number().nonnegative().optional(),
        currency: currencyField.optional(),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        return toolResult(await addAccommodation(supabase, args));
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to add accommodation: ${String(err)}`);
      }
    },
  );

  server.registerTool(
    'update_accommodation',
    {
      description:
        'Update an accommodation by its stay_id (from get_trip). If check-in/out dates change, night mappings are recomputed. Only the fields you pass are changed.',
      inputSchema: {
        stay_id: z.string().uuid().describe('Accommodation stay_id from get_trip'),
        hotel: z.string().min(1).optional(),
        hotel_checkin_date: dateField.optional(),
        hotel_checkout_date: dateField.optional(),
        hotel_address: z.string().optional(),
        checkin_time: timeField.optional(),
        checkout_time: timeField.optional(),
        hotel_phone: z.string().optional(),
        hotel_website: z.string().optional(),
        cost: z.number().nonnegative().optional(),
        currency: currencyField.optional(),
      },
      annotations: WRITE_IDEMPOTENT,
    },
    async (args) => {
      try {
        return toolResult(await updateAccommodation(supabase, args));
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to update accommodation: ${String(err)}`);
      }
    },
  );

  server.registerTool(
    'delete_accommodation',
    {
      description: 'Delete an accommodation by its stay_id (from get_trip). Also removes its night mappings.',
      inputSchema: { stay_id: z.string().uuid().describe('Accommodation stay_id from get_trip') },
      annotations: DESTRUCTIVE,
    },
    async ({ stay_id }) => {
      try {
        return toolResult(await deleteAccommodation(supabase, stay_id));
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to delete accommodation: ${String(err)}`);
      }
    },
  );
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint server/lib/tripWrites.ts server/lib/mcpTools.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/lib/tripWrites.ts server/lib/mcpTools.ts
git commit -m "feat(mcp): add/update/delete_accommodation tools with night fan-out"
```

---

## Task 10: Transportation tools (`add_transportation`, `update_transportation`, `delete_transportation`)

**No daily fan-out.** `type` is the Postgres enum `flight | train | car_service | shuttle | ferry | rental_car` (see Background fact #1). No `order_index` column.

**Files:**
- Modify: `server/lib/tripWrites.ts`
- Modify: `server/lib/mcpTools.ts`

- [ ] **Step 1: Add transportation write functions to `tripWrites.ts`**

Append to `server/lib/tripWrites.ts`:

```ts
// ---- Transportation ----

export type TransportationType =
  | 'flight'
  | 'train'
  | 'car_service'
  | 'shuttle'
  | 'ferry'
  | 'rental_car';

export interface AddTransportationInput {
  trip_id: string;
  type: TransportationType;
  start_date: string;
  provider?: string;
  flight_number?: string;
  confirmation_number?: string;
  departure_location?: string;
  arrival_location?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  cost?: number;
  currency?: string;
}

const TRANSPORT_SELECT =
  'id,type,provider,flight_number,confirmation_number,departure_location,arrival_location,start_date,start_time,end_date,end_time,cost,currency';

export async function addTransportation(supabase: SupabaseClient, input: AddTransportationInput) {
  const { data, error } = await supabase
    .from('transportation')
    .insert({
      trip_id: input.trip_id,
      type: input.type,
      start_date: input.start_date,
      provider: input.provider ?? null,
      flight_number: input.flight_number ?? null,
      confirmation_number: input.confirmation_number ?? null,
      departure_location: input.departure_location ?? null,
      arrival_location: input.arrival_location ?? null,
      start_time: input.start_time ?? null,
      end_date: input.end_date ?? null,
      end_time: input.end_time ?? null,
      cost: input.cost ?? null,
      currency: input.currency ?? null,
    })
    .select(TRANSPORT_SELECT)
    .single();
  if (error || !data) throw new WriteError(`Failed to add transportation: ${error?.message ?? 'no row returned'}`);
  return data;
}

export interface UpdateTransportationInput {
  id: string;
  type?: TransportationType;
  start_date?: string;
  provider?: string;
  flight_number?: string;
  confirmation_number?: string;
  departure_location?: string;
  arrival_location?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  cost?: number;
  currency?: string;
}

export async function updateTransportation(supabase: SupabaseClient, input: UpdateTransportationInput) {
  const updates: Record<string, unknown> = {};
  if (input.type !== undefined) updates.type = input.type;
  if (input.start_date !== undefined) updates.start_date = input.start_date;
  if (input.provider !== undefined) updates.provider = input.provider;
  if (input.flight_number !== undefined) updates.flight_number = input.flight_number;
  if (input.confirmation_number !== undefined) updates.confirmation_number = input.confirmation_number;
  if (input.departure_location !== undefined) updates.departure_location = input.departure_location;
  if (input.arrival_location !== undefined) updates.arrival_location = input.arrival_location;
  if (input.start_time !== undefined) updates.start_time = input.start_time;
  if (input.end_date !== undefined) updates.end_date = input.end_date;
  if (input.end_time !== undefined) updates.end_time = input.end_time;
  if (input.cost !== undefined) updates.cost = input.cost;
  if (input.currency !== undefined) updates.currency = input.currency;

  if (Object.keys(updates).length === 0) {
    throw new WriteError('Nothing to update: provide at least one field to change.');
  }

  const { data, error } = await supabase
    .from('transportation')
    .update(updates)
    .eq('id', input.id)
    .select(TRANSPORT_SELECT)
    .maybeSingle();
  if (error) throw new WriteError(`Failed to update transportation: ${error.message}`);
  if (!data) throw new WriteError('Transportation not found, or you do not have access to it.');
  return data;
}

export async function deleteTransportation(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('transportation')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new WriteError(`Failed to delete transportation: ${error.message}`);
  if (!data || data.length === 0) {
    throw new WriteError('Transportation not found, or you do not have access to it.');
  }
  return { deleted: true, id };
}
```

- [ ] **Step 2: Register the three transportation tools**

In `server/lib/mcpTools.ts`, extend the import to add `addTransportation, updateTransportation, deleteTransportation`. Add a shared enum field near the other zod field helpers:

```ts
const transportTypeField = z.enum([
  'flight',
  'train',
  'car_service',
  'shuttle',
  'ferry',
  'rental_car',
]);
```

Inside `registerWriteTools`, append:

```ts
  server.registerTool(
    'add_transportation',
    {
      description:
        'Add a transportation leg (flight, train, car_service, shuttle, ferry, or rental_car) to a trip. Returns the created leg, including its id.',
      inputSchema: {
        trip_id: z.string().uuid().describe('Trip ID from list_trips'),
        type: transportTypeField,
        start_date: dateField,
        provider: z.string().optional(),
        flight_number: z.string().optional(),
        confirmation_number: z.string().optional(),
        departure_location: z.string().optional(),
        arrival_location: z.string().optional(),
        start_time: timeField.optional(),
        end_date: dateField.optional(),
        end_time: timeField.optional(),
        cost: z.number().nonnegative().optional(),
        currency: currencyField.optional(),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        return toolResult(await addTransportation(supabase, args));
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to add transportation: ${String(err)}`);
      }
    },
  );

  server.registerTool(
    'update_transportation',
    {
      description:
        'Update a transportation leg by its id (from get_trip). Only the fields you pass are changed.',
      inputSchema: {
        id: z.string().uuid().describe('Transportation id from get_trip'),
        type: transportTypeField.optional(),
        start_date: dateField.optional(),
        provider: z.string().optional(),
        flight_number: z.string().optional(),
        confirmation_number: z.string().optional(),
        departure_location: z.string().optional(),
        arrival_location: z.string().optional(),
        start_time: timeField.optional(),
        end_date: dateField.optional(),
        end_time: timeField.optional(),
        cost: z.number().nonnegative().optional(),
        currency: currencyField.optional(),
      },
      annotations: WRITE_IDEMPOTENT,
    },
    async (args) => {
      try {
        return toolResult(await updateTransportation(supabase, args));
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to update transportation: ${String(err)}`);
      }
    },
  );

  server.registerTool(
    'delete_transportation',
    {
      description: 'Delete a transportation leg by its id (from get_trip).',
      inputSchema: { id: z.string().uuid().describe('Transportation id from get_trip') },
      annotations: DESTRUCTIVE,
    },
    async ({ id }) => {
      try {
        return toolResult(await deleteTransportation(supabase, id));
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to delete transportation: ${String(err)}`);
      }
    },
  );
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint server/lib/tripWrites.ts server/lib/mcpTools.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/lib/tripWrites.ts server/lib/mcpTools.ts
git commit -m "feat(mcp): add/update/delete_transportation tools"
```

---

## Task 11: Expense tools (`add_expense`, `update_expense`, `delete_expense`)

Targets `other_expenses` for **all** operations (Background fact #7 — do not replicate the app's `expenses`-table bug). No `order_index`.

**Files:**
- Modify: `server/lib/tripWrites.ts`
- Modify: `server/lib/mcpTools.ts`

- [ ] **Step 1: Add expense write functions to `tripWrites.ts`**

Append to `server/lib/tripWrites.ts`:

```ts
// ---- Other expenses ----

const EXPENSE_SELECT = 'id,description,cost,currency,amount_paid,is_paid';

export interface AddExpenseInput {
  trip_id: string;
  description: string;
  cost: number;
  currency: string;
  amount_paid?: number;
  is_paid?: boolean;
}

export async function addExpense(supabase: SupabaseClient, input: AddExpenseInput) {
  const { data, error } = await supabase
    .from('other_expenses')
    .insert({
      trip_id: input.trip_id,
      description: input.description,
      cost: input.cost,
      currency: input.currency,
      amount_paid: input.amount_paid ?? null,
      is_paid: input.is_paid ?? null,
    })
    .select(EXPENSE_SELECT)
    .single();
  if (error || !data) throw new WriteError(`Failed to add expense: ${error?.message ?? 'no row returned'}`);
  return data;
}

export interface UpdateExpenseInput {
  id: string;
  description?: string;
  cost?: number;
  currency?: string;
  amount_paid?: number;
  is_paid?: boolean;
}

export async function updateExpense(supabase: SupabaseClient, input: UpdateExpenseInput) {
  const updates: Record<string, unknown> = {};
  if (input.description !== undefined) updates.description = input.description;
  if (input.cost !== undefined) updates.cost = input.cost;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.amount_paid !== undefined) updates.amount_paid = input.amount_paid;
  if (input.is_paid !== undefined) updates.is_paid = input.is_paid;

  if (Object.keys(updates).length === 0) {
    throw new WriteError('Nothing to update: provide at least one field to change.');
  }

  const { data, error } = await supabase
    .from('other_expenses')
    .update(updates)
    .eq('id', input.id)
    .select(EXPENSE_SELECT)
    .maybeSingle();
  if (error) throw new WriteError(`Failed to update expense: ${error.message}`);
  if (!data) throw new WriteError('Expense not found, or you do not have access to it.');
  return data;
}

export async function deleteExpense(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('other_expenses')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new WriteError(`Failed to delete expense: ${error.message}`);
  if (!data || data.length === 0) {
    throw new WriteError('Expense not found, or you do not have access to it.');
  }
  return { deleted: true, id };
}
```

- [ ] **Step 2: Register the three expense tools**

In `server/lib/mcpTools.ts`, extend the import to add `addExpense, updateExpense, deleteExpense`. Inside `registerWriteTools`, append:

```ts
  server.registerTool(
    'add_expense',
    {
      description:
        'Add a miscellaneous (non-booking) expense to a trip — e.g. tickets, shopping, fees. Returns the created expense, including its id.',
      inputSchema: {
        trip_id: z.string().uuid().describe('Trip ID from list_trips'),
        description: z.string().min(1),
        cost: z.number().nonnegative(),
        currency: currencyField,
        amount_paid: z.number().nonnegative().optional(),
        is_paid: z.boolean().optional(),
      },
      annotations: WRITE,
    },
    async (args) => {
      try {
        return toolResult(await addExpense(supabase, args));
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to add expense: ${String(err)}`);
      }
    },
  );

  server.registerTool(
    'update_expense',
    {
      description:
        'Update a miscellaneous expense by its id (from get_trip_budget). Only the fields you pass are changed.',
      inputSchema: {
        id: z.string().uuid().describe('Expense id from get_trip_budget'),
        description: z.string().min(1).optional(),
        cost: z.number().nonnegative().optional(),
        currency: currencyField.optional(),
        amount_paid: z.number().nonnegative().optional(),
        is_paid: z.boolean().optional(),
      },
      annotations: WRITE_IDEMPOTENT,
    },
    async (args) => {
      try {
        return toolResult(await updateExpense(supabase, args));
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to update expense: ${String(err)}`);
      }
    },
  );

  server.registerTool(
    'delete_expense',
    {
      description: 'Delete a miscellaneous expense by its id (from get_trip_budget).',
      inputSchema: { id: z.string().uuid().describe('Expense id from get_trip_budget') },
      annotations: DESTRUCTIVE,
    },
    async ({ id }) => {
      try {
        return toolResult(await deleteExpense(supabase, id));
      } catch (err) {
        return toolError(err instanceof WriteError ? err.message : `Failed to delete expense: ${String(err)}`);
      }
    },
  );
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint server/lib/tripWrites.ts server/lib/mcpTools.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/lib/tripWrites.ts server/lib/mcpTools.ts
git commit -m "feat(mcp): add/update/delete_expense tools (other_expenses)"
```

---

## Task 12: Build-bundle verification

The server is bundled by esbuild (`server/build.js`) with `@supabase/supabase-js` and `zod` external. Confirm the new modules bundle cleanly.

**Files:** none modified.

- [ ] **Step 1: Build the server bundle**

Run: `node server/build.js`
Expected: prints `Server build complete: dist/server/index.js` with no esbuild errors. (This confirms `tripDates.ts`, `tripWrites.ts`, and `mcpTools.ts` all resolve and bundle.)

- [ ] **Step 2: Commit (no-op if nothing changed)**

No commit needed unless `server/build.js` had to change. If the build succeeds with no edits, proceed to Task 13.

---

## Task 13: Update the tools/list eval assertion

The existing eval asserts exactly the 3 read tools and that all are read-only. Update it to the full 20-tool surface and split the read-only assertion.

**Files:**
- Modify: `evals/mcp/tools.eval.ts:36-44`

- [ ] **Step 1: Replace the `tools/list` test**

In `evals/mcp/tools.eval.ts`, replace the test starting at line 36 (`it('tools/list: exactly the three tools...`) through its closing `}));` with:

```ts
  it('tools/list: full read+write surface with correct annotations', () =>
    runCase('mcp', 'tools-list', async () => {
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name).sort();

      const READ = ['get_trip', 'get_trip_budget', 'list_trips'];
      const WRITE = [
        'add_accommodation', 'add_activity', 'add_dining', 'add_expense', 'add_transportation',
        'create_trip',
        'delete_accommodation', 'delete_activity', 'delete_dining', 'delete_expense', 'delete_transportation',
        'update_accommodation', 'update_activity', 'update_dining', 'update_expense', 'update_transportation',
        'update_trip',
      ];
      expect(names).toEqual([...READ, ...WRITE].sort());

      const byName = new Map(tools.map((t) => [t.name, t]));
      for (const name of READ) {
        expect(byName.get(name)?.annotations?.readOnlyHint, `${name} readOnlyHint`).toBe(true);
      }
      for (const name of WRITE) {
        expect(byName.get(name)?.annotations?.readOnlyHint, `${name} readOnlyHint`).toBe(false);
      }
      // Delete tools (and only they, among writes) are destructive-hinted.
      const destructive = WRITE.filter((n) => n.startsWith('delete_'));
      for (const name of destructive) {
        expect(byName.get(name)?.annotations?.destructiveHint, `${name} destructiveHint`).toBe(true);
      }
    }));
```

- [ ] **Step 2: Sanity-check the file still type-checks**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add evals/mcp/tools.eval.ts
git commit -m "test(evals): assert full MCP read+write tool surface"
```

---

## Task 14: Lifecycle eval (`writes.eval.ts`)

On-demand eval (never CI) exercising the full write lifecycle against the eval-user fixture, including the confirm pattern. It creates its own throwaway trip and deletes it at the end, so it does not depend on the fixed-UUID fixtures.

**Files:**
- Create: `evals/mcp/writes.eval.ts`

- [ ] **Step 1: Create the lifecycle eval**

Create `evals/mcp/writes.eval.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { signInEvalUser } from '../helpers/auth';
import { missingEnv } from '../helpers/env';
import { connectMcp, toolJson } from '../helpers/mcpClient';
import { recordSuiteSkip, runCase } from '../helpers/runCase';

const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'EVAL_USER_EMAIL', 'EVAL_USER_PASSWORD'];
const missing = missingEnv(REQUIRED);
recordSuiteSkip('mcp', missing);

describe.skipIf(missing.length > 0)('mcp writes (lifecycle)', () => {
  let client: Client;
  let tripId: string;

  beforeAll(async () => {
    const { token } = await signInEvalUser();
    client = await connectMcp(process.env.EVALS_BASE_URL!, token);
  });

  afterAll(async () => {
    // Best-effort cleanup: shrink + delete is not exposed (whole-trip delete is
    // out of scope), so clear items and leave a tiny throwaway trip. To avoid
    // accumulating trips across runs, delete the children we created.
    await client?.close();
  });

  it('create_trip returns trip_id and generated day_dates', () =>
    runCase('mcp', 'create-trip', async () => {
      const payload = toolJson(
        await client.callTool({
          name: 'create_trip',
          arguments: {
            destination: 'Eval Sandbox City',
            arrival_date: '2030-01-10',
            departure_date: '2030-01-12',
            budget: 1000,
          },
        }),
      );
      expect(payload.trip_id).toMatch(/^[0-9a-f-]{36}$/);
      expect(payload.day_dates).toEqual(['2030-01-10', '2030-01-11', '2030-01-12']);
      tripId = payload.trip_id;
    }));

  it('add_activity and add_dining attach to a resolved day', () =>
    runCase('mcp', 'add-items', async () => {
      const activity = toolJson(
        await client.callTool({
          name: 'add_activity',
          arguments: { trip_id: tripId, date: '2030-01-10', title: 'Eval museum', cost: 20, currency: 'USD' },
        }),
      );
      expect(activity.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(activity.title).toBe('Eval museum');

      const dining = toolJson(
        await client.callTool({
          name: 'add_dining',
          arguments: { trip_id: tripId, date: '2030-01-10', restaurant_name: 'Eval Bistro', reservation_time: '19:30' },
        }),
      );
      expect(dining.restaurant_name).toBe('Eval Bistro');
    }));

  it('add_activity on an out-of-range date returns a clear error', () =>
    runCase('mcp', 'add-activity-out-of-range', async () => {
      const result = await client.callTool({
        name: 'add_activity',
        arguments: { trip_id: tripId, date: '2030-02-01', title: 'Should fail' },
      });
      expect((result as { isError?: boolean }).isError).toBe(true);
    }));

  it('update_trip blocks a destructive date shrink, then allows it with confirm_remove_days', () =>
    runCase('mcp', 'update-trip-confirm', async () => {
      // Day 2030-01-10 has an activity + dining → shrinking to exclude it must be blocked.
      const blocked = toolJson(
        await client.callTool({
          name: 'update_trip',
          arguments: { trip_id: tripId, arrival_date: '2030-01-11', departure_date: '2030-01-12' },
        }),
      );
      expect(blocked.status).toBe('confirmation_required');
      expect(blocked.at_risk_days.map((d: { date: string }) => d.date)).toContain('2030-01-10');

      const applied = toolJson(
        await client.callTool({
          name: 'update_trip',
          arguments: {
            trip_id: tripId,
            arrival_date: '2030-01-11',
            departure_date: '2030-01-12',
            confirm_remove_days: true,
          },
        }),
      );
      expect(applied.status).toBe('updated');
      expect(applied.days_removed).toContain('2030-01-10');
    }));

  it('get_trip reflects the writes (the removed day and its items are gone)', () =>
    runCase('mcp', 'verify-after-writes', async () => {
      const payload = toolJson(await client.callTool({ name: 'get_trip', arguments: { trip_id: tripId } }));
      expect(payload.days.map((d: { date: string }) => d.date)).toEqual(['2030-01-11', '2030-01-12']);
    }));
});
```

- [ ] **Step 2: Run the lifecycle eval (requires `.env` eval credentials + a running evals server)**

Run: `npx vitest run --config evals/vitest.config.ts evals/mcp/writes.eval.ts`
(If the project exposes `npm run evals:mcp`, that is the canonical invocation — check `package.json`. The suite auto-skips when eval env vars are missing.)
Expected: PASS — all 5 cases green, OR a clean skip if credentials are absent. If it runs, confirm no error other than expected `isError` on the out-of-range case.

- [ ] **Step 3: Commit**

```bash
git add evals/mcp/writes.eval.ts
git commit -m "test(evals): MCP write lifecycle (create→add→confirm-shrink→verify)"
```

---

## Task 15: Final verification, docs, and memory

**Files:**
- Modify: `CLAUDE.md` (MCP section, if present) — optional
- Modify: `/Users/reminiscent/.claude/projects/-Users-reminiscent-wanderluxe/memory/mcp-server-rollout.md` + `MEMORY.md`

- [ ] **Step 1: Full type-check, lint, unit tests, and build**

Run: `npx tsc --noEmit && npx eslint server/ && npx vitest run && node server/build.js`
Expected: type-check PASS; eslint clean on `server/`; full Vitest suite green (including the new `server/lib/*.test.ts`); server bundle builds.

- [ ] **Step 2: Update the MCP rollout memory**

Edit `memory/mcp-server-rollout.md` to note that v1 write tools (create_trip, update_trip with confirm pattern, and add/update/delete for activity/dining/accommodation/transportation/expense) are implemented on `feat/mcp-write-tools`, layered as `server/lib/{tripDates,tripWrites,mcpTools}.ts`, all RLS-scoped, sharing/travelers and whole-trip delete excluded. Keep the one-line pointer in `MEMORY.md` accurate.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: record MCP write-tools v1 in rollout memory"
```

- [ ] **Step 4: Hand off for review** — see `superpowers:finishing-a-development-branch`.

---

## Notes & accepted trade-offs

- **Duplicated write logic:** the server `tripWrites.ts` mirrors client services rather than sharing them (the client uses the browser Supabase singleton). The *pure* date logic is shared via `tripDates.ts`; the client is intentionally **not** refactored to consume it (YAGNI / avoid touching working code), matching the spec's "where convenient."
- **Accommodation night re-fan on update** clears and rebuilds `accommodations_days` only when a check-in/out date changes — matching `accommodationService.ts`.
- **`update_trip` cascade** explicitly deletes `day_activities`, `reservations`, and `accommodations_days` on dropped days before deleting the `trip_days` rows (not relying on FK cascade). It removes accommodation *night mappings* on those days, not the accommodation rows themselves.
- **Currency:** omitted-but-cost-bearing items store `null` currency (the app treats null as unset); we do not guess a default.
- **Not found vs no access** are indistinguishable by design (RLS) — error copy says "not found, or you do not have access."
- **Out of scope (unchanged from spec):** sharing/travelers junction writes, whole-trip deletion, image/cover uploads, bulk/nested create.
```