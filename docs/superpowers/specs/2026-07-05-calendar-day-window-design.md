# Calendar day window: collapsed early-morning hours

**Date:** 2026-07-05
**Status:** Approved

## Problem

The trip calendar's time-grid views render with `height="auto"`, so the full
24-hour grid is always on the page. The hours from midnight to 7am are almost
always empty, pushing the useful part of the day below a screenful of dead
rows.

## Behavior

- Time-grid views (Day / 3 Day / Week) start the grid at **7:00am** by
  default. Month and list views are unaffected.
- **Never clip an event.** If any timed event in the currently visible date
  range starts before 7am, the grid start drops to the floor of that event's
  start hour (a 5:45am flight makes the grid start at 5am). This recomputes on
  navigation, so one early flight does not add dead rows to the whole trip.
- **Expand toggle.** A small ghost button above the grid reads "Show full day"
  when collapsed and "Hide early morning" when expanded. Expanded shows
  midnight to midnight. The button renders only in time-grid views and only
  when hours are actually hidden. State is component-local; no persistence.
- End of day stays at midnight; only the morning was dead time.

## Implementation

- `slotWindow.ts`: pure `computeSlotMinTime(events, visibleStart, visibleEnd)`
  returning a FullCalendar `slotMinTime` string (`'07:00:00'` or earlier).
  Timed events use floating `YYYY-MM-DDTHH:mm:ss` strings (see
  `eventMapping.ts`); all-day events and non-string starts are ignored.
- `TripCalendarView.tsx`: tracks the visible range from the existing
  `datesSet` callback (bailing out to the previous reference when unchanged —
  a fresh object every call loops render → dateProfile → datesSet forever),
  holds `showFullDay` state, and passes the derived `slotMinTime` to
  `<FullCalendar>`.

## Alternatives rejected

- `scrollTime`: no-op with `height="auto"` — there is no internal scroller.
- Whole-trip earliest-event rule: one early flight would permanently expand
  every day of the trip.
