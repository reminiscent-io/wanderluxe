import React, { useState, useCallback } from 'react';
import { Sparkles, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
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

interface AIAssistantPanelProps {
  tripId: string;
}

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ tripId }) => {
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallUsage, setPaywallUsage] = useState<AIUsageInfo | undefined>();
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const isDisabled = isStreaming || (usage && usage.tier === 'free' && usage.used >= usage.limit);

  return (
    <>
      <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-sand-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-sand-200 bg-gradient-to-r from-sand-50 to-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-earth-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-earth-700 text-sm">Trip Assistant</h3>
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

            {/* Input */}
            <ChatInput
              onSend={handleSend}
              disabled={isDisabled}
              isSending={isStreaming}
              placeholder={
                isDisabled && usage?.used === usage?.limit
                  ? "Daily limit reached. Upgrade for unlimited messages."
                  : "Ask about your trip..."
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
      />
    </>
  );
};

export default AIAssistantPanel;
