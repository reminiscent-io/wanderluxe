# Trip Calendar View + Calendar Sync — Design

**Date:** 2026-06-30
**Status:** Approved (design); ready for implementation planning
**Author:** Kevin Lowe + Claude

## Summary

Add a **calendar view** of a trip's itinerary alongside the existing vertical
timeline, with Day / 3-Day / Week / Month views, full drag-to-edit and create
interactions, and a mobile-first agenda mode. Add **calendar sync** via a
token-gated, subscribable iCalendar feed so users can subscribe a trip into
Google / Apple / Outlook and have it auto-refresh.

The calendar is a **product** surface (a tool the organizer works in). The
guiding constraint from PRODUCT.md: it must feel instantly trustworthy and
familiar, while never reading as a "generic SaaS / cold-palette" calendar
(an explicit anti-reference). Design principles in play: *editorial not
transactional*, *hierarchy not density*, *one clear picture*.

## Decisions (locked during brainstorming)

| Question | Decision |
|---|---|
| Relationship to existing timeline | **Toggle alongside.** Add a Timeline ↔ Calendar switch; both views share data hooks. Timeline is not removed. |
| Interaction depth | **Full drag-to-edit + create**, with per-view scoping (see View Intent). |
| Calendar library | **FullCalendar** (MIT core: `@fullcalendar/react`, `daygrid`, `timegrid`, `interaction`). Only library satisfying 3-day view + full drag/create + robust mobile touch + native all-day lane. Lazy-loaded. |
| Calendar sync | **Subscribable iCal feed** (token-gated `webcal://` URL), with a one-time `.ics` download as fallback. One-way (trip → calendar). No OAuth. |
| Entities shown | Timed activities + dining (time blocks); untimed activities/dining (all-day lane); accommodations + transportation (multi-day spanning bars). **Expenses excluded** (stay in Budget). |

## Non-goals

- Two-way calendar sync / Google Calendar OAuth (explicitly out of scope).
- Per-trip timezone modeling. Times remain naive destination-local strings;
  the feed emits **floating** times so they render in local time on any device.
- Expenses on the calendar.
- Replacing or deprecating the vertical timeline.

## Architecture

### Mounting

`TimelineView` gains a **Timeline ↔ Calendar segmented toggle**. Both
presentations consume the *same* existing data hooks (`useTripDays` / activities,
`useTimelineEvents` / accommodations, `useTransportationEvents`, reservations),
so realtime subscriptions and React Query caching work unchanged. The toggle
swaps the rendering component only.

### New module: `src/components/trip/calendar/`

| File | Purpose |
|---|---|
| `TripCalendarView.tsx` | Top-level. Owns view state (day/3-day/week/month) and focused date; renders FullCalendar; wires drag/resize/click/select handlers. **Lazy-loaded** so FullCalendar (~100 kb gz) never enters the timeline bundle. |
| `useCalendarEvents.ts` | Adapter hook. Consumes existing data hooks, returns FullCalendar `EventInput[]`. |
| `eventMapping.ts` | **Pure, unit-tested core.** Forward map (entity → event) and reverse map (drag/resize result → entity field patch). |
| `CalendarToolbar.tsx` | View switcher + prev/next/today. Segmented control on desktop, compact dropdown on mobile. |
| `CalendarEventChip.tsx` | Custom `eventContent` renderer (icon, title, time, traveler avatars). |
| `calendarTheme.css` | Scoped FullCalendar CSS-variable overrides → warm editorial palette. |

### Data flow

```
existing data hooks
  → useCalendarEvents (eventMapping forward)
  → FullCalendar EventInput[]
  → user drags / resizes / clicks / selects
  → handler (eventMapping reverse) → existing React Query mutation → Supabase
  → realtime + cache invalidation → calendar re-renders
```

### Reuse principle

The calendar creates **no new forms**. Tapping an event opens the *existing*
edit dialog for that entity; clicking an empty slot opens the *existing* add
dialog prefilled with date/time; drag/resize calls *existing* mutations. This
keeps the surface DRY and consistent and reuses the realtime/cache flow.

## View Intent

Each view has one job. This prevents an empty month grid for short trips and
keeps interactions honest about trip-sized data.

| View | Job | Interaction |
|---|---|---|
| **Day** | Focused editing surface. Desktop = time-grid; **mobile = agenda list** (events stacked in time order, not a 24-row hour rail). | Full: tap to edit, add button, drag/resize (desktop grid). |
| **3-Day** | "Around now" working window. Default on tablet. | Full drag/resize/create. |
| **Week** | Default on desktop. Primary planning canvas. | Full drag/resize/create. |
| **Month** | **Navigator, not editor.** Per-day density (count/dots) + multi-day stay/transport bars. Tap a day to jump into Day/Week. | Read + navigate only; no drag-create. |

- **Defaults:** Week on desktop, Day on mobile.
- **Range clamp:** visible/valid range clamped to trip dates (`validRange`).
  Activities/dining are keyed to `trip_days` that exist only inside the range,
  so cells outside it are de-emphasized and non-droppable.

## Visual Treatment (de-SaaS workstream)

First-class deliverable with an explicit acceptance bar:
**"does not read as default FullCalendar."**

