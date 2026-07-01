# Trip Timezone Labels Design

**Date:** 2026-07-01
**Status:** Approved (design), pending implementation plan
**Branch:** `feat/trip-timezones` (stacked on `feat/trip-calendar-view`, which carries the calendar view + iCal feed this feature integrates with)

## Problem

Every trip time in WanderLuxe is stored and shown as a naive, timezone-agnostic wall-clock value (`start_time = '14:30:00'`, etc.). That is pleasant for entry and reading ("takeoff 5 PM local, land 7 PM local, no mental math"), but it is ambiguous the moment a trip crosses timezones: a viewer cannot tell whether a "5 PM" flight departure is in the origin or destination zone, and a cross-zone flight looks like a same-clock hop.

We want the times to remain local and math-free while making the timezone of each time **legible**, with the correct zone filled in automatically so user impact stays near zero.

## Decisions (from brainstorming)

1. **Fidelity: per-leg transport + per-event.** Transport carries a departure zone and an arrival zone; activities, dining, and accommodations carry one zone each; the trip carries a default zone.
2. **Display: local-at-location everywhere, never convert to the viewer.** No surface converts a time into the viewer's device zone. The subscribed iCal feed stays **floating**.
3. **Approach A: auto-resolve from existing place data.** The trip default comes from `primary_destination_place_id`; entities that already carry a `place_id` auto-resolve their own zone; transport endpoints (free text today) default to the trip zone with an easy per-leg override.

### Consequence, explicitly accepted

Because we never convert, a red-eye that departs 11 PM EDT and arrives 11 AM BST renders as a ~12-hour wall-clock block on the calendar (labeled with both zones), not its true ~7-hour absolute duration. Reflecting real elapsed time would require converting to absolute instants, which was declined. Timezone here is a **label, not a conversion.**

## Core Principle

Timezone is display metadata layered on top of unchanged floating wall-clock times. **No time value is ever converted or migrated.** Three cleanly separated responsibilities:

- **Resolve** — `place_id -> IANA timezone` (e.g. `America/New_York`). A pure, cached lookup.
- **Store** — IANA timezone strings on the trip and each entity. `NULL` means "inherit the trip default."
- **Present** — a helper that turns `(time, entityTz, tripTz)` into a display label and a "show a zone badge?" decision.

Unresolved / `NULL` always falls back to the trip default, and a trip with no resolved zone falls back to today's exact behavior. The feature therefore degrades gracefully and is **invisible on single-destination trips** (every event inherits the one trip zone, so nothing diverges and no badge shows).

## Architecture

### Unit 1: Timezone resolution service (server)

A new Edge Function `timezone-proxy` (sibling of `google-places-proxy`).

- **Input:** a Google `place_id` (or a `lat,lng` pair).
- **Behavior:** resolve `place_id -> lat/lng` (Places details), then call the Google Time Zone API to get the IANA timezone id. Cache the result in a `timezone_cache` table keyed by `place_id` (place_ids are stable, so lookups are effectively one-time per place).
- **Output:** `{ timeZoneId: string }` or a soft failure (see Error Handling).
- **Depends on:** Google Maps/Places API key (already a server secret), the Google Time Zone API (new usage), the `timezone_cache` table.

**Interface:** `POST /functions/v1/timezone-proxy { placeId }` -> `{ timeZoneId }`.

### Unit 2: Client resolution hook

`useResolveTimezone(placeId: string | null)` — React Query cached wrapper over `timezone-proxy`. Returns `{ timeZoneId, isLoading }`. Used by forms to auto-fill a zone when a place is selected. Returns null (no fill) when `placeId` is null or resolution fails.

### Unit 3: Timezone columns (DB migration)

All nullable, no backfill, no changes to any existing time value:

- `trips.timezone text`
- `day_activities.timezone text`
- `reservations.timezone text`
- `accommodations.timezone text`
- `transportation.departure_timezone text`
- `transportation.arrival_timezone text`

`NULL` semantics: an entity with `NULL` timezone inherits the trip default; a trip with `NULL` timezone is resolved lazily on next view (see Data Flow).

### Unit 4: Presentation helper

`src/utils/timezoneLabel.ts` (pure, unit-tested):

