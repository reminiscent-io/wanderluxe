
import { createContext, useContext, useEffect, useRef, useState, useMemo } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { identifyUser, resetAnalytics } from "@/lib/analytics";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  subscriptionTier: string;
  avatarUrl: string | null;
  fullName: string | null;
  lastLoginAt: string | null;
  profileLoaded: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  subscriptionTier: 'free',
  avatarUrl: null,
  fullName: null,
  lastLoginAt: null,
  profileLoaded: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  // Prevents concurrent visibility-change refreshes from racing the SDK's own
  // auto-refresh timer (which already handles the common case).
  const visibilityRefreshInFlight = useRef(false);

  // Add cache-busting to avatar URLs to ensure fresh images are loaded
  const addCacheBusting = (url: string | null): string | null => {
    if (!url) return null;
    // If URL already has a query parameter, don't add another
    if (url.includes('?')) return url;
    return `${url}?t=${Date.now()}`;
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, subscription_tier, avatar_url, full_name, last_login_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

        if (profile) {
        // Get OAuth metadata for fallbacks (fetch fresh, don't use stale state)
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const oauthAvatar = authUser?.user_metadata?.avatar_url;
        const oauthName = authUser?.user_metadata?.full_name;

        setSubscriptionTier(profile.subscription_tier || 'free');
        setAvatarUrl(addCacheBusting(profile.avatar_url) || oauthAvatar || null);
        setFullName(profile.full_name || oauthName || null);
        setLastLoginAt(profile.last_login_at);
      }
      setProfileLoaded(true);
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      setProfileLoaded(true);
    }
  };

  const updateLastLogin = async (userId: string) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({ last_login_at: now })
      .eq('id', userId);

    if (error) {
      console.error('Error updating last login:', error);
    } else {
      // Update local state so UI reflects the change immediately
      setLastLoginAt(now);
    }
  };

  useEffect(() => {
    const ensureProfile = async (userId: string, isNewLogin: boolean = false) => {
      try {
        // Run profile fetch and OAuth metadata fetch in parallel
        const [profileResult, authUserResult] = await Promise.allSettled([
          supabase
            .from('profiles')
            .select('id, subscription_tier, avatar_url, full_name, last_login_at')
            .eq('id', userId)
            .single(),
          supabase.auth.getUser(),
        ]);

        const profile = profileResult.status === 'fulfilled' ? profileResult.value.data : null;
        const profileError = profileResult.status === 'fulfilled' ? profileResult.value.error : profileResult.reason;
        const authUser = authUserResult.status === 'fulfilled' ? authUserResult.value.data?.user : null;

        if (profileError) {
          console.error('Error fetching profile in ensureProfile:', profileError);
          setProfileLoaded(true);
          return;
        }

        if (!profile) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: userId,
                created_at: new Date().toISOString(),
                last_login_at: new Date().toISOString(),
                full_name: null,
                avatar_url: null
              }
            ]);

          if (insertError) {
            console.error('Error creating profile:', insertError);
          }
          setProfileLoaded(true);
        } else {
          const oauthAvatar = authUser?.user_metadata?.avatar_url;
          const oauthName = authUser?.user_metadata?.full_name;

          setSubscriptionTier(profile.subscription_tier || 'free');
          setAvatarUrl(addCacheBusting(profile.avatar_url) || oauthAvatar || null);
          setFullName(profile.full_name || oauthName || null);
          setLastLoginAt(profile.last_login_at);
          setProfileLoaded(true);

          // Fire-and-forget — don't block profile loading on this write
          if (isNewLogin || !profile.last_login_at) {
            updateLastLogin(userId);
          }
        }
      } catch (err) {
        console.error('Error in ensureProfile:', err);
        setProfileLoaded(true);
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfileLoaded(true);
      } else {
        ensureProfile(session.user.id, false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        // Signed out is a settled state, not a pending one. The SDK fires
        // INITIAL_SESSION with a null session for every anonymous visitor —
        // after getSession() above already reported the same thing — and there
        // is no profile to load, so nothing would ever flip this back. Marking
        // it pending strands every gate that waits on `profileLoaded` to learn
        // the visitor is logged out (see useTripAccessGate).
        setSubscriptionTier('free');
        setAvatarUrl(null);
        setFullName(null);
        setLastLoginAt(null);
        setProfileLoaded(true);
        return;
      }
      // TOKEN_REFRESHED fires every time the SDK rotates the access token.
      // We only need to (re)load the profile on sign-in / user update — not
      // on every token refresh, which would hit the DB every ~hour.
      if (event === 'TOKEN_REFRESHED') return;
      const isNewLogin = event === 'SIGNED_IN';
      if (isNewLogin) {
        // Hold the flag while the new user's profile loads so the avatar shows
        // a skeleton rather than flashing initials. Bounded, unlike the
        // signed-out case above: ensureProfile resolves it on every path.
        setProfileLoaded(false);
      }
      identifyUser(session.user.id, {
        email: session.user.email,
        provider: session.user.app_metadata?.provider,
        created_at: session.user.created_at,
      });
      ensureProfile(session.user.id, isNewLogin);
    });

    // Token refresh is owned by the Supabase SDK (autoRefreshToken: true).
    // When it succeeds, onAuthStateChange above fires TOKEN_REFRESHED and our
    // session/user state stays in sync — no polling interval needed.
    //
    // When a tab is hidden the browser throttles timers, so the SDK's refresh
    // timer can lag. On visibility change we call getSession() once, which the
    // SDK transparently refreshes if the token is near expiry. We dedupe so
    // this doesn't race the SDK's own wake-up refresh.
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      if (visibilityRefreshInFlight.current) return;
      visibilityRefreshInFlight.current = true;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          // Transient offline / network blips are expected when a tab wakes up.
          // The SDK will retry on its own; keep this quiet.
          if (import.meta.env.DEV) {
            console.debug('Visibility getSession error (will retry):', error);
          }
          return;
        }
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user ?? null);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.debug('Visibility getSession threw (will retry):', err);
        }
      } finally {
        visibilityRefreshInFlight.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    resetAnalytics();
  };

  const refreshProfile = async () => {
    // Get user ID directly from auth to avoid stale closure issues
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser?.id) {
      await fetchProfile(currentUser.id);
    }
  };

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      session,
      user,
      subscriptionTier,
      avatarUrl,
      fullName,
      lastLoginAt,
      profileLoaded,
      signOut,
      refreshProfile,
    }),
    // signOut/refreshProfile are stable closures over the supabase client.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, user, subscriptionTier, avatarUrl, fullName, lastLoginAt, profileLoaded]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
