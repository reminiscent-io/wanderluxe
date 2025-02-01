import { useState } from "react";
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
  const { messages, sendMessage } = useChat(tripId, userId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput("");
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <h3 className="text-lg font-semibold">Travel Assistant</h3>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[500px] p-4">
          {messages.map((message, i) => (
            <div
              key={i}
              className={cn(
                "mb-4 max-w-[80%] rounded-lg p-3",
                message.isAi
                  ? "bg-secondary ml-0 mr-auto"
                  : "bg-primary text-primary-foreground ml-auto mr-0"
              )}
            >
              {message.content}
            </div>
          ))}
        </ScrollArea>
        <form
          onSubmit={handleSubmit}
          className="border-t p-4 flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}