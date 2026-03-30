import { useMemo } from 'react';
import { useRealtimeSubscription } from './useRealtimeSubscription';

export function useAccommodationsRealtime(tripId: string | undefined) {
  const config = useMemo(() => ({
    channelKey: `accommodations:${tripId}`,
    tables: [
      { table: 'accommodations', filterColumn: 'trip_id', filterValue: tripId! },
      { table: 'accommodation_travelers', filterColumn: 'trip_id', filterValue: tripId! },
    ],
    invalidateKeys: [
      ['trip', tripId],
      ['accommodations', tripId],
      ['trip-travelers:list', tripId],
      ['trip-travelers:assigned', tripId],
    ],
    enabled: !!tripId,
  }), [tripId]);

  return useRealtimeSubscription(config);
}
