import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Global set to track active subscriptions and prevent duplicates
const activeSubscriptions = new Set<string>();

export interface RealtimeTableListener {
  table: string;
  filterColumn: string;
  filterValue: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
}

export interface RealtimeSubscriptionConfig {
  channelKey: string;
  tables: RealtimeTableListener[];
  invalidateKeys: QueryKey[];
  enabled?: boolean;
  dedup?: boolean;
}

export interface RealtimeSubscriptionResult {
  isSubscribed: boolean;
}

export function useRealtimeSubscription(
  config: RealtimeSubscriptionConfig
): RealtimeSubscriptionResult {
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<any>(null);

  const {
    channelKey,
    tables,
    invalidateKeys,
    enabled = true,
    dedup = true,
  } = config;

  // Use ref so the callback doesn't change when invalidateKeys changes by reference
  const invalidateKeysRef = useRef(invalidateKeys);
  invalidateKeysRef.current = invalidateKeys;

  const handleChange = useCallback(() => {
    invalidateKeysRef.current.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, [queryClient]);

  // Serialize tables to a stable string for the dependency array
  const tablesKey = JSON.stringify(tables);

  useEffect(() => {
    if (!enabled || !channelKey) return;

    if (dedup && activeSubscriptions.has(channelKey)) {
      return;
    }

    if (dedup) {
      activeSubscriptions.add(channelKey);
    }

    let channel = supabase.channel(channelKey);

    for (const listener of tables) {
      channel = channel.on(
        'postgres_changes',
        {
          event: listener.event ?? '*',
          schema: listener.schema ?? 'public',
          table: listener.table,
          filter: `${listener.filterColumn}=eq.${listener.filterValue}`,
        },
        handleChange
      );
    }

    channel.subscribe((status) => {
      setIsSubscribed(status === 'SUBSCRIBED');
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (dedup) {
        activeSubscriptions.delete(channelKey);
      }
      setIsSubscribed(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelKey, enabled, dedup, handleChange, tablesKey]);

  return { isSubscribed };
}