- **Restrained color, not a 4-type rainbow.** Entity types are distinguished by
  a **leading icon + tonal warm tint** from DESIGN.md neutrals
  (`cream-paper` #FDFCF8, `raw-linen` #EEE7DA, `tea-stained` #EDDDC8,
  `aged-paper` #EDE8DD). The sunset accent (`citrus-peel` #F97316) is reserved
  for the focused/selected event and the "now" indicator. The grid should read
  as one warm surface, not a parking lot of colored tags.
- **Editorial typography.** Date and day-of-week headers in **DM Serif Display**;
  event chips, times, hour rail in **DM Sans**.
- **Custom event rendering** via FullCalendar `eventContent` → `CalendarEventChip`
  (icon, title, time, traveler avatars), not FullCalendar's default block.
  Themed via scoped CSS vars: sand gridlines, generous row height, `rounded-sm`,
  `shadow-warm-sm`.
- **Empty/sparse state.** A trip with no events shows a warm "Your itinerary is
  empty, add your first stop" panel over the grid, not bare cells.

## Event Mapping & Interaction Semantics

`eventMapping.ts` (pure) maps each entity both directions. Event ids are
namespaced by type (`activity:<id>`, `dining:<id>`, `accommodation:<id>`,
`transportation:<id>`); the original record + type ride in `extendedProps`.

| Entity | Render | Drag | Resize |
|---|---|---|---|
| Activity (timed) | Time block | Retime / move day (cross-midnight re-resolves `day_id`) | Change duration |
| Activity/dining (untimed) | All-day lane chip | Move to another date | n/a |
| Dining (timed) | Time block (point) | Retime / move day | n/a (point in time) |
| Accommodation | All-day spanning bar (check-in → check-out, end-exclusive handled) | Move dates | Change span; re-sync `accommodations_days` via existing service logic |
| Transportation | Spanning bar (departure → arrival); timed block if same-day with times | Move dates | Change span |

- Fine-grained check-in/out and transport *times* are edited in the dialog, not
  by drag.
- Reverse mapping returns the **minimal field patch** routed to the existing
  mutation for that entity.
- Mobile edit surface = existing dialogs **as bottom sheets** (audit reused
  dialogs; convert any centered modal to a sheet on mobile).

## Calendar Sync (subscribable iCal feed)

### Storage

Add to `trips`:
- `calendar_feed_token` (text/uuid, random, nullable until enabled) — unguessable.
- `calendar_feed_enabled` (boolean, default false).

A reset action regenerates the token (revokes old subscriptions).

### Endpoint

Express route `server/routes/calendar.ts`:
`GET /api/trips/:tripId/calendar.ics?token=…`
- Service-role read, validates token against `trips.calendar_feed_token`.
- Returns `text/calendar; charset=utf-8` with a short HTTP cache header.
- Invalid/missing/revoked token → 403.
- Chosen as an Express route (not an Edge Function) because it serves our own DB
  data server-side, matching the existing service-role route pattern
  (`server/routes/*` do their own authorization).

### Feed contents

Built with **`ical-generator`** (handles line folding, escaping, floating times).

- Each entity → one VEVENT with a **stable UID** (`activity-<id>@wanderluxe.io`,
  etc.) so calendar clients replace on update rather than duplicate.
- **Timed events** (activities, dining, same-day transport) → floating local
  times (no TZID, no `Z`) so they display in destination-local time anywhere.
- **All-day / multi-day** (accommodations, untimed items, multi-day transport)
  → DATE-valued VEVENTs.
- SUMMARY = title; LOCATION, DESCRIPTION populated where available.

### UI

An **"Add to calendar"** action in the **trip-level menu** (not the calendar
toolbar) opens a sheet with:
- the `webcal://…calendar.ics?token=…` subscribe URL + copy button,
- short Google / Apple / Outlook subscribe instructions,
- a **Download .ics** fallback (one-time snapshot),
- a **Reset link** action (revoke + regenerate token).

Note the known caveat in copy: Google refreshes subscribed feeds on its own slow
cadence (hours), so edits are not instant in subscribers' calendars.

## Testing

- `eventMapping.test.ts`: every entity ↔ event, edge cases — untimed → all-day,
  end-exclusive spans, cross-midnight day re-resolution, drop outside `validRange`
  rejected, reverse patch minimality.
- iCal builder: golden snapshot (floating times, all-day, UIDs, escaping); route
  test for token valid/invalid/revoked → 200/403.
- Calendar component smoke test (renders mapped events; FullCalendar internals
  trusted for drag mechanics).

## Dependencies

- `@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`,
  `@fullcalendar/interaction` (MIT).
- `ical-generator` (feed building).
- 3-day view = a custom `timeGrid` with `duration: { days: 3 }` (no premium plugin).

## Open implementation details (resolve during planning)

- Exact `validRange` end handling vs. FullCalendar's exclusive end semantics.
- Whether Month "density" is dots vs. a count badge.
- Mobile agenda day view: custom list rendering vs. FullCalendar `listDay`.
- Whether to gate the feed behind an explicit user enable, or auto-provision a
  token on first "Add to calendar" open.
