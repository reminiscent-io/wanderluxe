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
