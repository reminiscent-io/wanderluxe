import type { Message } from "@db/schema";

interface ChatResponse {
  content: string;
  intent?: string;
  confidence?: number;
  suggestions?: string[];
}

export async function processMessage(message: Message): Promise<ChatResponse> {
  // TODO: Implement AI chat processing
  return {
    content: "I understand you want to plan a luxury trip. Could you tell me more about your preferences?",
    intent: "gather_preferences",
    confidence: 0.9,
    suggestions: [
      "What's your preferred destination?",
      "What's your budget range?",
      "When are you planning to travel?",
    ],
  };
}