- `effectiveTz(entityTz: string | null, tripTz: string | null): string | null` — `entityTz ?? tripTz`.
- `tzAbbrev(tz: string, onDate: string): string` — DST-correct short label via `Intl.DateTimeFormat(..., { timeZone: tz, timeZoneName: 'short' })` evaluated at noon on `onDate` (so `America/New_York` yields `EST` in January and `EDT` in July). Guarded; returns `''` on invalid tz.
- `shouldShowBadge(entityTz: string | null, tripTz: string | null): boolean` — true when `effectiveTz` is set and differs from `tripTz`.

### Unit 5: Display integration (label only, no logic change)

The calendar keeps `timeZone` **unset** (floating preserved). Each surface renders the existing wall-clock time and appends a compact zone badge when `shouldShowBadge` is true (and always shows both labels on a flight whose two zones differ):

- Timeline rows (`timeline-utils` / `TimelineRow`).
- Calendar event chips (`eventMapping` / chip renderer).
- PDF export (`pdfmake-export` `fmtTime`).
- iCal feed: stays floating; for cross-zone items, include the zone in the `SUMMARY`/`DESCRIPTION` text so subscribers can read it (no `TZID`, no `Z`).

### Unit 6: Input integration (forms)

Each entity form gains a pre-filled, collapsed/advanced "Timezone" select: a searchable combobox over the full IANA zone list from `Intl.supportedValuesOf('timeZone')` (with a graceful fallback list if unavailable). Transport gets two (departure and arrival). Pre-fill order:

1. The entity's own place zone if it has a `place_id` (via `useResolveTimezone`).
2. Otherwise the trip default.

Selecting or changing a location that carries a `place_id` auto-updates the zone field, unless the user has manually overridden it. Times are typed exactly as today.

## Data Flow

- **Trip:** primary destination `place_id` -> resolve -> `trips.timezone`. Existing trips resolve **lazily**: when a trip loads with `timezone = NULL` and a `primary_destination_place_id` present, resolve once and persist (self-healing, no migration job). The persist is attempted only when the current user can edit the trip (owner or edit-share); a view-only viewer resolves in memory for display and does not write (the trip UPDATE RLS policy would reject it anyway, the same constraint seen in the calendar-feed feature).
- **Activity / dining / hotel:** if the item has a `place_id` (`location_place_id` / `place_id` / `hotel_place_id`), auto-fill its zone on create/edit; otherwise leave `NULL` (inherits trip). Time typed as-is.
- **Transport:** endpoints are free text today, so `departure_timezone` / `arrival_timezone` default to the trip zone, each with an easy override. A flight shows both labels when they differ.
- **Display (any surface):** `effectiveTz = entityTz ?? tripTz`; render the wall-clock time; add a badge only when `effectiveTz !== tripTz` (or the two flight zones differ).

## Error Handling

Resolution never blocks a save.

- Time Zone API failure, missing `place_id`, unresolvable location, or an invalid/legacy tz string -> the zone stays `NULL` -> inherit the trip default -> no badge (today's behavior).
- All `Intl` calls are wrapped; an unrecognized zone yields an empty label rather than throwing.
- `timezone-proxy` returns a soft failure (no id) rather than erroring the caller; the form simply does not auto-fill.

## Testing

- **Unit:** `timezone-proxy` (resolve, cache hit/miss, API-error -> soft null); `tzAbbrev` DST correctness (Jan EST vs Jul EDT, a `GMT+N` zone); `effectiveTz`; `shouldShowBadge`.
- **Component:** form auto-fill on place select; badge shows only on divergence; transport two-zone rendering (both labels when they differ).
- **Feed:** stays floating (existing assertions hold); assert the zone text appears in the title/description for a cross-zone item.

## Scope

**In:** the six timezone columns; the `timezone-proxy` Edge Function + `timezone_cache` table; `useResolveTimezone`; the `timezoneLabel` helper; form auto-fill + per-entity and per-leg override selects; badges across timeline / calendar / PDF / feed; lazy trip-tz resolution.

**Out (deferred):** any time conversion or `timestamptz` migration; Google place autocomplete on transport departure/arrival endpoints (Approach C); an editable trip timezone in the hero (Approach C); a bulk backfill of existing rows.

## Assumed defaults

- The timezone override control is a searchable combobox pre-filled from the location or the trip default, and is rarely opened.
- Existing trips get `timezone` resolved lazily on next view rather than through a backfill job.
