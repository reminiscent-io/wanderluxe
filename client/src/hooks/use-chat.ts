import { useEffect, useState } from "react";
import type { Message } from "@db/schema";

export function useChat(tripId: number, userId: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    try {
      setIsLoading(true);

      // Add user message immediately
      setMessages(prev => [...prev, {
        id: Date.now(),
        tripId,
        userId,
        content,
        createdAt: new Date(),
        isAi: false
      }]);

      // Get Perplexity API response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId,
          message: content,
          model: "sonar-pro", // Or "sonar"
        }),
      });

      const aiResponse = await response.json();

      setMessages(prev => [...prev, {
        id: Date.now(),
        tripId,
        userId,
        content: aiResponse.content,
        createdAt: new Date(),
        isAi: true
      }]);

    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, sendMessage, isLoading };
}
