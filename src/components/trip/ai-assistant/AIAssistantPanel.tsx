import React, { useState, useCallback, useMemo, Component, ReactNode } from 'react';
import { TreePalm, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FullScreenModal } from '@/components/ui/fullscreen-modal';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
  /**
   * Mobile: render the chat in a full-screen modal instead of a card. State
   * lives outside the modal, so closing it keeps the conversation.
   */
  fullscreen?: { open: boolean; onOpenChange: (open: boolean) => void };
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class AIAssistantErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AI Assistant Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <h3 className="font-display text-lg leading-tight tracking-tight text-foreground">Something went wrong</h3>
          <Button onClick={this.handleReset} variant="outline" size="sm" className="mt-1">
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
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

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ tripId, onCollapse, fullscreen }) => {
  const queryClient = useQueryClient();
  const { isKeyboardOpen } = useVisualViewport();
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallUsage, setPaywallUsage] = useState<AIUsageInfo | undefined>();
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);

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
    loadMoreMessages,
    loadHistory
  } = useAIAssistant({
    tripId,
    onLimitReached: handleLimitReached,
    onItemsExtracted: handleConversationItemsExtracted
  });

  const { isExtracting, extractDocument } = useDocumentExtraction();
  const isBusy = isStreaming || isExtracting;

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

        const items = await extractDocument(attachment);

        if (items) {
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

  const invalidateTripQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    queryClient.invalidateQueries({ queryKey: ['accommodations', tripId] });
    queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
    queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
    queryClient.invalidateQueries({ queryKey: ['reservations', tripId] });
  }, [queryClient, tripId]);

  // Handle import all items - directly performs the import
  const handleImportAll = useCallback(async (items: ExtractedItem[]) => {
    setIsImporting(true);
    try {
      const result = await bulkImportItems(tripId, items);

      if (result.successCount > 0) {
        toast.success(`Added ${result.successCount} item${result.successCount !== 1 ? 's' : ''} to your trip`);
        setExtractionMessages(prev => markItemsCreated(prev, items));
        invalidateTripQueries();
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
  }, [tripId, invalidateTripQueries]);

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
    if (status === 'created') invalidateTripQueries();
  }, [invalidateTripQueries]);

  const handleStepperComplete = useCallback(() => {
    setItemsToProcess([]);
  }, []);

  // Closing the full-screen chat mid-stream would orphan the reply.
  const onFullscreenChange = fullscreen?.onOpenChange;
  const handleFullscreenChange = useCallback((open: boolean) => {
    if (isBusy && !open) return;
    onFullscreenChange?.(open);
  }, [isBusy, onFullscreenChange]);

  const handleErrorBoundaryReset = useCallback(() => {
    setErrorBoundaryKey(prev => prev + 1);
  }, []);

  // limit === -1 means unlimited (the default for every signed-in account).
  const isDisabled = isBusy || (usage && (usage.tier === 'free' || usage.tier === 'anon') && usage.limit !== -1 && usage.used >= usage.limit);

  const collapse = fullscreen ? () => handleFullscreenChange(false) : onCollapse;

  const content = (
    <>
      {/* Header (full screen: clear the notch / PWA status bar) */}
      <div
        className={cn(
          'flex items-center justify-between gap-3 border-b border-border flex-shrink-0',
          fullscreen ? 'px-4 pb-2.5 bg-background' : 'px-4 py-3 bg-sand-50/60'
        )}
        style={fullscreen ? { paddingTop: 'max(env(safe-area-inset-top, 0px), 10px)' } : undefined}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn('rounded-full bg-earth-500 flex items-center justify-center shrink-0', fullscreen ? 'w-7 h-7' : 'w-8 h-8')}>
            <TreePalm className="w-4 h-4 text-background" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-[17px] leading-tight tracking-tight text-foreground">Trip Assistant</h2>
            <p className="text-[13px] leading-snug text-muted-foreground mt-0.5 truncate">Private to you, not shared with co-travelers</p>
          </div>
        </div>

        {collapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={collapse}
            className={cn('shrink-0 text-muted-foreground hover:text-foreground', fullscreen ? 'h-9 w-9' : 'h-8 w-8')}
            disabled={fullscreen ? isStreaming : undefined}
            title={fullscreen ? 'Minimize' : 'Collapse'}
            aria-label={fullscreen ? 'Minimize assistant' : 'Collapse assistant'}
          >
            <ChevronDown className={fullscreen ? 'w-5 h-5' : 'w-4 h-4'} />
          </Button>
        )}
      </div>

      <AIAssistantErrorBoundary key={errorBoundaryKey} onReset={handleErrorBoundaryReset}>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
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

          {error && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex-shrink-0">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Hidden while the on-screen keyboard is up, to save space */}
          {!isKeyboardOpen && (
            <div className="flex-shrink-0">
              <UsageMeter
                usage={usage}
                onUpgradeClick={() => setShowPaywall(true)}
              />
            </div>
          )}

          {/* First-run: the attach control is the least obvious thing in the app */}
          {!fullscreen && (
            <DiscoverHint hint="doc-import" className="mx-4 mb-2">
              Attach a booking confirmation with <span className="font-medium">+</span> and I'll
              read it into your trip.
            </DiscoverHint>
          )}

          {/* Bottom safe area only while the keyboard is closed (it covers the home indicator) */}
          <div
            className="flex-shrink-0 bg-background"
            style={{ paddingBottom: isKeyboardOpen ? 0 : 'env(safe-area-inset-bottom, 0px)' }}
          >
            <ChatInput
              onSend={handleSend}
              disabled={isDisabled}
              isSending={isBusy}
              placeholder={
                isDisabled && usage?.used === usage?.limit
                  ? (isAnonymous ? "Sign up free to keep chatting" : "Daily limit reached. Check back tomorrow.")
                  : "Ask about your trip..."
              }
            />
          </div>
        </div>
      </AIAssistantErrorBoundary>
    </>
  );

  return (
    <>
      {fullscreen ? (
        <FullScreenModal open={fullscreen.open} onOpenChange={handleFullscreenChange} closeOnOverlayClick={!isStreaming}>
          {content}
        </FullScreenModal>
      ) : (
        <div className="flex flex-col h-full bg-background rounded-card shadow-warm-sm border border-border overflow-hidden">
          {content}
        </div>
      )}

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        usage={paywallUsage || usage || undefined}
        isAnonymous={isAnonymous}
      />

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
