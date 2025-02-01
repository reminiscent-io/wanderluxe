import { useEffect, useState } from "react";
import type { Message } from "@db/schema";

export function useChat(tripId: number, userId: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    try {
      setIsLoading(true);

      // Add user message immediately
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          tripId,
          userId,
          content,
          createdAt: new Date(),
          isAi: false
        }
      ]);

      // Call backend API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId,
          message: content,
          model: "sonar-pro"
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const aiResponse = await response.json();

      // Add AI response to messages
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          tripId,
          userId,
          content: aiResponse.content || "AI did not respond.",
          createdAt: new Date(),
          isAi: true
        }
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          tripId,
          userId,
          content: `Error: ${errorMessage}`,
          createdAt: new Date(),
          isAi: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, sendMessage, isLoading };
}
