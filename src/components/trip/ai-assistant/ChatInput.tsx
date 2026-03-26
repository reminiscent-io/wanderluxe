import React, { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ChatFileAttachmentComponent from './ChatFileAttachment';
import type { ChatFileAttachment } from '@/types/ai-assistant';

interface ChatInputProps {
  onSend: (message: string, attachment?: ChatFileAttachment) => void;
  disabled?: boolean;
  placeholder?: string;
  isSending?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Ask about your trip...',
  isSending = false
}) => {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<ChatFileAttachment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Handle focus - wait for iOS keyboard to settle, then ensure input is visible
  const handleFocus = useCallback(() => {
    // On iOS PWA, the keyboard animation takes ~300ms. After it settles,
    // the FullScreenModal resizes via Visual Viewport API. We then scroll
    // the textarea into view *within the modal* (not the page) so paste
    // and text selection work properly.
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 350);
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    // Can send if has message OR has attachment
    if ((trimmed || attachment) && !disabled && !isSending) {
      onSend(trimmed, attachment || undefined);
      setMessage('');
      setAttachment(null);
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [message, attachment, disabled, isSending, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift) - but not on mobile touch keyboard
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Simply update the value without any validation
    setMessage(e.target.value);
  };

  const handleAttach = useCallback((att: ChatFileAttachment) => {
    setAttachment(att);
  }, []);

  const handleRemoveAttachment = useCallback(() => {
    setAttachment(null);
  }, []);

  // Can send if has message OR has attachment
  const canSend = (message.trim().length > 0 || attachment) && !disabled && !isSending;

  return (
    <div className="border-t border-sand-200 bg-background px-3 py-2">
      {/* Attachment preview */}
      {attachment && (
        <div className="mb-2 relative inline-block">
          <div className="relative rounded-lg overflow-hidden border border-sand-200 bg-background shadow-warm-sm">
            <img
              src={attachment.previewUrl}
              alt="Attachment preview"
              className="max-h-24 max-w-[160px] object-contain"
            />
            <button
              type="button"
              onClick={handleRemoveAttachment}
              disabled={disabled || isSending}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white border border-sand-200 shadow-warm-sm hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-sand-500"
            >
              <span className="sr-only">Remove</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {attachment.isConverted && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 flex items-center gap-1">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <ChatFileAttachmentComponent
          attachment={attachment}
          onAttach={handleAttach}
          onRemove={handleRemoveAttachment}
          disabled={disabled || isSending}
        />

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={attachment ? 'Add a message (optional)...' : placeholder}
            disabled={disabled || isSending}
            rows={1}
            autoComplete="off"
            autoCorrect="on"
            spellCheck="true"
            enterKeyHint="send"
            className={cn(
              'w-full resize-none rounded-xl border border-sand-200 bg-sand-50',
              'px-4 py-2.5 text-base md:text-sm text-earth-700 placeholder:text-sand-400',
              'focus:outline-none focus:ring-2 focus:ring-earth-500/20 focus:border-earth-500',
              'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              'max-h-[120px] overflow-y-auto'
            )}
          />
        </div>
        <Button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className={cn(
            'h-10 w-10 rounded-xl flex-shrink-0 transition-all',
            canSend
              ? 'bg-earth-500 hover:bg-earth-600 text-white'
              : 'bg-sand-100 text-sand-400 cursor-not-allowed'
          )}
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-sand-400 mt-2 px-1 hidden sm:block">
        {attachment ? 'Press Enter to extract items from document' : 'Press Enter to send, Shift+Enter for new line'}
      </p>
    </div>
  );
};

export default ChatInput;
