import React, { useEffect, useRef, useCallback, useMemo } from "react";
import ChatMessage from "./ChatMessage";
import { stripCreateItemsForDisplay } from "./chatContentSanitizer";
import { Loader2, Sparkles, ChevronUp } from "lucide-react";
import type {
  AIChatMessage,
  ExtractedItem,
  PlaceCard,
} from "@/types/ai-assistant";

// --- Chronological ordering + day anchoring -------------------------------
// Messages can arrive from three sources (server history, optimistic sends,
// extraction results) whose timestamps occasionally collide to the same
// millisecond — most often a user turn and its reply. A bare time sort leaves
// those ties to engine luck, which is how a reply can render above the
// question it answers. We own ordering here, at the render boundary, with a
// deterministic tiebreak so the transcript always reads top-to-bottom in send
// order regardless of how upstream merged it.

const sortTime = (m: AIChatMessage): number => {
  const t = new Date(m.created_at).getTime();
  return Number.isFinite(t) ? t : 0;
};

const bySendTime = (a: AIChatMessage, b: AIChatMessage): number => {
  const ta = sortTime(a);
  const tb = sortTime(b);
  if (ta !== tb) return ta - tb;
  // Same instant: the user's message leads its own turn, then fall back to a
  // stable id comparison so the order never shuffles between renders.
  if (a.role !== b.role) return a.role === "user" ? -1 : 1;
  return String(a.id).localeCompare(String(b.id));
};

const startOfDay = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const dayKey = (iso: string): number => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 0 : startOfDay(d);
};

// Locale-aware, relative where it helps: "Today" / "Yesterday" carry the most
// glance value; older days get the written month and only show the year when
// it isn't the current one. Intl keeps this correct across locales.
const formatDayLabel = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Earlier";

  const now = new Date();
  const today = startOfDay(now);
  const yesterday = (() => {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    return startOfDay(y);
  })();
  const msgDay = startOfDay(d);

  if (msgDay === today) return "Today";
  if (msgDay === yesterday) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  }).format(d);
};

interface DayGroup {
  key: number;
  label: string;
  items: AIChatMessage[];
}

// A floating, sticky date tab — opaque cream so messages scroll cleanly
// beneath it (no glass), the warm border + soft lift reading as a tab clipped
// to the top of the page rather than a banner across it.
const DayDivider: React.FC<{ label: string }> = ({ label }) => (
  <div className="sticky top-0 z-10 flex justify-center py-2 pointer-events-none">
    <span className="pointer-events-auto rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-sand-600 shadow-warm-sm">
      {label}
    </span>
  </div>
);

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
  emptyStateSlot,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Strictly ordered by send time, then split into per-day groups so each day
  // gets one sticky anchor. Done at render so the cache's merge order can't
  // leak a misordered transcript onto the screen.
  const dayGroups = useMemo<DayGroup[]>(() => {
    const sorted = [...messages].sort(bySendTime);
    const groups: DayGroup[] = [];
    for (const message of sorted) {
      const key = dayKey(message.created_at);
      const last = groups[groups.length - 1];
      if (last?.key === key) {
        last.items.push(message);
      } else {
        groups.push({
          key,
          label: formatDayLabel(message.created_at),
          items: [message],
        });
      }
    }
    return groups;
  }, [messages]);
  const prevScrollHeightRef = useRef<number>(0);
  const hasInitialScrolled = useRef<boolean>(false);
  const scrollThrottleRef = useRef<boolean>(false);
  const lastMessageCountRef = useRef<number>(0);

  // Reliable scroll-to-bottom using scrollTop on the container
  const scrollToBottom = useCallback((smooth = true) => {
    const container = containerRef.current;
    if (!container) return;

    if (smooth) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (
      messages.length > 0 &&
      !hasInitialScrolled.current &&
      containerRef.current
    ) {
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
    if (
      containerRef.current &&
      prevScrollHeightRef.current > 0 &&
      !isLoadingMore
    ) {
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
      if (newest?.role === "user") {
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

      // Load more when near top — only once the first history page is in
      // (historyLoaded), so pagination has a cursor to anchor on.
      if (
        historyLoaded &&
        hasMore &&
        !isLoadingMore &&
        onLoadMore &&
        container.scrollTop < 50
      ) {
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

  // "Show older chats" control — history normally auto-restores on mount
  // (useAIAssistant), so this only lingers while that first fetch is in
  // flight or as the manual retry after it failed. Once a page is in,
  // further loading hands off to the scroll-to-top behavior (hasMore).
  const showLoadHistoryButton = !historyLoaded && !!onLoadHistory;

  const loadHistoryControl = showLoadHistoryButton ? (
    <div className="flex justify-center py-2">
      <button
        type="button"
        onClick={onLoadHistory}
        disabled={isLoadingMore}
        className="flex items-center gap-1.5 text-[13px] text-sand-500 hover:text-earth-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-9 px-4 rounded-full hover:bg-sand-100"
      >
        {isLoadingMore ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Loading older chats…</span>
          </>
        ) : (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
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
            </div>
          </div>
          {emptyStateSlot}
          <p className="text-xs text-muted-foreground/80 max-w-[280px] text-center leading-relaxed">
            Trip details go to Google Gemini for recommendations. Messages are
            never used to train AI models.
          </p>
        </div>
      </div>
    );
  }

  // Create a streaming message if currently streaming. Sanitized here (not
  // just in ChatMessage) so a stream that is momentarily *only* a
  // create_items block falls back to the typing indicator below instead of
  // rendering an empty bubble.
  const visibleStreamingContent = isStreaming
    ? stripCreateItemsForDisplay(streamingContent, { streaming: true })
    : "";
  const streamingMessage: AIChatMessage | null =
    isStreaming && visibleStreamingContent
      ? {
          id: "streaming",
          thread_id: "",
          role: "assistant",
          content: visibleStreamingContent,
          metadata: {},
          created_at: new Date().toISOString(),
        }
      : null;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-2 space-y-1 touch-pan-y"
      style={{
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
      }}
    >
      {/* "Show older chats" button (before history loaded) */}
      {loadHistoryControl}

      {/* Load more indicator at top (after history loaded, more exist) */}
      {historyLoaded && hasMore && (
        <div className="flex justify-center py-2">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-sand-400 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading older chats…</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sand-400 text-xs">
              <ChevronUp className="w-3 h-3" />
              <span>Scroll up for more</span>
            </div>
          )}
        </div>
      )}

      {dayGroups.map((group) => (
        <section key={group.key} className="space-y-1">
          <DayDivider label={group.label} />
          {group.items.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onImportAll={onImportAll}
              onReviewEdit={onReviewEdit}
              onAddPlaceCard={onAddPlaceCard}
              isImporting={isImporting}
            />
          ))}
        </section>
      ))}

      {/* Show streaming message */}
      {streamingMessage && (
        <ChatMessage message={streamingMessage} isStreaming />
      )}

      {/* Show typing indicator when waiting for response but not yet streaming */}
      {isStreaming && !visibleStreamingContent && (
        <div className="flex gap-3 py-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sand-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-earth-600" />
          </div>
          <div className="bg-sand-50 border border-border rounded-2xl rounded-tl-sm px-4 py-3">
            <div className="flex gap-1">
              <span
                className="w-2 h-2 bg-earth-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-2 h-2 bg-earth-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-2 h-2 bg-earth-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
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
