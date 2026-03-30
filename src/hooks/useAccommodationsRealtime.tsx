import { useMemo } from 'react';
import { useRealtimeSubscription, buildTripEntityConfig } from './useRealtimeSubscription';

export function useAccommodationsRealtime(tripId: string | undefined) {
  const config = useMemo(
    () => tripId ? buildTripEntityConfig('accommodations', 'accommodation_travelers', tripId) : { channelKey: '', tables: [], invalidateKeys: [], enabled: false },
    [tripId]
  );

  return useRealtimeSubscription(config);
}
