import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

// Use vi.hoisted to create mock functions that will be available at the hoisted level
const {
  mockUnsubscribe,
  mockGetSession,
  mockGetUser,
  mockOnAuthStateChange,
  mockRefreshSession,
  mockSignOut,
  mockFrom,
} = vi.hoisted(() => ({
  mockUnsubscribe: vi.fn(),
  mockGetSession: vi.fn(),
  mockGetUser: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockRefreshSession: vi.fn(),
  mockSignOut: vi.fn(),
  mockFrom: vi.fn(),
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
      refreshSession: mockRefreshSession,
      signOut: mockSignOut,
    },
    from: mockFrom,
  },
}));

// Import after mock is set up
import { AuthProvider, useAuth } from './AuthContext';

// Test component to access auth context
const TestConsumer = () => {
  const { session, user, subscriptionTier, signOut } = useAuth();
  return (
    <div>
      <span data-testid="session">{session ? 'has-session' : 'no-session'}</span>
      <span data-testid="user">{user?.id || 'no-user'}</span>
      <span data-testid="tier">{subscriptionTier}</span>
      <button onClick={signOut} data-testid="sign-out">Sign Out</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });

    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    mockRefreshSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockSignOut.mockResolvedValue({ error: null });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  describe('initial state', () => {
    it('should provide default context values when no session exists', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('session')).toHaveTextContent('no-session');
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        expect(screen.getByTestId('tier')).toHaveTextContent('free');
      });
    });

    it('should load existing session on mount', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'token-123',
      };

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-123', subscription_tier: 'pro' },
          error: null,
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('session')).toHaveTextContent('has-session');
        expect(screen.getByTestId('user')).toHaveTextContent('user-123');
      });
    });
  });

  describe('profile management', () => {
    it('should fetch subscription tier from existing profile', async () => {
      const mockSession = {
        user: { id: 'user-123' },
        access_token: 'token',
      };

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-123', subscription_tier: 'premium' },
          error: null,
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('tier')).toHaveTextContent('premium');
      });
    });

    it('should create profile if one does not exist', async () => {
      const mockSession = {
        user: { id: 'new-user-123' },
        access_token: 'token',
      };

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: mockInsert,
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('profiles');
      });
    });

    it('should default to free tier when profile has no subscription_tier', async () => {
      const mockSession = {
        user: { id: 'user-123' },
        access_token: 'token',
      };

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-123', subscription_tier: null },
          error: null,
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('tier')).toHaveTextContent('free');
      });
    });
  });

  describe('auth state changes', () => {
    it('should update state when auth state changes', async () => {
      let authChangeCallback: (event: string, session: any) => void;

      mockOnAuthStateChange.mockImplementation((callback) => {
        authChangeCallback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-123', subscription_tier: 'free' },
          error: null,
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Initially no session
      await waitFor(() => {
        expect(screen.getByTestId('session')).toHaveTextContent('no-session');
      });

      // Simulate sign in
      await act(async () => {
        authChangeCallback!('SIGNED_IN', {
          user: { id: 'user-123' },
          access_token: 'token',
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('session')).toHaveTextContent('has-session');
        expect(screen.getByTestId('user')).toHaveTextContent('user-123');
      });
    });

    it('should clear state when user signs out', async () => {
      let authChangeCallback: (event: string, session: any) => void;

      mockOnAuthStateChange.mockImplementation((callback) => {
        authChangeCallback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      });

      const mockSession = {
        user: { id: 'user-123' },
        access_token: 'token',
      };

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-123', subscription_tier: 'free' },
          error: null,
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Initially has session
      await waitFor(() => {
        expect(screen.getByTestId('session')).toHaveTextContent('has-session');
      });

      // Simulate sign out
      await act(async () => {
        authChangeCallback!('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(screen.getByTestId('session')).toHaveTextContent('no-session');
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      });
    });
  });

  describe('auth settling', () => {
    // `profileLoaded` is the app's "auth has resolved" signal — the trip pages
    // wait on it before deciding whether a visitor may see a trip. A logged-out
    // visitor is a resolved answer, so it has to settle for them too.
    const SettledConsumer = () => {
      const { profileLoaded } = useAuth();
      return <span data-testid="settled">{profileLoaded ? 'settled' : 'pending'}</span>;
    };

    it('stays settled when INITIAL_SESSION arrives with no session', async () => {
      let authChangeCallback: (event: string, session: unknown) => void;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authChangeCallback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      });

      render(
        <AuthProvider>
          <SettledConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('settled')).toHaveTextContent('settled');
      });

      // The SDK emits INITIAL_SESSION for every anonymous visitor, after
      // getSession() has already reported the same null session. Reopening the
      // question here strands the sign-in gate: nothing loads a profile that
      // does not exist, so it would never settle again.
      await act(async () => {
        authChangeCallback!('INITIAL_SESSION', null);
      });

      expect(screen.getByTestId('settled')).toHaveTextContent('settled');
    });

    it('stays settled after the user signs out', async () => {
      let authChangeCallback: (event: string, session: unknown) => void;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authChangeCallback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      });

      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' }, access_token: 'token' } },
        error: null,
      });

      render(
        <AuthProvider>
          <SettledConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('settled')).toHaveTextContent('settled');
      });

      await act(async () => {
        authChangeCallback!('SIGNED_OUT', null);
      });

      expect(screen.getByTestId('settled')).toHaveTextContent('settled');
    });

    it('clears the previous profile on sign-out', async () => {
      let authChangeCallback: (event: string, session: unknown) => void;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authChangeCallback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      });

      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' }, access_token: 'token' } },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-123', subscription_tier: 'premium' },
          error: null,
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('tier')).toHaveTextContent('premium');
      });

      await act(async () => {
        authChangeCallback!('SIGNED_OUT', null);
      });

      expect(screen.getByTestId('tier')).toHaveTextContent('free');
    });
  });

  describe('visibility change', () => {
    it('should call getSession when tab becomes visible', async () => {
      const mockSession = {
        user: { id: 'user-123' },
        access_token: 'refreshed-token',
      };

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Clear calls from mount
      mockGetSession.mockClear();
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

      // Simulate tab becoming visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await waitFor(() => {
        expect(mockGetSession).toHaveBeenCalled();
      });
    });

    it('should not call getSession when tab becomes hidden', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Clear calls from mount
      mockGetSession.mockClear();

      // Simulate tab becoming hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Wait a tick to ensure no async calls happen
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockGetSession).not.toHaveBeenCalled();
    });
  });

  describe('signOut', () => {
    it('should call supabase signOut when signOut is invoked', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      const signOutButton = screen.getByTestId('sign-out');

      await act(async () => {
        signOutButton.click();
      });

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should cleanup subscriptions and intervals on unmount', async () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });
});

describe('useAuth hook', () => {
  it('should return default context when used outside AuthProvider', () => {
    // The current implementation provides default values rather than throwing
    const TestComponent = () => {
      const { session, user, subscriptionTier } = useAuth();
      return (
        <div>
          <span data-testid="session">{session ? 'has-session' : 'no-session'}</span>
          <span data-testid="user">{user?.id || 'no-user'}</span>
          <span data-testid="tier">{subscriptionTier}</span>
        </div>
      );
    };

    render(<TestComponent />);

    // Should have default values
    expect(screen.getByTestId('session')).toHaveTextContent('no-session');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    expect(screen.getByTestId('tier')).toHaveTextContent('free');
  });
});
