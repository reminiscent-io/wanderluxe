import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/* ------------------------------------------------------------------ */
/* Types & constants                                                  */
/* ------------------------------------------------------------------ */
export interface ChatLogRow {
  id: string;
  role: 'user' | 'ai';
  message: string;
  timestamp: string;
  embedding?: unknown;
  trip_id: string;
  user_id: string;
  created_at: string;
}

export const chatLogsKey = (tripId: string) => ['chat_logs', tripId];

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Transform raw DB record → typed row */
const adaptRow = (row: any): ChatLogRow => ({
  id: row.id,
  role: row.role,
  message: row.message,
  timestamp: row.timestamp,
  embedding: row.embedding,
  trip_id: row.trip_id,
  user_id: row.user_id,
  created_at: row.created_at,
});

/** Fetch full chat log for a trip */
const fetchChatLogs = async (tripId: string): Promise<ChatLogRow[]> => {
  const { data, error } = await supabase
    .from('chat_logs')
    .select('*')
    .eq('trip_id', tripId)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('[useChat] Failed to load chat logs →', error);
    return [];
  }
  return (data ?? []).map(adaptRow);
};

/** Sort messages chronologically (ascending) */
const byTimestamp = (a: ChatLogRow, b: ChatLogRow) =>
  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();

/** Handle an incoming realtime payload */
const handleRealtimeInsert = (
  payload: any,
  tripId: string,
  qc: ReturnType<typeof useQueryClient>,
) => {
  const newMsg = adaptRow(payload.new);

  qc.setQueryData<ChatLogRow[]>(chatLogsKey(tripId), (prev) => {
    const existing = prev ?? [];

    // avoid duplicates
    if (existing.some((m) => m.id === newMsg.id)) return existing;

    // replace optimistic user message (same content, temp id)
    const deduped =
      newMsg.role === 'user'
        ? existing.filter(
            (m) =>
              !(
                m.role === 'user' &&
                m.message === newMsg.message &&
                m.id.length === 36 && // crypto.randomUUID length
                m.id === m.created_at // optimistic uses same value
              ),
          )
        : existing;

    return [...deduped, newMsg].sort(byTimestamp);
  });
};

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */
export function useChat(tripId: string) {
  const qc = useQueryClient();

  /* 1 · fetch chat history --------------------------------------------------- */
  const query = useQuery({
    queryKey: chatLogsKey(tripId),
    queryFn: () => fetchChatLogs(tripId),
    enabled: !!tripId,
  });

  /* 2 · realtime subscription ------------------------------------------------ */
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`chat_logs_${tripId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_logs',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => handleRealtimeInsert(payload, tripId, qc),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, qc]);

  /* 3 · helper to optimistically add a message ------------------------------ */
  const addMessage = (msg: Omit<ChatLogRow, 'id' | 'created_at'>) => {
    qc.setQueryData<ChatLogRow[]>(chatLogsKey(tripId), (prev) => [
      ...(prev ?? []),
      { ...msg, id: crypto.randomUUID(), created_at: new Date().toISOString() },
    ]);
  };

  return { ...query, addMessage };
}
