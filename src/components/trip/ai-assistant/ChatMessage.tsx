import React, { useMemo, useState } from 'react';
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
import { stripCreateItemsForDisplay } from './chatContentSanitizer';
import type { AIChatMessage, ExtractedItem, PlaceCard } from '@/types/ai-assistant';

// Defined at module scope so the component functions aren't recreated on
// every ChatMessage render. safeHref() runs at render time on every link to
// strip AI-authored URLs that don't pass validation (see chatUrlSafety.ts).
//
// Scale is tuned for chat bubbles (14px body) with a real four-step ramp:
// serif at 18 / 16 carries narrative headings, sans-semibold takes over at
// 14 / 12 for sub-points and label-style eyebrows. Links break at word
// boundaries, code/quote containers stay warm and tonal.
const markdownComponents: Components = {
  // Headings — serif for h1/h2 (narrative weight), sans semibold for h3/h4
  h1: ({ ...props }) => (
    <h1 className="font-display text-lg leading-tight tracking-tight text-foreground mt-3 mb-1.5 first:mt-0" {...props} />
  ),
  h2: ({ ...props }) => (
    <h2 className="font-display text-base leading-snug tracking-tight text-foreground mt-3 mb-1.5 first:mt-0" {...props} />
  ),
  h3: ({ ...props }) => (
    <h3 className="font-sans font-semibold text-sm leading-snug tracking-tight text-foreground mt-2.5 mb-1 first:mt-0" {...props} />
  ),
  h4: ({ ...props }) => (
    <h4 className="font-sans font-semibold text-xs uppercase tracking-[0.06em] text-muted-foreground mt-2.5 mb-1 first:mt-0" {...props} />
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

  // Blockquote — tonal aside, italic for editorial voice contrast,
  // no side stripe (DESIGN.md absolute ban)
  blockquote: ({ ...props }) => (
    <blockquote
      className="my-2 rounded-md bg-sand-100/60 px-3 py-2 italic text-foreground/90 [&>p]:mb-0"
      {...props}
    />
  ),

  // Horizontal rule — quiet paper divider
  hr: ({ ...props }) => (
    <hr className="my-3 border-0 border-t border-border" {...props} />
  ),

  // Tables — warm chrome, full row dividers, tabular figures so numeric
  // columns align cleanly when the AI returns prices, durations, or counts
  table: ({ ...props }) => (
    <div className="my-2 -mx-1 overflow-x-auto">
      <table className="w-full text-xs tabular-nums" {...props} />
    </div>
  ),
  thead: ({ ...props }) => (
    <thead className="border-b border-border" {...props} />
  ),
  th: ({ ...props }) => (
    <th className="text-left font-semibold text-foreground px-2 py-1.5 tracking-tight normal-nums" {...props} />
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

  // Assistant content passes through the create_items display sanitizer so a
  // structured block never renders as raw JSON — neither mid-stream nor from
  // a historical message the server missed. User text is never touched.
  const displayContent = useMemo(
    () =>
      isUser
        ? message.content
        : stripCreateItemsForDisplay(message.content, { streaming: isStreaming }),
    [isUser, message.content, isStreaming]
  );

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
      await navigator.clipboard.writeText(displayContent);
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
        'group flex gap-3 py-3',
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
              'rounded-2xl px-4 py-2.5 text-sm leading-snug overflow-hidden',
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
            {displayContent.trim().length > 0 && (
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
                    {normalizeMarkdownListSpacing(displayContent)}
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

        {/* Message footer — the time + copy meta. Bound tight to the bubble
            (mt-0.5, indented to the bubble's edge) so it reads as that
            message's own line rather than a control orphaned in the gutter.
            With day dividers now anchoring the date, the per-message time is
            secondary: on hover-capable devices it stays out of the way until
            you focus the message; on touch it's always present so the copy
            target is reachable without a hover. */}
        {!hasExtractedItems && (
          <div
            className={cn(
              'flex items-center gap-1.5 mt-0.5 text-[11px] text-sand-500 transition-opacity duration-150',
              'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100',
              isUser ? 'flex-row-reverse pr-1.5' : 'flex-row pl-1.5'
            )}
          >
            <span className="tabular-nums">{formatTime(message.created_at)}</span>

            {/* Copy button for assistant messages — 44px touch target on
                mobile, collapsed back to inline-meta size on pointer devices. */}
            {!isUser && !isStreaming && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                aria-label={copied ? 'Copied' : 'Copy message'}
                className="h-11 w-11 sm:h-6 sm:w-6 -my-2 sm:my-0 p-0 text-sand-400 hover:text-earth-600 hover:bg-sand-100"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                ) : (
                  <Copy className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
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
