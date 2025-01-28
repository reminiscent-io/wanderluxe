import type { Message } from "@db/schema";
import { INTENTS } from "../intents";

export interface TrainingData {
  intent: keyof typeof INTENTS;
  examples: string[];
}

export const trainingData: TrainingData[] = [
  {
    intent: "GATHER_PREFERENCES",
    examples: [
      "I want to plan a luxury honeymoon",
      "Help me plan a special vacation",
      "What are the best luxury destinations",
      "Looking for exclusive travel experiences",
    ],
  },
  {
    intent: "SUGGEST_ACTIVITIES",
    examples: [
      "What activities are available",
      "Show me luxury experiences",
      "What can we do at the destination",
      "Recommend some exclusive activities",
    ],
  },
  {
    intent: "MANAGE_BUDGET",
    examples: [
      "What's the budget breakdown",
      "How much should I budget for this trip",
      "Show me luxury accommodation prices",
      "What's the cost for activities",
    ],
  },
  {
    intent: "PLAN_TIMELINE",
    examples: [
      "Help me plan the schedule",
      "Create an itinerary",
      "What's the best time to visit",
      "Plan activities timeline",
    ],
  },
];

export function trainModel() {
  // TODO: Implement model training logic
  console.log("Training model with examples:", trainingData.length);
}
