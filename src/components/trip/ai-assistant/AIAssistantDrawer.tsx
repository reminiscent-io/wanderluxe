import React, { useState, useCallback, useMemo, Component, ReactNode } from 'react';
import { FullScreenModal } from '@/components/ui/fullscreen-modal';
import { Sparkles, Trash2, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { bulkImportItems } from '@/services/bulkImportService';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';
import PromptChips from './PromptChips';
import UsageMeter from './UsageMeter';
import PaywallModal from './PaywallModal';
import ImportConfirmationDialog from './ImportConfirmationDialog';
import ItemStepperDialog from './ItemStepperDialog';
import type { AIUsageInfo, AIChatMessage, ExtractedItem } from '@/types/ai-assistant';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

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
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallUsage, setPaywallUsage] = useState<AIUsageInfo | undefined>();
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);

  // Extraction state (for chat-extracted items)
  const [extractionMessages, setExtractionMessages] = useState<AIChatMessage[]>([]);
  const [showStepperDialog, setShowStepperDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
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

  const allMessages = useMemo(() => {
    return [...chatMessages, ...extractionMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [chatMessages, extractionMessages]);

  const handleImportAll = useCallback((items: ExtractedItem[]) => {
    setItemsToProcess(items);
    setShowConfirmDialog(true);
  }, []);

  const handleConfirmImport = useCallback(async () => {
    setIsImporting(true);
    try {
      const result = await bulkImportItems(tripId, itemsToProcess);

      if (result.successCount > 0) {
        toast.success(`Added ${result.successCount} item${result.successCount !== 1 ? 's' : ''} to your trip`);
        setExtractionMessages(prev =>
          prev.map(msg => {
            if (msg.extractedItems) {
              return {
                ...msg,
                extractedItems: msg.extractedItems.map(item =>
                  itemsToProcess.some(i => i.id === item.id)
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
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to import items');
    } finally {
      setIsImporting(false);
      setShowConfirmDialog(false);
      setItemsToProcess([]);
    }
  }, [tripId, itemsToProcess, queryClient]);

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
    toast.success('All items have been processed');
  }, []);

  const handleClearChat = useCallback(() => {
    clearThread();
    setExtractionMessages([]);
  }, [clearThread]);

  const handleSend = useCallback(async (message: string) => {
    try {
      await sendMessage(message);
    } catch (err) {
      console.error('Unexpected error in handleSend:', err);
    }
  }, [sendMessage]);

  const handlePromptSelect = useCallback(async (prompt: string) => {
    try {
      await sendMessage(prompt);
    } catch (err) {
      console.error('Unexpected error in handlePromptSelect:', err);
    }
  }, [sendMessage]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (isStreaming && !newOpen) {
      return;
    }
    onOpenChange(newOpen);
  }, [isStreaming, onOpenChange]);

  const handleErrorBoundaryReset = useCallback(() => {
    setErrorBoundaryKey(prev => prev + 1);
  }, []);

  const isDisabled = isStreaming || (usage && usage.tier === 'free' && usage.used >= usage.limit);

  return (
    <>
      <FullScreenModal open={open} onOpenChange={handleOpenChange} closeOnOverlayClick={!isStreaming}>
        {/* Header with safe area padding for PWA/notch */}
        <div
          className="border-b border-sand-200 pb-3 px-4 flex-shrink-0"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-earth-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-left text-earth-700 font-semibold text-lg leading-none tracking-tight">Trip Assistant</h2>
                <p className="text-xs text-sand-500">AI-powered travel help</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Clear chat button */}
              {allMessages.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-sand-400 hover:text-red-500"
                      title="Clear chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all messages in this conversation.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearChat}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Clear
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* Minimize button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenChange(false)}
                className="h-8 w-8 p-0 text-sand-400 hover:text-earth-600"
                disabled={isStreaming}
                title="Minimize"
              >
                <ChevronDown className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

          <AIAssistantErrorBoundary key={errorBoundaryKey} onReset={handleErrorBoundaryReset}>
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Prompt chips - show when no messages */}
              {allMessages.length === 0 && !isLoading && (
                <div className="flex-shrink-0">
                  <PromptChips
                    onSelect={handlePromptSelect}
                    disabled={isDisabled}
                  />
                </div>
              )}

              {/* Messages area - scrollable with contained scroll behavior */}
              <div className="flex-1 min-h-0 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
                <ChatMessageList
                  messages={allMessages}
                  isLoading={isLoading}
                  isStreaming={isStreaming}
                  streamingContent={streamingContent}
                  hasMore={hasMore}
                  isLoadingMore={isLoadingMore}
                  onLoadMore={loadMoreMessages}
                  tripId={tripId}
                  onImportAll={handleImportAll}
                  onReviewEdit={handleReviewEdit}
                  isImporting={isImporting}
                />
              </div>

              {/* Error display */}
              {error && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex-shrink-0">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Usage meter */}
              <div className="flex-shrink-0">
                <UsageMeter
                  usage={usage}
                  onUpgradeClick={() => setShowPaywall(true)}
                />
              </div>

              {/* Input - with safe area padding for PWA bottom inset */}
              <div
                className="flex-shrink-0 bg-white"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              >
                <ChatInput
                  onSend={handleSend}
                  disabled={isDisabled}
                  isSending={isStreaming}
                  placeholder={
                    isDisabled && usage?.used === usage?.limit
                      ? "Daily limit reached. Upgrade for unlimited."
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

      {/* Import confirmation dialog */}
      <ImportConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        items={itemsToProcess}
        onConfirm={handleConfirmImport}
        isImporting={isImporting}
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
