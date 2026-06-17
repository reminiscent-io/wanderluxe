import { describe, it, expect, vi } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Trip } from '@/types/trip';

// ─── Mocks ──────────────────────────────────────────────────────────────────
// TripCard pulls in Supabase + weather; stub them so the test stays focused on
// the crawlable-link behaviour that drives SEO indexing.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: null }, error: null }),
      }),
    },
  },
}));

vi.mock('@/hooks/useWeather', () => ({
  useWeather: () => ({ data: undefined }),
  getWeatherForDate: () => undefined,
  getWeatherEmoji: () => '',
}));

// Drives the homepage featured-destinations section.
const mockUsePublicTrips = vi.fn();
vi.mock('@/hooks/usePublicTrips', () => ({
  usePublicTrips: () => mockUsePublicTrips(),
}));

import TripCard from '@/components/trip/TripCard';
import FeaturedDestinations from '@/components/landing/FeaturedDestinations';

// ─── Fixtures ─────────────────────────────────────────────────────────────—─
const makeTrip = (overrides: Partial<Trip> = {}): Trip =>
  ({
    trip_id: '11111111-1111-1111-1111-111111111111',
    user_id: 'user-1',
    destination: 'Marrakech, Morocco',
    start_date: '2026-04-01',
    end_date: '2026-04-06',
    arrival_date: '2026-04-01',
    departure_date: '2026-04-06',
    cover_image_url: 'https://images.unsplash.com/photo-marrakech',
    created_at: '2026-01-01',
    hidden: false,
    budget: null,
    is_public: true,
    slug: 'marrakech-morocco-5-nights',
    ...overrides,
  }) as Trip;

const renderWithProviders = (ui: ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
};

// ─── Tests ────────────────────────────────────────────────────────────────—─
describe('SEO internal linking — crawlable <a href> to destination pages', () => {
  it('renders a real, crawlable anchor when TripCard is given linkTo', () => {
    renderWithProviders(
      <TripCard trip={makeTrip()} isExample linkTo="/explore/marrakech-morocco-5-nights" />,
    );

    const link = screen.getByRole('link', { name: /Marrakech, Morocco/i });
    expect(link).toHaveAttribute('href', '/explore/marrakech-morocco-5-nights');
    // Descriptive anchor text — not a generic "View"/"Learn more".
    expect(link).toHaveAccessibleName(/Marrakech, Morocco — 5 nights/i);
  });

  it('does NOT emit a crawlable anchor without linkTo (legacy onClick card)', () => {
    renderWithProviders(<TripCard trip={makeTrip()} isExample />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('links every featured destination from the homepage section', () => {
    mockUsePublicTrips.mockReturnValue({
      data: [
        makeTrip(),
        makeTrip({
          trip_id: '22222222-2222-2222-2222-222222222222',
          destination: 'Tokyo, Japan',
          slug: 'tokyo-japan-6-nights',
          arrival_date: '2026-05-01',
          departure_date: '2026-05-07',
        }),
      ],
    });

    renderWithProviders(<FeaturedDestinations />);

    expect(screen.getByRole('link', { name: /Marrakech, Morocco/i })).toHaveAttribute(
      'href',
      '/explore/marrakech-morocco-5-nights',
    );
    expect(screen.getByRole('link', { name: /Tokyo, Japan/i })).toHaveAttribute(
      'href',
      '/explore/tokyo-japan-6-nights',
    );
    // And a path back to the hub.
    expect(
      screen.getAllByRole('link', { name: /View all destinations/i }).length,
    ).toBeGreaterThan(0);
  });

  it('renders nothing when there are no public trips', () => {
    mockUsePublicTrips.mockReturnValue({ data: [] });
    const { container } = renderWithProviders(<FeaturedDestinations />);
    expect(container).toBeEmptyDOMElement();
  });
});
