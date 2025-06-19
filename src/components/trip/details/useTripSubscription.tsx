
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

let globalChannelMap = new Map<string, any>();

export const useTripSubscription = (tripId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tripId) return;

    console.log('Trip subscription temporarily disabled for debugging');
    
    // Temporarily disable real-time subscriptions to fix the multiple subscription error
    // This will be re-enabled once the subscription lifecycle is properly managed
    
    return () => {
      console.log('Subscription cleanup - no active subscriptions');
    };
  }, [tripId, queryClient]);
};
