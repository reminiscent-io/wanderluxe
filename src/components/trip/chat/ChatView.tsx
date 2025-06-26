import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatLogsKey, useChat } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import {
  Avatar, AvatarFallback, AvatarImage,
  Button, Card, CardContent, Input, ScrollArea,
} from '@/components/ui';
import {
  Bot, ClipboardCopy, CornerDownLeft, Loader2,
  Paperclip, Plus, Send, Upload, User, X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchEventSource } from '@microsoft/fetch-event-source';

const MAX_BUBBLE_WIDTH = '65ch';
const API_ENDPOINT = `${import.meta.env.VITE_SUPABASE_EDGE_URL}/chat-ai`;

interface ChatMessageDB {
  id: string;
  role: 'user' | 'ai';
  message: string;
  timestamp: string;
  extractedData?: unknown;
  attachments?: { type: 'image' | 'pdf'; url: string; name: string }[];
}

interface ChatViewProps { tripId: string }

const ChatView: React.FC<ChatViewProps> = ({ tripId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { data: messages = [], isLoading: isHistoryLoading } = useChat(tripId);

  const [newMessage, setNewMessage] = useState('');
  const [uploads, setUploads] = useState<File[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');

  /* ------------------------------------------------------------------ */
  /* helpers                                                            */
  /* ------------------------------------------------------------------ */
  const scrollToBottom = () =>
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages, streamBuffer]);

  const validateFile = (f: File) => {
    const okTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!okTypes.includes(f.type)) return 'Supported: JPG, PNG, PDF';
    if (f.size > 10 * 1024 * 1024) return 'Max file size is 10 MB';
    return null;
  };

  async function uploadToSupabase(f: File): Promise<{ url: string; type: 'image' | 'pdf'; name: string }> {
    const ext = f.name.split('.').pop();
    const fileName = `${user!.id}/${tripId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('chat-attachments').upload(fileName, f);
    if (error) throw error;
    const { data } = supabase.storage.from('chat-attachments').getPublicUrl(fileName);
    return { url: data.publicUrl, type: f.type.startsWith('image/') ? 'image' : 'pdf', name: f.name };
  }

  /* ------------------------------------------------------------------ */
  /* mutation: send message + files                                      */
  /* ------------------------------------------------------------------ */
  const { mutate: sendChat, isLoading: isSending } = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Upload attachments in parallel
      const attachments = await Promise.all(uploads.map(uploadToSupabase));

      const body = JSON.stringify({
        message: newMessage.trim(),
        tripId,
        attachments,
        stream: true,
      });

      setIsStreaming(true);
      setStreamBuffer('');

      await fetchEventSource(API_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await supabase.auth.getSession().then(r => r.data.session?.access_token ?? '')}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body,
        onmessage(ev) {
          if (ev.event === 'chunk') {
            setStreamBuffer(prev => prev + ev.data);
          } else if (ev.event === 'eom') {
            // flush buffer to cache
            const final: ChatMessageDB = JSON.parse(ev.data);
            queryClient.setQueryData<ChatMessageDB[]>(chatLogsKey(tripId), old => [...(old ?? []), final]);
            setStreamBuffer('');
          }
        },
        onclose() { setIsStreaming(false); },
        onerror(err) {
          console.error(err);
          setIsStreaming(false);
          toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
        },
      });
    },
    onSuccess() {
      setNewMessage('');
      setUploads([]);
    },
  });

  /* ------------------------------------------------------------------ */
  /* render                                                             */
  /* ------------------------------------------------------------------ */
  if (isHistoryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-earth-500" />
        <span className="ml-2 text-earth-600">Loading chat…</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* HEADER */}
      <header className="mb-4">
        <h3 className="text-lg font-semibold text-earth-800">Trip Assistant</h3>
        <p className="text-sm text-earth-600">Ask anything about your trip — or drop receipts to auto‑import</p>
      </header>

      {/* MESSAGES */}
      <Card className="flex-1 mb-4">
        <CardContent className="p-0">
          <ScrollArea className="h-96 p-4">
            <div className="space-y-4">
              {messages.map(m => (
                <Bubble key={m.id} msg={m} isUser={m.role === 'user'} user={user} />
              ))}

              {/* live stream */}
              {isStreaming && streamBuffer && (
                <Bubble
                  msg={{ id: 'stream', message: streamBuffer, role: 'ai', timestamp: new Date().toISOString() }}
                  isUser={false}
                  user={user}
                />
              )}

              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* UPLOAD PREVIEW */}
      {uploads.length > 0 && (
        <div className="mb-3 p-3 bg-earth-50 border border-earth-200 rounded-md space-y-2">
          {uploads.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-earth-600" />
              <span className="text-sm">{f.name}</span>
              <button className="ml-auto" onClick={() => setUploads(u => u.filter(x => x !== f))}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* INPUT BAR */}
      <ChatBar
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        uploads={uploads}
        setUploads={setUploads}
        onSend={sendChat}
        disabled={isSending || isStreaming}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* sub‑components                                                     */
/* ------------------------------------------------------------------ */
const Bubble: React.FC<{ msg: ChatMessageDB; isUser: boolean; user: any }> = ({ msg, isUser, user }) => (
  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-full`}>
      {/* avatar */}
      <Avatar className="w-8 h-8 flex-shrink-0">
        {isUser ? (
          <>
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
          </>
        ) : (
          <AvatarFallback className="bg-earth-500 text-white"><Bot className="w-4 h-4" /></AvatarFallback>
        )}
      </Avatar>

      {/* message */}
      <div className={`rounded-lg p-3 ${isUser ? 'bg-earth-500 text-white' : 'bg-gray-100 text-gray-800'}`}
           style={{ maxWidth: MAX_BUBBLE_WIDTH }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => (
              <a href={href!} target="_blank" rel="noopener noreferrer"
                 className="text-earth-600 hover:text-earth-700 font-medium">{children}</a>
            ),
            code: ({ children }) => (
              <code className="relative bg-gray-200 px-1 rounded">
                {children}
                <button onClick={() => navigator.clipboard.writeText(String(children))}
                        className="absolute top-0.5 right-0.5">
                  <ClipboardCopy className="w-3 h-3 text-gray-500" />
                </button>
              </code>
            ),
          }}>
          {msg.message}
        </ReactMarkdown>
        <p className={`text-xs mt-2 ${isUser ? 'text-earth-200' : 'text-gray-500'}`}
           title={new Date(msg.timestamp).toLocaleString()}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  </div>
);

