import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const chatLogsKey = (tripId: string) => ['chat_logs', tripId];

export function useChat(tripId: string) {
  const qc = useQueryClient();

  /* 1️⃣ fetch full history once */
  const query = useQuery({
    queryKey: chatLogsKey(tripId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_logs')
        .select('*')
        .eq('trip_id', tripId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!tripId,
  });

  /* 2️⃣ realtime subscription */
  useEffect(() => {                        // ← switch call site
    const channel = supabase
      .channel(`chat_logs_${tripId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', table: 'chat_logs', filter: `trip_id=eq.${tripId}` },
        payload => {
          qc.setQueryData<any[]>(chatLogsKey(tripId), prev => [...(prev ?? []), payload.new]);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tripId, qc]);

  return query;
}
