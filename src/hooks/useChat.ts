import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
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

interface ChatPage {
  messages: ChatLogRow[];
  hasMore: boolean;
}

export const chatLogsKey = (tripId: string) => ['chat_logs', tripId];

const MESSAGES_PER_PAGE = 10;

export function useChat(tripId: string) {
  const qc = useQueryClient();

  /* Fetch chat history with pagination from Supabase */
  const query = useInfiniteQuery({
    queryKey: chatLogsKey(tripId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<ChatPage> => {
      try {
        // Get total count first
        const { count } = await (supabase as any)
          .from('chat_logs')
          .select('*', { count: 'exact', head: true })
          .eq('trip_id', tripId);

        // Fetch messages with pagination, newest first
        const { data, error } = await (supabase as any)
          .from('chat_logs')
          .select('*')
          .eq('trip_id', tripId)
          .order('timestamp', { ascending: false })
          .range(pageParam * MESSAGES_PER_PAGE, (pageParam + 1) * MESSAGES_PER_PAGE - 1);
        
        if (error) {
          console.error('Failed to load chat logs:', error);
          return { messages: [], hasMore: false };
        }
        
        const messages = (data || []).map((row: any) => ({
          id: row.id,
          role: row.role,
          message: row.message,
          timestamp: row.timestamp,
          embedding: row.embedding,
          trip_id: row.trip_id,
          user_id: row.user_id,
          created_at: row.created_at
        })) as ChatLogRow[];

        // Reverse to show oldest first in UI
        const reversedMessages = messages.reverse();
        const hasMore = count ? (pageParam + 1) * MESSAGES_PER_PAGE < count : false;
        
        return { messages: reversedMessages, hasMore };
      } catch (err) {
        console.error('Chat query error:', err);
        return { messages: [], hasMore: false };
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
    },
    enabled: !!tripId,
    staleTime: 1000 * 60 * 5, // 5 minutes
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
            
            // Update infinite query data
            qc.setQueryData(chatLogsKey(tripId), (oldData: any) => {
              if (!oldData) return oldData;
              
              const firstPage = oldData.pages[0] as ChatPage;
              if (!firstPage) return oldData;
              
              // Check if message already exists to prevent duplicates
              const allMessages = oldData.pages.flatMap((page: ChatPage) => page.messages);
              if (allMessages.some((msg: ChatLogRow) => msg.id === newMessage.id)) {
                console.log('Message already exists, skipping duplicate');
                return oldData;
              }

              // Add new message to the first page (most recent)
              const updatedFirstPage: ChatPage = {
                ...firstPage,
                messages: [...firstPage.messages, newMessage]
              };

              return {
                ...oldData,
                pages: [updatedFirstPage, ...oldData.pages.slice(1)]
              };
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

  // Function to add new message (optimistic update)
  const addMessage = (message: Omit<ChatLogRow, 'id' | 'created_at'>) => {
    qc.setQueryData(chatLogsKey(tripId), (oldData: any) => {
      if (!oldData) return oldData;
      
      const firstPage = oldData.pages[0] as ChatPage;
      if (!firstPage) return oldData;
      
      const newMessage: ChatLogRow = {
        ...message,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      };

      const updatedFirstPage: ChatPage = {
        ...firstPage,
        messages: [...firstPage.messages, newMessage]
      };

      return {
        ...oldData,
        pages: [updatedFirstPage, ...oldData.pages.slice(1)]
      };
    });
  };

  // Flatten all messages from pages for easy consumption
  const allMessages = query.data?.pages?.flatMap((page: ChatPage) => page.messages) || [];
  const hasNextPage = query.hasNextPage;
  const fetchNextPage = query.fetchNextPage;
  const isFetchingNextPage = query.isFetchingNextPage;

  return { 
    ...query, 
    data: allMessages,
    addMessage,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  };
}
