// Pure tool-forcing heuristics for the AI chat. Given a user message, decide
// whether to force the model to call one of the available tools (`find_place`
// or `search_web`) on its first turn, rather than letting it answer from
// memory. Kept free of Deno globals so vitest can import directly.

export const DINING_KEYWORDS = /\b(restaurant|restaurants|dining|dinner|lunch|eat|food|reservation|reservations|book a table|opentable|resy|carbone)\b/i;
export const PLACE_KEYWORDS = /\b(hotel|hotels|attraction|attractions|landmark|museum|park|bar|bars|cafe|neighborhood|things to do|visit|sightseeing|activity|activities|recommend)\b/i;
export const BOOKING_KEYWORDS = /\b(booking link|reservation link|book a table)\b/i;
export const WEATHER_KEYWORDS = /\b(weather|temperature|forecast|rainy|sunny|snow|humidity)\b/i;
export const CURRENT_INFO_KEYWORDS = /\b(news|latest|current|today|happening|events|concerts|opening hours|closed today|exchange rate|currency)\b/i;

export function chooseForcedTool(
  message: string,
  hasFindPlace: boolean,
  hasSearchWeb: boolean,
): string | null {
  // Explicit live/web info → prefer web search.
  if (hasSearchWeb && (
    BOOKING_KEYWORDS.test(message)
    || WEATHER_KEYWORDS.test(message)
    || CURRENT_INFO_KEYWORDS.test(message)
  )) {
    return 'search_web';
  }
  // Dining / place recommendations → prefer structured Google Places.
  if (hasFindPlace && (DINING_KEYWORDS.test(message) || PLACE_KEYWORDS.test(message))) {
    return 'find_place';
  }
  // Dining fallback when only search_web is configured.
  if (hasSearchWeb && DINING_KEYWORDS.test(message)) {
    return 'search_web';
  }
  return null;
}
