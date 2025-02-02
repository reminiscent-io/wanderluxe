import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/use-chat";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  tripId: number;
  userId: number;
}

export function ChatInterface({ tripId, userId }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isLoading } = useChat(tripId, userId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (input.trim() && !isLoading) {
        await sendMessage(input);
        setInput("");
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <Card className="w-full max-w-2xl h-[600px] flex flex-col">
      <CardHeader className="text-lg font-semibold border-b">
        Travel Assistant
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-hidden">
        <ScrollArea className="h-[500px] pr-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "mb-4 p-3 rounded-lg",
                message.isAi ? "bg-gray-100 ml-auto w-3/4" : "bg-blue-100 mr-auto w-3/4"
              )}
            >
              <p className="text-sm">{message.content}</p>
              {message.isAi && (
                <p className="text-xs text-gray-500 mt-2">AI Assistant</p>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </ScrollArea>
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about destinations, budgets, or itineraries..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Sending..." : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}