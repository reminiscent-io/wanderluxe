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
//
// Scale is tuned for chat bubbles (14px body): two-step heading rhythm
// (serif at base, semibold sans for sub-headings), tonal warm code/quote
// containers, and quiet links that break at word boundaries — never mid-word.
const markdownComponents: Components = {
  // Headings — tight bubble-aware scale, serif for h1–h3
  h1: ({ ...props }) => (
    <h1 className="font-display text-base leading-snug tracking-tight text-foreground mt-3 mb-1.5 first:mt-0" {...props} />
  ),
  h2: ({ ...props }) => (
    <h2 className="font-display text-base leading-snug tracking-tight text-foreground mt-3 mb-1.5 first:mt-0" {...props} />
  ),
  h3: ({ ...props }) => (
    <h3 className="font-display text-sm leading-snug tracking-tight text-foreground mt-2.5 mb-1 first:mt-0" {...props} />
  ),
  h4: ({ ...props }) => (
    <h4 className="font-semibold text-sm leading-snug text-foreground mt-2.5 mb-1 first:mt-0" {...props} />
  ),

  // Paragraphs — preserve rhythm even without prose plugin
  p: ({ ...props }) => (
    <p className="leading-relaxed mb-2 last:mb-0" {...props} />
  ),

  // Lists — comfy hang, quiet bullet color, breathing room
  ul: ({ ...props }) => (
    <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-0.5 marker:text-sand-400" {...props} />
  ),
  ol: ({ ...props }) => (
    <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-0.5 marker:text-sand-500" {...props} />
  ),
  li: ({ ...props }) => (
    <li className="leading-relaxed" {...props} />
  ),

  // Links — subordinate to body, hover reveals stronger underline
  a: ({ href, children, ...props }) => (
    <a
      {...props}
      href={safeHref(typeof href === 'string' ? href : '', typeof children === 'string' ? children : '')}
      className="font-medium text-earth-700 underline decoration-sand-300 decoration-1 underline-offset-[3px] hover:decoration-earth-500 transition-colors break-words"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),

  // Inline code — relative size so it sits well in any parent
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    return isInline ? (
      <code
        className="font-mono text-[0.85em] rounded bg-sand-100 px-1.5 py-[1px] text-foreground break-words"
        {...props}
      >
        {children}
      </code>
    ) : (
      <code className={cn(className, 'font-mono text-xs leading-relaxed')} {...props}>
        {children}
      </code>
    );
  },

  // Code block — warm tonal container, scrollable
  pre: ({ children, ...props }) => (
    <pre
      className="my-2 overflow-x-auto rounded-md border border-border bg-sand-50/80 p-3 text-xs font-mono leading-relaxed text-foreground"
      {...props}
    >
      {children}
    </pre>
  ),

  // Blockquote — tonal aside, no side stripe (DESIGN.md absolute ban)
  blockquote: ({ ...props }) => (
    <blockquote
      className="my-2 rounded-md bg-sand-100/60 px-3 py-2 text-foreground/90 [&>p]:mb-0"
      {...props}
    />
  ),

  // Horizontal rule — quiet paper divider
  hr: ({ ...props }) => (
    <hr className="my-3 border-0 border-t border-border" {...props} />
  ),

  // Tables — warm chrome, full row dividers
  table: ({ ...props }) => (
    <div className="my-2 -mx-1 overflow-x-auto">
      <table className="w-full text-xs" {...props} />
    </div>
  ),
  thead: ({ ...props }) => (
    <thead className="border-b border-border" {...props} />
  ),
  th: ({ ...props }) => (
    <th className="text-left font-semibold text-foreground px-2 py-1.5" {...props} />
  ),
  td: ({ ...props }) => (
    <td className="align-top px-2 py-1.5 border-b border-border/50 last:border-b-0" {...props} />
  ),

  // Emphasis — keep contrast warm, no slate fallback
  strong: ({ ...props }) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: ({ ...props }) => (
    <em className="italic text-foreground/95" {...props} />
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
          <AvatarFallback className="bg-earth-500 text-background text-xs">
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
            <div className="relative rounded-md overflow-hidden border border-border shadow-warm-sm">
              <img
                src={message.attachmentPreviewUrl}
                alt="Attached document"
                className="max-h-32 max-w-[200px] object-contain"
              />
              {message.attachmentFileName?.toLowerCase().endsWith('.pdf') && (
                <div className="absolute bottom-0 left-0 right-0 bg-foreground/70 text-background text-[10px] px-1.5 py-0.5 flex items-center gap-1">
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
              'bg-earth-500 text-background rounded-tr-sm'
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
                  'bg-sand-50 text-foreground border border-border rounded-tl-sm',
                  isStreaming && 'transition-all duration-150 ease-out'
                )}
              >
                <div className="max-w-full break-words overflow-wrap-anywhere text-sm leading-relaxed text-foreground">
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
            <span className="tabular-nums">{formatTime(message.created_at)}</span>

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
