import React, { useEffect, useRef, useCallback } from 'react';
import ChatMessage from './ChatMessage';
import { Loader2, Sparkles, ChevronUp } from 'lucide-react';
import type { AIChatMessage, ExtractedItem, PlaceCard } from '@/types/ai-assistant';

interface ChatMessageListProps {
  messages: AIChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  historyLoaded?: boolean;
  onLoadHistory?: () => void;
  tripId?: string;
  onImportAll?: (items: ExtractedItem[]) => Promise<void>;
  onReviewEdit?: (items: ExtractedItem[]) => void;
  onAddPlaceCard?: (card: PlaceCard) => Promise<void>;
  isImporting?: boolean;
  emptyStateSlot?: React.ReactNode;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isLoading,
  isStreaming,
  streamingContent,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  historyLoaded = true,
  onLoadHistory,
  tripId,
  onImportAll,
  onReviewEdit,
  onAddPlaceCard,
  isImporting = false,
  emptyStateSlot
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const hasInitialScrolled = useRef<boolean>(false);
  const scrollThrottleRef = useRef<boolean>(false);
  const lastMessageCountRef = useRef<number>(0);

  // Reliable scroll-to-bottom using scrollTop on the container
  const scrollToBottom = useCallback((smooth = true) => {
    const container = containerRef.current;
    if (!container) return;

    if (smooth) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0 && !hasInitialScrolled.current && containerRef.current) {
      // Use rAF to ensure DOM has laid out before scrolling
      requestAnimationFrame(() => {
        scrollToBottom(false);
        hasInitialScrolled.current = true;
      });
    }
  }, [messages, scrollToBottom]);

  // Reset initial scroll flag when messages are cleared
  useEffect(() => {
    if (messages.length === 0) {
      hasInitialScrolled.current = false;
    }
  }, [messages.length]);

  // Preserve scroll position after loading more messages
  useEffect(() => {
    if (containerRef.current && prevScrollHeightRef.current > 0 && !isLoadingMore) {
      const newScrollHeight = containerRef.current.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
      containerRef.current.scrollTop = scrollDiff;
      prevScrollHeightRef.current = 0;
    }
  }, [messages, isLoadingMore]);

  // When a new user message arrives, scroll to bottom so they see their message sent
  // Do NOT scroll when the assistant's completed response is added (let the user read naturally)
  useEffect(() => {
    if (!hasInitialScrolled.current) return;
    if (messages.length > lastMessageCountRef.current) {
      const newest = messages[messages.length - 1];
      if (newest?.role === 'user') {
        requestAnimationFrame(() => scrollToBottom(true));
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, messages, scrollToBottom]);

  // Throttled scroll handler to detect user scrolling up and load-more
  const handleScroll = useCallback(() => {
    if (scrollThrottleRef.current) return;
    scrollThrottleRef.current = true;

    requestAnimationFrame(() => {
      scrollThrottleRef.current = false;
      if (!containerRef.current) return;

      const container = containerRef.current;

      // Load more when near top — only after user has opted into history,
      // otherwise they'd be surprised by auto-loading when the feature was
      // supposed to be behind the "Show older chats" button.
      if (historyLoaded && hasMore && !isLoadingMore && onLoadMore && container.scrollTop < 50) {
        prevScrollHeightRef.current = container.scrollHeight;
        onLoadMore();
      }
    });
  }, [historyLoaded, hasMore, isLoadingMore, onLoadMore]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sand-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm tracking-tight">Loading conversation…</span>
        </div>
      </div>
    );
  }

  // "Show older chats" control — shown before history has been loaded. Once
  // the user clicks it we fetch the newest page and hand further loading off
  // to the scroll-to-top behavior (hasMore).
  const showLoadHistoryButton = !historyLoaded && !!onLoadHistory;

  const loadHistoryControl = showLoadHistoryButton ? (
    <div className="flex justify-center py-2">
      <button
        type="button"
        onClick={onLoadHistory}
        disabled={isLoadingMore}
        className="flex items-center gap-1.5 text-xs text-sand-500 hover:text-earth-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-full hover:bg-sand-100"
      >
        {isLoadingMore ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Loading older chats...</span>
          </>
        ) : (
          <>
            <ChevronUp className="w-3 h-3" />
            <span>Show older chats</span>
          </>
        )}
      </button>
    </div>
  ) : null;

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {loadHistoryControl}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-sand-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-earth-500" />
            </div>
            <div className="space-y-2 max-w-[300px]">
              <h2 className="font-display text-2xl text-foreground leading-[1.15] tracking-tight">
                What can I help you plan?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Recommendations, scheduling, packing tips, or paste a confirmation to add it to your trip.
              </p>
            </div>
          </div>
          {emptyStateSlot}
          <p className="text-xs text-muted-foreground/80 max-w-[280px] text-center leading-relaxed">
            Trip details are shared with Google Gemini to personalize recommendations. Messages are never used to train AI models.
          </p>
        </div>
      </div>
    );
  }

  // Create a streaming message if currently streaming
  const streamingMessage: AIChatMessage | null = isStreaming && streamingContent
    ? {
        id: 'streaming',
        thread_id: '',
        role: 'assistant',
        content: streamingContent,
        metadata: {},
        created_at: new Date().toISOString()
      }
    : null;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-2 space-y-1 touch-pan-y"
      style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
    >
      {/* "Show older chats" button (before history loaded) */}
      {loadHistoryControl}

      {/* Load more indicator at top (after history loaded, more exist) */}
      {historyLoaded && hasMore && (
        <div className="flex justify-center py-2">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-sand-400 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading older messages...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sand-400 text-xs">
              <ChevronUp className="w-3 h-3" />
              <span>Scroll up for more</span>
            </div>
          )}
        </div>
      )}

      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          onImportAll={onImportAll}
          onReviewEdit={onReviewEdit}
          onAddPlaceCard={onAddPlaceCard}
          isImporting={isImporting}
        />
      ))}

      {/* Show streaming message */}
      {streamingMessage && (
        <ChatMessage message={streamingMessage} isStreaming />
      )}

      {/* Show typing indicator when waiting for response but not yet streaming */}
      {isStreaming && !streamingContent && (
        <div className="flex gap-3 py-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sand-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-earth-600" />
          </div>
          <div className="bg-sand-50 border border-border rounded-2xl rounded-tl-sm px-4 py-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-earth-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-earth-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-earth-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={scrollRef} className="h-1" />
    </div>
  );
};

export default ChatMessageList;
