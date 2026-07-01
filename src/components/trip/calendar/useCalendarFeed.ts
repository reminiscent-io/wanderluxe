import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FeedRow { calendar_feed_enabled: boolean | null; calendar_feed_token: string | null; }

function genToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID().replaceAll('-', '');
  // Fallback for secure contexts lacking randomUUID: use the CSPRNG, never Math.random,
  // since this token is the sole gate on the public feed.
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('No secure random source available to generate a calendar feed token');
}

export function useCalendarFeed(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['calendar-feed', tripId], [tripId]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<FeedRow> => {
      const { data, error } = await supabase
        .from('trips')
        .select('calendar_feed_enabled, calendar_feed_token')
        .eq('trip_id', tripId)
        .maybeSingle();
      if (error) throw error;
      return (data as FeedRow) ?? { calendar_feed_enabled: false, calendar_feed_token: null };
    },
    enabled: !!tripId,
  });

  const enabled = !!data?.calendar_feed_enabled;
  const token = data?.calendar_feed_token ?? null;

  const host = typeof window !== 'undefined' ? window.location.host : '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const path = token ? `/api/trips/${tripId}/calendar.ics?token=${token}` : null;
  // Subscribe uses webcal:// (calendar apps map it to https). Download follows
  // the current origin's scheme so it also works over http in local dev.
  const subscribeUrl = path && host ? `webcal://${host}${path}` : null;
  const downloadUrl = path && origin ? `${origin}${path}` : null;

  const patch = useCallback(async (values: Partial<FeedRow>) => {
    const { error } = await supabase.from('trips').update(values).eq('trip_id', tripId);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey });
  }, [tripId, queryClient, queryKey]);

  const enable = useCallback(async () => {
    await patch({ calendar_feed_enabled: true, calendar_feed_token: token ?? genToken() });
  }, [patch, token]);

  const reset = useCallback(async () => {
    await patch({ calendar_feed_token: genToken(), calendar_feed_enabled: true });
  }, [patch]);

  const disable = useCallback(async () => {
    await patch({ calendar_feed_enabled: false });
  }, [patch]);

  return { enabled, token, isLoading, subscribeUrl, downloadUrl, enable, reset, disable };
}
