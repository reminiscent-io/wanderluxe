import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import type { EventInput } from '@fullcalendar/core';
import TripCalendarView from './TripCalendarView';

const LOUVRE: EventInput = { id: 'activity:a1', title: 'Louvre', start: '2030-03-01T14:30:00', end: '2030-03-01T16:00:00', allDay: false, extendedProps: { entityType: 'activity', record: { id: 'a1' } } };
let mockEvents: EventInput[] = [LOUVRE];

vi.mock('./useCalendarRealtime', () => ({ useCalendarRealtime: () => ({ isSubscribed: true }) }));
vi.mock('./useCalendarEvents', () => ({
  useCalendarEvents: () => ({ isLoading: false, events: mockEvents }),
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

const slot = (container: HTMLElement, time: string) =>
  container.querySelector(`.fc-timegrid-slot[data-time="${time}"]`);

describe('TripCalendarView', () => {
  beforeEach(() => {
    mockEvents = [LOUVRE];
  });

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

  it('starts the time grid at 7am by default', () => {
    const { container } = renderCalendar(FUTURE_TRIP);
    expect(slot(container, '07:00:00')).toBeInTheDocument();
    expect(slot(container, '06:00:00')).not.toBeInTheDocument();
  });

  it('lowers the grid start to fit an event that begins before 7am', () => {
    mockEvents = [LOUVRE, { id: 'transportation:t1', title: 'Early flight', start: '2030-03-01T05:45:00', allDay: false, extendedProps: { entityType: 'transportation', record: { id: 't1' } } }];
    const { container } = renderCalendar(FUTURE_TRIP);
    expect(slot(container, '05:00:00')).toBeInTheDocument();
    expect(slot(container, '04:00:00')).not.toBeInTheDocument();
  });

  it('ends the time grid at 10pm by default', () => {
    const { container } = renderCalendar(FUTURE_TRIP);
    expect(slot(container, '21:30:00')).toBeInTheDocument();
    expect(slot(container, '22:00:00')).not.toBeInTheDocument();
  });

  it('raises the grid end to fit an event that runs past 10pm', () => {
    mockEvents = [LOUVRE, { id: 'reservation:r1', title: 'Late dinner', start: '2030-03-01T21:30:00', end: '2030-03-01T23:00:00', allDay: false, extendedProps: { entityType: 'dining', record: { id: 'r1' } } }];
    const { container } = renderCalendar(FUTURE_TRIP);
    expect(slot(container, '22:30:00')).toBeInTheDocument();
    expect(slot(container, '23:00:00')).not.toBeInTheDocument();
  });

  it('expands to the full 24-hour day and collapses back', () => {
    const { container } = renderCalendar(FUTURE_TRIP);
    fireEvent.click(screen.getByRole('button', { name: 'Show full day' }));
    expect(slot(container, '00:00:00')).toBeInTheDocument();
    expect(slot(container, '23:30:00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide extra hours' }));
    expect(slot(container, '00:00:00')).not.toBeInTheDocument();
    expect(slot(container, '23:30:00')).not.toBeInTheDocument();
    expect(slot(container, '07:00:00')).toBeInTheDocument();
  });

  it('hides the toggle when nothing is collapsed', () => {
    mockEvents = [
      { id: 'activity:a2', title: 'Midnight snack', start: '2030-03-01T00:30:00', allDay: false, extendedProps: { entityType: 'activity', record: { id: 'a2' } } },
      { id: 'activity:a3', title: 'Stargazing', start: '2030-03-01T23:15:00', allDay: false, extendedProps: { entityType: 'activity', record: { id: 'a3' } } },
    ];
    renderCalendar(FUTURE_TRIP);
    expect(screen.queryByRole('button', { name: 'Show full day' })).not.toBeInTheDocument();
  });

  it('hides the toggle in month view', () => {
    renderCalendar(FUTURE_TRIP);
    fireEvent.click(screen.getByRole('button', { name: 'Month' }));
    expect(screen.queryByRole('button', { name: 'Show full day' })).not.toBeInTheDocument();
  });
});
