import { useState } from "react";
import { perplexityService } from "@/services/perplexity";

interface Message {
  id: number;
  tripId: number;
  content: string;
  isAi: boolean;
  createdAt: Date;
  citations?: string[];
}

const SYSTEM_PROMPT = `You are a luxury travel planning assistant. Help users plan their trips by suggesting activities, accommodations, and managing their budget. Be precise and concise in your recommendations. When suggesting activities or places, include specific details like addresses and estimated costs. Today's date is ${new Date().toLocaleDateString()}.`;

export function useChat(tripId: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    try {
      setIsLoading(true);

      // Add user message to the chat
      const userMessage = {
        id: Date.now(),
        tripId,
        content,
        createdAt: new Date(),
        isAi: false
      };
      setMessages(prev => [...prev, userMessage]);

      // Prepare conversation history for Perplexity
      const conversationHistory = [
        { role: "system" as const, content: SYSTEM_PROMPT },
        ...messages.map(msg => ({
          role: msg.isAi ? "assistant" as const : "user" as const,
          content: msg.content
        })),
        { role: "user" as const, content }
      ];

      // Get AI response
      const response = await perplexityService.chat(conversationHistory);

      // Add AI response to the chat
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          tripId,
          content: response.content,
          createdAt: new Date(),
          isAi: true,
          citations: response.citations
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