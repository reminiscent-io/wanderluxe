import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Ask about your trip...'
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div className="border-t border-sand-200 bg-white p-3">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full resize-none rounded-xl border border-sand-200 bg-sand-50',
              'px-4 py-2.5 text-sm text-earth-700 placeholder:text-sand-400',
              'focus:outline-none focus:ring-2 focus:ring-earth-500/20 focus:border-earth-500',
              'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              'max-h-[120px] overflow-y-auto'
            )}
          />
        </div>
        <Button
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
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-sand-400 mt-2 px-1">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
};

export default ChatInput;
