import React, { useEffect, useRef, useCallback } from 'react';
import ChatMessage from './ChatMessage';
import { Loader2, Sparkles, ChevronUp } from 'lucide-react';
import type { AIChatMessage, ExtractedItem } from '@/types/ai-assistant';

interface ChatMessageListProps {
  messages: AIChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  tripId?: string;
  onImportAll?: (items: ExtractedItem[]) => Promise<void>;
  onReviewEdit?: (items: ExtractedItem[]) => void;
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
  tripId,
  onImportAll,
  onReviewEdit,
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

  // When a new message arrives (not streaming update), scroll to bottom
  useEffect(() => {
    if (!hasInitialScrolled.current) return;
    if (messages.length > lastMessageCountRef.current) {
      requestAnimationFrame(() => scrollToBottom(true));
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Throttled scroll handler to detect user scrolling up and load-more
  const handleScroll = useCallback(() => {
    if (scrollThrottleRef.current) return;
    scrollThrottleRef.current = true;

    requestAnimationFrame(() => {
      scrollThrottleRef.current = false;
      if (!containerRef.current) return;

      const container = containerRef.current;

      // Load more when near top
      if (hasMore && !isLoadingMore && onLoadMore && container.scrollTop < 50) {
        prevScrollHeightRef.current = container.scrollHeight;
        onLoadMore();
      }
    });
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sand-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading conversation...</span>
        </div>
      </div>
    );
  }

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-4 gap-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 rounded-full bg-sand-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-earth-500" />
          </div>
          <p className="text-sm text-sand-500 max-w-[260px]">
            Ask me anything about your trip — recommendations, scheduling, packing tips, and more.
          </p>
        </div>
        {emptyStateSlot}
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
      {/* Load more indicator at top */}
      {hasMore && (
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
          <div className="bg-sand-50 border border-sand-200 rounded-2xl rounded-tl-sm px-4 py-3">
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
