import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  message: string;
  timestamp: string;
  user_id?: string;
}

interface ChatViewProps {
  tripId: string;
}

const ChatView: React.FC<ChatViewProps> = ({ tripId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history
  useEffect(() => {
    loadChatHistory();
  }, [tripId]);

  const loadChatHistory = async () => {
    if (!tripId) return;
    
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('chat_logs')
        .select('*')
        .eq('trip_id', tripId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading chat history:', error);
      toast({
        title: "Error",
        description: "Failed to load chat history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !tripId) return;

    const userMessage = newMessage.trim();
    setNewMessage('');
    setIsLoading(true);

    // Add user message to UI immediately
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      message: userMessage,
      timestamp: new Date().toISOString(),
      user_id: user.id
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: {
          message: userMessage,
          tripId: tripId
        }
      });

      if (error) throw error;

      // Replace temp message and add AI response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== tempUserMessage.id);
        return [
          ...filtered,
          data.userMessage,
          data.aiMessage
        ];
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-earth-500" />
        <span className="ml-2 text-earth-600">Loading chat history...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-earth-800">Trip Assistant</h3>
        <p className="text-sm text-earth-600">Ask me anything about your trip or get suggestions for activities!</p>
      </div>

      {/* Messages Area */}
      <Card className="flex-1 mb-4">
        <CardContent className="p-0">
          <ScrollArea className="h-96 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Bot className="h-12 w-12 text-earth-400 mb-4" />
                <p className="text-earth-600 mb-2">No messages yet</p>
                <p className="text-sm text-earth-500">Start a conversation with your trip assistant!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex max-w-[80%] ${
                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      } gap-2`}
                    >
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        {message.role === 'user' ? (
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
                      <div
                        className={`rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-earth-500 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-earth-200' : 'text-gray-500'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex gap-2">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-earth-500 text-white">
                          <Bot className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-gray-100 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-gray-600">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Input Area */}
      <div className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about your trip or request suggestions..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          onClick={sendMessage}
          disabled={!newMessage.trim() || isLoading}
          size="icon"
          className="bg-earth-500 hover:bg-earth-600"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatView;