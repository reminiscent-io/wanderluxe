import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TripCalendarView from './TripCalendarView';

vi.mock('./useCalendarRealtime', () => ({ useCalendarRealtime: () => ({ isSubscribed: true }) }));
vi.mock('./useCalendarEvents', () => ({
  useCalendarEvents: () => ({
    isLoading: false,
    events: [{ id: 'activity:a1', title: 'Louvre', start: '2026-06-30T14:30:00', end: '2026-06-30T16:00:00', allDay: false, extendedProps: { entityType: 'activity', record: { id: 'a1' } } }],
  }),
}));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

describe('TripCalendarView', () => {
  it('renders a mapped event title', async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <TripCalendarView tripId="t1" tripDates={{ arrival_date: '2026-06-30', departure_date: '2026-07-06' }} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Louvre')).toBeInTheDocument();
  });
});
