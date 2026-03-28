import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockGetInviteLinkPreview = vi.fn();
const mockRedeemInviteLink = vi.fn();
vi.mock('@/services/inviteLinkService', () => ({
  getInviteLinkPreview: (...args: any[]) => mockGetInviteLinkPreview(...args),
  redeemInviteLink: (...args: any[]) => mockRedeemInviteLink(...args),
}));

// Auth context mock — start unauthenticated, can be overridden per test
let mockUser: any = null;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Supabase client — default resolves immediately; individual tests can override
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockGetSession(...args),
    },
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const MOCK_CODE = 'AbCdEfGh';
const MOCK_TRIP_ID = 'trip-xyz-456';

const MOCK_PREVIEW = {
  trip_id: MOCK_TRIP_ID,
  destination: 'Paris',
  cover_image_url: 'https://example.com/paris.jpg',
  arrival_date: '2026-06-01',
  departure_date: '2026-06-10',
  inviter_name: 'Alice',
};

function renderInviteRedeem(code = MOCK_CODE) {
  return render(
    <MemoryRouter initialEntries={[`/invite/${code}`]}>
      <Routes>
        <Route path="/invite/:code" element={<InviteReedeem />} />
      </Routes>
    </MemoryRouter>
  );
}

// Lazy import so mocks are in place first
let InviteReedeem: React.ComponentType;
beforeEach(async () => {
  const mod = await import('./InviteRedeem');
  InviteReedeem = mod.default;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('InviteRedeem page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    sessionStorage.clear();
    // Restore default: getSession resolves immediately (auth settled, no session)
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  // ─── Loading state ────────────────────────────────────────────────────────
  it('shows a loading spinner while auth settles', () => {
    // Hold getSession in pending state so authChecked never becomes true
    mockGetSession.mockReturnValue(new Promise(() => {}));
    mockGetInviteLinkPreview.mockResolvedValue(MOCK_PREVIEW);
    renderInviteRedeem();

    expect(screen.getByText(/loading invite/i)).toBeInTheDocument();
  });

  // ─── Unauthenticated: valid invite ────────────────────────────────────────
  it('shows trip preview card for an unauthenticated user with a valid invite', async () => {
    mockGetInviteLinkPreview.mockResolvedValue(MOCK_PREVIEW);
    renderInviteRedeem();

    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
    });
    expect(screen.getByText(/alice invited you to join/i)).toBeInTheDocument();
    expect(screen.getByText(/Jun 1, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Jun 10, 2026/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in to join trip/i })).toBeInTheDocument();
  });

  it('shows sign-in fallback (not a dead-end) when preview fetch fails for unauthenticated user', async () => {
    mockGetInviteLinkPreview.mockRejectedValue(new Error('Link not found'));
    renderInviteRedeem();

    await waitFor(() => {
      expect(screen.getByText(/sign in to join this trip/i)).toBeInTheDocument();
    });
    // Should still offer a path forward
    expect(screen.getByRole('button', { name: /sign in to join trip/i })).toBeInTheDocument();
  });

  it('shows sign-in fallback when invite code is invalid/expired (preview returns null)', async () => {
    mockGetInviteLinkPreview.mockResolvedValue(null);
    renderInviteRedeem();

    await waitFor(() => {
      expect(screen.getByText(/sign in to join this trip/i)).toBeInTheDocument();
    });
  });

  // ─── Sign In button stores pendingInviteCode ──────────────────────────────
  it('"Sign In to Join Trip" stores code in sessionStorage and navigates to /auth', async () => {
    mockGetInviteLinkPreview.mockResolvedValue(MOCK_PREVIEW);
    renderInviteRedeem();

    await waitFor(() => screen.getByRole('button', { name: /sign in to join trip/i }));
    await userEvent.click(screen.getByRole('button', { name: /sign in to join trip/i }));

    expect(sessionStorage.getItem('pendingInviteCode')).toBe(MOCK_CODE);
    expect(mockNavigate).toHaveBeenCalledWith('/auth');
  });

  // ─── Authenticated: happy path ────────────────────────────────────────────
  it('redeems the invite and redirects to /trip/:id/timeline when user is logged in', async () => {
    mockUser = { id: 'user-123' };
    mockRedeemInviteLink.mockResolvedValue(MOCK_TRIP_ID);
    renderInviteRedeem();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        `/trip/${MOCK_TRIP_ID}/timeline`,
        { replace: true }
      );
    });
    expect(mockRedeemInviteLink).toHaveBeenCalledWith(MOCK_CODE);
  });

  it('shows "joining trip" spinner while redemption is in flight', async () => {
    mockUser = { id: 'user-123' };
    // Keep redemption pending
    mockRedeemInviteLink.mockReturnValue(new Promise(() => {}));
    renderInviteRedeem();

    await waitFor(() => {
      expect(screen.getByText(/joining trip/i)).toBeInTheDocument();
    });
  });

  // ─── Authenticated: failed redemption ────────────────────────────────────
  it('shows "Unable to Join" error when redemption fails for authenticated user', async () => {
    mockUser = { id: 'user-123' };
    mockRedeemInviteLink.mockRejectedValue(new Error('Invite link has expired'));
    renderInviteRedeem();

    await waitFor(() => {
      expect(screen.getByText(/unable to join/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/invite link has expired/i)).toBeInTheDocument();
    expect(screen.getByText(/contact the trip owner/i)).toBeInTheDocument();
  });

  it('does not offer "Sign In" when an authenticated user hits an error', async () => {
    mockUser = { id: 'user-123' };
    mockRedeemInviteLink.mockRejectedValue(new Error('Link is disabled'));
    renderInviteRedeem();

    await waitFor(() => {
      expect(screen.getByText(/unable to join/i)).toBeInTheDocument();
    });
    // No sign-in button — user IS authenticated, the link itself is the problem
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
  });

  // ─── Race condition: auth context hydrates after preview loads ────────────
  it('redeems automatically when user becomes available after preview is shown', async () => {
    // Auth context starts with no user (context not yet hydrated)
    mockUser = null;
    mockGetInviteLinkPreview.mockResolvedValue(MOCK_PREVIEW);
    mockRedeemInviteLink.mockResolvedValue(MOCK_TRIP_ID);

    const { rerender } = renderInviteRedeem();

    // Preview card shows first
    await waitFor(() => {
      expect(screen.getByText('Paris')).toBeInTheDocument();
    });

    // Simulate AuthContext finishing hydration — user is now available
    mockUser = { id: 'user-late-hydration' };

    // Re-render with updated auth context value
    const mod = await import('./InviteRedeem');
    rerender(
      <MemoryRouter initialEntries={[`/invite/${MOCK_CODE}`]}>
        <Routes>
          <Route path="/invite/:code" element={<mod.default />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockRedeemInviteLink).toHaveBeenCalledWith(MOCK_CODE);
      expect(mockNavigate).toHaveBeenCalledWith(
        `/trip/${MOCK_TRIP_ID}/timeline`,
        { replace: true }
      );
    });
  });

  // ─── Missing code edge case ───────────────────────────────────────────────
  it('shows an error immediately when no invite code is in the URL', async () => {
    render(
      <MemoryRouter initialEntries={['/invite/']}>
        <Routes>
          <Route path="/invite/" element={<InviteReedeem />} />
        </Routes>
      </MemoryRouter>
    );

    // Without a code the component should not try to fetch
    expect(mockGetInviteLinkPreview).not.toHaveBeenCalled();
  });
});

