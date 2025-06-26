import React, { useRef, useState, useEffect, memo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatLogsKey, useChat } from '@/hooks/useChat';
import type { ChatLogRow } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, ClipboardCopy, Loader2, Paperclip, Send, Upload, User, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchEventSource } from '@microsoft/fetch-event-source';

const MAX_BUBBLE_WIDTH = '65ch';
const API_ENDPOINT = 'https://arnengxblsfnezrqcsxw.functions.supabase.co/chat-ai';

interface ChatMessageDB {
  id: string;
  role: 'user' | 'ai';
  message: string;
  timestamp: string;
  extractedData?: unknown;
  attachments?: { type: 'image' | 'pdf'; url: string; name: string }[];
}



interface ChatViewProps { tripId: string }

/* ------------------------------------------------------------------ */
/* main component                                                     */
/* ------------------------------------------------------------------ */
const ChatView: React.FC<ChatViewProps> = ({ tripId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: rawMessages = [], isLoading, addMessage } = useChat(tripId);
  
  // Transform raw messages to match ChatMessageDB interface
  const messages: ChatMessageDB[] = rawMessages
    .filter((msg: ChatLogRow) => msg && msg.id && msg.role && msg.message && msg.timestamp)
    .map((msg: ChatLogRow) => ({
      id: msg.id,
      role: msg.role as 'user' | 'ai',
      message: msg.message,
      timestamp: msg.timestamp,
      extractedData: msg.embedding,
      attachments: undefined // Will add attachment support later
    }));

  const [text, setText] = useState('');
  const [uploads, setUploads] = useState<File[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  
  // Debounce stream buffer updates to improve typing performance
  const [displayBuffer, setDisplayBuffer] = useState('');
  
  useEffect(() => {
    if (streamBuffer) {
      const timer = setTimeout(() => setDisplayBuffer(streamBuffer), 50);
      return () => clearTimeout(timer);
    } else {
      setDisplayBuffer('');
    }
  }, [streamBuffer]);

  /* auto-scroll to bottom */
  const scrollBottom = () => scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollBottom, [messages, streamBuffer]);

  /* ------------------------------ file helpers */
  const okTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  const validate = (f: File) =>
    !okTypes.includes(f.type) ? 'Only JPG, PNG or PDF'
      : f.size > 10 * 1024 * 1024 ? 'Max 10 MB'
      : null;

  const uploadToSupabase = async (f: File) => {
    const ext = f.name.split('.').pop();
    const key = `${user!.id}/${tripId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('chat-attachments').upload(key, f);
    if (error) throw error;
    const { data } = supabase.storage.from('chat-attachments').getPublicUrl(key);
    return { url: data.publicUrl, type: f.type.startsWith('image/') ? 'image' : 'pdf', name: f.name };
  };

  /* ------------------------------ mutation send */
  const { mutate: send, isPending: isSending } = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      /* 1. upload files */
      const attachments = await Promise.all(uploads.map(uploadToSupabase));

      /* 2. prepare request */
      const body = JSON.stringify({ message: text.trim(), tripId, attachments, stream: true });
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      /* 3. open stream */
      setIsStreaming(true);
      setStreamBuffer('');

      try {
        await fetchEventSource(API_ENDPOINT, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body,

          async onopen(res) {
            const ct = res.headers.get('Content-Type') ?? '';
            if (ct.startsWith('text/event-stream')) return; // OK
            // Server responded with JSON -> toast & abort
            const err = await res.json().catch(() => ({}));
            toast({
              title: `Chat error (${res.status})`,
              description: err.error ?? 'Unexpected response',
              variant: 'destructive',
            });
            throw new DOMException('stream aborted', 'AbortError');
          },

          onmessage(ev) {
            if (ev.event === 'chunk') {
              setStreamBuffer(prev => prev + ev.data);
            }
            if (ev.event === 'eom') {
              qc.setQueryData(chatLogsKey(tripId), (old: any[] = []) => [...old, JSON.parse(ev.data)]);
              setStreamBuffer('');
              setDisplayBuffer('');
            }
          },

          onclose() { setIsStreaming(false); },

          onerror(err) {
            if (err?.name !== 'AbortError') {
              console.error(err);
              toast({ title: 'Send failed', description: String(err), variant: 'destructive' });
            }
            setIsStreaming(false);
          },
        });
      } catch (err) {
        // swallow only our intentional AbortError
        if (err?.name !== 'AbortError') throw err;
      }
    },
    onSuccess() {
      setText('');
      setUploads([]);
    },
  });

  /* ------------------------------ render */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-earth-500" />
        <span className="ml-2 text-earth-600">Loading chat…</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* header */}
      <header className="mb-4">
        <h3 className="text-lg font-semibold text-earth-800">Trip Assistant</h3>
        <p className="text-sm text-earth-600">Ask anything or drop receipts to import</p>
      </header>

      {/* messages */}
      <Card className="flex-1 mb-4">
        <CardContent className="p-0">
          <ScrollArea className="h-96 p-4">
            <div className="space-y-4">
              {messages.map(m => (
                <MemoBubble key={m.id} msg={m} isUser={m.role === 'user'} user={user} />
              ))}
              {isStreaming && streamBuffer && (
                <MemoBubble
                  key="stream"
                  msg={{ id: 'stream', role: 'ai', message: streamBuffer, timestamp: new Date().toISOString() }}
                  isUser={false}
                  user={user}
                />
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* upload preview */}
      {uploads.length > 0 && (
        <div className="mb-3 p-3 bg-earth-50 border border-earth-200 rounded-md space-y-2">
          {uploads.map(f => (
            <div key={f.name} className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              <span className="text-sm">{f.name}</span>
              <button onClick={() => setUploads(u => u.filter(x => x !== f))} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* input bar */}
      <ChatBar
        text={text}
        setText={setText}
        uploads={uploads}
        setUploads={setUploads}
        onSend={send}
        disabled={isSending || isStreaming}
        validate={validate}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Bubble (memoised)                                                  */
/* ------------------------------------------------------------------ */
const Bubble = ({ msg, isUser, user }: { msg: ChatMessageDB; isUser: boolean; user: any }) => (
  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-full`}>
      <Avatar className="w-8 h-8">
        {isUser ? (
          <>
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
          </>
        ) : (
          <AvatarFallback className="bg-earth-500 text-white"><Bot className="w-4 h-4" /></AvatarFallback>
        )}
      </Avatar>

      <div
        className={`rounded-lg p-3 ${isUser ? 'bg-earth-500 text-white' : 'bg-gray-100 text-gray-800'}`}
        style={{ maxWidth: MAX_BUBBLE_WIDTH }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => (
              <a href={href!} target="_blank" rel="noopener noreferrer" className="text-earth-600 hover:text-earth-700 font-medium">
                {children}
              </a>
            ),
            code: ({ children, className }) => {
              const isInlineCode = !className;
              if (isInlineCode) {
                return (
                  <code className="bg-gray-200 px-1 rounded text-sm">
                    {children}
                  </code>
                );
              }
              // Block code with copy functionality using span instead of button to avoid nesting
              return (
                <div className="relative group">
                  <code className="block bg-gray-200 p-2 rounded text-sm overflow-x-auto">
                    {children}
                  </code>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(String(children));
                    }}
                    className="absolute top-2 right-2 p-1 hover:bg-gray-300 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        navigator.clipboard.writeText(String(children));
                      }
                    }}
                  >
                    <ClipboardCopy className="w-3 h-3 text-gray-500" />
                  </span>
                </div>
              );
            },
          }}
        >
          {msg.message}
        </ReactMarkdown>
        <p
          className={`text-xs mt-2 ${isUser ? 'text-earth-200' : 'text-gray-500'}`}
          title={new Date(msg.timestamp).toLocaleString()}
        >
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  </div>
);
const MemoBubble = memo(Bubble);

