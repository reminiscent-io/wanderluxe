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
  // For extraction handling
  tripId?: string;
  onImportAll?: (items: ExtractedItem[]) => Promise<void>;
  onReviewEdit?: (items: ExtractedItem[]) => void;
  isImporting?: boolean;
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
  isImporting = false
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const hasInitialScrolled = useRef<boolean>(false);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0 && !hasInitialScrolled.current && scrollRef.current) {
      // Use instant scroll for initial load
      scrollRef.current.scrollIntoView({ behavior: 'instant' });
      hasInitialScrolled.current = true;
    }
  }, [messages]);

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

  // Auto-scroll to bottom when new messages arrive or streaming content updates
  useEffect(() => {
    // Skip if this is the initial load (handled by separate effect)
    if (!hasInitialScrolled.current) return;

    if (scrollRef.current && containerRef.current) {
      const container = containerRef.current;
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;

      // Always scroll when streaming, or when near bottom
      if (isStreaming || isNearBottom) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, streamingContent, isStreaming]);

  // Handle scroll to detect when user scrolls to top
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !hasMore || isLoadingMore || !onLoadMore) return;

    const container = containerRef.current;
    // Trigger load more when scrolled within 50px of top
    if (container.scrollTop < 50) {
      prevScrollHeightRef.current = container.scrollHeight;
      onLoadMore();
    }
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
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-sand-100 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-earth-500" />
          </div>
          <div>
            <h3 className="font-medium text-earth-700 mb-1">Trip Assistant</h3>
            <p className="text-sm text-sand-500">
              Ask me anything about your trip! I can help with recommendations,
              scheduling, packing tips, and more.
            </p>
          </div>
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
      className="flex-1 overflow-y-auto overscroll-contain px-4 py-2 space-y-1"
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
