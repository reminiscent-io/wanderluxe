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
  StreamingErrorResponse,
  ExtractedItem
} from '@/types/ai-assistant';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const EDGE_FUNCTION_BASE = `${SUPABASE_URL}/functions/v1/ai-chat`;

const ANON_STORAGE_KEY = 'anon-ai-count';
const ANON_MESSAGE_LIMIT = 5;

interface SSEExtractedItemsEvent {
  items: ExtractedItem[];
  meta: {
    model: string;
    source: string;
  };
}

interface UseAIAssistantOptions {
  tripId: string;
  onLimitReached?: (usage: AIUsageInfo) => void;
  onItemsExtracted?: (items: ExtractedItem[]) => void;
}

const PAGE_SIZE = 5;

// Helper to read/write anonymous usage from sessionStorage
function getAnonUsageCount(): number {
  try {
    return parseInt(sessionStorage.getItem(ANON_STORAGE_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function incrementAnonUsageCount(): number {
  const count = getAnonUsageCount() + 1;
  try {
    sessionStorage.setItem(ANON_STORAGE_KEY, String(count));
  } catch {
    // sessionStorage may be unavailable
  }
  return count;
}

export function useAIAssistant({ tripId, onLimitReached, onItemsExtracted }: UseAIAssistantOptions): UseAIAssistantReturn {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper to get auth token
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, []);

  // Detect anonymous mode on mount and auth changes
  useEffect(() => {
    const checkAuth = async () => {
      const token = await getAuthToken();
      setIsAnonymous(!token);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, [getAuthToken]);

  // Fetch messages (initial load - last PAGE_SIZE messages)
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ['ai-assistant-messages', tripId],
    queryFn: async (): Promise<{ messages: AIChatMessage[]; thread_id: string | null; hasMore: boolean }> => {
      const token = await getAuthToken();
      if (!token) {
        // Anonymous: return empty - messages are only in local cache
        return { messages: [], thread_id: null, hasMore: false };
      }

      const response = await fetch(`${EDGE_FUNCTION_BASE}/${tripId}/messages?limit=${PAGE_SIZE}&offset=0`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      setHasMore(data.hasMore || false);
      return data;
    },
    enabled: !!tripId,
    staleTime: 30000 // 30 seconds
  });

  // Load more (older) messages
  const loadMoreMessages = useCallback(async (): Promise<void> => {
    if (isLoadingMore || !hasMore || isAnonymous) return;

    const token = await getAuthToken();
    if (!token) return;

    setIsLoadingMore(true);
    try {
      const currentMessages = messagesData?.messages || [];
      const offset = currentMessages.length;

      const response = await fetch(
        `${EDGE_FUNCTION_BASE}/${tripId}/messages?limit=${PAGE_SIZE}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load more messages');
      }

      const data = await response.json();
      setHasMore(data.hasMore || false);

      // Prepend older messages to the beginning
      queryClient.setQueryData(
        ['ai-assistant-messages', tripId],
        (old: { messages: AIChatMessage[]; thread_id: string | null; hasMore: boolean } | undefined) => ({
          messages: [...(data.messages || []), ...(old?.messages || [])],
          thread_id: old?.thread_id || data.thread_id,
          hasMore: data.hasMore
        })
      );
    } catch (err) {
      console.error('Error loading more messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [tripId, hasMore, isLoadingMore, isAnonymous, getAuthToken, messagesData?.messages, queryClient]);

  // Fetch usage
  const {
    data: usageData,
    refetch: refetchUsage
  } = useQuery({
    queryKey: ['ai-assistant-usage', tripId],
    queryFn: async (): Promise<AIUsageInfo> => {
      const token = await getAuthToken();
      if (!token) {
        // Anonymous: return usage from sessionStorage
        const used = getAnonUsageCount();
        return { used, limit: ANON_MESSAGE_LIMIT, tier: 'anon', resetAt: '' };
      }

      const response = await fetch(`${EDGE_FUNCTION_BASE}/${tripId}/usage`, {
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

  // Send message with streaming - anonymous path
  const sendMessageAnon = useCallback(async (content: string): Promise<void> => {
    const trimmedContent = (content || '').trim();
    if (!trimmedContent || isStreaming) return;

    // Check anonymous limit
    const currentCount = getAnonUsageCount();
    if (currentCount >= ANON_MESSAGE_LIMIT) {
      const usageInfo: AIUsageInfo = {
        used: currentCount,
        limit: ANON_MESSAGE_LIMIT,
        tier: 'anon',
        resetAt: ''
      };
      onLimitReached?.(usageInfo);
      setError('Sign up for a free account to keep chatting');
      return;
    }

    setError(null);
    setIsStreaming(true);
    setStreamingContent('');

    // Optimistically add user message
    const optimisticUserMessage: AIChatMessage = {
      id: `anon-user-${Date.now()}`,
      thread_id: '',
      role: 'user',
      content: trimmedContent,
      metadata: {},
      created_at: new Date().toISOString()
    };

    queryClient.setQueryData(
      ['ai-assistant-messages', tripId],
      (old: { messages: AIChatMessage[]; thread_id: string | null } | undefined) => ({
        messages: [...(old?.messages || []), optimisticUserMessage],
        thread_id: null
      })
    );

    // Build previous messages from cache for context
    const currentMessages = queryClient.getQueryData<{ messages: AIChatMessage[] }>(['ai-assistant-messages', tripId]);
    const previousMessages = (currentMessages?.messages || [])
      .filter(m => m.id !== optimisticUserMessage.id)
      .map(m => ({ role: m.role, content: m.content }));

    abortControllerRef.current = new AbortController();
    let fullContent = '';

    const removeOptimisticMessage = () => {
      queryClient.setQueryData(
        ['ai-assistant-messages', tripId],
        (old: { messages: AIChatMessage[]; thread_id: string | null } | undefined) => ({
          messages: (old?.messages || []).filter(m => m.id !== optimisticUserMessage.id),
          thread_id: null
        })
      );
    };

    try {
      await fetchEventSource(`/api/trips/${tripId}/assistant/anon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: trimmedContent,
          messages: previousMessages
        }),
        signal: abortControllerRef.current.signal,

        onopen: async (response) => {
          if (!response.ok) {
            let errorData;
            try {
              errorData = await response.json();
            } catch {
              errorData = { message: `Server error: ${response.status}` };
            }
            throw errorData;
          }
        },

        onmessage: (event) => {
          try {
            if (event.event === 'message') {
              const data = JSON.parse(event.data) as SSEMessageEvent;
              fullContent += data.content;
              setStreamingContent(fullContent);
            } else if (event.event === 'done') {
              const data = JSON.parse(event.data) as SSEDoneEvent;

              // Add the complete assistant message to the cache
              const assistantMessage: AIChatMessage = {
                id: data.message_id || `anon-assistant-${Date.now()}`,
                thread_id: '',
                role: 'assistant',
                content: fullContent,
                metadata: {},
                created_at: new Date().toISOString()
              };

              queryClient.setQueryData(
                ['ai-assistant-messages', tripId],
                (old: { messages: AIChatMessage[]; thread_id: string | null } | undefined) => ({
                  messages: [...(old?.messages || []), assistantMessage],
                  thread_id: null
                })
              );

              setStreamingContent('');
              setIsStreaming(false);

              // Increment anonymous usage counter
              incrementAnonUsageCount();

              // Refresh usage to reflect new count
              refetchUsage();
            } else if (event.event === 'error') {
              const data = JSON.parse(event.data) as SSEErrorEvent;
              throw data.error;
            }
          } catch (parseError) {
            console.error('Error parsing SSE message:', parseError);
          }
        },

        onerror: (err) => {
          console.error('SSE connection error:', err);
          throw err;
        }
      });
    } catch (err) {
      console.error('Send message error (anon):', err);

      if (err instanceof Error && err.name === 'AbortError') {
        setStreamingContent('');
        setIsStreaming(false);
        return;
      }

      const errorResponse = err as StreamingErrorResponse;
      if (errorResponse?.code === 'RATE_LIMITED') {
        setError('Too many requests. Please wait a moment and try again.');
      } else if (errorResponse?.code === 'NOT_PUBLIC') {
        setError('This trip is not publicly accessible.');
      } else if (err instanceof TypeError && err.message.includes('Load failed')) {
        setError('Connection error. Please check your internet and try again.');
      } else {
        const errorMessage = errorResponse?.message ||
          (err instanceof Error ? err.message : 'Failed to send message. Please try again.');
        setError(errorMessage);
      }

      removeOptimisticMessage();
      setStreamingContent('');
      setIsStreaming(false);
    }
  }, [tripId, isStreaming, queryClient, onLimitReached, refetchUsage]);

  // Send message with streaming - authenticated path
  const sendMessageAuth = useCallback(async (content: string): Promise<void> => {
    // Validate input before proceeding
    const trimmedContent = (content || '').trim();
    if (!trimmedContent || isStreaming) return;

    setError(null);
    setIsStreaming(true);
    setStreamingContent('');

    let token: string | null = null;
    try {
      token = await getAuthToken();
    } catch (authError) {
      console.error('Auth error:', authError);
      setError('Unable to authenticate. Please try again.');
      setIsStreaming(false);
      return;
    }

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
      content: trimmedContent,
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

    // Helper to remove the optimistic message on error
    const removeOptimisticMessage = () => {
      queryClient.setQueryData(
        ['ai-assistant-messages', tripId],
        (old: { messages: AIChatMessage[]; thread_id: string | null } | undefined) => ({
          messages: (old?.messages || []).filter(m => m.id !== optimisticUserMessage.id),
          thread_id: old?.thread_id || null
        })
      );
    };

    try {
      await fetchEventSource(`${EDGE_FUNCTION_BASE}/${tripId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: trimmedContent,
          thread_id: messagesData?.thread_id
        }),
        signal: abortControllerRef.current.signal,

        onopen: async (response) => {
          if (!response.ok) {
            let errorData;
            try {
              errorData = await response.json();
            } catch {
              errorData = { message: `Server error: ${response.status}` };
            }
            throw errorData;
          }
        },

        onmessage: (event) => {
          try {
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
            } else if (event.event === 'extracted_items') {
              // AI detected item creation intent and extracted structured data
              const data = JSON.parse(event.data) as SSEExtractedItemsEvent;
              if (data.items && data.items.length > 0 && onItemsExtracted) {
                onItemsExtracted(data.items);
              }
            } else if (event.event === 'error') {
              const data = JSON.parse(event.data) as SSEErrorEvent;
              throw data.error;
            }
          } catch (parseError) {
            console.error('Error parsing SSE message:', parseError);
            // Don't throw - continue trying to process other messages
          }
        },

        onerror: (err) => {
          // Don't throw on network errors - handle them gracefully
          console.error('SSE connection error:', err);
          throw err;
        }
      });
    } catch (err) {
      console.error('Send message error:', err);
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
        removeOptimisticMessage();
      } else if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled, don't show error but still clean up streaming state
        setStreamingContent('');
        setIsStreaming(false);
        return;
      } else if (err instanceof TypeError && err.message.includes('Load failed')) {
        // Network error - common on mobile or poor connections
        setError('Connection error. Please check your internet and try again.');
        removeOptimisticMessage();
      } else {
        // Generic error handling
        const errorMessage = errorResponse?.message ||
          (err instanceof Error ? err.message : 'Failed to send message. Please try again.');
        setError(errorMessage);
        removeOptimisticMessage();
      }

      setStreamingContent('');
      setIsStreaming(false);
    }
  }, [tripId, isStreaming, getAuthToken, messagesData?.thread_id, queryClient, onLimitReached, onItemsExtracted, refetchUsage]);

  // Route sendMessage to the appropriate handler
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (isAnonymous) {
      return sendMessageAnon(content);
    }
    return sendMessageAuth(content);
  }, [isAnonymous, sendMessageAnon, sendMessageAuth]);

  // Clear thread/conversation
  const clearThread = useCallback(async (): Promise<void> => {
    if (isAnonymous) {
      // Anonymous: just clear local cache
      queryClient.setQueryData(
        ['ai-assistant-messages', tripId],
        { messages: [], thread_id: null }
      );
      setError(null);
      return;
    }

    const token = await getAuthToken();
    if (!token) return;

    try {
      const response = await fetch(`${EDGE_FUNCTION_BASE}/${tripId}/messages`, {
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
  }, [tripId, isAnonymous, getAuthToken, queryClient]);

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
    hasMore,
    isLoadingMore,
    isAnonymous,
    sendMessage,
    clearThread,
    refreshUsage,
    loadMoreMessages
  };
}
