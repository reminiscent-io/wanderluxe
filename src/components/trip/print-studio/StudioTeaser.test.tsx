import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StudioTeaser from './StudioTeaser';
import { PRO_FEATURES } from './ProFeatureList';
import { printTripDataKey } from './printTripData';
import type { PrintItem, PrintTrip } from '@/lib/printDesign/trip';

// The data module reaches the Supabase client, which validates env at import.
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

const fetchPrintTripData = vi.fn();
vi.mock('./printTripData', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./printTripData')>()),
  fetchPrintTripData: (...args: unknown[]) => fetchPrintTripData(...args),
}));

const item = (title: string, time: string, sortKey: number, kind: 'journey' | 'stay'): PrintItem => ({
  kind,
  title,
  time,
  endTime: '',
  links: [],
  facts: [],
  sortKey,
});

const tripData: PrintTrip = {
  destination: 'Lisbon',
  startDate: '2026-05-04',
  endDate: '2026-05-11',
  dateRange: 'May 4–11, 2026',
  nights: 7,
  timezone: null,
  days: [
    {
      date: '2026-05-04',
      index: 0,
      weekday: 'Monday',
      title: 'Arrival',
      items: [item('Flight lands, LIS', '2:10 PM', 850, 'journey'), item('Check in, Bairro Alto', '4:00 PM', 960, 'stay')],
    },
  ],
  stays: [],
  journeys: [],
  reservations: [],
  budget: { budget: null, categories: [], total: 0 },
};

const renderTeaser = (
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
) =>
  render(
    <QueryClientProvider client={client}>
      <StudioTeaser tripId="trip-1" destination="Lisbon" />
    </QueryClientProvider>
  );

beforeEach(() => {
  fetchPrintTripData.mockReset().mockResolvedValue(tripData);
});

describe('StudioTeaser', () => {
  it('shows the traveler’s own trip, titled with the destination', async () => {
    renderTeaser();
    await waitFor(() => expect(screen.getByText('Lisbon')).toBeInTheDocument());
    expect(screen.getByText('Flight lands, LIS')).toBeInTheDocument();
  });

  it('describes the picture for assistive tech', async () => {
    renderTeaser();
    await waitFor(() =>
      expect(screen.getByText(/preview of this trip in a sample print studio style/i)).toBeInTheDocument()
    );
  });

  it('falls back to the feature list when trip data cannot be loaded', async () => {
    fetchPrintTripData.mockRejectedValue(new Error('offline'));
    renderTeaser();
    await waitFor(() => expect(screen.getByText(PRO_FEATURES[0])).toBeInTheDocument());
    expect(screen.queryByText('Flight lands, LIS')).not.toBeInTheDocument();
  });

  it('keeps a loaded preview when a background refetch fails', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderTeaser(client);
    await waitFor(() => expect(screen.getByText('Flight lands, LIS')).toBeInTheDocument());

    fetchPrintTripData.mockRejectedValue(new Error('offline'));
    await act(() => client.refetchQueries());
    // React Query tells its observers about the failure on a zero-delay timer.
    // Without letting that land, the assertions below read the page from
    // before the refetch failed and pass whatever the component does.
    await waitFor(() =>
      expect(client.getQueryState(printTripDataKey('trip-1', null))?.status).toBe('error')
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));

    expect(screen.getByText('Flight lands, LIS')).toBeInTheDocument();
    expect(screen.queryByText(PRO_FEATURES[0])).not.toBeInTheDocument();
  });
});
