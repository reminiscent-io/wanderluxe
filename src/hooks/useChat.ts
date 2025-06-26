import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatLogRow {
  id: string;
  role: string;
  message: string;
  timestamp: string;
  embedding?: unknown; // Added based on your database schema
  trip_id: string;
  user_id: string;
  created_at: string;
}

export const chatLogsKey = (tripId: string) => ['chat_logs', tripId];

export function useChat(tripId: string) {
  const qc = useQueryClient();

  /* Fetch chat history from Supabase */
  const query = useQuery({
    queryKey: chatLogsKey(tripId),
    queryFn: async (): Promise<ChatLogRow[]> => {
      try {
        // Use raw query to bypass type issues
        const { data, error } = await (supabase as any)
          .from('chat_logs')
          .select('*')
          .eq('trip_id', tripId)
          .order('timestamp', { ascending: true });
        
        if (error) {
          console.error('Failed to load chat logs:', error);
          return [];
        }
        
        return (data || []).map((row: any) => ({
          id: row.id,
          role: row.role,
          message: row.message,
          timestamp: row.timestamp,
          embedding: row.embedding,
          trip_id: row.trip_id,
          user_id: row.user_id,
          created_at: row.created_at
        })) as ChatLogRow[];
      } catch (err) {
        console.error('Chat query error:', err);
        return [];
      }
    },
    enabled: !!tripId,
  });

  /* Real-time subscription for new chat messages */
  useEffect(() => {
    if (!tripId) return;

    let channel: any;
    
    try {
      channel = supabase
        .channel(`chat_logs_${tripId}`)
        .on(
          'postgres_changes' as any,
          { 
            event: 'INSERT', 
            schema: 'public',
            table: 'chat_logs', 
            filter: `trip_id=eq.${tripId}` 
          },
          (payload: any) => {
            console.log('New chat message received:', payload);
            qc.setQueryData<ChatLogRow[]>(chatLogsKey(tripId), prev => [
              ...(prev ?? []), 
              {
                id: payload.new.id,
                role: payload.new.role,
                message: payload.new.message,
                timestamp: payload.new.timestamp,
                embedding: payload.new.embedding,
                trip_id: payload.new.trip_id,
                user_id: payload.new.user_id,
                created_at: payload.new.created_at
              }
            ]);
          }
        )
        .subscribe();
    } catch (err) {
      console.error('Failed to set up chat subscription:', err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [tripId, qc]);

  // Function to add new message
  const addMessage = (message: Omit<ChatLogRow, 'id' | 'created_at'>) => {
    qc.setQueryData<ChatLogRow[]>(chatLogsKey(tripId), prev => [
      ...(prev ?? []),
      {
        ...message,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      }
    ]);
  };

  return { ...query, addMessage };
}
