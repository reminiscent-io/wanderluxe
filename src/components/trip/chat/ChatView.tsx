// components/ChatView.tsx – WanderLuxe chat (fast‑typing edition)
// -----------------------------------------------------------------------------
//  Drop‑in replacement for your original ChatView that streams AI replies at
//  ≈500 chars/s (2 ms/char) **and** keeps the viewport anchored on the first
//  line of the new answer so users never have to scroll to the bottom to start
//  reading.  All original features – markdown rendering, receipt uploads,
//  “Add to Itinerary” buttons, etc. – are preserved.
// -----------------------------------------------------------------------------
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Button,
  Input,
  ScrollArea,
  Card,
  CardContent,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui"; // ← adjust barrel‑export path if different
import {
  Send,
  Bot,
  User,
  Loader2,
  Upload,
  Paperclip,
  Plus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/*******************************
 *  Types
 ******************************/
interface Attachment {
  type: "image" | "pdf";
  url: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  message: string;
  timestamp: string;
  user_id?: string;
  attachments?: Attachment[];
  extractedData?: {
    type: "hotel" | "flight" | "reservation" | "activity";
    data: any;
    missingFields?: string[];
    readyToAdd?: boolean;
  };
  /** fullText is only used for streaming; optional */
  fullText?: string;
}

interface ChatViewProps {
  tripId: string;
}

/*******************************
 *  Constants
 ******************************/
const TYPING_DELAY_MS = 2; // 2 ms/char ≈500 chars/s

/*******************************
 *  Component
 ******************************/
const ChatView: React.FC<ChatViewProps> = ({ tripId }) => {
  /* ---------------- State ---------------- */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  /* ---------------- Refs ---------------- */
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------------- Context ---------------- */
  const { user } = useAuth();
  const { toast } = useToast();

  /**************************************************************************
   *  Helpers
   **************************************************************************/
  /** Scroll so the bottom marker is visible (only once, when a new bubble is
   *  inserted).  We do *not* continually scroll during streaming – that way
   *  the first line of the assistant’s message stays fixed at the top of the
   *  viewport as the bubble grows downward.                                 */
  const scrollToBottomOnce = () => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  };

  /** Replace a message’s partial text during streaming */
  const updateMessageText = useCallback((id: string, partial: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, message: partial } : m))
    );
  }, []);

  /** Typing animation – resolves when done */
  const streamText = useCallback(
    (id: string, fullText: string) =>
      new Promise<void>((resolve) => {
        let i = 0;
        const tick = () => {
          i += 1;
          updateMessageText(id, fullText.slice(0, i));
          if (i < fullText.length) {
            setTimeout(tick, TYPING_DELAY_MS);
          } else {
            resolve();
          }
        };
        tick();
      }),
    [updateMessageText]
  );

  /**************************************************************************
   *  Load chat history once per trip
   **************************************************************************/
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!tripId) return;
      setIsLoadingHistory(true);
      try {
        const { data, error } = await supabase
          .from("chat_logs")
          .select("*")
          .eq("trip_id", tripId)
          .order("timestamp", { ascending: true });
        if (error) throw error;
        setMessages(data || []);
      } catch (err) {
        console.error("Error loading chat history:", err);
        toast({
          title: "Error",
          description: "Failed to load chat history. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  /**************************************************************************
   *  File upload helpers (unchanged from original)
   **************************************************************************/
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image (JPG, PNG) or PDF file.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }
    setUploadedFiles([file]);
    setNewMessage(`📎 ${file.name} – Ready to analyze receipt`);
  };

  const uploadToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user?.id}/${tripId}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(fileName, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  /**************************************************************************
   *  Send message
   **************************************************************************/
  const sendMessage = async () => {
    if ((!newMessage.trim() && uploadedFiles.length === 0) || !user || !tripId)
      return;

    const userMessageText = newMessage.trim() || "Analyze this receipt";
    setNewMessage("");
    setIsLoading(true);

    /* -------- Upload any attachments -------- */
    const attachments: Attachment[] = [];
    if (uploadedFiles.length) {
      try {
        for (const file of uploadedFiles) {
          const url = await uploadToSupabase(file);
          attachments.push({
            type: file.type.startsWith("image/") ? "image" : "pdf",
            url,
            name: file.name,
          });
        }
      } catch (err) {
        console.error("Upload error:", err);
        toast({
          title: "Upload Error",
          description: "Failed to upload file. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    /* -------- Optimistic user bubble -------- */
    const tempUserMsg: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      message: userMessageText,
      timestamp: new Date().toISOString(),
      user_id: user.id,
      attachments: attachments.length ? attachments : undefined,
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setUploadedFiles([]);

    /* -------- Call edge function -------- */
    try {
      const { data, error } = await supabase.functions.invoke("chat-ai", {
        body: { message: userMessageText, tripId, attachments },
      });
      if (error) throw error;

      // Remove temp user msg; add real user & streaming AI placeholder
      setMessages((prev) => {
        const withoutTmp = prev.filter((m) => m.id !== tempUserMsg.id);
        // Edge function returns user + ai messages in correct order
        return [...withoutTmp, data.userMessage, { ...data.aiMessage, message: "" }];
      });

      // Scroll viewport once so the new assistant bubble’s *top* is visible
      setTimeout(scrollToBottomOnce, 0);

      // Stream the AI response
      await streamText(data.aiMessage.id, data.aiMessage.message);
    } catch (err) {
      console.error("Error sending message:", err);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      // Remove optimistic bubble on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  /**************************************************************************
   *  Add extracted item to itinerary (unchanged)
   **************************************************************************/
  const addToItinerary = async (extractedData: any) => {
    try {
      setIsLoading(true);
      let endpoint = "";
      let payload: Record<string, any> = {};
      switch (extractedData.type) {
        case "hotel":
          endpoint = "accommodations";
          payload = {
            trip_id: tripId,
            hotel: extractedData.data.hotel_name,
            hotel_address: extractedData.data.address,
            initial_accommodation_day: extractedData.data.check_in_date,
            final_accommodation_day: extractedData.data.check_out_date,
            cost: extractedData.data.total_cost,
            currency: extractedData.data.currency || "USD",
          };
          break;
        case "flight":
          endpoint = "transportation";
          payload = {
            trip_id: tripId,
            type: "Flight",
            departure_location: extractedData.data.departure_city,
            arrival_location: extractedData.data.arrival_city,
            departure_time: extractedData.data.departure_time,
            arrival_time: extractedData.data.arrival_time,
            cost: extractedData.data.total_cost,
            currency: extractedData.data.currency || "USD",
          };
          break;
        case "reservation": {
          const reservationDate =
            extractedData.data.date || extractedData.data.reservation_date;
          const { data: dayData } = await supabase
            .from("trip_days")
            .select("day_id")
            .eq("trip_id", tripId)
            .eq("date", reservationDate)
            .single();
          if (dayData) {
            endpoint = "reservations";
            payload = {
              trip_id: tripId,
              day_id: dayData.day_id,
              restaurant_name: extractedData.data.restaurant_name,
              cuisine_type: extractedData.data.cuisine_type || "Unknown",
              reservation_time: extractedData.data.time,
              party_size: extractedData.data.party_size || 2,
              notes: extractedData.data.notes || "",
            };
          }
          break;
        }
        case "activity": {
          const activityDate =
            extractedData.data.date || extractedData.data.activity_date;
          const { data: dayData } = await supabase
            .from("trip_days")
            .select("day_id")
            .eq("trip_id", tripId)
            .eq("date", activityDate)
            .single();
          if (dayData) {
            endpoint = "day_activities";
            payload = {
              trip_id: tripId,
              day_id: dayData.day_id,
              title: extractedData.data.activity_name,
              description: extractedData.data.description || "",
              time: extractedData.data.time,
              cost: extractedData.data.cost,
              currency: extractedData.data.currency || "USD",
            };
          }
          break;
        }
      }
      if (endpoint && Object.keys(payload).length) {
        const { error } = await supabase.from(endpoint).insert(payload);
        if (error) throw error;
        toast({
          title: "Success!",
          description: `${
            extractedData.type.charAt(0).toUpperCase() + extractedData.type.slice(1)
          } added to your itinerary.`,
        });
      }
    } catch (err) {
      console.error("Add to itinerary error:", err);
      toast({
        title: "Error",
        description: "Failed to add item to itinerary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /** Allow Enter to send */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-earth-500" />
        <span className="ml-2 text-earth-600">Loading chat history…</span>
      </div>
    );
  }

  /**************************************************************************
   *  Render
   **************************************************************************/
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col h-full max-h-[600px]">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-earth-800">Trip Assistant</h3>
          <p className="text-sm text-earth-600">
            Ask me anything about your trip or get suggestions!
          </p>
        </div>

        {/* Messages */}
        <Card className="flex-1 mb-4">
          <CardContent className="p-0">
            <ScrollArea ref={scrollAreaRef} className="h-96 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <Bot className="h-12 w-12 text-earth-400 mb-4" />
                  <p className="text-earth-600 mb-2">No messages yet</p>
                  <p className="text-sm text-earth-500">
                    Start a conversation with your trip assistant!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      msg={message}
                      isCurrentUser={message.role === "user"}
                      userAvatar={user?.user_metadata?.avatar_url}
                      onAdd={addToItinerary}
                      isLoading={isLoading}
                    />
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
                            <span className="text-sm text-gray-600">Thinking…</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* File upload preview */}
        {uploadedFiles.length > 0 && (
          <div className="mb-3 p-3 bg-earth-50 rounded-md border border-earth-200">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2">
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

        {/* Input */}
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
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/**********************************************************************
 *  Message bubble (factored out for readability)
 **********************************************************************/
interface BubbleProps {
  msg: ChatMessage;
  isCurrentUser: boolean;
  userAvatar?: string;
  onAdd(extractedData: any): void;
  isLoading: boolean;
}

const MessageBubble: React.FC<BubbleProps> = ({
  msg,
  isCurrentUser,
  userAvatar,
  onAdd,
  isLoading,
}) => {
  return (
    <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[80%] ${
          isCurrentUser ? "flex-row-reverse" : "flex-row"
        } gap-2`}
      >
        <Avatar className="w-8 h-8 flex-shrink-0">
          {isCurrentUser ? (
            <>
              <AvatarImage src={userAvatar} />
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
            isCurrentUser ? "bg-earth-500 text-white" : "bg-gray-100 text-gray-800"
          }`}
        >
          {/* AI markdown or plain text */}
          {msg.role === "ai" ? (
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
                    <h3
                      className="text-base font-semibold text-gray-800 mt-3 mb-2 first:mt-0"
                      {...props}
                    >
                      {children}
                    </h3>
                  ),
                  h4: ({ children, ...props }) => (
                    <h4
                      className="text-sm font-semibold text-gray-800 mt-2 mb-1"
                      {...props}
                    >
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
                  ),
                }}
              >
                {msg.message || " " /* nbsp prevents empty bubble height Collapse */}
              </ReactMarkdown>
            </div>
          ) : (
            <div>
              {/* Attachments */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mb-3">
                  {msg.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-earth-400/20 rounded-md mb-2"
                    >
                      <Paperclip className="h-4 w-4" />
                      <span className="text-sm font-medium">{att.name}</span>
                    </div>
                  ))}
                  {msg.attachments
                    .filter((a) => a.type === "image")
                    .map((att, idx) => (
                      <img
                        key={idx}
                        src={att.url}
                        alt={att.name}
                        className="max-w-48 max-h-32 object-cover rounded mt-2"
                      />
                    ))}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
            </div>
          )}
          <p
            className={`text-xs mt-2 ${
              isCurrentUser ? "text-earth-200" : "text-gray-500"
            }`}
          >
            {new Date(msg.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Extraction card */}
      {msg.extractedData && (
        <div className="mt-2 max-w-[80%] ml-10">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Plus className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">
                  {msg.extractedData.type.charAt(0).toUpperCase() +
                    msg.extractedData.type.slice(1)}{" ""}
                  Detected
                </span>
              </div>
              <div className="text-sm text-green-700 mb-3 font-mono bg-green-100 p-2 rounded">
                <pre className="whitespace-pre-wrap text-xs">
                  {JSON.stringify(msg.extractedData.data, null, 2)}
                </pre>
              </div>
              {msg.extractedData.missingFields &&
                msg.extractedData.missingFields.length > 0 && (
                  <div className="text-sm text-amber-600 mb-2 p-2 bg-amber-50 rounded">
                    <strong>Missing required fields:</strong>{" "}
                    {msg.extractedData.missingFields.join(", ")}
                  </div>
                )}
              {msg.extractedData.readyToAdd && (
                <Button
                  onClick={() => onAdd(msg.extractedData)}
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
  );
};

export default ChatView;
