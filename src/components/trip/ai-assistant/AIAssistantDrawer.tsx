import React, { useState, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Sparkles, Trash2, X } from 'lucide-react';
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
    sendMessage,
    clearThread
  } = useAIAssistant({
    tripId,
    onLimitReached: handleLimitReached
  });

  const handleSend = useCallback((message: string) => {
    sendMessage(message);
  }, [sendMessage]);

  const handlePromptSelect = useCallback((prompt: string) => {
    sendMessage(prompt);
  }, [sendMessage]);

  const isDisabled = isStreaming || (usage && usage.tier === 'free' && usage.used >= usage.limit);

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[85vh] max-h-[85vh]">
          <DrawerHeader className="border-b border-sand-200 pb-3">
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
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 p-0 text-sand-400 hover:text-earth-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DrawerHeader>

          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Prompt chips - show when no messages */}
            {messages.length === 0 && !isLoading && (
              <PromptChips
                onSelect={handlePromptSelect}
                disabled={isDisabled}
              />
            )}

            {/* Messages area */}
            <ChatMessageList
              messages={messages}
              isLoading={isLoading}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
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

            {/* Input - with extra padding for mobile bottom navigation */}
            <div className="pb-safe">
              <ChatInput
                onSend={handleSend}
                disabled={isDisabled}
                placeholder={
                  isDisabled && usage?.used === usage?.limit
                    ? "Daily limit reached. Upgrade for unlimited."
                    : "Ask about your trip..."
                }
              />
            </div>
          </div>
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
