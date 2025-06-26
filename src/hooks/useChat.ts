import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const chatLogsKey = (tripId: string) => ['chat_logs', tripId];

/**
 * Returns the entire chat history for a trip, ordered chronologically.
 * Re‑runs automatically when another client inserts into `chat_logs`
 * because we subscribe to the table with `supabase.channel`.
 */
export function useChat(tripId: string) {
  return useQuery({
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
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
