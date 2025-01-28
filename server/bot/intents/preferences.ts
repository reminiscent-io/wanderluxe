import type { IntentHandler } from "./index";

export const preferencesHandler: IntentHandler = {
  handle: async (message: string, context: any) => {
    // TODO: Implement preferences handling logic
    return {
      response: "I'll help you plan your perfect luxury trip. What's your dream destination?",
      suggestions: [
        "Tell me about your ideal accommodation type",
        "What activities interest you the most?",
        "Do you have any specific dates in mind?",
      ],
    };
  },
};
