# Calendar Default 3-Day View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the trip calendar on the 3-day time grid, anchored at today when the trip is in progress and at the trip's first day otherwise.

**Architecture:** Two surgical changes inside `TripCalendarView.tsx`: the `activeView` initializer becomes a flat `'timeGridThreeDay'` (dropping the mobile-width branch), and a computed `initialDate` is passed to `<FullCalendar>`. Everything else (view registry, toolbars, validRange, drag/drop) is untouched.

**Tech Stack:** React, FullCalendar v6, date-fns, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-07-02-calendar-default-3day-design.md`

## Global Constraints

- 3-day default applies on **both desktop and mobile** (the width-dependent initializer is removed, not rerouted).
- Initial date rule: trip dates missing → `undefined`; today within `[arrival_date, departure_date]` → today; otherwise → `arrival_date` (never let FullCalendar's `validRange` clamp choose — it would open a **past** trip on its last day).
- No changes to view switching, drag/drop, `validRange`, timezone badges, or the `CalendarToolbar` lists.
- Tests must not depend on the real clock except through explicitly constructed relative dates (the mid-trip test builds dates around `new Date()`; fixed-date tests use far-future dates).
- `bun` is NOT on PATH — use `npx vitest run` and `npx tsc --noEmit`.
- Branch: `feat/trip-calendar-view` (current checkout). Commit at the end of the task.

---

### Task 1: 3-day default view + trip-anchored initial date

**Files:**
- Modify: `src/components/trip/calendar/TripCalendarView.tsx:46-50` (view initializer), `:101-105` (add `initialDate` computation next to `validRange`), `:133-166` (pass `initialDate` prop)
- Test: `src/components/trip/calendar/TripCalendarView.test.tsx` (update existing fixture + 3 new tests)

**Interfaces:**
- Consumes: `isDateWithinTripRange(date, startInclusive, endInclusive): boolean` from `./eventMapping` (already imported in this file); `format`/`addDays`/`parse` from `date-fns` (already imported).
- Produces: nothing new — `TripCalendarViewProps` unchanged.

- [ ] **Step 1: Update the existing smoke test's fixture and add the three failing tests**

The current `renders a mapped event title` test only passes because the calendar opens on *today's* week and the fixture event (2026-06-30) happened to be nearby — under the new trip-anchored default it becomes clock-dependent. Move the fixture to a far-future trip whose event sits on day 1. Replace the entire file body of `src/components/trip/calendar/TripCalendarView.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import TripCalendarView from './TripCalendarView';

vi.mock('./useCalendarRealtime', () => ({ useCalendarRealtime: () => ({ isSubscribed: true }) }));
vi.mock('./useCalendarEvents', () => ({
  useCalendarEvents: () => ({
    isLoading: false,
    events: [{ id: 'activity:a1', title: 'Louvre', start: '2030-03-01T14:30:00', end: '2030-03-01T16:00:00', allDay: false, extendedProps: { entityType: 'activity', record: { id: 'a1' } } }],
  }),
}));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

const FUTURE_TRIP = { arrival_date: '2030-03-01', departure_date: '2030-03-05' };

function renderCalendar(tripDates: { arrival_date: string | null; departure_date: string | null }) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TripCalendarView tripId="t1" tripDates={tripDates} />
    </QueryClientProvider>,
  );
}

describe('TripCalendarView', () => {
  it('renders a mapped event title', async () => {
    renderCalendar(FUTURE_TRIP);
    expect(await screen.findByText('Louvre')).toBeInTheDocument();
  });

  it('defaults to the 3-day time grid view', () => {
    const { container } = renderCalendar(FUTURE_TRIP);
    expect(container.querySelector('.fc-timeGridThreeDay-view')).toBeInTheDocument();
  });

  it('opens a future trip on its first day', () => {
    const { container } = renderCalendar(FUTURE_TRIP);
    expect(container.querySelector('[data-date="2030-03-01"]')).toBeInTheDocument();
    // Anchored at day 1: the day before the trip is not part of the 3-day window.
    expect(container.querySelector('[data-date="2030-02-28"]')).not.toBeInTheDocument();
  });

  it('opens an in-progress trip at today', () => {
    const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
    const now = new Date();
    const arrival = fmt(addDays(now, -2));
    const departure = fmt(addDays(now, 3));
    const { container } = renderCalendar({ arrival_date: arrival, departure_date: departure });
    expect(container.querySelector(`[data-date="${fmt(now)}"]`)).toBeInTheDocument();
    // Anchored at today, not at the trip's first day two days ago.
    expect(container.querySelector(`[data-date="${arrival}"]`)).not.toBeInTheDocument();
  });
});
```

(The `Louvre` assertion works because the event now sits on the trip's first day, which is exactly where the new default opens. FullCalendar renders every visible day column with a `data-date` attribute, which is what the range assertions key on.)

- [ ] **Step 2: Run the test file to verify the new tests fail**

Run: `npx vitest run src/components/trip/calendar/TripCalendarView.test.tsx`
Expected: FAIL — `defaults to the 3-day time grid view` (view is `timeGridWeek`), `opens a future trip on its first day` (calendar opens near today, and `validRange` clamping shows dates around 2030-03-01 only after the fix — the `data-date="2030-03-01"` assertion may fail or the excluded-date assertion will), and `opens an in-progress trip at today` may pass incidentally under the old today-anchored default — that's fine; at least the first two must fail. `renders a mapped event title` will also fail (event not in the visible window yet).

- [ ] **Step 3: Implement in `TripCalendarView.tsx`**

Replace the `activeView` initializer (lines 46-50):

```tsx
const [activeView, setActiveView] = useState<CalendarViewName>('timeGridThreeDay');
```

(delete the `// Lazy initializer: ...` comment and the `window.innerWidth` expression entirely).

Next to the existing `validRange` computation (line ~101), add:

```tsx
// Open at today mid-trip; otherwise on trip day 1. Relying on validRange
// clamping alone would open a *past* trip on its last day (the clamp picks
// the valid date closest to today).
const initialDate = (() => {
  const { arrival_date: arrival, departure_date: departure } = tripDates;
  if (!arrival || !departure) return undefined;
  const today = format(new Date(), 'yyyy-MM-dd');
  return isDateWithinTripRange(today, arrival, departure) ? today : arrival;
})();
```

And pass it to the calendar (in the `<FullCalendar>` props, next to `initialView={activeView}`):

```tsx
initialDate={initialDate}
```

- [ ] **Step 4: Run the test file to verify all pass**

Run: `npx vitest run src/components/trip/calendar/TripCalendarView.test.tsx`
Expected: PASS (4/4).

- [ ] **Step 5: Full gates**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc clean; 326 tests passing (323 existing + 3 new; the smoke test was modified, not added).

- [ ] **Step 6: Commit**

```bash
git add src/components/trip/calendar/TripCalendarView.tsx src/components/trip/calendar/TripCalendarView.test.tsx
git commit -m "feat(calendar): default to 3-day view anchored at trip start (today mid-trip)"
```

---

## Self-Review (completed at planning time)

- **Spec coverage:** default view on both breakpoints → Step 3 initializer; initial-date rule incl. the past-trip clamp case → Step 3 `initialDate`; out-of-scope items untouched; testing section → Steps 1-2 (view class + `data-date` range assertions, plus the mid-trip case beyond the spec's minimum).
- **Placeholder scan:** none.
- **Type consistency:** `CalendarViewName` already includes `'timeGridThreeDay'` (`CalendarToolbar.tsx:6`); `isDateWithinTripRange` is already imported in `TripCalendarView.tsx:17`; no new interfaces.
