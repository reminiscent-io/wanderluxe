export const INTENTS = {
  GATHER_PREFERENCES: "gather_preferences",
  SUGGEST_ACTIVITIES: "suggest_activities",
  MANAGE_BUDGET: "manage_budget",
  PLAN_TIMELINE: "plan_timeline",
  BOOK_ACCOMMODATION: "book_accommodation",
  ARRANGE_TRANSPORTATION: "arrange_transportation",
} as const;

export type Intent = (typeof INTENTS)[keyof typeof INTENTS];

export interface IntentHandler {
  handle: (message: string, context: any) => Promise<{
    response: string;
    suggestions?: string[];
    actions?: any[];
  }>;
}

export * from "./preferences";
export * from "./activities";
export * from "./budget";
export * from "./timeline";
