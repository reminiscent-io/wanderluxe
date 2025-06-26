import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { chatLogsKey, useChat } from '@/hooks/useChat';
import type { ChatLogRow } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Bot,
  ClipboardCopy,
  Loader2,
  Paperclip,
  Send,
  Upload,
  User,
  X,
} from 'lucide-react';

const API_ENDPOINT =
  'https://arnengxblsfnezrqcsxw.functions.supabase.co/chat-ai';
const MAX_BUBBLE_WIDTH = '68ch';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Extract the assistant message text (and any extracted data) from the
 * heterogeneous Edge‑Function responses we receive.
 */
function extractAssistantMessage(res: any): {
  text: string;
  extractedData?: unknown;
} {
  // New format ➜ { success: true, aiMessage: { message, extractedData } }
  if (res?.aiMessage?.message) {
    return {
      text: res.aiMessage.message,
      extractedData: res.aiMessage.extractedData,
    };
  }
  // Old format ➜ { aiMessage: string, extracted: unknown }
  if (typeof res?.aiMessage === 'string') {
    return { text: res.aiMessage, extractedData: res.extracted };
  }
  // Raw OpenAI proxy ➜ { choices: [ { message: { content } } ] }
  if (Array.isArray(res?.choices)) {
    return { text: res.choices[0]?.message?.content ?? '', extractedData: null };
  }
  // Fallback – stringify whole object so we see *something* useful.
  return { text: JSON.stringify(res, null, 2), extractedData: null };
}

// Matches citation tokens like: citeturn3search4
const CITATION_RE = /\uE208cite\uE209.*?\uE20D/g;
const cleanCitations = (md: string) => md.replace(CITATION_RE, '');

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
interface ChatMessageDB {
  id: string;
  role: 'user' | 'ai';
  message: string;
  timestamp: string;
  extractedData?: unknown;
  attachments?: { type: 'image' | 'pdf'; url: string; name: string }[];
}

interface ChatViewProps {
  tripId: string;
}

