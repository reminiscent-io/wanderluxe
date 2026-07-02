import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resolve a Google place_id to an IANA timezone via the timezone-proxy Edge
 * Function. Soft-fails to null (no auto-fill) — resolution never blocks a save.
 */
export function useResolveTimezone(placeId: string | null | undefined): {
  timeZoneId: string | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ['timezone', placeId],
    enabled: !!placeId,
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<string | null> => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/timezone-proxy`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
            },
            body: JSON.stringify({ placeId }),
          },
        );
        if (!response.ok) return null;
        const json = await response.json();
        return typeof json?.timeZoneId === 'string' ? json.timeZoneId : null;
      } catch {
        return null;
      }
    },
  });
  return { timeZoneId: data ?? null, isLoading: !!placeId && isLoading };
}
