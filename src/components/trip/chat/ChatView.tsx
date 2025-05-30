import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Bot, User, Loader2, Upload, Paperclip, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

const ChatView: React.FC<ChatViewProps> = ({ tripId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image (JPG, PNG) or PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFiles([file]);
    setNewMessage(`📎 ${file.name} - Ready to analyze receipt`);
  };

  const uploadToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/${tripId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file);

    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && uploadedFiles.length === 0) || !user || !tripId) return;

    const userMessage = newMessage.trim() || "Analyze this receipt";
    setNewMessage('');
    setIsLoading(true);

    let attachments: any[] = [];
    
    // Upload files if any
    if (uploadedFiles.length > 0) {
      try {
        for (const file of uploadedFiles) {
          const url = await uploadToSupabase(file);
          attachments.push({
            type: file.type.startsWith('image/') ? 'image' : 'pdf',
            url,
            name: file.name
          });
        }
      } catch (error) {
        console.error('Error uploading files:', error);
        toast({
          title: "Upload Error",
          description: "Failed to upload file. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    // Add user message to UI immediately
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      message: userMessage,
      timestamp: new Date().toISOString(),
      user_id: user.id,
      attachments: attachments.length > 0 ? attachments : undefined
    };
    setMessages(prev => [...prev, tempUserMessage]);
    setUploadedFiles([]);

    try {
      // Call the Edge Function with attachment support
      console.log('Calling edge function with:', { message: userMessage, tripId, attachments });
      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: {
          message: userMessage,
          tripId: tripId,
          attachments: attachments
        }
      });

      console.log('Edge function response:', { data, error });
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

  const addToItinerary = async (extractedData: any) => {
    try {
      setIsLoading(true);
      
      // Call appropriate API based on data type
      let endpoint = '';
      let payload = {};
      
      switch (extractedData.type) {
        case 'hotel':
          endpoint = 'accommodations';
          payload = {
            trip_id: tripId,
            hotel: extractedData.data.hotel_name,
            hotel_address: extractedData.data.address,
            initial_accommodation_day: extractedData.data.check_in_date,
            final_accommodation_day: extractedData.data.check_out_date,
            cost: extractedData.data.total_cost,
            currency: extractedData.data.currency || 'USD'
          };
          break;
        case 'flight':
          endpoint = 'transportation';
          payload = {
            trip_id: tripId,
            type: 'Flight',
            departure_location: extractedData.data.departure_city,
            arrival_location: extractedData.data.arrival_city,
            departure_time: extractedData.data.departure_time,
            arrival_time: extractedData.data.arrival_time,
            cost: extractedData.data.total_cost,
            currency: extractedData.data.currency || 'USD'
          };
          break;
        case 'reservation':
          // Find the appropriate day for the reservation
          const reservationDate = extractedData.data.date || extractedData.data.reservation_date;
          const { data: dayData } = await supabase
            .from('trip_days')
            .select('day_id')
            .eq('trip_id', tripId)
            .eq('date', reservationDate)
            .single();
          
          if (dayData) {
            endpoint = 'reservations';
            payload = {
              trip_id: tripId,
              day_id: dayData.day_id,
              restaurant_name: extractedData.data.restaurant_name,
              cuisine_type: extractedData.data.cuisine_type || 'Unknown',
              reservation_time: extractedData.data.time,
              party_size: extractedData.data.party_size || 2,
              notes: extractedData.data.notes || ''
            };
          }
          break;
        case 'activity':
          // Find the appropriate day for the activity
          const activityDate = extractedData.data.date || extractedData.data.activity_date;
          const { data: activityDayData } = await supabase
            .from('trip_days')
            .select('day_id')
            .eq('trip_id', tripId)
            .eq('date', activityDate)
            .single();
          
          if (activityDayData) {
            endpoint = 'day_activities';
            payload = {
              trip_id: tripId,
              day_id: activityDayData.day_id,
              title: extractedData.data.activity_name,
              description: extractedData.data.description || '',
              time: extractedData.data.time,
              cost: extractedData.data.cost,
              currency: extractedData.data.currency || 'USD'
            };
          }
          break;
      }

      if (endpoint && Object.keys(payload).length > 0) {
        const { error } = await supabase
          .from(endpoint)
          .insert(payload);

        if (error) throw error;

        toast({
          title: "Success!",
          description: `${extractedData.type.charAt(0).toUpperCase() + extractedData.type.slice(1)} added to your itinerary.`,
        });
      }
    } catch (error) {
      console.error('Error adding to itinerary:', error);
      toast({
        title: "Error",
        description: "Failed to add item to itinerary. Please try again.",
        variant: "destructive",
      });
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
    <div className="max-w-5xl mx-auto">
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
                        {message.role === 'ai' ? (
                          <div className="text-sm prose prose-sm max-w-none prose-headings:text-gray-800 prose-headings:font-semibold prose-strong:text-gray-800 prose-a:text-earth-600 hover:prose-a:text-earth-700 prose-a:no-underline hover:prose-a:underline prose-ul:text-gray-800 prose-ol:text-gray-800 prose-li:text-gray-800">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                a: ({ href, children, ...props }) => (
                                  <a 
                                    href={href} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-earth-600 hover:text-earth-700 font-medium transition-colors duration-200"
                                    {...props}
                                  >
                                    {children}
                                  </a>
                                ),
                                h3: ({ children, ...props }) => (
                                  <h3 className="text-base font-semibold text-gray-800 mt-3 mb-2 first:mt-0" {...props}>
                                    {children}
                                  </h3>
                                ),
                                h4: ({ children, ...props }) => (
                                  <h4 className="text-sm font-semibold text-gray-800 mt-2 mb-1" {...props}>
                                    {children}
                                  </h4>
                                ),
                                strong: ({ children, ...props }) => (
                                  <strong className="font-semibold text-gray-800" {...props}>
                                    {children}
                                  </strong>
                                ),
                                ul: ({ children, ...props }) => (
                                  <ul className="list-disc list-inside space-y-1 my-2" {...props}>
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children, ...props }) => (
                                  <ol className="list-decimal list-inside space-y-1 my-2" {...props}>
                                    {children}
                                  </ol>
                                ),
                                li: ({ children, ...props }) => (
                                  <li className="text-gray-800" {...props}>
                                    {children}
                                  </li>
                                ),
                                p: ({ children, ...props }) => (
                                  <p className="text-gray-800 mb-2 last:mb-0" {...props}>
                                    {children}
                                  </p>
                                )
                              }}
                            >
                              {message.message}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div>
                            {/* Show attachments if any */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mb-3">
                                {message.attachments.map((attachment, index) => (
                                  <div key={index} className="flex items-center gap-2 p-2 bg-earth-400/20 rounded-md mb-2">
                                    <Paperclip className="h-4 w-4" />
                                    <span className="text-sm font-medium">{attachment.name}</span>
                                  </div>
                                ))}
                                {message.attachments.filter(a => a.type === 'image').map((attachment, index) => (
                                  <img 
                                    key={index}
                                    src={attachment.url} 
                                    alt={attachment.name}
                                    className="max-w-48 max-h-32 object-cover rounded mt-2"
                                  />
                                ))}
                              </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          </div>
                        )}
                        <p className={`text-xs mt-2 ${
                          message.role === 'user' ? 'text-earth-200' : 'text-gray-500'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    
                    {/* Show extracted data with "Add to Itinerary" button */}
                    {message.extractedData && (
                      <div className="mt-2 max-w-[80%] ml-10">
                        <Card className="bg-green-50 border-green-200">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Plus className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-green-800">
                                {message.extractedData.type.charAt(0).toUpperCase() + message.extractedData.type.slice(1)} Detected
                              </span>
                            </div>
                            
                            <div className="text-sm text-green-700 mb-3 font-mono bg-green-100 p-2 rounded">
                              <pre className="whitespace-pre-wrap text-xs">
                                {JSON.stringify(message.extractedData.data, null, 2)}
                              </pre>
                            </div>

                            {message.extractedData.missingFields && message.extractedData.missingFields.length > 0 && (
                              <div className="text-sm text-amber-600 mb-2 p-2 bg-amber-50 rounded">
                                <strong>Missing required fields:</strong> {message.extractedData.missingFields.join(', ')}
                              </div>
                            )}

                            {message.extractedData.readyToAdd && (
                              <Button
                                onClick={() => addToItinerary(message.extractedData)}
                                disabled={isLoading}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add to Itinerary
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}
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

        {/* File upload preview */}
        {uploadedFiles.length > 0 && (
          <div className="mb-3 p-3 bg-earth-50 rounded-md border border-earth-200">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-earth-600" />
                <span className="text-sm text-earth-700">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadedFiles([])}
                  className="ml-auto text-earth-600 hover:text-earth-800"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
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
            <Upload className="h-4 w-4" />
          </Button>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your trip or upload a receipt to add to your itinerary..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || (!newMessage.trim() && uploadedFiles.length === 0)}
            size="icon"
            className="bg-earth-500 hover:bg-earth-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;