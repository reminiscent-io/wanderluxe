
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTimelineSubscription = (
  tripId: string,
  refreshEvents: () => void,
  refreshDays: () => void
) => {
  useEffect(() => {
    const abortController = new AbortController();
    const channel = supabase
      .channel('timeline_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accommodations',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          if (!abortController.signal.aborted) {
            refreshEvents();
            console.log('Timeline accommodation updated');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_days',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          if (!abortController.signal.aborted) {
            refreshDays();
            console.log('Timeline days updated');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'day_activities',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          if (!abortController.signal.aborted) {
            refreshDays();
            console.log('Timeline activities updated');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accommodations_days',
          filter: `stay_id=in.(select stay_id from accommodations where trip_id=eq.${tripId})`,
        },
        () => {
          if (!abortController.signal.aborted) {
            refreshEvents();
            console.log('Timeline accommodation days updated');
          }
        }
      )
      .subscribe();

    return () => {
      abortController.abort();
      supabase.removeChannel(channel);
    };
  }, [tripId, refreshEvents, refreshDays]);
};
