import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

let mockAuth: { session: unknown; profileLoaded: boolean } = {
  session: null,
  profileLoaded: true,
};
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

let mockTripQuery: Record<string, unknown> = {
  trip: null,
  tripLoading: false,
  tripError: null,
  previousTrip: null,
};
vi.mock('@/hooks/useTripQuery', () => ({
  useTripQuery: () => mockTripQuery,
  useTripIdBySlug: (slug?: string) => ({
    tripId: slug ? 'trip-from-slug' : undefined,
    isLoading: false,
  }),
}));

let mockPermissions: Record<string, unknown> = {
  canView: false,
  canEdit: false,
  isOwner: false,
  permissionLevel: null,
  isLoading: false,
};
vi.mock('@/hooks/use-trip-permissions', () => ({
  useTripPermissions: () => mockPermissions,
}));

vi.mock('@/components/trip/details/useTripSubscription', () => ({
  useTripSubscription: (): void => undefined,
}));

// Heavy children — irrelevant to routing/guard behaviour, stubbed for speed.
vi.mock('@/components/trip/HeroSection', () => ({ default: () => <div data-testid="hero" /> }));
vi.mock('@/components/layout/Sidebar', () => ({ default: () => <div /> }));
vi.mock('@/components/layout/BottomNavigation', () => ({ default: () => <div /> }));
vi.mock('@/components/layout/QuickAddSheet', () => ({ default: () => <div /> }));
vi.mock('@/components/trip/TimelineView', () => ({ default: () => <div data-testid="timeline" /> }));
vi.mock('@/components/trip/BudgetView', () => ({ default: () => <div /> }));
vi.mock('@/components/trip/BookingView', () => ({ default: () => <div /> }));
vi.mock('@/components/trip/ai-assistant/AIAssistantPanel', () => ({ default: () => <div /> }));
vi.mock('@/components/trip/ai-assistant/AIAssistantDrawer', () => ({ default: () => <div /> }));
vi.mock('@/components/SEO', () => ({ default: (): null => null, SITE_URL: 'https://wanderluxe.io' }));

// ─── Helpers ────────────────────────────────────────────────────────────────

const TRIP_ID = 'a4268df2-d4a5-44f6-b23b-87cf6e96aee2';
const TRIP_PATH = `/trip/${TRIP_ID}/timeline`;
const AUTH_ROUTE = '/auth';
const REPLACE = { replace: true };

const A_TRIP = {
  trip_id: TRIP_ID,
  destination: 'Gregg in Austria',
  primary_destination: 'Elmau, Austria',
  arrival_date: '2026-08-15',
  departure_date: '2026-08-22',
  cover_image_url: null as string | null,
  is_public: false,
};

let TripDetails: React.ComponentType;
beforeEach(async () => {
  const mod = await import('./TripDetails');
  TripDetails = mod.default;
});

function renderAt(path: string) {
  // The skeleton pulls in navigation chrome that reads from React Query.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const tree = () => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/trip/:tripId/*" element={<TripDetails />} />
          <Route path="/explore:slug/*" element={<TripDetails />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  const utils = render(tree());
  // Re-render the same tree so the component picks up changed mock state —
  // a fresh element each time, or React bails out on identity.
  return { ...utils, refresh: () => utils.rerender(tree()) };
}

describe('TripDetails — signed-out access to a shared trip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockAuth = { session: null, profileLoaded: true };
    mockTripQuery = { trip: null, tripLoading: false, tripError: null, previousTrip: null };
    mockPermissions = {
      canView: false, canEdit: false, isOwner: false, permissionLevel: null, isLoading: false,
    };
  });

  it('sends a signed-out visitor to /auth instead of a dead-end error', async () => {
    renderAt(TRIP_PATH);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(AUTH_ROUTE, REPLACE);
    });
  });

  it('remembers the exact trip URL so sign-in returns the visitor to it', async () => {
    renderAt(TRIP_PATH);

    await waitFor(() => {
      expect(sessionStorage.getItem('pendingRedirect')).toBe(TRIP_PATH);
    });
  });

  it('never flashes the "could not be found" error on the way to /auth', async () => {
    renderAt(TRIP_PATH);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(screen.queryByText(/could not be found/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/unable to load trip/i)).not.toBeInTheDocument();
  });

  it('waits for auth to resolve before redirecting, so a signed-in user is not bounced', async () => {
    // profileLoaded false = AuthContext has not settled yet.
    mockAuth = { session: null, profileLoaded: false };
    renderAt(TRIP_PATH);

    await new Promise((r) => setTimeout(r, 50));
    expect(mockNavigate).not.toHaveBeenCalledWith(AUTH_ROUTE, REPLACE);
  });

  it('does not accuse a visitor of lacking access while auth is still resolving', async () => {
    // Following a reminder email loads the page cold: the permission check can
    // come back empty before the session is restored. Hold, do not refuse.
    mockAuth = { session: null, profileLoaded: false };
    renderAt(TRIP_PATH);

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/access restricted/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/could not be found/i)).not.toBeInTheDocument();
  });

  it('shows the trip once a late-restored session grants access', async () => {
    mockAuth = { session: null, profileLoaded: false };
    const { refresh } = renderAt(TRIP_PATH);
    expect(screen.queryByTestId('timeline')).not.toBeInTheDocument();

    // Session comes back and the permission check re-runs with it.
    mockAuth = { session: { user: { id: 'u1' } }, profileLoaded: true };
    mockPermissions = { ...mockPermissions, canView: true, canEdit: true };
    mockTripQuery = { ...mockTripQuery, trip: A_TRIP };
    refresh();

    await waitFor(() => {
      expect(screen.getByTestId('timeline')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(AUTH_ROUTE, REPLACE);
  });

  it('leaves public trips alone for anonymous visitors', async () => {
    mockPermissions = { ...mockPermissions, canView: true };
    mockTripQuery = { ...mockTripQuery, trip: { ...A_TRIP, is_public: true } };
    renderAt(TRIP_PATH);

    await new Promise((r) => setTimeout(r, 50));
    expect(mockNavigate).not.toHaveBeenCalledWith(AUTH_ROUTE, REPLACE);
  });

  it('does not send explore visitors to sign-in', async () => {
    renderAt('/explore/vienna-in-spring/timeline');

    await new Promise((r) => setTimeout(r, 50));
    expect(mockNavigate).not.toHaveBeenCalledWith(AUTH_ROUTE, REPLACE);
  });
});

describe('TripDetails — signed-in visitor without access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockAuth = { session: { user: { id: 'u1' } }, profileLoaded: true };
    // RLS hides the row from someone without access, so the query is empty too —
    // the access screen must win over the "not found" branch.
    mockTripQuery = { trip: null, tripLoading: false, tripError: null, previousTrip: null };
    mockPermissions = {
      canView: false, canEdit: false, isOwner: false, permissionLevel: null, isLoading: false,
    };
  });

  it('shows "Access Restricted" rather than "could not be found"', async () => {
    renderAt(TRIP_PATH);

    await waitFor(() => {
      expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/could not be found/i)).not.toBeInTheDocument();
  });

  it('does not redirect a signed-in user to /auth', async () => {
    renderAt(TRIP_PATH);

    await waitFor(() => expect(screen.getByText(/access restricted/i)).toBeInTheDocument());
    expect(mockNavigate).not.toHaveBeenCalledWith(AUTH_ROUTE, REPLACE);
  });
});
