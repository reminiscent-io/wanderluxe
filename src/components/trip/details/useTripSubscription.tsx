
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useTripSubscription = (tripId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tripId) return;

    // Temporarily disable real-time subscriptions to fix the multiple subscription error
    // This will be re-enabled once the subscription lifecycle is properly managed
    
    return () => {
      // Cleanup - no active subscriptions
    };
  }, [tripId, queryClient]);
};
