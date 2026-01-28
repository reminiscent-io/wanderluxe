import React, { useState, useCallback, useEffect, Component, ReactNode } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Sparkles, Trash2, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useVisualViewport } from '@/hooks/useVisualViewport';
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

  // Use visual viewport to handle mobile keyboard properly
  const viewport = useVisualViewport();

  // Lock body scroll when drawer is open to prevent background scrolling
  useEffect(() => {
    if (open) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

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
        <DrawerContent
          className="flex flex-col rounded-none border-none bg-white [&>div:first-child]:hidden"
          style={{
            // Use fixed positioning with visual viewport height
            // This ensures the drawer resizes correctly when keyboard opens
            position: 'fixed',
            top: `${viewport.offsetTop}px`,
            left: 0,
            right: 0,
            // Use visual viewport height to account for keyboard
            // Using explicit px value to override Tailwind !important classes
            height: `${viewport.height}px`,
            // Override the default bottom-0 from Vaul drawer
            bottom: 'auto',
            // Prevent any margin from default drawer styles
            marginTop: 0,
            // Higher z-index to ensure we're above the bottom navigation (z-50)
            zIndex: 100,
            // Prevent scroll chaining that causes content to escape bounds
            overscrollBehavior: 'contain',
            // Contain all content within bounds
            overflow: 'hidden',
            // Ensure consistent width
            maxWidth: '100vw',
            width: '100%',
            // Disable Vaul's transform animation that fights with our positioning
            transform: 'none',
          }}
        >
          {/* Header with safe area padding for PWA/notch */}
          <DrawerHeader
            className="border-b border-sand-200 pb-3 flex-shrink-0"
            style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
          >
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

              {/* Messages area - scrollable with contained scroll behavior */}
              <div className="flex-1 min-h-0 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
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
