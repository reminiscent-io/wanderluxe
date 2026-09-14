import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Auth from './Auth';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockGetSession = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      resend: vi.fn(),
    },
  },
}));

vi.mock('@/components/LogoFromSupabase', () => ({ default: (): null => null }));
vi.mock('@/components/SEO', () => ({ default: (): null => null }));

// ─── Helpers ────────────────────────────────────────────────────────────────

const CODE = 'AbCdEfGh';
// A signUp response while email confirmation is on: a user, no session yet.
const AWAITING_CONFIRMATION = {
  data: { user: { id: 'u1', identities: [{ id: 'i1' }] }, session: null as null },
  error: null as null,
};

function renderAuth(path = '/auth') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Auth />
    </MemoryRouter>
  );
}

async function submitCredentials(submitLabel: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/^email$/i), 'traveler@example.com');
  await user.type(screen.getByLabelText(/^password$/i), 'hunter22');
  await user.click(screen.getByRole('button', { name: submitLabel }));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Auth page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInWithOAuth.mockResolvedValue({ error: null });
  });

  describe('mode', () => {
    it('opens on sign-in by default', () => {
      renderAuth();
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
      expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
    });

    it('opens on create-account with ?mode=signup', () => {
      renderAuth('/auth?mode=signup');
      expect(screen.getByRole('heading', { name: /start your first trip/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });
  });

  // The confirmation link usually opens where sessionStorage is empty, so the
  // invite has to be carried by emailRedirectTo itself.
  describe('email sign-up confirmation redirect', () => {
    it('points the confirmation link at the pending invite', async () => {
      sessionStorage.setItem('pendingInviteCode', CODE);
      mockSignUp.mockResolvedValue(AWAITING_CONFIRMATION);
      renderAuth('/auth?mode=signup');

      await submitCredentials('Create account');

      await waitFor(() => expect(screen.getByText(/check your email/i)).toBeInTheDocument());
      expect(mockSignUp.mock.calls[0][0].options.emailRedirectTo).toBe(
        `${window.location.origin}/invite/${CODE}`
      );
      // This tab keeps the code, so signing in here later still lands on the invite.
      expect(sessionStorage.getItem('pendingInviteCode')).toBe(CODE);
    });

    it('falls back to /create-trip with no pending invite', async () => {
      mockSignUp.mockResolvedValue(AWAITING_CONFIRMATION);
      renderAuth('/auth?mode=signup');

      await submitCredentials('Create account');

      await waitFor(() => expect(mockSignUp).toHaveBeenCalled());
      expect(mockSignUp.mock.calls[0][0].options.emailRedirectTo).toBe(
        `${window.location.origin}/create-trip`
      );
    });

    it('ignores a malformed pending invite code', async () => {
      sessionStorage.setItem('pendingInviteCode', '../../evil?x=1');
      mockSignUp.mockResolvedValue(AWAITING_CONFIRMATION);
      renderAuth('/auth?mode=signup');

      await submitCredentials('Create account');

      await waitFor(() => expect(mockSignUp).toHaveBeenCalled());
      expect(mockSignUp.mock.calls[0][0].options.emailRedirectTo).toBe(
        `${window.location.origin}/create-trip`
      );
    });

    it('goes straight to the invite when sign-up returns a session', async () => {
      sessionStorage.setItem('pendingInviteCode', CODE);
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'u1', identities: [{ id: 'i1' }] }, session: { access_token: 't' } },
        error: null,
      });
      renderAuth('/auth?mode=signup');

      await submitCredentials('Create account');

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith(`/invite/${CODE}`, { replace: true })
      );
      expect(sessionStorage.getItem('pendingInviteCode')).toBeNull();
    });
  });

  describe('sign-in paths with a pending invite', () => {
    it('password sign-in lands on the invite and clears the code', async () => {
      sessionStorage.setItem('pendingInviteCode', CODE);
      mockSignInWithPassword.mockResolvedValue({ error: null });
      renderAuth();

      await submitCredentials('Sign in');

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith(`/invite/${CODE}`, { replace: true })
      );
      expect(sessionStorage.getItem('pendingInviteCode')).toBeNull();
    });

    it('password sign-in without an invite lands on /my-trips', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });
      renderAuth();

      await submitCredentials('Sign in');

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/my-trips'));
    });

    it('Google OAuth redirects to the invite', async () => {
      sessionStorage.setItem('pendingInviteCode', CODE);
      renderAuth();

      await userEvent.setup().click(screen.getByRole('button', { name: /continue with google/i }));

      await waitFor(() => expect(mockSignInWithOAuth).toHaveBeenCalled());
      expect(mockSignInWithOAuth.mock.calls[0][0].options.redirectTo).toBe(
        `${window.location.origin}/invite/${CODE}`
      );
    });

    it('an existing session on mount goes to the invite', async () => {
      sessionStorage.setItem('pendingInviteCode', CODE);
      mockGetSession.mockResolvedValue({ data: { session: { access_token: 't' } } });
      renderAuth();

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith(`/invite/${CODE}`, { replace: true })
      );
    });
  });
});