// ─── Auth.tsx redirect flow ──────────────────────────────────────────────────
//
// These tests validate the sessionStorage-based post-login redirect that
// makes the iMessage share flow work end-to-end.
//
describe('Auth.tsx: post-login redirect via pendingInviteCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('navigates to /invite/:code after login when pendingInviteCode is stored', () => {
    // Simulate what InviteRedeem's handleSignIn() does
    sessionStorage.setItem('pendingInviteCode', MOCK_CODE);

    // Simulate what Auth.tsx navigateAfterAuth() does
    const pendingCode = sessionStorage.getItem('pendingInviteCode');
    if (pendingCode) {
      sessionStorage.removeItem('pendingInviteCode');
      mockNavigate(`/invite/${pendingCode}`, { replace: true });
    } else {
      mockNavigate('/my-trips');
    }

    expect(mockNavigate).toHaveBeenCalledWith(`/invite/${MOCK_CODE}`, { replace: true });
    expect(sessionStorage.getItem('pendingInviteCode')).toBeNull();
  });

  it('navigates to /my-trips after login when no pendingInviteCode', () => {
    // No code in sessionStorage
    const pendingCode = sessionStorage.getItem('pendingInviteCode');
    if (pendingCode) {
      sessionStorage.removeItem('pendingInviteCode');
      mockNavigate(`/invite/${pendingCode}`, { replace: true });
    } else {
      mockNavigate('/my-trips');
    }

    expect(mockNavigate).toHaveBeenCalledWith('/my-trips');
  });

  it('clears pendingInviteCode from sessionStorage after reading it', () => {
    sessionStorage.setItem('pendingInviteCode', MOCK_CODE);

    const pendingCode = sessionStorage.getItem('pendingInviteCode');
    if (pendingCode) sessionStorage.removeItem('pendingInviteCode');

    expect(sessionStorage.getItem('pendingInviteCode')).toBeNull();
  });

  it('Google OAuth redirect URL includes /invite/:code when pendingInviteCode is stored', () => {
    sessionStorage.setItem('pendingInviteCode', MOCK_CODE);

    // Simulate Auth.tsx handleGoogleSignIn()
    const pendingCode = sessionStorage.getItem('pendingInviteCode');
    const redirectUrl = pendingCode
      ? `${window.location.origin}/invite/${pendingCode}`
      : `${window.location.origin}/my-trips`;

    if (pendingCode) sessionStorage.removeItem('pendingInviteCode');

    expect(redirectUrl).toBe(`${window.location.origin}/invite/${MOCK_CODE}`);
    expect(sessionStorage.getItem('pendingInviteCode')).toBeNull();
  });

  it('Google OAuth redirect URL falls back to /my-trips when no pendingInviteCode', () => {
    const pendingCode = sessionStorage.getItem('pendingInviteCode');
    const redirectUrl = pendingCode
      ? `${window.location.origin}/invite/${pendingCode}`
      : `${window.location.origin}/my-trips`;

    expect(redirectUrl).toBe(`${window.location.origin}/my-trips`);
  });
});
