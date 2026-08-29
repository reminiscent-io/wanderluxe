import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { visglMock } from '@/test/visglMock';
import { buildTripStops, buildDayFrames, tripDatesFrom } from './buildStops';
import type { TripMapData } from './useTripMapData';
import type { PlaceCoordinateMap, ResolvedPlace } from './usePlaceCoordinates';
import TripMapView from './TripMapView';

vi.mock('@vis.gl/react-google-maps', () => visglMock());
vi.mock('./useMapRealtime', () => ({ useMapRealtime: () => ({ isSubscribed: true }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/utils/googleMapsLoader', () => ({ getPhotoUrl: (): string | null => null }));
vi.mock('@/components/trip/day/activities/ActivityDialog', () => ({
  default: () => <div data-testid="activity-dialog" />,
}));
vi.mock('@/components/trip/dining/RestaurantReservationDialog', () => ({
  default: () => <div data-testid="dining-dialog" />,
}));
vi.mock('@/components/trip/accommodation/AccommodationDialog', () => ({
  default: () => <div data-testid="accommodation-dialog" />,
}));
vi.mock('@/components/trip/transportation/TransportationDialog', () => ({
  default: () => <div data-testid="transportation-dialog" />,
}));

let mockCoords: PlaceCoordinateMap = new Map();
vi.mock('./usePlaceCoordinates', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./usePlaceCoordinates')>();
  return { ...actual, usePlaceCoordinates: () => ({ data: mockCoords, isLoading: false }) };
});

let mockData: TripMapData = { stops: [], frames: [], dates: [], isLoading: false };
vi.mock('./useTripMapData', () => ({ useTripMapData: () => mockData }));

/* ------------------------------------------------------------------ */

const PARIS = { lat: 48.8566, lng: 2.3522 };
const LOUVRE = { lat: 48.8606, lng: 2.3376 };
const HOTEL = { lat: 48.8656, lng: 2.3212 };

const place = (lat: number, lng: number): ResolvedPlace => ({
  lat,
  lng,
  placeId: null,
  name: null,
  address: null,
  photoRef: null,
});

/** A two-day Paris trip: flight in, a museum, dinner, a hotel across both days. */
function buildFixture() {
  const days = [
    {
      day_id: 'd1',
      date: '2026-05-04',
      activities: [
        {
          id: 'a1',
          title: 'Louvre Museum',
          start_time: '14:00',
          order_index: 0,
          location_place_id: 'louvre',
        },
      ],
    },
    { day_id: 'd2', date: '2026-05-05', activities: [] },
  ];

  const stops = buildTripStops({
    days,
    reservations: [
      {
        id: 'r1',
        day_id: 'd1',
        restaurant_name: 'Le Comptoir',
        reservation_time: '12:00',
        end_time: null,
        place_id: 'comptoir',
        order_index: 0,
      },
    ] as never,
    stays: [
      {
        stay_id: 's1',
        hotel: 'Hotel Danieli',
        hotel_checkin_date: '2026-05-04',
        hotel_checkout_date: '2026-05-06',
        checkin_time: '15:00',
        checkout_time: '11:00',
        hotel_place_id: 'danieli',
      },
    ] as never,
    transportation: [
      {
        id: 't1',
        type: 'flight',
        start_date: '2026-05-04',
        start_time: '08:00',
        end_time: '10:00',
        departure_location: 'JFK',
        arrival_location: 'Charles de Gaulle Airport (CDG)',
      },
    ] as never,
  });

  const dates = tripDatesFrom(days, stops);
  return { stops, frames: buildDayFrames(stops, dates), dates, isLoading: false };
}

const renderView = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TripMapView
        tripId="trip-1"
        tripDates={{ arrival_date: '2026-05-04', departure_date: '2026-05-06' }}
        destination="Paris"
        canEdit
      />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key');
  mockData = buildFixture() as never;
  mockCoords = new Map([
    ['place:louvre', place(LOUVRE.lat, LOUVRE.lng)],
    ['place:comptoir', place(PARIS.lat, PARIS.lng)],
    ['place:danieli', place(HOTEL.lat, HOTEL.lng)],
    ['text:jfk airport', place(40.6446, -73.7797)],
    ['text:cdg airport', place(49.0097, 2.5479)],
  ]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('TripMapView', () => {
  it('renders one map and a day chip per trip date', () => {
    renderView();

    expect(screen.getAllByTestId('google-map')).toHaveLength(1);
    expect(screen.getByRole('tab', { name: /whole trip/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Mon 4/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Tue 5/ })).toBeInTheDocument();
  });

  it('defaults to whole-trip mode and lists every stop chronologically', () => {
    renderView();

    const list = screen.getByTestId('map-stop-list');
    const labels = within(list)
      .getAllByRole('button')
      .map((b) => b.textContent);

    // Flight out, flight in, lunch, check-in — in wall-clock order.
    expect(labels[0]).toContain('JFK');
    expect(labels[1]).toContain('Charles de Gaulle');
    expect(labels[2]).toContain('Le Comptoir');
    expect(labels[3]).toContain('Louvre Museum');
    expect(labels[4]).toContain('Hotel Danieli');
  });

  it('puts the hotel check-in straight after the noon reservation', () => {
    renderView();

    const list = screen.getByTestId('map-stop-list');
    const labels = within(list).getAllByRole('button').map((b) => b.textContent ?? '');
    const lunch = labels.findIndex((l) => l.includes('Le Comptoir'));
    const checkin = labels.findIndex((l) => l.includes('Check in'));

    expect(checkin).toBeGreaterThan(lunch);
    expect(labels[checkin]).toContain('Hotel Danieli');
  });

  it('draws every leg as a sampled arc on the sphere', () => {
    renderView();

    // Legs are bowed arcs (many sampled points, not a two-point chord) so
    // nearby out-and-back legs separate instead of overlapping; drawing each
    // sub-segment geodesically keeps antimeridian hops from streaking around
    // the world.
    const lines = screen.getAllByTestId('polyline');
    expect(lines.length).toBeGreaterThan(0);
    lines.forEach((l) => {
      expect(l.dataset.geodesic).toBe('true');
      expect(Number(l.dataset.points)).toBeGreaterThan(2);
    });
  });

  it('summarises stop count and bird’s-eye distance', () => {
    renderView();
    const summary = screen.getByTestId('map-day-summary').textContent ?? '';

    expect(summary).toMatch(/stops/);
    expect(summary).toMatch(/bird’s-eye/);
  });

  it('filters to a single day when a day chip is chosen', () => {
    renderView();
    fireEvent.click(screen.getByRole('tab', { name: /Tue 5/ }));

    const list = screen.getByTestId('map-stop-list');
    const labels = within(list).getAllByRole('button').map((b) => b.textContent ?? '');

    // 5 May is a middle night of the stay: hotel at both ends, nothing between.
    expect(labels.every((l) => l.includes('Hotel Danieli'))).toBe(true);
    expect(screen.queryByText(/Louvre/)).not.toBeInTheDocument();
  });

  it('opens the matching edit dialog when a stop is chosen and edited', () => {
    renderView();

    const list = screen.getByTestId('map-stop-list');
    fireEvent.click(within(list).getByText('Louvre Museum'));

    const popup = screen.getByRole('dialog');
    fireEvent.click(within(popup).getByRole('button', { name: /edit/i }));

    expect(screen.getByTestId('activity-dialog')).toBeInTheDocument();
  });

  it('toggles satellite imagery to hybrid, which keeps labels', () => {
    renderView();
    expect(screen.getByTestId('google-map').dataset.mapType).toBe('roadmap');

    fireEvent.click(screen.getByRole('button', { name: /satellite/i }));
    expect(screen.getByTestId('google-map').dataset.mapType).toBe('hybrid');
  });

  it('keeps stops that could not be placed in the list, marked in situ', () => {
    mockCoords = new Map([['place:louvre', place(LOUVRE.lat, LOUVRE.lng)]]);
    renderView();

    // Still listed exactly once, not dropped and not duplicated into a group.
    expect(screen.getAllByText('Le Comptoir')).toHaveLength(1);
    expect(screen.getByTestId('map-unplaced-count').textContent).toMatch(/not on the map/i);
    expect(screen.getAllByText(/couldn’t find this place/).length).toBeGreaterThan(0);
  });

  it('offers to add a location to an unplaceable stop', () => {
    mockCoords = new Map();
    renderView();

    fireEvent.click(screen.getByRole('button', { name: /add a location to Le Comptoir/i }));
    expect(screen.getByTestId('dining-dialog')).toBeInTheDocument();
  });

  it('explains itself when no API key is configured', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
    renderView();

    expect(screen.getByText(/Map unavailable/i)).toBeInTheDocument();
    expect(screen.queryByTestId('google-map')).not.toBeInTheDocument();
  });
});
