
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/services/analyticsService";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const ensureProfile = async (userId: string) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select()
        .eq('id', userId)
        .single();

      if (!profile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: userId,
              created_at: new Date().toISOString(),
              full_name: null,
              avatar_url: null
            }
          ]);

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        ensureProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        ensureProfile(session.user.id);
        // Track authentication events
        if (event === 'SIGNED_IN') {
          analytics.trackAuth('login');
        } else if (event === 'SIGNED_UP') {
          analytics.trackAuth('signup');
        }
      } else if (event === 'SIGNED_OUT') {
        analytics.trackAuth('logout');
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

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      session,
      user,
      signOut,
    }),
    [session, user] // signOut is stable and doesn't need to be a dependency
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