/* ------------------------------------------------------------------ */
/* ChatBar                                                             */
/* ------------------------------------------------------------------ */
function ChatBar({
  text, setText, uploads, setUploads, onSend, disabled, validate,
}: {
  text: string;
  setText: (s: string) => void;
  uploads: File[];
  setUploads: React.Dispatch<React.SetStateAction<File[]>>;
  onSend: () => void;
  disabled: boolean;
  validate: (f: File) => string | null;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const list: File[] = [];
    Array.from(files).forEach(f => {
      const err = validate(f);
      if (err) {
        toast({ title: 'Invalid file', description: err, variant: 'destructive' });
      } else {
        list.push(f);
      }
    });
    setUploads(prev => [...prev, ...list]);
  };

  return (
    <div className="flex gap-2">
      <input type="file" ref={fileRef} hidden multiple accept="image/*,.pdf" onChange={e => handleFiles(e.target.files)} />
      <Button variant="outline" size="icon" onClick={() => fileRef.current?.click()} disabled={disabled}>
        <Upload className="w-4 h-4" />
      </Button>

      <Input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type a message…"
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        disabled={disabled}
        className="flex-1"
      />

      <Button
        onClick={onSend}
        size="icon"
        disabled={disabled || (!text.trim() && uploads.length === 0)}
        className="bg-earth-500 hover:bg-earth-600"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default ChatView;
