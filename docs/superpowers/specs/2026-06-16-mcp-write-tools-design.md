# MCP Write Tools — Design Spec

**Date:** 2026-06-16
**Branch:** `mcp-server`
**Status:** Approved, pending implementation plan

## Goal

Extend the WanderLuxe MCP server (`server/routes/mcp.ts`) from read-only to read+write so a
Claude.ai connector can fully manage a user's trips: create trips, add items, update existing
items, and delete items. Sharing/travelers and whole-trip deletion are intentionally excluded
from v1.

## Background

The MCP server today exposes 3 read-only tools (`list_trips`, `get_trip`, `get_trip_budget`)
over stateless streamable HTTP, authenticated by Supabase-issued ES256 user JWTs validated
against the project JWKS via `jose`. Every query runs through a **per-request, user-scoped
Supabase client** (anon key + the user's bearer token), so RLS enforces all access control. No
service-role key is ever used. See `mcp-server-rollout` memory for the broader rollout context.

Writes are **not** simple inserts. The app's create/update flows carry business logic that the
tools must mirror:

- **Create trip** → insert `trips` + generate one `trip_days` row per date in the range + add
  an owner record to `trip_shares`.
- **Add activity / dining** → resolve `day_id` from a date, compute `order_index`, insert with
  both `trip_id` and `day_id`.
- **Add accommodation** → insert `accommodations` + fan out `accommodations_days` (one row per
  night, each mapped to a `trip_days.day_id`).
- **Update trip dates** → add `trip_days` for new dates, remove `trip_days` for dropped dates
  (which can orphan items scheduled on those days).

This logic currently lives in client-side services (`src/services/tripDaysService.ts`,
`src/services/accommodation/accommodationService.ts`, `CreateTripForm.tsx`) that use the
**browser** Supabase singleton — so they cannot be imported by the Express server, which uses a
different (per-request, user-scoped) client.

## Architecture

### New module: `server/lib/tripWrites.ts`

Pure functions, each taking the user-scoped Supabase client as its first argument:

```
createTrip(supabase, input)            → { trip_id, day_dates[] }
updateTrip(supabase, input)            → updated trip (+ removed-day report on the destructive path)
addActivity(supabase, input)           → created activity
updateActivity(supabase, input)        → updated activity
deleteActivity(supabase, id)           → { deleted: true }
addDining(supabase, input)             → created reservation
updateDining(supabase, input)          → updated reservation
deleteDining(supabase, id)             → { deleted: true }
addAccommodation(supabase, input)      → created accommodation (+ accommodations_days fan-out)
updateAccommodation(supabase, input)   → updated accommodation (re-fans accommodations_days)
deleteAccommodation(supabase, id)      → { deleted: true }
addTransportation(supabase, input)     → created transportation
updateTransportation(supabase, input)  → updated transportation
deleteTransportation(supabase, id)     → { deleted: true }
addExpense(supabase, input)            → created other_expense
updateExpense(supabase, input)         → updated other_expense
deleteExpense(supabase, id)            → { deleted: true }
```

Benefits: testable in isolation, keeps `mcp.ts` focused, no risky refactor of working client
code. Trade-off accepted: the write logic is mirrored in two places (client service + server
lib). To minimize duplication, extract the **pure** date helpers (date-range → dates array) into
a shared, unit-tested helper that both server and — where convenient — client can use.

### New module: `server/lib/mcpTools.ts`

Move tool registration (both the existing read tools and the new write tools) out of `mcp.ts`
into this module. `mcp.ts` shrinks to transport, auth, and OAuth discovery only. `mcpTools.ts`
exports a function that registers all tools onto an `McpServer` given a user-scoped client.

This is a targeted refactor justified by the registration code roughly doubling in size; it is
not unrelated cleanup.

### Unchanged

- Auth (`authenticate`, JWKS, `unauthorized`), the per-request client factory
  (`createUserClient`), transport wiring, rate limiting, and OAuth discovery metadata in
  `mcp.ts`.
- The 3 read tools' behavior. They already return item ids (`activity id`, `reservation id`,
  `stay_id`, transportation `id`), which the update/delete tools rely on for addressing.

## Tool surface (17 tools)

| Entity | Create | Update | Delete |
|---|---|---|---|
| Trip | `create_trip` | `update_trip` | — (excluded) |
| Activity | `add_activity` | `update_activity` | `delete_activity` |
| Dining | `add_dining` | `update_dining` | `delete_dining` |
| Accommodation | `add_accommodation` | `update_accommodation` | `delete_accommodation` |
| Transportation | `add_transportation` | `update_transportation` | `delete_transportation` |
| Other expense | `add_expense` | `update_expense` | `delete_expense` |

Plus the existing read tools (`list_trips`, `get_trip`, `get_trip_budget`), unchanged.

### Per-tool input contracts

Dates are ISO `YYYY-MM-DD`; times are 24h `HH:MM`; ids are uuids; currency is a 3-letter code.
All validated with `zod`. Required vs optional fields below match the underlying table
constraints found during exploration.

- **create_trip** — required: `destination`, `arrival_date`, `departure_date`. Optional:
  `budget`. Side effects: generates `trip_days`, inserts owner `trip_shares`. Returns `trip_id`
  and the generated `day_dates[]`.
