
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  subscriptionTier: string;
  avatarUrl: string | null;
  fullName: string | null;
  lastLoginAt: string | null;
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
    } catch (err) {
      console.error('Error in fetchProfile:', err);
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, subscription_tier, avatar_url, full_name, last_login_at')
        .eq('id', userId)
        .single();

      if (!profile) {
        const { error: profileError } = await supabase
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

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
      } else {
        // Get OAuth metadata for fallbacks
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const oauthAvatar = authUser?.user_metadata?.avatar_url;
        const oauthName = authUser?.user_metadata?.full_name;

        setSubscriptionTier(profile.subscription_tier || 'free');
        // Use profile avatar_url, fall back to OAuth metadata avatar
        setAvatarUrl(addCacheBusting(profile.avatar_url) || oauthAvatar || null);
        setFullName(profile.full_name || oauthName || null);
        setLastLoginAt(profile.last_login_at);

        // Update last login timestamp on new sign in, or if it's never been set
        if (isNewLogin || !profile.last_login_at) {
          await updateLastLogin(userId);
        }
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        ensureProfile(session.user.id, false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Only update last login on actual sign in events
        const isNewLogin = event === 'SIGNED_IN';
        ensureProfile(session.user.id, isNewLogin);
      }
    });

    // Set up a periodic session refresh to keep the token valid
    // This will run every 20 minutes to refresh the session but without causing full page reloads
    // Using a longer interval reduces frequency of network requests
    const refreshInterval = setInterval(async () => {
      try {
        console.log("Refreshing session silently...");
        // Use a more resilient approach with timeout and error handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
          const { data, error } = await supabase.auth.refreshSession();
          clearTimeout(timeoutId);
          
          if (data.session) {
            setSession(data.session);
            setUser(data.session.user ?? null);
            console.log("Session refreshed successfully");
          } else if (error) {
            console.warn("Session refresh error:", error);
          }
        } catch (fetchErr) {
          console.warn("Session refresh network error:", fetchErr);
        }
      } catch (err) {
        console.error("Session refresh failed:", err);
      }
    }, 20 * 60 * 1000); // 20 minutes (increased from 10)
    
    // Handle visibility change to refresh silently when tab becomes visible again
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          console.log("Tab visible - refreshing session silently");
          const { data, error } = await supabase.auth.refreshSession();
          if (data.session) {
            setSession(data.session);
            setUser(data.session.user ?? null);
          } else if (error) {
            console.warn("Session refresh error on visibility change:", error);
          }
        } catch (err) {
          console.error("Session refresh failed on visibility change:", err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
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
      signOut,
      refreshProfile,
    }),
    [session, user, subscriptionTier, avatarUrl, fullName, lastLoginAt] // signOut/refreshProfile are stable
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
