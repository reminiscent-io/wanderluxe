import React, { useState, useCallback, useMemo } from 'react';
import { Sparkles, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
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
import ExtractionResultMessage from './ExtractionResultMessage';
import ItemStepperDialog from './ItemStepperDialog';
import type { AIUsageInfo, AIChatMessage, ChatFileAttachment, ExtractedItem } from '@/types/ai-assistant';
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

interface AIAssistantPanelProps {
  tripId: string;
}

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ tripId }) => {
  const queryClient = useQueryClient();
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallUsage, setPaywallUsage] = useState<AIUsageInfo | undefined>();
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    isAnonymous,
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
          content: message || 'Please extract items from this document',
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

        // Update the extraction messages to mark items as created
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
    } catch (e: any) {
      if (!e?.message?.includes('Failed to import')) {
        toast.error(e?.message || 'Failed to import items');
      }
      throw e;
    } finally {
      setIsImporting(false);
    }
  }, [tripId, queryClient]);

  // Handle review & edit flow
  const handleReviewEdit = useCallback((items: ExtractedItem[]) => {
    setItemsToProcess(items);
    setShowStepperDialog(true);
  }, []);

  // Handle individual item processed in stepper
  const handleItemProcessed = useCallback((itemId: string, status: 'created' | 'skipped') => {
    // Update item status in extraction messages
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

    // If created, invalidate queries
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
    toast.success('All items have been processed');
  }, []);

  // Handle clear chat - also clear extraction messages
  const handleClearChat = useCallback(async () => {
    try {
      await clearThread();
    } catch (e) {
      console.error('Failed to clear thread:', e);
    }
    setExtractionMessages([]);
    clearExtraction();
  }, [clearThread, clearExtraction]);

  const isDisabled = isStreaming || isExtracting || (usage && (usage.tier === 'free' || usage.tier === 'anon') && usage.used >= usage.limit);

  return (
    <>
      <div className="flex flex-col h-full bg-background rounded-lg shadow-warm-sm border border-sand-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-sand-200 bg-gradient-to-r from-sand-50 to-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-earth-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-earth-700 text-sm">Trip Assistant</h3>
              <p className="text-xs text-sand-500">AI-powered travel help & import</p>
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

            {/* Collapse toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0 text-sand-400 hover:text-earth-600"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Collapsible content */}
        {!isCollapsed && (
          <>
            {/* Prompt chips - show when no messages */}
            {allMessages.length === 0 && !isLoading && (
              <PromptChips
                onSelect={handlePromptSelect}
                disabled={isDisabled}
              />
            )}

            {/* Messages area */}
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

            {/* Input */}
            <ChatInput
              onSend={handleSend}
              disabled={isDisabled}
              isSending={isStreaming || isExtracting}
              placeholder={
                isDisabled && usage?.used === usage?.limit
                  ? (isAnonymous ? "Sign up free to keep chatting" : "Daily limit reached. Upgrade for unlimited messages.")
                  : "Ask about your trip or attach a booking..."
              }
            />
          </>
        )}
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
