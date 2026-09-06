import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { supabase } from '@/integrations/supabase/client';
import { useBufferedStreaming } from '@/hooks/useBufferedStreaming';
import { track } from '@/lib/analytics';
import type {
  AIChatMessage,
  AIUsageInfo,
  UseAIAssistantReturn,
  SSEMessageEvent,
  SSEDoneEvent,
  SSEErrorEvent,
  StreamingErrorResponse,
  ExtractedItem,
  PlaceCard
} from '@/types/ai-assistant';

const EXPRESS_BASE = '/api/trips';

const ANON_STORAGE_KEY = 'anon-ai-count';
const ANON_MESSAGE_LIMIT = 5;

interface SSEExtractedItemsEvent {
  items: ExtractedItem[];
  meta: {
    model: string;
    source: string;
  };
}

interface SSEPlaceCardsEvent {
  cards: PlaceCard[];
}

interface UseAIAssistantOptions {
  tripId: string;
  onLimitReached?: (usage: AIUsageInfo) => void;
  onItemsExtracted?: (items: ExtractedItem[]) => void;
}

const PAGE_SIZE = 10;

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

function handleSSEOpen(response: Response): void {
  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }
}

interface SSEStreamAccumulator {
  fullContent: string;
  placeCards?: PlaceCard[];
}

interface AnonSSEContext {
  accumulator: SSEStreamAccumulator;
  setStreamingContent: (content: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient>;
  tripId: string;
  refetchUsage: () => void;
}

function handleAnonSSEMessage(event: { event: string; data: string }, ctx: AnonSSEContext): void {
  try {
    if (event.event === 'message') {
      const data = JSON.parse(event.data) as SSEMessageEvent;
      ctx.accumulator.fullContent += data.content;
      ctx.setStreamingContent(ctx.accumulator.fullContent);
    } else if (event.event === 'done') {
      const data = JSON.parse(event.data) as SSEDoneEvent;

      const assistantMessage: AIChatMessage = {
        id: data.message_id || `anon-assistant-${Date.now()}`,
        thread_id: '',
        role: 'assistant',
        content: ctx.accumulator.fullContent,
        metadata: {},
        created_at: new Date().toISOString()
      };

      ctx.queryClient.setQueryData(
        ['ai-assistant-messages', ctx.tripId],
        (old: { messages: AIChatMessage[]; thread_id: string | null } | undefined) => ({
          messages: [...(old?.messages || []), assistantMessage],
          thread_id: null
        })
      );

      ctx.setStreamingContent('');
      ctx.setIsStreaming(false);
      incrementAnonUsageCount();
      ctx.refetchUsage();
    } else if (event.event === 'error') {
      const data = JSON.parse(event.data) as SSEErrorEvent;
      throw data.error;
    }
  } catch (parseError) {
    console.error('Error parsing SSE message:', parseError);
  }
}

interface AuthSSEContext {
  accumulator: SSEStreamAccumulator;
  setStreamingContent: (content: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient>;
  tripId: string;
  refetchUsage: () => void;
  onItemsExtracted?: (items: ExtractedItem[]) => void;
}

function handleAuthSSEMessage(event: { event: string; data: string }, ctx: AuthSSEContext): void {
  try {
    if (event.event === 'message') {
      const data = JSON.parse(event.data) as SSEMessageEvent;
      ctx.accumulator.fullContent += data.content;
      ctx.setStreamingContent(ctx.accumulator.fullContent);
    } else if (event.event === 'done') {
      const data = JSON.parse(event.data) as SSEDoneEvent;
      const messageContent = data.content ?? ctx.accumulator.fullContent;

      const assistantMessage: AIChatMessage = {
        id: data.message_id,
        thread_id: data.thread_id,
        role: 'assistant',
        content: messageContent,
        metadata: {},
        created_at: new Date().toISOString(),
        placeCards: ctx.accumulator.placeCards
      };

      ctx.queryClient.setQueryData(
        ['ai-assistant-messages', ctx.tripId],
        (old: { messages: AIChatMessage[]; thread_id: string | null } | undefined) => ({
          messages: [...(old?.messages || []), assistantMessage],
          thread_id: data.thread_id
        })
      );

      ctx.setStreamingContent('');
      ctx.setIsStreaming(false);
      ctx.refetchUsage();
    } else if (event.event === 'extracted_items') {
      const data = JSON.parse(event.data) as SSEExtractedItemsEvent;
      if (data.items && data.items.length > 0 && ctx.onItemsExtracted) {
        ctx.onItemsExtracted(data.items);
      }
    } else if (event.event === 'place_cards') {
      const data = JSON.parse(event.data) as SSEPlaceCardsEvent;
      if (Array.isArray(data.cards) && data.cards.length > 0) {
        ctx.accumulator.placeCards = data.cards;
      }
    } else if (event.event === 'error') {
      const data = JSON.parse(event.data) as SSEErrorEvent;
      throw data.error;
    }
  } catch (parseError) {
    console.error('Error parsing SSE message:', parseError);
  }
}

function handleSSEError(err: unknown): never {
  console.error('SSE connection error:', err);
  throw err;
}

export function useAIAssistant({ tripId, onLimitReached, onItemsExtracted }: UseAIAssistantOptions): UseAIAssistantReturn {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    displayedContent: streamingContent,
    setBufferContent,
    startBuffering,
    reset: resetBuffer
  } = useBufferedStreaming();

