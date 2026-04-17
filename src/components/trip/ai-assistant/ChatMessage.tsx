import React, { useState } from 'react';
import type { Components } from 'react-markdown';
import { cn } from '@/lib/utils';
import { Copy, Check, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ExtractionResultMessage from './ExtractionResultMessage';
import PlaceCardCarousel from './PlaceCardCarousel';
import { normalizeMarkdownListSpacing, safeHref } from './chatUrlSafety';
import type { AIChatMessage, ExtractedItem, PlaceCard } from '@/types/ai-assistant';

// Defined at module scope so the component functions aren't recreated on
// every ChatMessage render. safeHref() runs at render time on every link to
// strip AI-authored URLs that don't pass validation (see chatUrlSafety.ts).
const markdownComponents: Components = {
  a: ({ href, children, ...props }) => (
    <a
      {...props}
      href={safeHref(typeof href === 'string' ? href : '', typeof children === 'string' ? children : '')}
      className="text-earth-600 underline hover:text-earth-800 break-all"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    return isInline ? (
      <code
        className="bg-sand-100 px-1 py-0.5 rounded text-earth-700 text-xs break-all"
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
  pre: ({ ...props }) => (
    <pre className="overflow-x-auto max-w-full" {...props} />
  ),
  ul: ({ ...props }) => (
    <ul className="list-disc pl-4 space-y-1" {...props} />
  ),
  ol: ({ ...props }) => (
    <ol className="list-decimal pl-4 space-y-1" {...props} />
  ),
  p: ({ ...props }) => (
    <p className="mb-2 last:mb-0" {...props} />
  ),
  table: ({ ...props }) => (
    <div className="overflow-x-auto max-w-full">
      <table className="min-w-0" {...props} />
    </div>
  ),
  thead: ({ ...props }) => (
    <thead className="border-b border-sand-200" {...props} />
  ),
  th: ({ ...props }) => (
    <th className="text-left text-xs font-semibold text-earth-700 px-2 py-1" {...props} />
  ),
};

const markdownRemarkPlugins = [remarkGfm];

interface ChatMessageProps {
  message: AIChatMessage;
  isStreaming?: boolean;
  onImportAll?: (items: ExtractedItem[]) => Promise<void>;
  onReviewEdit?: (items: ExtractedItem[]) => void;
  onAddPlaceCard?: (card: PlaceCard) => Promise<void>;
  isImporting?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming = false,
  onImportAll,
  onReviewEdit,
  onAddPlaceCard,
  isImporting = false
}) => {
  const [copied, setCopied] = useState(false);
  const { avatarUrl, fullName, session } = useAuth();
  const isUser = message.role === 'user';
  const hasExtractedItems = message.extractedItems && message.extractedItems.length > 0;
  const hasPlaceCards = !isUser && Array.isArray(message.placeCards) && message.placeCards.length > 0;
  const hasAttachment = !!message.attachmentPreviewUrl;

  const getUserInitials = () => {
    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return fullName.substring(0, 2).toUpperCase();
    }
    return (session?.user?.email || 'U').substring(0, 2).toUpperCase();
  };

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
      {isUser ? (
        <Avatar className="flex-shrink-0 w-8 h-8">
          <AvatarImage src={avatarUrl || undefined} alt={fullName || 'You'} />
          <AvatarFallback className="bg-earth-500 text-white text-xs">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-sand-100">
          <Sparkles className="w-4 h-4 text-earth-600" />
        </div>
      )}

      {/* Message content */}
      <div
        className={cn(
          'flex flex-col max-w-[85%] min-w-0',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Attachment preview for user messages */}
        {isUser && hasAttachment && (
          <div className="mb-2 relative">
            <div className="relative rounded-lg overflow-hidden border border-earth-400/30 shadow-sm">
              <img
                src={message.attachmentPreviewUrl}
                alt="Attached document"
                className="max-h-32 max-w-[200px] object-contain"
              />
              {message.attachmentFileName?.toLowerCase().endsWith('.pdf') && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 flex items-center gap-1">
                  <FileText className="w-2.5 h-2.5" />
                  PDF
                </div>
              )}
            </div>
          </div>
        )}

        {/* User message bubble or Assistant message */}
        {isUser ? (
          <div
            className={cn(
              'rounded-2xl px-4 py-2.5 text-sm overflow-hidden',
              'bg-earth-500 text-white rounded-tr-sm'
            )}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        ) : hasExtractedItems ? (
          // Extraction result message
          <div className="w-full overflow-hidden">
            <ExtractionResultMessage
              items={message.extractedItems!}
              fileName={message.extractionMeta?.originalFileName}
              onImportAll={onImportAll || (async () => {})}
              onReviewEdit={onReviewEdit || (() => {})}
              isImporting={isImporting}
            />
          </div>
        ) : (
          // Regular assistant message
          <div className="w-full">
            {message.content.trim().length > 0 && (
              <div
                className={cn(
                  'rounded-2xl px-4 py-2.5 text-sm overflow-hidden',
                  'bg-sand-50 text-earth-700 border border-sand-200 rounded-tl-sm',
                  isStreaming && 'transition-all duration-150 ease-out'
                )}
              >
                <div className="prose prose-sm prose-earth max-w-full break-words overflow-wrap-anywhere">
                  <ReactMarkdown
                    remarkPlugins={markdownRemarkPlugins}
                    components={markdownComponents}
                  >
                    {normalizeMarkdownListSpacing(message.content)}
                  </ReactMarkdown>
                  {isStreaming && (
                    <span className="inline-block w-1 h-[1.1em] ml-0.5 rounded-full bg-earth-400/60 animate-pulse" />
                  )}
                </div>
              </div>
            )}
            {hasPlaceCards && (
              <PlaceCardCarousel
                cards={message.placeCards!}
                onAdd={onAddPlaceCard}
              />
            )}
          </div>
        )}

        {/* Message footer - hide for extraction result messages */}
        {!hasExtractedItems && (
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
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
