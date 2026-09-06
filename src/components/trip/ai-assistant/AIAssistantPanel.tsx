import React, { useState, useCallback, useMemo } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useDocumentExtraction } from '@/hooks/useDocumentExtraction';
import { bulkImportItems } from '@/services/bulkImportService';
import { addPlaceCardItem, undoPlaceCardItem } from '@/services/placeCardAddService';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';
import PromptChips from './PromptChips';
import DiscoverHint from '@/components/discovery/DiscoverHint';
import UsageMeter from './UsageMeter';
import PaywallModal from './PaywallModal';
import ItemStepperDialog from './ItemStepperDialog';
import type { AIUsageInfo, AIChatMessage, ChatFileAttachment, ExtractedItem, PlaceCard } from '@/types/ai-assistant';

interface AIAssistantPanelProps {
  tripId: string;
  /** Renders a collapse button in the header when provided (desktop dock). */
  onCollapse?: () => void;
}

function markItemsCreated(
  messages: AIChatMessage[],
  importedItems: ExtractedItem[]
): AIChatMessage[] {
  const importedIds = new Set(importedItems.map(i => i.id));
  return messages.map(msg => {
    if (!msg.extractedItems) return msg;
    return {
      ...msg,
      extractedItems: msg.extractedItems.map(item =>
        importedIds.has(item.id) ? { ...item, status: 'created' as const } : item
      )
    };
  });
}

