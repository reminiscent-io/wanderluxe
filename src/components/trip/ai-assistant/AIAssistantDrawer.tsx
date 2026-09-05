import React, { useState, useCallback, useMemo, Component, ReactNode } from 'react';
import { FullScreenModal } from '@/components/ui/fullscreen-modal';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { Sparkles, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useDocumentExtraction } from '@/hooks/useDocumentExtraction';
import { bulkImportItems } from '@/services/bulkImportService';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';
import PromptChips from './PromptChips';
import UsageMeter from './UsageMeter';
import PaywallModal from './PaywallModal';
import ItemStepperDialog from './ItemStepperDialog';
import type { AIUsageInfo, AIChatMessage, ChatFileAttachment, ExtractedItem } from '@/types/ai-assistant';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AIAssistantErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AI Assistant Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <div className="space-y-1">
            <h3 className="font-display text-lg leading-tight tracking-tight text-foreground">Something went wrong</h3>
          </div>
          <Button onClick={this.handleReset} variant="outline" size="sm" className="mt-1">
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface AIAssistantDrawerProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  tripId,
  open,
  onOpenChange
}) => {
  const queryClient = useQueryClient();
  const { isKeyboardOpen } = useVisualViewport();
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallUsage, setPaywallUsage] = useState<AIUsageInfo | undefined>();
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);

  // Extraction state (for chat-extracted items)
  const [extractionMessages, setExtractionMessages] = useState<AIChatMessage[]>([]);
  const [showStepperDialog, setShowStepperDialog] = useState(false);
  const [itemsToProcess, setItemsToProcess] = useState<ExtractedItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const handleLimitReached = useCallback((usage: AIUsageInfo) => {
    setPaywallUsage(usage);
    setShowPaywall(true);
  }, []);

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
    clearExtraction
  } = useDocumentExtraction();

  const allMessages = useMemo(() => {
    return [...chatMessages, ...extractionMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [chatMessages, extractionMessages]);

  const handleImportAll = useCallback(async (items: ExtractedItem[]) => {
    setIsImporting(true);
    try {
      const result = await bulkImportItems(tripId, items);

      if (result.successCount > 0) {
        toast.success(`Added ${result.successCount} item${result.successCount !== 1 ? 's' : ''} to your trip`);
        setExtractionMessages(prev =>
          prev.map(msg => {
            if (msg.extractedItems) {
              return {
                ...msg,
                extractedItems: msg.extractedItems.map(item =>
                  items.some(i => i.id === item.id)
                    ? { ...item, status: 'created' as const }
                    : item
                )
              };
            }
            return msg;
          })
        );
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

  const handleReviewEdit = useCallback((items: ExtractedItem[]) => {
    setItemsToProcess(items);
    setShowStepperDialog(true);
  }, []);

  const handleItemProcessed = useCallback((itemId: string, status: 'created' | 'skipped') => {
    setExtractionMessages(prev =>
      prev.map(msg => {
        if (msg.extractedItems) {
          return {
            ...msg,
            extractedItems: msg.extractedItems.map(item =>
              item.id === itemId ? { ...item, status } : item
            )
          };
        }
        return msg;
      })
    );
    if (status === 'created') {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['accommodations', tripId] });
      queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
      queryClient.invalidateQueries({ queryKey: ['activities', tripId] });
      queryClient.invalidateQueries({ queryKey: ['reservations', tripId] });
    }
  }, [tripId, queryClient]);

  const handleStepperComplete = useCallback(() => {
    setItemsToProcess([]);
  }, []);


  const handleSend = useCallback(async (message: string, attachment?: ChatFileAttachment) => {
    try {
      if (attachment) {
        // Create user message with attachment preview
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

        // Extract document via OCR
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

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if ((isStreaming || isExtracting) && !newOpen) {
      return;
    }
    onOpenChange(newOpen);
  }, [isStreaming, isExtracting, onOpenChange]);

  const handleErrorBoundaryReset = useCallback(() => {
    setErrorBoundaryKey(prev => prev + 1);
  }, []);

  // limit === -1 means unlimited (the default for every signed-in account).
  const isDisabled = isStreaming || isExtracting || (usage && (usage.tier === 'free' || usage.tier === 'anon') && usage.limit !== -1 && usage.used >= usage.limit);

  return (
    <>
      <FullScreenModal open={open} onOpenChange={handleOpenChange} closeOnOverlayClick={!isStreaming}>
        {/* Header with safe area padding for PWA/notch */}
        <div
          className="border-b border-border pb-2.5 px-4 flex-shrink-0 bg-background"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 10px)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-earth-500 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-background" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-[17px] leading-tight tracking-tight text-foreground">Trip Assistant</h2>
                <p className="text-[13px] leading-snug text-muted-foreground mt-0.5 truncate">Private to you, not shared with co-travelers</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenChange(false)}
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              disabled={isStreaming}
              title="Minimize"
              aria-label="Minimize assistant"
            >
              <ChevronDown className="w-5 h-5" />
            </Button>
          </div>
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
                tripId={tripId}
                onImportAll={handleImportAll}
                onReviewEdit={handleReviewEdit}
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
                <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex-shrink-0">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Usage meter - hidden when keyboard is open to save space */}
              {!isKeyboardOpen && (
                <div className="flex-shrink-0">
                  <UsageMeter
                    usage={usage}
                    onUpgradeClick={() => setShowPaywall(true)}
                  />
                </div>
              )}

              {/* Input - safe area padding only when keyboard is closed (keyboard covers the home indicator) */}
              <div
                className="flex-shrink-0 bg-background"
                style={{ paddingBottom: isKeyboardOpen ? 0 : 'env(safe-area-inset-bottom, 0px)' }}
              >
                <ChatInput
                  onSend={handleSend}
                  disabled={isDisabled}
                  isSending={isStreaming || isExtracting}
                  placeholder={
                    isDisabled && usage?.used === usage?.limit
                      ? (usage?.tier === 'anon' ? "Sign up free to keep chatting" : "Daily limit reached. Check back tomorrow.")
                      : "Ask about your trip..."
                  }
                />
              </div>
            </div>
          </AIAssistantErrorBoundary>
      </FullScreenModal>

      {/* Paywall modal */}
      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        usage={paywallUsage || usage || undefined}
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

export default AIAssistantDrawer;
