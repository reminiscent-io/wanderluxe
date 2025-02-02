import { useState } from "react";
import { api } from "@/services/api";

interface Message {
  id: number;
  tripId: number;
  content: string;
  isAi: boolean;
  createdAt: Date;
}

export function useChat(tripId: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    try {
      setIsLoading(true);

      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          tripId,
          content,
          createdAt: new Date(),
          isAi: false
        }
      ]);

      const response = await api.post('/chat', {
        tripId,
        message: content,
        model: "sonar-pro"
      });

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          tripId,
          content: response.content,
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
          id: Date.now() + 1,
          tripId,
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