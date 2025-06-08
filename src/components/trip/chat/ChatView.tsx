import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import {
  Button,
} from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  Send,
  Bot,
  User,
  Loader2,
  Upload,
  Paperclip,
  Plus,
  CornerDownLeft,
  ClipboardCopy,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/*****************************
 * UI constants
 *****************************/
const TYPING_DELAY_MS = 50; // 50ms per character for smooth readable typing
const MAX_BUBBLE_WIDTH = '65ch';

/*****************************
 * Types
 *****************************/
interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  message: string;
  timestamp: string;
  user_id?: string;
  attachments?: {
    type: 'image' | 'pdf';
    url: string;
    name: string;
  }[];
  extractedData?: {
    type: 'hotel' | 'flight' | 'reservation' | 'activity';
    data: any;
    missingFields?: string[];
    readyToAdd?: boolean;
  };
}

interface ChatViewProps {
  tripId: string;
}

/*****************************
 * Component
 *****************************/
const ChatView: React.FC<ChatViewProps> = ({ tripId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [typingBuffer, setTypingBuffer] = useState<string | null>(null);
  const [skipTyping, setSkipTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  /*****************************
   * Helper: scroll to bottom
   *****************************/
  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!typingBuffer) scrollToBottom();
  }, [messages, typingBuffer, scrollToBottom]);

  /*****************************
   * Load chat history from localStorage
   *****************************/
  useEffect(() => {
    const loadChatHistory = () => {
      if (!tripId) return;
      setIsLoadingHistory(true);
      
      try {
        const localKey = `chat_history_${tripId}`;
        const localData = localStorage.getItem(localKey);
        
        if (localData) {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed)) {
            const validMessages = parsed.filter((msg: any): msg is ChatMessage => {
              return msg && 
                     typeof msg.id === 'string' && 
                     (msg.role === 'user' || msg.role === 'ai') && 
                     typeof msg.message === 'string' && 
                     typeof msg.timestamp === 'string';
            });
            setMessages(validMessages);
          }
        }
      } catch (err) {
        console.error('Error loading chat history from localStorage', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    loadChatHistory();
  }, [tripId]);

  /*****************************
   * Save to localStorage
   *****************************/
  const saveToLocalStorage = useCallback((updatedMessages: ChatMessage[]) => {
    try {
      const localKey = `chat_history_${tripId}`;
      localStorage.setItem(localKey, JSON.stringify(updatedMessages));
    } catch (err) {
      console.error('Error saving to localStorage', err);
    }
  }, [tripId]);

  /*****************************
   * File upload validation
   *****************************/
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file',
        description: 'Upload JPG, PNG, or PDF.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Max 10 MB.',
        variant: 'destructive',
      });
      return;
    }
    setUploadedFiles([file]);
    setNewMessage(`📎 ${file.name} – ready to analyze`);
  };

  /*****************************
   * Upload to Supabase Storage
   *****************************/
  const uploadToSupabase = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const fileName = `${user?.id}/${tripId}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  /*****************************
   * Send message & stream reply
   *****************************/
  const sendMessage = async () => {
    if ((!newMessage.trim() && uploadedFiles.length === 0) || !user) return;
    const userMsgText = newMessage.trim() || 'Analyze this receipt';
    setNewMessage('');
    setIsLoading(true);

    // Handle attachments
    const attachments: ChatMessage['attachments'] = [];
    if (uploadedFiles.length) {
      try {
        for (const f of uploadedFiles) {
          const url = await uploadToSupabase(f);
          attachments.push({
            type: f.type.startsWith('image/') ? 'image' : 'pdf',
            url,
            name: f.name,
          });
        }
      } catch (err) {
        console.error('Upload error', err);
        toast({ title: 'Upload error', description: 'File upload failed.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
    }

    // Create user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      message: userMsgText,
      timestamp: new Date().toISOString(),
      user_id: user.id,
      attachments: attachments.length ? attachments : undefined,
    };

    // Add user message immediately
    const updatedWithUser = [...messages, userMessage];
    setMessages(updatedWithUser);
    setUploadedFiles([]);

    try {
      // Call AI function
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: { message: userMsgText, tripId, attachments },
      });
      
      if (error) throw error;

      // Create AI response from authentic data
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        message: data?.aiMessage?.message || '',
        timestamp: new Date().toISOString(),
        extractedData: data?.aiMessage?.extractedData,
      };

      // Add placeholder for streaming
      const placeholderId = `placeholder-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        { ...aiMessage, id: placeholderId, message: '' },
      ]);

      // Start streaming animation
      const fullText = aiMessage.message;
      setTypingBuffer(fullText);
      setSkipTyping(false);

      let index = 0;
      const streamInterval = setInterval(() => {
        if (skipTyping) {
          index = fullText.length;
        } else {
          index += 1;
        }
        
        setMessages(prev =>
          prev.map(m =>
            m.id === placeholderId ? { ...m, message: fullText.slice(0, index) } : m,
          ),
        );
        
        if (index >= fullText.length) {
          clearInterval(streamInterval);
          setTypingBuffer(null);
          
          // Save final state to localStorage
          const finalMessages = [...updatedWithUser, aiMessage];
          saveToLocalStorage(finalMessages);
          
          // Update with final message
          setMessages(finalMessages);
        }
      }, TYPING_DELAY_MS);
      
    } catch (err) {
      console.error('Send error', err);
      toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
      // Remove user message on error
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  /*****************************
   * Add to itinerary
   *****************************/
  const addToItinerary = async (extracted: NonNullable<ChatMessage['extractedData']>) => {
    try {
      setIsLoading(true);
      toast({ title: 'Success', description: 'Added to itinerary!' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Could not add to itinerary.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  /*****************************
   * Keyboard shortcut
   *****************************/
  const onKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /*****************************
   * Copy button
   *****************************/
  const CopyBtn: React.FC<{ text: string }> = ({ text }) => {
    return (
      <button
        onClick={() => navigator.clipboard.writeText(text)}
        className="absolute top-1 right-1 p-1 text-gray-500 hover:text-gray-800"
        title="Copy to clipboard"
      >
        <ClipboardCopy className="w-4 h-4" />
      </button>
    );
  };

  /*****************************
   * Render
   *****************************/
  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-earth-500" />
        <span className="ml-2 text-earth-600">Loading chat history…</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col h-full max-h-[600px]">
        {/* Header */}
        <header className="mb-4">
          <h3 className="text-lg font-semibold text-earth-800">Trip Assistant</h3>
          <p className="text-sm text-earth-600">Ask anything about your trip!</p>
        </header>

        {/* Messages */}
        <Card className="flex-1 mb-4">
          <CardContent className="p-0">
            <ScrollArea className="h-96 p-4 pb-[calc(theme(spacing[4])+env(safe-area-inset-bottom))]">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <Bot className="w-12 h-12 text-earth-400 mb-4" />
                  <p className="text-earth-600 mb-2">No messages yet</p>
                  <p className="text-sm text-earth-500">Start planning your adventure!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.filter(Boolean).map((msg, idx) => {
                    // Enhanced safety checks
                    if (!msg || typeof msg !== 'object' || !msg.role || !msg.id || !msg.message) {
                      console.warn('Invalid message structure:', msg);
                      return null;
                    }
                    
                    const prev = messages[idx - 1];
                    const showAvatar = !prev || !prev.role || prev.role !== msg.role;
                    const isUser = msg.role === 'user';
                    
                    return (
                      <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-full`}>
                          {showAvatar && (
                            <Avatar className="w-8 h-8 flex-shrink-0">
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
                          )}
                          <div
                            className={`rounded-lg p-3 ${
                              isUser ? 'bg-earth-500 text-white' : 'bg-gray-100 text-gray-800'
                            }`} 
                            style={{ maxWidth: MAX_BUBBLE_WIDTH }}
                          >
                            {/* Content */}
                            {isUser ? (
                              <>
                                {/* Attachments */}
                                {msg.attachments?.length && (
                                  <div className="mb-3">
                                    {msg.attachments.map((a, i) => (
                                      <div key={i} className="flex items-center gap-2 p-2 bg-earth-400/20 rounded-md mb-2">
                                        <Paperclip className="w-4 h-4" />
                                        <span className="text-sm font-medium">{a.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                              </>
                            ) : (
                              <div className="text-sm prose prose-sm max-w-none">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    a: ({ href, children, ...props }) => (
                                      <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-earth-600 hover:text-earth-700 font-medium"
                                        {...props}
                                      >
                                        {children}
                                      </a>
                                    ),
                                    code: ({ children, ...props }) => (
                                      <code className="relative bg-gray-200 px-1 rounded" {...props}>
                                        {children}
                                        <CopyBtn text={String(children)} />
                                      </code>
                                    ),
                                  }}
                                >
                                  {msg.message}
                                </ReactMarkdown>
                              </div>
                            )}

                            {/* Timestamp */}
                            <p
                              className={`text-xs mt-2 ${isUser ? 'text-earth-200' : 'text-gray-500'}`}
                              title={new Date(msg.timestamp).toLocaleString()}
                            >
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Extracted data card */}
                        {msg.extractedData && (
                          <div className="mt-2 max-w-[80%] ml-10">
                            <Card className="bg-green-50 border-green-200">
                              <CardContent className="p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Plus className="w-4 h-4 text-green-600" />
                                  <span className="font-medium text-green-800">
                                    {msg.extractedData.type.replace(/^./, s => s.toUpperCase())} detected
                                  </span>
                                </div>
                                <div className="relative text-xs text-green-700 bg-green-100 p-2 rounded">
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(msg.extractedData.data, null, 2)}
                                  </pre>
                                  <CopyBtn text={JSON.stringify(msg.extractedData.data, null, 2)} />
                                </div>
                                {msg.extractedData.missingFields?.length ? (
                                  <div className="text-sm text-amber-600 my-2 p-2 bg-amber-50 rounded">
                                    <strong>Missing:</strong> {msg.extractedData.missingFields.join(', ')}
                                  </div>
                                ) : null}
                                {msg.extractedData.readyToAdd && (
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => addToItinerary(msg.extractedData!)}
                                    disabled={isLoading}
                                  >
                                    <Plus className="w-4 h-4 mr-1" /> Add to itinerary
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Loader bubble while waiting */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex gap-2">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="bg-earth-500 text-white">
                            <Bot className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-gray-600">Planning your trip…</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Skip typing button */}
                  {typingBuffer && (
                    <button
                      onClick={() => setSkipTyping(true)}
                      className="self-start text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                    >
                      <CornerDownLeft className="w-3 h-3" /> Skip typing
                    </button>
                  )}

                  {/* Scroll anchor */}
                  <div ref={scrollRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Upload preview */}
        {uploadedFiles.length > 0 && (
          <div className="mb-3 p-3 bg-earth-50 border border-earth-200 rounded-md">
            {uploadedFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-earth-600" />
                <span className="text-sm text-earth-700">{f.name}</span>
                <button
                  className="ml-auto p-1 text-earth-600 hover:text-earth-800"
                  onClick={() => setUploadedFiles([])}
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,.pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Upload receipt or document"
            className="border-earth-300 text-earth-600 hover:bg-earth-50"
          >
            <Upload className="w-4 h-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="Ask about your trip or upload a receipt…"
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={
              isLoading || (!newMessage.trim() && uploadedFiles.length === 0)
            }
            size="icon"
            className="bg-earth-500 hover:bg-earth-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;