import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResolveTimezone } from './useResolveTimezone';
import { useTripPermissions } from './use-trip-permissions';

/**
 * The trip's default timezone. Lazily self-heals: a trip with timezone NULL
 * and a primary destination place resolves once on view; the result persists
 * only when the viewer can edit (owner/edit-share) — view-only viewers keep
 * the resolved value in memory for display.
 */
export function useTripTimezone(tripId: string | undefined): {
  tripTimezone: string | null;
  isLoading: boolean;
} {
  const queryClient = useQueryClient();
  const { canEdit } = useTripPermissions(tripId);

  const { data: row, isLoading } = useQuery({
    queryKey: ['trip-timezone', tripId],
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('timezone, primary_destination_place_id')
        .eq('trip_id', tripId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const needsResolve = !!row && !row.timezone && !!row.primary_destination_place_id;
  const { timeZoneId: resolved } = useResolveTimezone(
    needsResolve ? row!.primary_destination_place_id : null,
  );

  const persistedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!tripId || !needsResolve || !resolved || !canEdit) return;
    if (persistedFor.current === tripId) return;
    persistedFor.current = tripId;
    supabase
      .from('trips')
      .update({ timezone: resolved })
      .eq('trip_id', tripId)
      .then(({ error }) => {
        if (error) {
          persistedFor.current = null; // allow a later retry
          return;
        }
        queryClient.invalidateQueries({ queryKey: ['trip-timezone', tripId] });
        queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      })
      .catch(() => { persistedFor.current = null; });
  }, [tripId, needsResolve, resolved, canEdit, queryClient]);

  return { tripTimezone: row?.timezone ?? resolved ?? null, isLoading };
}
