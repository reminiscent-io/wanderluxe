import { useMemo } from 'react';
import {
  useRealtimeSubscription,
  type RealtimeSubscriptionConfig,
} from '@/hooks/useRealtimeSubscription';

/**
 * Trip-wide realtime for the map view.
 *
 * The channel key deliberately differs from `calendar:${tripId}`:
 * `useRealtimeSubscription` dedupes by key through a module-level Set, so the
 * first mount wins and any later mount of the same key silently receives no
 * events. Since the map stays mounted after its first open, it can coexist with
 * the calendar — and a shared key would leave one of them dead.
 */
export function useMapRealtime(tripId: string | undefined) {
  const config: RealtimeSubscriptionConfig = useMemo(
    () => ({
      channelKey: `map:${tripId}`,
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
