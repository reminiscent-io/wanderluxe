import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { supabase } from '@/integrations/supabase/client';
import type {
  AIChatMessage,
  AIUsageInfo,
  UseAIAssistantReturn,
  SSEMessageEvent,
  SSEDoneEvent,
  SSEErrorEvent,
  StreamingErrorResponse
} from '@/types/ai-assistant';

const API_BASE = '';

interface UseAIAssistantOptions {
  tripId: string;
  onLimitReached?: (usage: AIUsageInfo) => void;
}

export function useAIAssistant({ tripId, onLimitReached }: UseAIAssistantOptions): UseAIAssistantReturn {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper to get auth token
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, []);

  // Fetch messages
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ['ai-assistant-messages', tripId],
    queryFn: async (): Promise<{ messages: AIChatMessage[]; thread_id: string | null }> => {
      const token = await getAuthToken();
      if (!token) {
        return { messages: [], thread_id: null };
      }

      const response = await fetch(`${API_BASE}/api/trips/${tripId}/assistant/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      return response.json();
    },
    enabled: !!tripId,
    staleTime: 30000 // 30 seconds
  });

  // Fetch usage
  const {
    data: usageData,
    refetch: refetchUsage
  } = useQuery({
    queryKey: ['ai-assistant-usage', tripId],
    queryFn: async (): Promise<AIUsageInfo> => {
      const token = await getAuthToken();
      if (!token) {
        return { used: 0, limit: 15, tier: 'free', resetAt: '' };
      }

      const response = await fetch(`${API_BASE}/api/trips/${tripId}/assistant/usage`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load usage');
      }

      return response.json();
    },
    enabled: !!tripId,
    staleTime: 60000 // 1 minute
  });

  // Send message with streaming
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!content.trim() || isStreaming) return;

    setError(null);
    setIsStreaming(true);
    setStreamingContent('');

    const token = await getAuthToken();
    if (!token) {
      setError('Please sign in to use the assistant');
      setIsStreaming(false);
      return;
    }

    // Optimistically add user message
    const optimisticUserMessage: AIChatMessage = {
      id: `temp-${Date.now()}`,
      thread_id: messagesData?.thread_id || '',
      role: 'user',
      content: content.trim(),
      metadata: {},
      created_at: new Date().toISOString()
    };

    queryClient.setQueryData(
      ['ai-assistant-messages', tripId],
      (old: { messages: AIChatMessage[]; thread_id: string | null } | undefined) => ({
        messages: [...(old?.messages || []), optimisticUserMessage],
        thread_id: old?.thread_id || null
      })
    );

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();
    let fullContent = '';

    try {
      await fetchEventSource(`${API_BASE}/api/trips/${tripId}/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: content.trim(),
          thread_id: messagesData?.thread_id
        }),
        signal: abortControllerRef.current.signal,

        onopen: async (response) => {
          if (!response.ok) {
            const errorData = await response.json();
            throw errorData;
          }
        },

        onmessage: (event) => {
          if (event.event === 'message') {
            const data = JSON.parse(event.data) as SSEMessageEvent;
            fullContent += data.content;
            setStreamingContent(fullContent);
          } else if (event.event === 'done') {
            const data = JSON.parse(event.data) as SSEDoneEvent;

            // Add the complete assistant message to the cache
            const assistantMessage: AIChatMessage = {
              id: data.message_id,
              thread_id: data.thread_id,
              role: 'assistant',
              content: fullContent,
              metadata: {},
              created_at: new Date().toISOString()
            };

            queryClient.setQueryData(
              ['ai-assistant-messages', tripId],
              (old: { messages: AIChatMessage[]; thread_id: string | null } | undefined) => ({
                messages: [...(old?.messages || []), assistantMessage],
                thread_id: data.thread_id
              })
            );

            setStreamingContent('');
            setIsStreaming(false);

            // Refresh usage after successful message
            refetchUsage();
          } else if (event.event === 'error') {
            const data = JSON.parse(event.data) as SSEErrorEvent;
            throw data.error;
          }
        },

        onerror: (err) => {
          throw err;
        }
      });
    } catch (err) {
      const errorResponse = err as StreamingErrorResponse;

      if (errorResponse?.code === 'DAILY_LIMIT_REACHED') {
        const usageInfo: AIUsageInfo = {
          used: errorResponse.used || 15,
          limit: errorResponse.limit || 15,
          tier: 'free',
          resetAt: errorResponse.resetAt || ''
        };
        onLimitReached?.(usageInfo);
        setError('You have reached your daily message limit');

        // Remove optimistic user message
        queryClient.setQueryData(
          ['ai-assistant-messages', tripId],
          (old: { messages: AIChatMessage[]; thread_id: string | null } | undefined) => ({
            messages: (old?.messages || []).filter(m => m.id !== optimisticUserMessage.id),
            thread_id: old?.thread_id || null
          })
        );
      } else if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled, don't show error
      } else {
        setError(errorResponse?.message || 'Failed to send message');
        // Remove optimistic user message on error
        queryClient.setQueryData(
          ['ai-assistant-messages', tripId],
          (old: { messages: AIChatMessage[]; thread_id: string | null } | undefined) => ({
            messages: (old?.messages || []).filter(m => m.id !== optimisticUserMessage.id),
            thread_id: old?.thread_id || null
          })
        );
      }

      setStreamingContent('');
      setIsStreaming(false);
    }
  }, [tripId, isStreaming, getAuthToken, messagesData?.thread_id, queryClient, onLimitReached, refetchUsage]);

  // Clear thread/conversation
  const clearThread = useCallback(async (): Promise<void> => {
    const token = await getAuthToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/trips/${tripId}/assistant/messages`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to clear chat');
      }

      // Clear local state
      queryClient.setQueryData(
        ['ai-assistant-messages', tripId],
        { messages: [], thread_id: null }
      );
      setError(null);
    } catch (err) {
      setError('Failed to clear chat history');
    }
  }, [tripId, getAuthToken, queryClient]);

  // Refresh usage
  const refreshUsage = useCallback(async (): Promise<void> => {
    await refetchUsage();
  }, [refetchUsage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages: messagesData?.messages || [],
    isLoading: isLoadingMessages,
    isStreaming,
    streamingContent,
    error,
    usage: usageData || null,
    threadId: messagesData?.thread_id || null,
    sendMessage,
    clearThread,
    refreshUsage
  };
}
