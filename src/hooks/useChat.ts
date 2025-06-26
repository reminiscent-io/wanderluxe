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
            const newMessage = {
              id: payload.new.id,
              role: payload.new.role,
              message: payload.new.message,
              timestamp: payload.new.timestamp,
              embedding: payload.new.embedding,
              trip_id: payload.new.trip_id,
              user_id: payload.new.user_id,
              created_at: payload.new.created_at
            };
            
            qc.setQueryData<ChatLogRow[]>(chatLogsKey(tripId), prev => {
              const existing = prev ?? [];
              
              // Check if message already exists to prevent duplicates
              if (existing.some(msg => msg.id === newMessage.id)) {
                console.log('Message already exists, skipping duplicate');
                return existing;
              }

              // For user messages, replace any temporary optimistic message with same content
              if (newMessage.role === 'user') {
                const withoutOptimistic = existing.filter(msg => 
                  !(msg.role === 'user' && msg.message === newMessage.message && msg.id.length === 36 && msg.created_at === msg.timestamp)
                );
                console.log('Adding real user message, replacing optimistic:', newMessage.message.substring(0, 50) + '...');
                const updatedMessages = [...withoutOptimistic, newMessage];
                // Sort by timestamp to maintain chronological order
                return updatedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
              }

              console.log('Adding new message to chat:', newMessage.role, newMessage.message.substring(0, 50) + '...');
              const updatedMessages = [...existing, newMessage];
              // Sort by timestamp to maintain chronological order
              return updatedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            });
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
