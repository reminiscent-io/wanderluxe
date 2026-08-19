import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * One-time discovery hints.
 *
 * Every key here names a capability that exists but does not announce itself.
 * A hint fires once, beside the thing it describes, at the first moment the
 * user is in a position to want it — not on first login, when there is nothing
 * for the information to attach to.
 */
export type DiscoveryKey =
  | 'map-view'
  | 'calendar-sync'
  | 'doc-import'
  | 'live-collab';

const STORAGE_KEY = 'wl.discovery';
const QUERY_KEY = ['discovery-state'] as const;

type DiscoveryState = Partial<Record<DiscoveryKey, boolean>>;

/**
 * localStorage mirror. Read synchronously on first render so a hint the user
 * already dismissed never flashes back while the profile query is in flight.
 */
function readLocal(): DiscoveryState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DiscoveryState) : {};
  } catch {
    // Private mode, quota, or hand-edited garbage — hints are not worth throwing over.
    return {};
  }
}

function writeLocal(next: DiscoveryState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* no-op */
  }
}

/**
 * Server-side state, shared by every hint on the page through one query key.
 * Fails soft: if the column or RPC isn't there yet, hints fall back to the
 * local mirror rather than erroring out of the surrounding component.
 */
function useDiscoveryState() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: QUERY_KEY,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DiscoveryState> => {
      // `discovery_state` and `mark_discovery_seen` land in the generated types
      // only after 20260819000000_profile_discovery_state.sql is applied and
      // types are regenerated. Go around the typed builder until then.
      const from = supabase.from as unknown as (table: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{
              data: { discovery_state?: DiscoveryState } | null;
              error: { message: string } | null;
            }>;
          };
        };
      };

      const { data, error } = await from('profiles')
        .select('discovery_state')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('discovery_state unavailable, using local only:', error.message);
        return {};
      }
      return data?.discovery_state ?? {};
    },
  });
}

interface FirstRun {
  /** True when this hint has never been seen and there is a user to remember it for. */
  isUnseen: boolean;
  /** Mark seen. Idempotent, and safe to call from a render-time effect. */
  dismiss: () => void;
}

/**
 * `active` gates the hint on the trigger condition (e.g. the trip has enough
 * items to be worth mapping). Passing it in rather than checking outside keeps
 * the "seen" bookkeeping in one place.
 */
export function useFirstRun(key: DiscoveryKey, active: boolean = true): FirstRun {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { data: remote } = useDiscoveryState();

  const [local, setLocal] = useState<DiscoveryState>(readLocal);

  // Seen anywhere is seen everywhere: a user who dismissed on their phone
  // should not meet the same hint again on a laptop, and vice versa.
  const seen = Boolean(local[key] || remote?.[key]);

  // Fold the server's record back into the local mirror so a fresh device
  // stops re-checking after the first load.
  useEffect(() => {
    if (remote?.[key] && !local[key]) {
      const next = { ...readLocal(), [key]: true };
      writeLocal(next);
      setLocal(next);
    }
  }, [remote, key, local]);

  const dismiss = useCallback(() => {
    const next = { ...readLocal(), [key]: true };
    writeLocal(next);
    setLocal(next);

    queryClient.setQueryData<DiscoveryState>(QUERY_KEY, (prev) => ({ ...prev, [key]: true }));

    if (!session?.user) return;
    // Fire and forget: the local mirror already closed the hint, so a failed
    // write costs one repeat on another device, not a broken interaction.
    void (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ error: { message: string } | null }>)('mark_discovery_seen', {
      discovery_key: key,
    }).then(({ error }) => {
      if (error) console.warn('Could not persist discovery hint:', error.message);
    });
  }, [key, queryClient, session]);

  const isUnseen = useMemo(
    // Anonymous visitors on public trips get no hints — there is nowhere to
    // remember the dismissal, so it would nag on every page load.
    () => Boolean(session?.user) && active && !seen,
    [session, active, seen]
  );

  return { isUnseen, dismiss };
}

export default useFirstRun;
