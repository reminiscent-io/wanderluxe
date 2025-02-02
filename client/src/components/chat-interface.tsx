import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/use-chat";
import { Send, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  tripId: number;
}

export function ChatInterface({ tripId }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isLoading } = useChat(tripId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      await sendMessage(input);
      setInput("");
    }
  };

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader className="text-lg font-semibold border-b flex justify-between items-center">
        Luxury Travel Assistant
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-hidden">
        <ScrollArea className="h-[500px] pr-4">
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={cn(
                "mb-4 p-4 rounded-lg",
                message.isAi 
                  ? "bg-secondary/50 ml-4" 
                  : "bg-primary/10 mr-4"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.isAi && message.citations && message.citations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Sources:</p>
                  <div className="space-y-1">
                    {message.citations.map((citation, i) => (
                      <a
                        key={i}
                        href={citation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        {new URL(citation).hostname}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </ScrollArea>
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about destinations, activities, or budgeting..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}