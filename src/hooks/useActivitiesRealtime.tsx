import { useMemo } from 'react';
import { useRealtimeSubscription, RealtimeSubscriptionConfig } from './useRealtimeSubscription';

export function useActivitiesRealtime(dayId: string, tripId: string | undefined) {
  const config: RealtimeSubscriptionConfig = useMemo(() => ({
    channelKey: `activities:${dayId}`,
    tables: [
      { table: 'day_activities', filterColumn: 'day_id', filterValue: dayId },
      { table: 'day_activity_travelers', filterColumn: 'trip_id', filterValue: tripId! },
    ],
    invalidateKeys: [
      ['trip', tripId],
      ['activities', dayId],
      ['activities', tripId],
      ['trip-travelers:list', tripId],
      ['trip-travelers:assigned', tripId],
    ],
    enabled: !!dayId && !!tripId,
  }), [dayId, tripId]);

  return useRealtimeSubscription(config);
}