  // Adapter: setStreamingContent now goes through the buffer
  // When setting empty string, also stop the buffer flush loop
  const setStreamingContent = useCallback((content: string) => {
    if (content === '') {
      resetBuffer();
    } else {
      setBufferContent(content);
    }
  }, [setBufferContent, resetBuffer]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
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

  // The messages query itself never fetches (enabled: false) — it is the
  // cache backing optimistic adds, streamed responses, and the pages that
  // `loadHistory` / `loadMoreMessages` merge in. History restore happens via
  // the auto-load effect below `loadHistory`, not through this queryFn.
  const {
    data: messagesData,
    isLoading: isLoadingMessages
  } = useQuery({
    queryKey: ['ai-assistant-messages', tripId],
    queryFn: async (): Promise<{ messages: AIChatMessage[]; thread_id: string | null; hasMore: boolean }> => {
      // Never actually runs (enabled: false) — defensive default.
      return { messages: [], thread_id: null, hasMore: false };
    },
    enabled: false,
    initialData: { messages: [], thread_id: null, hasMore: false },
    staleTime: 30000
  });

  // Load the most recent PAGE_SIZE messages. Auto-invoked on mount for
  // signed-in users (see the effect below); also wired to the "Show older
  // chats" control as a manual fallback when the automatic load failed.
  const loadHistory = useCallback(async (): Promise<void> => {
    if (historyLoaded || isLoadingMore || isAnonymous) return;

    const token = await getAuthToken();
    if (!token) return;

    setIsLoadingMore(true);
    try {
      const response = await fetch(
        `${EXPRESS_BASE}/${tripId}/assistant/messages?limit=${PAGE_SIZE}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load history');
      }

      const data = await response.json();
      setHasMore(data.hasMore || false);
      setHistoryLoaded(true);

      // Merge server messages with any session-only optimistic messages that
      // the server hasn't sent back (e.g. streaming in-flight).
      queryClient.setQueryData(
        ['ai-assistant-messages', tripId],
        (old: { messages: AIChatMessage[]; thread_id: string | null; hasMore: boolean } | undefined) => {
          const serverMessages: AIChatMessage[] = data.messages || [];
          const serverIds = new Set(serverMessages.map(m => m.id));
          const localOnly = (old?.messages || []).filter(m => !serverIds.has(m.id));
          const merged = [...serverMessages, ...localOnly].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          return {
            messages: merged,
            thread_id: data.thread_id ?? old?.thread_id ?? null,
            hasMore: data.hasMore ?? false
          };
        }
      );
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [tripId, historyLoaded, isLoadingMore, isAnonymous, getAuthToken, queryClient]);

  // Restore the persisted conversation as soon as the assistant mounts for a
  // signed-in user. Mobile browsers routinely evict backgrounded tabs, so
  // switching apps and returning remounts React with an empty in-memory
  // cache even though every message is saved server-side — without this the
  // chat looked wiped. One attempt per auth state: the ref stops a failed
  // fetch from retry-looping (the "Show older chats" control stays visible
  // as the manual fallback), and it resets when auth changes so a user who
  // signs in mid-session still gets their history.
  const historyAutoloadAttemptedRef = useRef(false);

  useEffect(() => {
    historyAutoloadAttemptedRef.current = false;
  }, [isAnonymous]);

  useEffect(() => {
    if (isAnonymous || historyLoaded || historyAutoloadAttemptedRef.current) return;
    historyAutoloadAttemptedRef.current = true;
    void loadHistory();
  }, [isAnonymous, historyLoaded, loadHistory]);

  // Load older messages using cursor-based pagination anchored on the oldest
  // message currently in the cache. Stable across new messages being sent.
  const loadMoreMessages = useCallback(async (): Promise<void> => {
    if (isLoadingMore || !hasMore || isAnonymous || !historyLoaded) return;

    const token = await getAuthToken();
    if (!token) return;

    const currentMessages = messagesData?.messages || [];
    if (currentMessages.length === 0) return;

    // First message in cache is the oldest (messages are chronological).
    const cursor = currentMessages[0].created_at;

    setIsLoadingMore(true);
    try {
      const response = await fetch(
        `${EXPRESS_BASE}/${tripId}/assistant/messages?limit=${PAGE_SIZE}&before=${encodeURIComponent(cursor)}`,
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
  }, [tripId, hasMore, isLoadingMore, isAnonymous, historyLoaded, getAuthToken, messagesData?.messages, queryClient]);

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

      const response = await fetch(`${EXPRESS_BASE}/${tripId}/assistant/usage`, {
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
    startBuffering();

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
    const accumulator: SSEStreamAccumulator = { fullContent: '' };

    const removeOptimisticMessage = () => {
      queryClient.setQueryData(
        ['ai-assistant-messages', tripId],
        (old: { messages: AIChatMessage[]; thread_id: string | null } | undefined) => ({
          messages: (old?.messages || []).filter(m => m.id !== optimisticUserMessage.id),
          thread_id: null
        })
      );
    };

    const anonCtx: AnonSSEContext = {
      accumulator,
      setStreamingContent,
      setIsStreaming,
      queryClient,
      tripId,
      refetchUsage
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
        onopen: handleSSEOpen,
        onmessage: (event) => handleAnonSSEMessage(event, anonCtx),
        onerror: handleSSEError
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
    // removeOptimisticMessage is a stable closure; including it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, isStreaming, queryClient, onLimitReached, refetchUsage, startBuffering]);

  // Send message with streaming - authenticated path
  const sendMessageAuth = useCallback(async (content: string): Promise<void> => {
    // Validate input before proceeding
    const trimmedContent = (content || '').trim();
    if (!trimmedContent || isStreaming) return;

    setError(null);
    setIsStreaming(true);
    startBuffering();

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
    const accumulator: SSEStreamAccumulator = { fullContent: '' };

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

    const authCtx: AuthSSEContext = {
      accumulator,
      setStreamingContent,
      setIsStreaming,
      queryClient,
      tripId,
      refetchUsage,
      onItemsExtracted
    };

    try {
      await fetchEventSource(`${EXPRESS_BASE}/${tripId}/assistant`, {
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
        onopen: handleSSEOpen,
        onmessage: (event) => handleAuthSSEMessage(event, authCtx),
        onerror: handleSSEError
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
    // removeOptimisticMessage and other helpers are stable closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, isStreaming, getAuthToken, messagesData?.thread_id, queryClient, onLimitReached, onItemsExtracted, refetchUsage, startBuffering]);

  // Route sendMessage to the appropriate handler
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    track('ai_chat_message_sent', {
      trip_id: tripId,
      anonymous: isAnonymous,
      message_length: content.length,
    });
    if (isAnonymous) {
      return sendMessageAnon(content);
    }
    return sendMessageAuth(content);
  }, [isAnonymous, sendMessageAnon, sendMessageAuth, tripId]);

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
      const response = await fetch(`${EXPRESS_BASE}/${tripId}/assistant/messages`, {
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
    // The initial history restore (isLoadingMore before historyLoaded flips)
    // presents as a full "Loading conversation…" state rather than a flash
    // of the empty prompt — but only while nothing is on screen yet. When
    // the cache is already warm (assistant re-opened in the same session)
    // the refresh merges silently behind the visible messages.
    isLoading: isLoadingMessages ||
      (isLoadingMore && !historyLoaded && (messagesData?.messages?.length ?? 0) === 0),
    isStreaming,
    streamingContent,
    error,
    usage: usageData || null,
    threadId: messagesData?.thread_id || null,
    hasMore,
    isLoadingMore,
    isAnonymous,
    // Anonymous sessions have no persisted history to load, so treat them as
    // "already loaded" to suppress the Show older chats control.
    historyLoaded: historyLoaded || isAnonymous,
    sendMessage,
    clearThread,
    refreshUsage,
    loadMoreMessages,
    loadHistory
  };
}