/* ------------------------------------------------------------------ */
/* Main Component                                                     */
/* ------------------------------------------------------------------ */
const ChatView: React.FC<ChatViewProps> = ({ tripId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: rawMessages = [], isLoading } = useChat(tripId);

  // Transform DB rows → UI messages.
  const messages: ChatMessageDB[] = useMemo(
    () =>
      rawMessages
        .filter(
          (m: ChatLogRow) => m && m.id && m.role && m.message && m.timestamp,
        )
        .map((m: ChatLogRow) => ({
          id: m.id,
          role: m.role as 'user' | 'ai',
          message: m.message,
          timestamp: m.timestamp,
          extractedData: m.embedding,
          attachments: undefined,
        })),
    [rawMessages],
  );

  /* ------------------------------ state ------------------------------ */
  const [text, setText] = useState('');
  const [uploads, setUploads] = useState<File[]>([]);

  /* --------------------------- auto‑scroll --------------------------- */
  const scrollBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(scrollBottom, [messages.length]);

  /* --------------------------- file utils --------------------------- */
  const okTypes = useMemo(
    () => ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    [],
  );
  const validate = useCallback(
    (file: File) => {
      if (!okTypes.includes(file.type)) return 'Only JPG, PNG or PDF files are allowed';
      if (file.size > 10 * 1024 * 1024) return 'Max file size is 10 MB';
      return null;
    },
    [okTypes],
  );

  const uploadToSupabase = useCallback(
    async (file: File) => {
      const ext = file.name.split('.').pop();
      const key = `${user!.id}/${tripId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from('chat-attachments')
        .upload(key, file);
      if (error) throw error;
      const { data } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(key);
      return {
        url: data.publicUrl,
        type: file.type.startsWith('image/') ? 'image' : 'pdf',
        name: file.name,
      };
    },
    [tripId, user],
  );

  /* -------------------------- chat mutation -------------------------- */
  const { mutate: send, isPending: isSending } = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      /* ---------- 1 / Upload attachments ---------- */
      const attachments = await Promise.all(uploads.map(uploadToSupabase));

      /* ---------- 2 / Compose enhanced prompt ---------- */
      const { data: trip } = await supabase
        .from('trips')
        .select('destination, arrival_date, departure_date')
        .eq('trip_id', tripId)
        .single();
      const destination = trip?.destination ?? 'Unknown Destination';
      const arrival = trip?.arrival_date ?? 'Unknown Date';
      const departure = trip?.departure_date ?? 'Unknown Date';
      const userMessage = text.trim();
      
      // First, persist user message to database
      const { error: userLogErr } = await supabase.from("chat_logs").insert({
        id: crypto.randomUUID(),
        trip_id: tripId,
        user_id: user.id,
        role: "user",
        message: userMessage,
        timestamp: new Date().toISOString()
      });
      
      if (userLogErr) {
        console.error("Failed to persist user message:", userLogErr);
        throw new Error("Failed to save your message");
      }
      
      const prompt = `TRAVEL CONTEXT: You are assisting with a trip to ${destination} from ${arrival} to ${departure}.
\n\nUser question: ${userMessage}`;
      const body = JSON.stringify({ message: prompt, tripId, attachments });

      /* ---------- 3 / Supabase Auth token ---------- */
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication error - please refresh and try again.');
      }
      
      const token = session.session?.access_token;
      if (!token) {
        console.error('No access token found in session:', session);
        throw new Error('Authentication expired – please sign in again.');
      }
      
      console.log('Using auth token for edge function call');

      /* ---------- 4 / Call Edge Function ---------- */
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
      });
      const json = await res.json();
      console.log('Edge function response:', res.status, json);
      if (!res.ok || json.success === false) {
        if (res.status === 401) {
          throw new Error('Authentication failed - please refresh and sign in again.');
        }
        throw new Error(json.error || `Request failed (${res.status})`);
      }

      /* ---------- 5 / Normalise response ---------- */
      let { text: aiText, extractedData } = extractAssistantMessage(json);
      aiText = cleanCitations(aiText) || 'No response received';

      /* ---------- 6 / Optimistic UI update ---------- */
      const aiMessage: ChatMessageDB = {
        id: crypto.randomUUID(),
        role: 'ai',
        message: aiText,
        timestamp: new Date().toISOString(),
        extractedData,
      };
      qc.setQueryData(chatLogsKey(tripId), (old: any[] = []) => [...old, aiMessage]);

      return json;
    },
    onSuccess: () => {
      setText('');
      setUploads([]);
    },
    onError: (err) => {
      console.error(err);
      toast({
        title: 'Assistant Error',
        description:
          err instanceof Error ? err.message : 'Something went wrong – try again.',
        variant: 'destructive',
      });
    },
  });

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */
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
      {/* Header */}
      <header className="mb-4">
        <h3 className="text-lg font-semibold text-earth-800">Trip Assistant</h3>
        <p className="text-sm text-earth-600">
          Ask anything about your trip or drop travel documents to analyze.
        </p>
      </header>

      {/* Messages */}
      <Card className="flex-1 mb-4">
        <CardContent className="p-0">
          <ScrollArea className="h-96 p-4" aria-live="polite">
            <div className="space-y-4">
              {messages.map((m) => (
                <MemoBubble key={m.id} msg={m} isUser={m.role === 'user'} user={user} />
              ))}

              {/* Typing indicator */}
              {isSending && (
                <div className="flex justify-start">
                  <div className="flex gap-2 flex-row max-w-full">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-earth-500 text-white">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className="rounded-lg p-3 bg-earth-100 text-earth-800"
                      style={{ maxWidth: MAX_BUBBLE_WIDTH }}
                    >
                      <span className="animate-pulse text-earth-600">
                        Typing<span className="inline-block w-1 h-1 mx-0.5 rounded-full bg-earth-600 animate-bounce"></span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Upload preview */}
      {uploads.length > 0 && (
        <div className="mb-3 p-3 bg-earth-50 border border-earth-200 rounded-md space-y-2">
          {uploads.map((f) => (
            <div key={f.name} className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              <span className="text-sm truncate max-w-[16rem]">{f.name}</span>
              <button
                onClick={() => setUploads((u) => u.filter((x) => x !== f))}
                className="ml-auto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <ChatBar
        text={text}
        setText={setText}
        uploads={uploads}
        setUploads={setUploads}
        onSend={send}
        disabled={isSending}
        validate={validate}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Chat Bubble                                                        */
/* ------------------------------------------------------------------ */
const Bubble = ({
  msg,
  isUser,
  user,
}: {
  msg: ChatMessageDB;
  isUser: boolean;
  user: any;
}) => {
  const markdown = useMemo(() => cleanCitations(msg.message), [msg.message]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-full`}
      >
        {/* Avatar */}
        <Avatar className="w-8 h-8 shadow-md shadow-black/10">
          {isUser ? (
            <>
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback>
                <User className="w-4 h-4" />
              </AvatarFallback>
            </>
          ) : (
            <AvatarFallback className="bg-earth-500 text-white">
              <Bot className="w-4 h-4" />
            </AvatarFallback>
          )}
        </Avatar>

        {/* Bubble */}
        <div
          className={`rounded-lg p-3 ${
            isUser
              ? 'bg-earth-500 text-white'
              : 'bg-earth-100 text-earth-800 dark:bg-earth-800 dark:text-cream-100'
          }`}
          style={{ maxWidth: MAX_BUBBLE_WIDTH }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => (
                <a
                  href={href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-earth-600 hover:underline font-medium"
                >
                  {children}
                </a>
              ),
              code({ node, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const lang = match ? match[1] : '';
                const isInline = !match;
                
                if (isInline) {
                  return (
                    <code className="bg-gray-200 px-1 rounded text-[0.88rem]" {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <div className="relative group">
                    <SyntaxHighlighter
                      language={lang}
                      style={prism}
                      PreTag="div"
                      wrapLongLines={true}
                      customStyle={{
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
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
            {markdown}
          </ReactMarkdown>
          <p
            className={`uppercase tracking-wide text-[10px] opacity-70 mt-2 ${
              isUser ? 'text-earth-200' : 'text-earth-600'
            }`}
            title={new Date(msg.timestamp).toLocaleString()}
          >
            {new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  );
};
const MemoBubble = memo(Bubble);

/* ------------------------------------------------------------------ */
/* Chat Bar                                                           */
/* ------------------------------------------------------------------ */
const ChatBar = memo(function ChatBar({
  text,
  setText,
  uploads,
  setUploads,
  onSend,
  disabled,
  validate,
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

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const list: File[] = [];
      Array.from(files).forEach((f) => {
        const err = validate(f);
        if (err) {
          toast({
            title: 'Invalid file',
            description: err,
            variant: 'destructive',
          });
        } else {
          list.push(f);
        }
      });
      setUploads((prev) => [...prev, ...list]);
    },
    [validate, setUploads, toast],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    },
    [onSend],
  );

  return (
    <div className="flex gap-2">
      <input
        type="file"
        ref={fileRef}
        hidden
        multiple
        accept="image/*,.pdf"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        variant="outline"
        size="icon"
        onClick={() => fileRef.current?.click()}
        disabled={disabled}
      >
        <Upload className="w-4 h-4" />
      </Button>

      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message…"
        onKeyDown={handleKeyDown}
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
});

export default ChatView;
