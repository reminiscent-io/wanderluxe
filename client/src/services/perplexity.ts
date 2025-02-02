import axios from "axios";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  citations?: string[];
}

export const perplexityService = {
  async chat(messages: Message[]): Promise<{ content: string; citations?: string[] }> {
    try {
      const response = await axios.post<PerplexityResponse>("/api/chat", {
        messages,
        model: "llama-3.1-sonar-small-128k-online",
      });

      return {
        content: response.data.choices[0].message.content,
        citations: response.data.citations,
      };
    } catch (error) {
      console.error("Perplexity API error:", error);
      throw new Error("Failed to get AI response");
    }
  },
};
