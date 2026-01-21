import React, { useState, useCallback, Component, ReactNode } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Sparkles, Trash2, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';
import PromptChips from './PromptChips';
import UsageMeter from './UsageMeter';
import PaywallModal from './PaywallModal';
import type { AIUsageInfo } from '@/types/ai-assistant';
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
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallUsage, setPaywallUsage] = useState<AIUsageInfo | undefined>();
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);

  const handleLimitReached = useCallback((usage: AIUsageInfo) => {
    setPaywallUsage(usage);
    setShowPaywall(true);
  }, []);

  const {
    messages,
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
    onLimitReached: handleLimitReached
  });

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
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="h-[85svh] max-h-[85svh] flex flex-col">
          <DrawerHeader className="border-b border-sand-200 pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-earth-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <DrawerTitle className="text-left text-earth-700">Trip Assistant</DrawerTitle>
                  <p className="text-xs text-sand-500">AI-powered travel help</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Clear chat button */}
                {messages.length > 0 && (
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
                          onClick={clearThread}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Clear
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Close button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenChange(false)}
                  className="h-8 w-8 p-0 text-sand-400 hover:text-earth-600"
                  disabled={isStreaming}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DrawerHeader>

          <AIAssistantErrorBoundary key={errorBoundaryKey} onReset={handleErrorBoundaryReset}>
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Prompt chips - show when no messages */}
              {messages.length === 0 && !isLoading && (
                <div className="flex-shrink-0">
                  <PromptChips
                    onSelect={handlePromptSelect}
                    disabled={isDisabled}
                  />
                </div>
              )}

              {/* Messages area - scrollable */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <ChatMessageList
                  messages={messages}
                  isLoading={isLoading}
                  isStreaming={isStreaming}
                  streamingContent={streamingContent}
                  hasMore={hasMore}
                  isLoadingMore={isLoadingMore}
                  onLoadMore={loadMoreMessages}
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

              {/* Input - with extra padding for mobile bottom navigation */}
              <div className="flex-shrink-0 pb-safe">
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
        </DrawerContent>
      </Drawer>

      {/* Paywall modal */}
      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        usage={paywallUsage || usage || undefined}
      />
    </>
  );
};

export default AIAssistantDrawer;
