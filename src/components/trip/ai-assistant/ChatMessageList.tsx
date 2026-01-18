import React, { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import { Loader2, Sparkles } from 'lucide-react';
import type { AIChatMessage } from '@/types/ai-assistant';

interface ChatMessageListProps {
  messages: AIChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isLoading,
  isStreaming,
  streamingContent
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or streaming content updates
  useEffect(() => {
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
      className="flex-1 overflow-y-auto px-4 py-2 space-y-1"
    >
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
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
