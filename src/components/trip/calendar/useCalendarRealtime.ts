import { useMemo } from 'react';
import { useRealtimeSubscription, type RealtimeSubscriptionConfig } from '@/hooks/useRealtimeSubscription';

export function useCalendarRealtime(tripId: string | undefined) {
  const config: RealtimeSubscriptionConfig = useMemo(
    () => ({
      channelKey: `calendar:${tripId}`,
      tables: [
        { table: 'day_activities', filterColumn: 'trip_id', filterValue: tripId ?? '' },
        { table: 'accommodations', filterColumn: 'trip_id', filterValue: tripId ?? '' },
        { table: 'transportation', filterColumn: 'trip_id', filterValue: tripId ?? '' },
        { table: 'reservations', filterColumn: 'trip_id', filterValue: tripId ?? '' },
      ],
      invalidateKeys: [
        ['trip-days', tripId],
        ['accommodations', tripId],
        ['transportation', tripId],
        ['reservations', tripId],
        ['trip', tripId],
      ],
      enabled: !!tripId,
    }),
    [tripId],
  );
  return useRealtimeSubscription(config);
}
