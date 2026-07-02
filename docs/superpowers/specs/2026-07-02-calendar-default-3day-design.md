# Calendar Default 3-Day View Design

**Date:** 2026-07-02
**Status:** Approved (design), pending implementation plan
**Branch:** `feat/trip-calendar-view` (the calendar feature branch this modifies)

## Problem

The trip calendar opens on Week view (desktop) or the Day agenda list (mobile), anchored at today's date. For a trip you're planning, "today" is usually nowhere near the trip and a full week is more grid than itinerary. The user wants the calendar to open on the 3-day time grid, positioned at the start of the trip.

## Decisions (from brainstorming)

1. **3-day default on both desktop and mobile.** One consistent default; the existing width-dependent initializer (`listDay` on <768px, `timeGridWeek` otherwise) is removed.
2. **Open at today when the trip is in progress, otherwise at trip day 1.** Mid-trip you care about now; future trips open on the first day, and past trips also open on the first day (explicitly — FullCalendar's `validRange` clamping would otherwise land a past trip on its *last* day, since the clamp picks the closest valid date to today).

## Design

One file changes: `src/components/trip/calendar/TripCalendarView.tsx`.

- **Default view:** the `activeView` lazy initializer (currently lines 46-50) becomes a plain `useState<CalendarViewName>('timeGridThreeDay')`. The width-reading initializer and its explanatory comment are deleted. The `timeGridThreeDay` view definition in the `views` prop and both `CalendarToolbar` view lists already exist and are unchanged.
- **Initial date:** compute once and pass `initialDate` to `<FullCalendar>`:
  - trip dates missing → `undefined` (FullCalendar default, today).
  - today within `[arrival_date, departure_date]` (via the existing `isDateWithinTripRange`) → today.
  - otherwise → `arrival_date`.

  `initialDate` is read only at mount, which is the wanted semantics; the Today button and prev/next arrows still navigate freely within `validRange`.

## Out of scope

- Persisting the user's last-used view (localStorage) — not requested.
- Making the default view configurable via props — no second caller.
- Any change to view switching, drag/drop, `validRange`, or timezone badges.

## Error handling

- Missing/partial trip dates degrade to FullCalendar's defaults (no `initialDate`, no `validRange`) — same as today.
- Date comparison uses `yyyy-MM-dd` string comparison via `isDateWithinTripRange` (lexicographic == chronological), consistent with the rest of the calendar code.

## Testing

Extend the existing `TripCalendarView` smoke test:

- Default view: the mounted calendar renders the 3-day time grid (assert the `timeGridThreeDay` view container / view class).
- Initial date: for a trip entirely in the future, the calendar's initial visible range starts on `arrival_date` (assert via the toolbar title emitted by `datesSet`).