function applyItemStatusUpdate(
  messages: AIChatMessage[],
  itemId: string,
  status: 'created' | 'skipped'
): AIChatMessage[] {
  return messages.map(msg => {
    if (!msg.extractedItems) return msg;
    return {
      ...msg,
      extractedItems: msg.extractedItems.map(item =>
        item.id === itemId ? { ...item, status } : item
      )
    };
  });
}

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ tripId, onCollapse }) => {
  const queryClient = useQueryClient();
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallUsage, setPaywallUsage] = useState<AIUsageInfo | undefined>();

  // Extraction state
  const [extractionMessages, setExtractionMessages] = useState<AIChatMessage[]>([]);
  const [showStepperDialog, setShowStepperDialog] = useState(false);
  const [itemsToProcess, setItemsToProcess] = useState<ExtractedItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const handleLimitReached = useCallback((usage: AIUsageInfo) => {
    setPaywallUsage(usage);
    setShowPaywall(true);
  }, []);

  // Handle items extracted from conversation (when AI detects "add X to my trip")
  const handleConversationItemsExtracted = useCallback((items: ExtractedItem[]) => {
    // Create an assistant message with the extracted items
    const extractionMessage: AIChatMessage = {
      id: `assistant-conv-extract-${Date.now()}`,
      thread_id: '',
      role: 'assistant',
      content: items.length === 1
        ? "I've prepared this item:"
        : `I've prepared ${items.length} items:`,
      metadata: {},
      created_at: new Date().toISOString(),
      extractedItems: items,
      extractionMeta: {
        pagesUsed: 0,
        originalFileName: 'conversation'
      }
    };

    setExtractionMessages(prev => [...prev, extractionMessage]);
  }, []);

  const {
    messages: chatMessages,
    isLoading,
    isStreaming,
    streamingContent,
    error,
    usage,
    hasMore,
    isLoadingMore,
    isAnonymous,
    historyLoaded,
    sendMessage,
    clearThread,
    loadMoreMessages,
    loadHistory
  } = useAIAssistant({
    tripId,
    onLimitReached: handleLimitReached,
    onItemsExtracted: handleConversationItemsExtracted
  });

  const {
    isExtracting,
    extractDocument,
    updateItemStatus,
    clearExtraction
  } = useDocumentExtraction();

  // Combine chat messages with extraction messages
  const allMessages = useMemo(() => {
    return [...chatMessages, ...extractionMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [chatMessages, extractionMessages]);

  // Handle sending message with optional file attachment
  const handleSend = useCallback(async (message: string, attachment?: ChatFileAttachment) => {
    try {
      if (attachment) {
        // Create user message with attachment
        const userMessage: AIChatMessage = {
          id: `user-extract-${Date.now()}`,
          thread_id: '',
          role: 'user',
          content: message || 'Extract items from this document',
          metadata: {},
          created_at: new Date().toISOString(),
          attachmentPreviewUrl: attachment.previewUrl,
          attachmentFileName: attachment.file.name
        };

        setExtractionMessages(prev => [...prev, userMessage]);

        // Extract document
        const items = await extractDocument(attachment);

        if (items) {
          // Create assistant message with extracted items
          const assistantMessage: AIChatMessage = {
            id: `assistant-extract-${Date.now()}`,
            thread_id: '',
            role: 'assistant',
            content: items.length > 0
              ? `I found ${items.length} item${items.length !== 1 ? 's' : ''} in your document.`
              : "I didn't find any travel details in your document.",
            metadata: {},
            created_at: new Date().toISOString(),
            extractedItems: items,
            extractionMeta: {
              pagesUsed: 1,
              originalFileName: attachment.file.name
            }
          };

          setExtractionMessages(prev => [...prev, assistantMessage]);
        }
      } else if (message.trim()) {
        // Regular text message
        await sendMessage(message);
      }
    } catch (err) {
      console.error('Unexpected error in handleSend:', err);
    }
  }, [sendMessage, extractDocument]);

  const handlePromptSelect = useCallback(async (prompt: string) => {
    try {
      await sendMessage(prompt);
    } catch (err) {
      console.error('Unexpected error in handlePromptSelect:', err);
    }
  }, [sendMessage]);

  // Handle import all items - directly performs the import
  const handleImportAll = useCallback(async (items: ExtractedItem[]) => {
    setIsImporting(true);
    try {
      const result = await bulkImportItems(tripId, items);

      if (result.successCount > 0) {
        toast.success(`Added ${result.successCount} item${result.successCount !== 1 ? 's' : ''} to your trip`);

        setExtractionMessages(prev => markItemsCreated(prev, items));

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
        queryClient.invalidateQueries({ queryKey: ['accommodations', tripId] });
        queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
        queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
        queryClient.invalidateQueries({ queryKey: ['reservations', tripId] });
      }

      if (result.failedCount > 0) {
        toast.error(`Failed to import ${result.failedCount} item${result.failedCount !== 1 ? 's' : ''}`);
        throw new Error(`Failed to import ${result.failedCount} item(s)`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '';
      if (!message.includes('Failed to import')) {
        toast.error(message || 'Failed to import items');
      }
      throw e;
    } finally {
      setIsImporting(false);
    }
  }, [tripId, queryClient]);

  const invalidateTripQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    queryClient.invalidateQueries({ queryKey: ['accommodations', tripId] });
    queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
    queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
    queryClient.invalidateQueries({ queryKey: ['reservations', tripId] });
  }, [queryClient, tripId]);

  // One-tap add from a place card. Date/time validation already happened on
  // the server (suggested_add is stripped when invalid), so this path should
  // only fire for cards we know can be added. Shows an undo toast for 5s.
  const handleAddPlaceCard = useCallback(async (card: PlaceCard): Promise<void> => {
    try {
      const added = await addPlaceCardItem(tripId, card);
      invalidateTripQueries();
      toast.success(`Added ${added.label} to your trip`, {
        action: {
          label: 'Undo',
          onClick: () => {
            undoPlaceCardItem(added)
              .then(() => {
                invalidateTripQueries();
                toast.message('Removed from trip');
              })
              .catch((e) => toast.error(e?.message || 'Undo failed'));
          },
        },
        duration: 5000,
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not add this recommendation');
      throw e;
    }
  }, [tripId, invalidateTripQueries]);

  // Handle review & edit flow
  const handleReviewEdit = useCallback((items: ExtractedItem[]) => {
    setItemsToProcess(items);
    setShowStepperDialog(true);
  }, []);

  // Handle individual item processed in stepper
  const handleItemProcessed = useCallback((itemId: string, status: 'created' | 'skipped') => {
    setExtractionMessages(prev => applyItemStatusUpdate(prev, itemId, status));

    if (status === 'created') {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['accommodations', tripId] });
      queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
      queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
      queryClient.invalidateQueries({ queryKey: ['reservations', tripId] });
    }
  }, [tripId, queryClient]);

  // Handle stepper complete
  const handleStepperComplete = useCallback(() => {
    setItemsToProcess([]);
  }, []);

  // Handle clear chat - also clear extraction messages

  // limit === -1 means unlimited (the default for every signed-in account).
  const isDisabled = isStreaming || isExtracting || (usage && (usage.tier === 'free' || usage.tier === 'anon') && usage.limit !== -1 && usage.used >= usage.limit);

  return (
    <>
      <div className="flex flex-col h-full bg-background rounded-card shadow-warm-sm border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sand-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-earth-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-background" />
            </div>
            <div>
              <h3 className="font-display text-[17px] leading-tight tracking-tight text-foreground">Trip Assistant</h3>
              <p className="text-[13px] leading-snug text-muted-foreground mt-0.5">Private to you, not shared with co-travelers</p>
            </div>
          </div>

          {onCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCollapse}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Collapse"
              aria-label="Collapse assistant"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Content — always rendered; visibility is the dock's job */}
        <>
          {/* Messages area */}
            <ChatMessageList
              messages={allMessages}
              isLoading={isLoading || isExtracting}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={loadMoreMessages}
              historyLoaded={historyLoaded}
              onLoadHistory={loadHistory}
              tripId={tripId}
              onImportAll={handleImportAll}
              onReviewEdit={handleReviewEdit}
              onAddPlaceCard={handleAddPlaceCard}
              isImporting={isImporting}
              emptyStateSlot={
                <PromptChips
                  onSelect={handlePromptSelect}
                  disabled={isDisabled}
                />
              }
            />

            {/* Error display */}
            {error && (
              <div className="px-4 py-2 bg-red-50 border-t border-red-100">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Usage meter */}
            <UsageMeter
              usage={usage}
              onUpgradeClick={() => setShowPaywall(true)}
            />

            {/* First-run: the attach control is the least obvious thing in the app */}
            <DiscoverHint hint="doc-import" className="mx-4 mb-2">
              Attach a booking confirmation with <span className="font-medium">+</span> and I'll
              read it into your trip.
            </DiscoverHint>

            {/* Input */}
            <ChatInput
              onSend={handleSend}
              disabled={isDisabled}
              isSending={isStreaming || isExtracting}
              placeholder={
                isDisabled && usage?.used === usage?.limit
                  ? (isAnonymous ? "Sign up free to keep chatting" : "Daily limit reached. Check back tomorrow.")
                  : "Ask about your trip..."
              }
            />
        </>
      </div>

      {/* Paywall modal */}
      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        usage={paywallUsage || usage || undefined}
        isAnonymous={isAnonymous}
      />

      {/* Item stepper dialog for review & edit */}
      <ItemStepperDialog
        open={showStepperDialog}
        onOpenChange={setShowStepperDialog}
        items={itemsToProcess}
        tripId={tripId}
        onItemProcessed={handleItemProcessed}
        onComplete={handleStepperComplete}
      />
    </>
  );
};

export default AIAssistantPanel;
