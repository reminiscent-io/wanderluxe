import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AIChatMessage } from '@/types/ai-assistant';

interface ChatMessageProps {
  message: AIChatMessage;
  isStreaming?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming = false }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      className={cn(
        'flex gap-3 py-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-earth-500' : 'bg-sand-100'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Sparkles className="w-4 h-4 text-earth-600" />
        )}
      </div>

      {/* Message content */}
      <div
        className={cn(
          'flex flex-col max-w-[85%] min-w-0',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm',
            isUser
              ? 'bg-earth-500 text-white rounded-tr-sm'
              : 'bg-sand-50 text-earth-700 border border-sand-200 rounded-tl-sm'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-earth max-w-none break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Customize link styling
                  a: ({ ...props }) => (
                    <a
                      {...props}
                      className="text-earth-600 underline hover:text-earth-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                  // Customize code blocks
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code
                        className="bg-sand-100 px-1 py-0.5 rounded text-earth-700 text-xs"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code className={cn(className, 'text-xs')} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // Customize lists
                  ul: ({ ...props }) => (
                    <ul className="list-disc pl-4 space-y-1" {...props} />
                  ),
                  ol: ({ ...props }) => (
                    <ol className="list-decimal pl-4 space-y-1" {...props} />
                  ),
                  // Customize paragraphs
                  p: ({ ...props }) => (
                    <p className="mb-2 last:mb-0" {...props} />
                  )
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-earth-500 animate-pulse" />
              )}
            </div>
          )}
        </div>

        {/* Message footer */}
        <div
          className={cn(
            'flex items-center gap-2 mt-1 text-xs text-sand-500',
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span>{formatTime(message.created_at)}</span>

          {/* Copy button for assistant messages */}
          {!isUser && !isStreaming && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 w-6 p-0 text-sand-400 hover:text-earth-600 hover:bg-sand-100"
            >
              {copied ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
