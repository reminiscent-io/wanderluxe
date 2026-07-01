import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FeedRow { calendar_feed_enabled: boolean | null; calendar_feed_token: string | null; }

function genToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID().replace(/-/g, '');
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
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
  const path = token ? `/api/trips/${tripId}/calendar.ics?token=${token}` : null;
  const subscribeUrl = path && host ? `webcal://${host}${path}` : null;
  const downloadUrl = path && host ? `https://${host}${path}` : null;

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