- **update_trip** — required: `trip_id`. Optional: `destination`, `budget`, `arrival_date`,
  `departure_date`, `confirm_remove_days` (boolean, default false). See date-change safety below.
- **add_activity** — required: `trip_id`, `date`, `title`. Optional: `description`,
  `start_time`, `end_time`, `cost`, `currency`, `location_address`. Resolves `day_id` from
  `date`; computes `order_index`.
- **update_activity** — required: `activity_id`. Optional: any of the above fields. Changing
  `date` re-resolves `day_id`.
- **delete_activity** — required: `activity_id`.
- **add_dining** — required: `trip_id`, `date`, `restaurant_name`. Optional: `reservation_time`,
  `number_of_people`, `address`, `confirmation_number`, `notes`, `cost`, `currency`. Resolves
  `day_id`; computes `order_index`.
- **update_dining / delete_dining** — by `reservation_id`, analogous to activity.
- **add_accommodation** — required: `trip_id`, `hotel`, `hotel_checkin_date`,
  `hotel_checkout_date`. Optional: `hotel_address`, `checkin_time`, `checkout_time`,
  `hotel_phone`, `hotel_website`, `cost`, `currency`. Sets `title = hotel`, computes
  `order_index`, fans out `accommodations_days`.
- **update_accommodation** — by `stay_id`; if check-in/out dates change, re-fan
  `accommodations_days`.
- **delete_accommodation** — by `stay_id` (cascade/explicit cleanup of `accommodations_days`).
- **add_transportation** — required: `trip_id`, `type` (enum: flight|train|bus|car|other),
  `start_date`. Optional: `provider`, `flight_number`, `confirmation_number`,
  `departure_location`, `arrival_location`, `start_time`, `end_date`, `end_time`, `cost`,
  `currency`. No daily fan-out.
- **update_transportation / delete_transportation** — by transportation `id`.
- **add_expense** — required: `trip_id`, `description`, `cost`, `currency`. Optional:
  `amount_paid`, `is_paid`.
- **update_expense / delete_expense** — by expense `id`.

## Addressing model

- **Items**: addressed by their own id, which the read tools already surface.
- **Days**: addressed by **date**, never `day_id`. The server resolves date→`day_id` and returns
  a clear error ("That date is outside the trip's range") if no matching day exists. This matches
  the app's own forms and is natural for an LLM.
- **New-trip flow**: `create_trip` returns `trip_id` + `day_dates[]` so Claude can add items in
  the same turn without a round-trip read.

## Trip date-change safety (the two-call confirm pattern)

`update_trip` with changed `arrival_date`/`departure_date`:

1. Compute the new date range and diff against existing `trip_days`.
2. **Days to add** (in new range, no existing row): always created. No confirmation needed.
3. **Days to drop** (existing row, outside new range): run a content pre-check — does each
   dropped day have any `day_activities`, `reservations`, or `accommodations_days`?
   - **No content on any dropped day** → drop them and apply the date change.
   - **Content exists on ≥1 dropped day** and `confirm_remove_days` is not `true` → **refuse**.
     Return a structured report listing each at-risk day and what's on it (counts + titles), and
     do **not** mutate anything. Claude relays this to the user for validation.
   - Caller re-invokes with `confirm_remove_days: true` → cascade: delete the dropped
     `trip_days` (and their dependent items via FK cascade / explicit cleanup) and apply the date
     change.

This realizes the user's "validate first, then cascade" intent within MCP's single
request→response model — no dependency on the elicitation capability, which Claude.ai connectors
may not support.

## Security

- All writes use the **user-scoped (RLS) Supabase client** — anon key + the request's user
  bearer token. Identical security posture to the read tools. **Never** service-role.
- RLS guarantees a user can only write to trips they own or have an edit share on. "Not found"
  and "no access" are indistinguishable by design.
- `create_trip` sets `user_id` to the authenticated `userId` from the validated JWT (not from
  input).

## MCP annotations

- Create/update tools: `readOnlyHint: false`, `destructiveHint: false`. Update tools that are
  naturally idempotent set `idempotentHint: true`.
- Delete tools and the destructive (cascade) branch of `update_trip`: `destructiveHint: true`.

## Error handling

- Validation errors (`zod`) surface as tool errors with actionable messages.
- Supabase errors return `toolError(...)` with the DB message, matching the existing read tools.
- Out-of-range date, missing parent trip, and not-found item all return clear, distinct messages.

## Testing

- **Unit (`.test.ts`, runs in CI):** pure date-range helper; `update_trip` data-loss pre-check
  (days-to-add / days-to-drop diff and the content-detection branch).
- **Eval (`evals/mcp`, on-demand):** a lifecycle case against the eval-user fixture —
  create_trip → add_activity → add_dining → update → delete → (clean up). Asserts RLS scoping and
  that the confirm pattern blocks then allows a destructive date edit.

## Out of scope (v1)

- Sharing / travelers / any `*_travelers` junction writes.
- Whole-trip deletion.
- Image/cover uploads and Unsplash metadata.
- Bulk/nested create (atomic tools compose without it).

## Open considerations (non-blocking)

- `order_index` computation: mirror the app's "next index" approach (max+1 within the
  trip/day scope) so MCP-created items sort consistently with app-created ones.
- Currency defaulting: if omitted on a cost-bearing item, leave null (the app treats null
  currency as unset) rather than guessing.
