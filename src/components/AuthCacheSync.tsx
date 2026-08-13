import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Drops cached server state when the signed-in identity changes.
 *
 * Every query here is answered through RLS, so one key returns different rows —
 * or none at all — depending on who is asking. Someone following a trip email
 * while logged out caches an empty trip under `['trip', id]`; signing in and
 * coming back would otherwise replay that empty answer for the rest of its
 * five-minute staleTime and dead-end on "could not be found", even though the
 * visitor now has access. Signing out matters for the same reason in reverse:
 * the next person on this browser must not read the previous one's rows.
 *
 * Renders nothing.
 */
const AuthCacheSync = () => {
  const { user, profileLoaded } = useAuth();
  const queryClient = useQueryClient();
  // undefined = no identity observed yet, distinct from null = signed out.
  const lastIdentity = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Wait for auth to settle, or the first pass would read as "signed out".
    if (!profileLoaded) return;

    const identity = user?.id ?? null;
    const previous = lastIdentity.current;
    lastIdentity.current = identity;

    // First observation establishes the baseline; nothing cached before it
    // belongs to anyone else.
    if (previous === undefined || previous === identity) return;

    queryClient.clear();
  }, [profileLoaded, user?.id, queryClient]);

  return null;
};

export default AuthCacheSync;
