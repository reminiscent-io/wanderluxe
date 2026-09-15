import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StudioTeaser from './StudioTeaser';
import { PRO_FEATURES } from './ProFeatureList';

const fetchPdfTripData = vi.fn();
vi.mock('@/services/pdf/data', () => ({
  fetchPdfTripData: (...args: unknown[]) => fetchPdfTripData(...args),
}));

const tripData = {
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

const renderTeaser = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StudioTeaser tripId="trip-1" destination="Lisbon" />
    </QueryClientProvider>
  );
};

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
});
