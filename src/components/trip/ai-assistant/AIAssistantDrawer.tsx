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
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <h3 className="font-medium text-earth-700 mb-2">Something went wrong</h3>
          <p className="text-sm text-sand-500 mb-4">
            The assistant encountered an unexpected error.
          </p>
          <Button onClick={this.handleReset} variant="outline" size="sm">
            Try Again
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
        ? "I've prepared this item for you to add to your trip:"
        : `I've prepared ${items.length} items for you to add to your trip:`,
      metadata: {},
      created_at: new Date().toISOString(),
      extractedItems: items,
      extractionMeta: {
        model: 'gpt-4o-mini',
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
    sendMessage,
    clearThread,
    loadMoreMessages
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
    } catch (e: any) {
      if (!e?.message?.includes('Failed to import')) {
        toast.error(e?.message || 'Failed to import items');
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
          content: message || 'Please extract items from this document',
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
              : "I couldn't find any bookable items in this document.",
            metadata: {},
            created_at: new Date().toISOString(),
            extractedItems: items,
            extractionMeta: {
              model: 'gpt-4o-mini',
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

  const isDisabled = isStreaming || isExtracting || (usage && (usage.tier === 'free' || usage.tier === 'anon') && usage.used >= usage.limit);

  return (
    <>
      <FullScreenModal open={open} onOpenChange={handleOpenChange} closeOnOverlayClick={!isStreaming}>
        {/* Header with safe area padding for PWA/notch */}
        <div
          className="border-b border-sand-200 pb-2 px-4 flex-shrink-0"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 10px)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-earth-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-left text-earth-700 font-display font-semibold text-base leading-none tracking-tight">Trip Assistant</h2>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              className="h-8 w-8 p-0 text-sand-600 hover:text-earth-600"
              disabled={isStreaming}
              title="Minimize"
            >
              <ChevronDown className="w-5 h-5 stroke-[3]" />
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
                className="flex-shrink-0 bg-white"
                style={{ paddingBottom: isKeyboardOpen ? 0 : 'env(safe-area-inset-bottom, 0px)' }}
              >
                <ChatInput
                  onSend={handleSend}
                  disabled={isDisabled}
                  isSending={isStreaming || isExtracting}
                  placeholder={
                    isDisabled && usage?.used === usage?.limit
                      ? "Daily limit reached. Upgrade for unlimited."
                      : "Ask about your trip or attach a booking..."
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
