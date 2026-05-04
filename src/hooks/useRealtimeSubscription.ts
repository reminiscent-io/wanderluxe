import { useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Global set to track active subscriptions and prevent duplicates
const activeSubscriptions = new Set<string>();

// Counter for generating unique channel names per hook instance
let instanceCounter = 0;

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

/**
 * Build a standard subscription config for a trip-level entity table
 * and its associated travelers junction table.
 */
export function buildTripEntityConfig(
  entityTable: string,
  travelersTable: string,
  tripId: string,
  options?: { channelPrefix?: string; extraInvalidateKeys?: QueryKey[]; dedup?: boolean }
): RealtimeSubscriptionConfig {
  const prefix = options?.channelPrefix ?? entityTable;
  return {
    channelKey: `${prefix}:${tripId}`,
    tables: [
      { table: entityTable, filterColumn: 'trip_id', filterValue: tripId },
      { table: travelersTable, filterColumn: 'trip_id', filterValue: tripId },
    ],
    invalidateKeys: [
      [entityTable, tripId],
      ['trip', tripId],
      ['trip-travelers:list', tripId],
      ['trip-travelers:assigned', tripId],
      ...(options?.extraInvalidateKeys ?? []),
    ],
    enabled: !!tripId,
    dedup: options?.dedup ?? true,
  };
}

export function useRealtimeSubscription(
  config: RealtimeSubscriptionConfig
): RealtimeSubscriptionResult {
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Stable unique ID per hook instance to avoid Supabase channel name collisions
  const instanceIdRef = useRef<number | null>(null);
  if (instanceIdRef.current === null) {
    instanceIdRef.current = ++instanceCounter;
  }

  const {
    channelKey,
    tables,
    invalidateKeys,
    enabled = true,
    dedup = true,
  } = config;

  // When dedup is true, use the channelKey as-is (shared across instances).
  // When dedup is false, append a unique suffix so each hook instance gets its own channel.
  const resolvedChannelKey = dedup ? channelKey : `${channelKey}:${instanceIdRef.current}`;

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
    if (!enabled || !resolvedChannelKey) return;

    if (dedup && activeSubscriptions.has(resolvedChannelKey)) {
      return;
    }

    if (dedup) {
      activeSubscriptions.add(resolvedChannelKey);
    }

    let channel = supabase.channel(resolvedChannelKey);

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
        activeSubscriptions.delete(resolvedChannelKey);
      }
      setIsSubscribed(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedChannelKey, enabled, dedup, handleChange, tablesKey]);

  return { isSubscribed };
}
