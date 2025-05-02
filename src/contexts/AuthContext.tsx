
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        ensureProfile(session.user.id);
      }
    });

    // Set up a periodic session refresh to keep the token valid
    // This will run every 10 minutes to refresh the session but without causing full page reloads
    const refreshInterval = setInterval(async () => {
      try {
        console.log("Refreshing session silently...");
        const { data, error } = await supabase.auth.refreshSession();
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user ?? null);
          console.log("Session refreshed successfully");
        } else if (error) {
          console.warn("Session refresh error:", error);
        }
      } catch (err) {
        console.error("Session refresh failed:", err);
      }
    }, 10 * 60 * 1000); // 10 minutes
    
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
