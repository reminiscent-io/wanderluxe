import { useMemo } from 'react';
import { useRealtimeSubscription } from './useRealtimeSubscription';

export function useActivitiesRealtime(dayId: string, tripId: string | undefined) {
  const config = useMemo(() => ({
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