const ChatBar: React.FC<{
  newMessage: string;
  setNewMessage: (s: string) => void;
  uploads: File[];
  setUploads: React.Dispatch<React.SetStateAction<File[]>>;
  onSend: () => void;
  disabled: boolean;
}> = ({ newMessage, setNewMessage, uploads, setUploads, onSend, disabled }) => {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const toAdd: File[] = [];
    for (const f of Array.from(files)) {
      const err = validate(f);
      if (err) { toast({ title: 'Invalid file', description: err, variant: 'destructive' }); continue; }
      toAdd.push(f);
    }
    setUploads(prev => [...prev, ...toAdd]);
  };
  const validate = (f: File) =>
    !['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(f.type)
      ? 'Only JPG, PNG or PDF'
      : f.size > 10 * 1024 * 1024
        ? 'Max 10 MB'
        : null;

  return (
    <div className="flex gap-2">
      <input
        type="file"
        ref={inputFileRef}
        multiple
        accept="image/*,.pdf"
        onChange={e => handleFiles(e.target.files)}
        className="hidden"
      />
      <Button variant="outline" size="icon" onClick={() => inputFileRef.current?.click()}
              title="Upload files" disabled={disabled}>
        <Upload className="w-4 h-4" />
      </Button>
      <Input
        value={newMessage}
        onChange={e => setNewMessage(e.target.value)}
        placeholder="Type a message…"
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        disabled={disabled}
        className="flex-1"
      />
      <Button onClick={onSend} disabled={disabled || (!newMessage.trim() && uploads.length === 0)}
              size="icon" className="bg-earth-500 hover:bg-earth-600">
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default ChatView;
