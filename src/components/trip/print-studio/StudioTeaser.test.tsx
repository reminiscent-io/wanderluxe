import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StudioTeaser from './StudioTeaser';
import { PRO_FEATURES } from './ProFeatureList';
import { printTripDataKey } from './printTripData';
import type { PdfTripData } from '@/services/pdf/types';

const fetchPdfTripData = vi.fn();
vi.mock('@/services/pdf/data', () => ({
  fetchPdfTripData: (...args: unknown[]) => fetchPdfTripData(...args),
}));

const tripData: PdfTripData = {
  destination: 'Lisbon',
  dateRange: 'May 4 – May 11',
  coverImageDataUri: '',
  coverImageRequested: false,
  days: [
    {
      date: '2026-05-04',
      title: 'Arrival',
      items: [
        { type: 'transportation', title: 'Flight lands, LIS', time: '2:10 PM', sortKey: 850 },
        { type: 'accommodation', title: 'Check in, Bairro Alto', time: '4:00 PM', sortKey: 960 },
      ],
    },
  ],
  stays: [],
  transports: [],
  diningRefs: [],
  budgetData: { budget: null, categories: [], total: 0 },
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
  fetchPdfTripData.mockReset().mockResolvedValue(tripData);
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
    fetchPdfTripData.mockRejectedValue(new Error('offline'));
    renderTeaser();
    await waitFor(() => expect(screen.getByText(PRO_FEATURES[0])).toBeInTheDocument());
    expect(screen.queryByText('Flight lands, LIS')).not.toBeInTheDocument();
  });

  it('keeps a loaded preview when a background refetch fails', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderTeaser(client);
    await waitFor(() => expect(screen.getByText('Flight lands, LIS')).toBeInTheDocument());

    fetchPdfTripData.mockRejectedValue(new Error('offline'));
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
