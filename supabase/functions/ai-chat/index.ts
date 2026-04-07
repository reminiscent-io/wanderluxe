import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Inlined from _shared/cors.ts to support single-function deployment
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://wanderluxe.io';
const ALLOWED_ORIGIN_PATTERNS = [
  /\.replit\.dev(:\d+)?$/,
  /\.repl\.co(:\d+)?$/,
  /\.replit\.app(:\d+)?$/,
];
function getCorsHeaders(origin: string | null): Record<string, string> {
  let allowOrigin = ALLOWED_ORIGIN;
  if (origin && ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin))) {
    allowOrigin = origin;
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  };
}

type SupabaseClient = ReturnType<typeof createClient>;

type ExtractedItem = {
  id: string;
  itemType: string;
  fields: Record<string, unknown>;
  missingRequired: string[];
  confidence: number;
  status: 'pending';
};

type ToolCall = {
  id: string;
  type: string;
  function: { name: string; arguments: string };
};

type OpenAIMessage = {
  role: string;
  content?: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
};

type OpenAIOptions = {
  model: string;
  openaiApiKey: string;
  tools?: any[];
  forceTool?: boolean;
  skipTools?: boolean;
};

type StreamContext = {
  openaiMsgs: OpenAIMessage[];
  openaiOptions: OpenAIOptions;
  forceSearch: boolean;
  serperApiKey: string | undefined;
  message: string;
  supabase: SupabaseClient;
  threadId: string;
};

type SystemPromptParams = {
  tripName: string;
  locationContext: string;
  arrivalDate: string;
  departureDate: string;
  partySizeContext: string;
  itineraryContext: string;
  formattedAccommodations: string;
  formattedTransportation: string;
  searchLocation: string;
  serperApiKey: string | undefined;
};

function jsonResponse(body: Record<string, unknown>, status = 200, cors: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}

async function searchWeb(query: string, apiKey: string): Promise<{ organic: Array<{ title: string; link: string; snippet?: string }> }> {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey
    },
    body: JSON.stringify({ q: query, num: 8 })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Serper API error: ${res.status} ${err}`);
  }
  return res.json();
}

function parseCreateItemsBlock(response: string): { cleanContent: string; extractedItems: ExtractedItem[] } {
  const createItemsRegex = /```create_items\s*([\s\S]*?)```/;
  const match = response.match(createItemsRegex);
  if (!match) return { cleanContent: response, extractedItems: [] };

  const jsonStr = match[1].trim();
  let items: ExtractedItem[] = [];
  try {
    const parsed = JSON.parse(jsonStr);
    const rawItems = Array.isArray(parsed) ? parsed : [parsed];
    const requiredByType: Record<string, string[]> = {
      accommodation: ['name', 'check_in_date', 'check_out_date'],
      transportation: ['type', 'departure_location', 'arrival_location', 'departure_date'],
      activity: ['name', 'date'],
      reservation: ['restaurant_name', 'date', 'time']
    };
    items = rawItems.map((item: any, idx: number) => {
      const itemType = item.itemType || 'activity';
      const fields = item.fields || item;
      const required = requiredByType[itemType] || [];
      const missingRequired = required.filter((k: string) => !fields[k]);
      return { id: `ai-item-${idx}-${Date.now()}`, itemType, fields, missingRequired, confidence: 0.85, status: 'pending' as const };
    });
  } catch { /* ignore parse errors */ }

  const cleanContent = response.replace(createItemsRegex, '').trim();
  return { cleanContent, extractedItems: items };
}

function accumulateToolCall(
  toolCallsAcc: Array<ToolCall | undefined>,
  tcArgs: Record<number, string>,
  tc: any
): void {
  const idx = tc.index ?? 0;
  if (!toolCallsAcc[idx]) {
    toolCallsAcc[idx] = {
      id: tc.id || `call_${idx}`,
      type: tc.type || 'function',
      function: { name: tc.function?.name || '', arguments: '' }
    };
  }
  if (tc.id) toolCallsAcc[idx]!.id = tc.id;
  if (tc.function?.name) toolCallsAcc[idx]!.function.name = tc.function.name;
  if (tc.function?.arguments) tcArgs[idx] = (tcArgs[idx] || '') + tc.function.arguments;
}

function processStreamLine(
  line: string,
  state: { content: string },
  toolCallsAcc: Array<ToolCall | undefined>,
  tcArgs: Record<number, string>,
  controller: { enqueue: (chunk: Uint8Array) => void },
  encoder: TextEncoder
): void {
  if (!line.startsWith('data: ') || line.slice(6) === '[DONE]') return;
  try {
    const data = JSON.parse(line.slice(6));
    const delta = data.choices?.[0]?.delta;
    if (delta?.content) {
      state.content += delta.content;
      controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify({ content: delta.content })}\n\n`));
    }
    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        accumulateToolCall(toolCallsAcc, tcArgs, tc);
      }
    }
  } catch { /* ignore malformed SSE chunks */ }
}

function finalizeToolCalls(
  toolCallsAcc: Array<ToolCall | undefined>,
  tcArgs: Record<number, string>
): ToolCall[] | null {
  const withIndex = toolCallsAcc
    .map((tc, i) => (tc ? { tc, i } : null))
    .filter(Boolean) as Array<{ tc: ToolCall; i: number }>;
  if (withIndex.length === 0) return null;
  return withIndex.map(({ tc, i }) => ({
    ...tc,
    function: { ...tc.function, arguments: tcArgs[i] ?? tc.function?.arguments ?? '' }
  }));
}

async function processStream(
  openaiRes: Response,
  controller: { enqueue: (chunk: Uint8Array) => void },
  encoder: TextEncoder
): Promise<{ fullResponse: string; toolCalls: ToolCall[] | null }> {
  const reader = openaiRes.body!.getReader();
  const decoder = new TextDecoder();
  const state = { content: '' };
  const toolCallsAcc: Array<ToolCall | undefined> = [];
  const tcArgs: Record<number, string> = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      processStreamLine(line, state, toolCallsAcc, tcArgs, controller, encoder);
    }
  }

  return { fullResponse: state.content, toolCalls: finalizeToolCalls(toolCallsAcc, tcArgs) };
}

async function callOpenAI(messages: OpenAIMessage[], stream: boolean, options: OpenAIOptions): Promise<Response> {
  const body: Record<string, unknown> = {
    model: options.model,
    messages,
    stream,
    temperature: 0.7,
    max_completion_tokens: 1500
  };
  if (options.tools && !options.skipTools) {
    body.tools = options.tools;
    if (options.forceTool) body.tool_choice = { type: 'function' as const, function: { name: 'search_web' } };
  }
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${options.openaiApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function handleUsage(supabase: SupabaseClient, userId: string, cors: Record<string, string> = {}): Promise<Response> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.rpc('get_ai_usage', { check_user_id: userId, check_date: today });
  const tomorrow = new Date(); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1); tomorrow.setUTCHours(0,0,0,0);
  return jsonResponse({ used: data?.[0]?.current_count || 0, limit: data?.[0]?.daily_limit || 15, tier: data?.[0]?.subscription_tier || 'free', resetAt: tomorrow.toISOString() }, 200, cors);
}

async function handleGetMessages(supabase: SupabaseClient, tripId: string, userId: string, url: URL, cors: Record<string, string> = {}): Promise<Response> {
  const { data: thread } = await supabase.from('ai_chat_threads').select('id').eq('trip_id', tripId).eq('user_id', userId).single();
  if (!thread) return jsonResponse({ messages: [], thread_id: null, hasMore: false }, 200, cors);

  const limit = Number.parseInt(url.searchParams.get('limit') || '5');
  const offset = Number.parseInt(url.searchParams.get('offset') || '0');

  const { count: totalCount } = await supabase.from('ai_chat_messages').select('id', { count: 'exact', head: true }).eq('thread_id', thread.id);

  const { data: messages } = await supabase
    .from('ai_chat_messages')
    .select('id, role, content, metadata, created_at')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const orderedMessages = (messages || []).reverse();
  const hasMore = offset + limit < (totalCount || 0);

  return jsonResponse({ messages: orderedMessages, thread_id: thread.id, hasMore, totalCount }, 200, cors);
}

async function handleDeleteMessages(supabase: SupabaseClient, tripId: string, userId: string, cors: Record<string, string> = {}): Promise<Response> {
  await supabase.from('ai_chat_threads').delete().eq('trip_id', tripId).eq('user_id', userId);
  return jsonResponse({ success: true }, 200, cors);
}

async function resolveThreadId(supabase: SupabaseClient, tripId: string, userId: string, threadIdInput: string | null): Promise<string | null> {
  let threadId = threadIdInput;
  if (threadId) {
    const { data: t } = await supabase.from('ai_chat_threads').select('id').eq('id', threadId).eq('user_id', userId).single();
    if (!t) threadId = null;
  }
  if (!threadId) {
    const { data: existing } = await supabase.from('ai_chat_threads').select('id').eq('trip_id', tripId).eq('user_id', userId).single();
    if (existing) return existing.id;
    const { data: newT } = await supabase.from('ai_chat_threads').insert({ trip_id: tripId, user_id: userId }).select('id').single();
    return newT?.id ?? null;
  }
  return threadId;
}

function buildLocationContext(
  tripName: string,
  primaryDestination: string | null,
  accommodations: any[] | null,
  transportation: any[] | null,
  reservations: any[] | null
): string {
  const locationHints: string[] = [];

  accommodations?.forEach((a: any) => {
    if (a.hotel_address) locationHints.push(sanitizeForPrompt(a.hotel_address));
    else if (a.hotel) locationHints.push(sanitizeForPrompt(a.hotel));
  });

  transportation?.forEach((t: any) => {
    if (t.arrival_location) locationHints.push(sanitizeForPrompt(t.arrival_location));
  });

  reservations?.forEach((r: any) => {
    if (r.address) locationHints.push(sanitizeForPrompt(r.address));
  });

  const inferredLocations = locationHints.length > 0 ? locationHints.slice(0, 3).join('; ') : null;
  const safeTripName = sanitizeForPrompt(tripName);
  const safeDest = sanitizeForPrompt(primaryDestination);

  if (safeDest) {
    return `The trip "${safeTripName}" is to ${safeDest}.`;
  }
  if (inferredLocations) {
    return `The trip is named "${safeTripName}". Based on booked accommodations, transportation, and reservations, the locations include: ${inferredLocations}.`;
  }
  return `The trip destination is: ${safeTripName}.`;
}

function buildSearchStep2WithSerper(): string {
  return `Call the search_web tool with these queries in priority order until you find results:
1. "[restaurant name] [city] site:resy.com"
2. "[restaurant name] [city] site:opentable.com"
3. "[restaurant name] [city] reservations" (fallback — catches Tock, Yelp, SevenRooms, direct sites)

For international destinations, also try: TheFork (Europe), Tabelog/Hotpepper (Japan), TableCheck, or "[restaurant] [city] reservations" for local platforms.`;
}

function buildSearchStep2WithoutSerper(): string {
  return 'Provide a Google Search link: https://www.google.com/search?q=RESTAURANT+NAME+PLUS+CITY+reservations (replace with actual names). Only include Resy/OpenTable URLs if confident from your knowledge; otherwise use the search link. Always add: "Verify the link before booking."';
}

function buildBookingIntro(hasSerper: boolean): string {
  if (hasSerper) return 'Use the search_web tool to search. ';
  return 'Provide a Google Search link for the user to find booking pages. Only include Resy/OpenTable URLs if you are confident from your knowledge; otherwise say "Search for reservations" with the link. Always add: "Verify the link before booking."';
}

function buildSystemPrompt(params: SystemPromptParams): string {
  const {
    tripName, locationContext, arrivalDate, departureDate,
    partySizeContext, itineraryContext, formattedAccommodations,
    formattedTransportation, searchLocation, serperApiKey
  } = params;

  const hasSerper = !!serperApiKey;
  const bookingIntro = buildBookingIntro(hasSerper);
  const searchStep2 = hasSerper ? buildSearchStep2WithSerper() : buildSearchStep2WithoutSerper();
  const mapsUrl = 'https://www.google.com/maps/search/PLACE+NAME+' + searchLocation;
  const searchUrl = 'https://www.google.com/search?q=PLACE+NAME+' + searchLocation;

  const safeTripName = sanitizeForPrompt(tripName);

  return `You are a helpful travel assistant for a trip to ${safeTripName}. ${locationContext}
Trip dates: ${arrivalDate} to ${departureDate}.${partySizeContext}${itineraryContext}

Accommodations:
${formattedAccommodations}

Transportation:
${formattedTransportation}

Guidelines:
- Be concise and helpful
- Use markdown formatting for readability. IMPORTANT: When writing numbered lists, put each item on its own line with a blank line between items for proper rendering
- When listing multiple recommendations, use a numbered markdown list with each item separated by a blank line
- When recommending hotels or attractions, make the name a clickable link using Google Maps or Google Search URLs
- For restaurants, use the Restaurant Booking Links workflow below — you may use direct booking URLs (Resy, OpenTable, etc.) when found via search
- IMPORTANT for non-restaurant places: Only use Google Maps or Google Search URL formats (never IP addresses or made-up URLs):
  - Google Maps: ${mapsUrl}
  - Google Search: ${searchUrl}
- Format: **[Place Name](url)** - Brief description

## Restaurant Booking Links

When you recommend, suggest, or discuss a specific restaurant for a user's trip, you MUST find booking links. ${bookingIntro}Follow this workflow:

### Step 1: Identify the Restaurant
Extract the restaurant name, city, and neighborhood (if known) from the conversation context or the trip destination.

### Step 2: Search for Booking Links
${searchStep2}

### Step 3: Classify the Booking Platform
From search results, identify which platform(s) the restaurant uses:
- Resy — URLs contain resy.com/cities/
- OpenTable — URLs contain opentable.com/r/ or opentable.com/restref/
- Tock — URLs contain exploretock.com/
- Yelp Reservations — URLs contain yelp.com/reservations/
- SevenRooms — URLs contain sevenrooms.com/
- TheFork — URLs contain thefork.com/ (Europe)
- Direct — The restaurant's own booking page

### Step 4: Present the Recommendation with Booking Action
Always include a booking link with every restaurant recommendation. Format:

**[Restaurant Name]** — [Cuisine Type], [Neighborhood]
[1-2 sentence description of why it fits the user's needs]
Price: [Price range if known]
Book on [Platform Name]: [Direct URL to booking page]

If multiple platforms exist, show both. If NO booking platform found, say so honestly and suggest Google Maps or the restaurant's website. NEVER fabricate or guess URLs — only use URLs from search results.

### Step 5: Pre-fill When Possible
If trip dates and party size are in context, you may append parameters to OpenTable URLs. Resy does not support deep-link pre-filling.

CRITICAL - YOU CAN ADD ITEMS TO THE TRIP:
You have the ability to add items directly to the user's trip itinerary. This is a core feature.
Adding a reservation = creating a timeline event the user can click to import. You are NOT booking at the restaurant.
When the user asks you to ADD, CREATE, SCHEDULE, or PUT something on their trip/itinerary/calendar, or says things like "I want to go to X for dinner on [day] at [time]", "add a dinner reservation at X", "schedule X for Tuesday", "put that on my itinerary", "add the Eiffel Tower visit", "yes add it", you MUST:

1. Confirm what you're adding in a brief, friendly response
2. ALWAYS include the JSON block below - this is what actually creates the item

YOU MUST output this JSON block at the END of your response:
\`\`\`create_items
[{"itemType": "reservation", "fields": {"restaurant_name": "...", "date": "YYYY-MM-DD", "time": "HH:mm", ...}}]
\`\`\`

Item types and their fields:
- reservation (restaurants/dining): {"restaurant_name", "date" (YYYY-MM-DD), "time" (HH:mm), "party_size", "address", "phone", "website" (booking URL when found), "notes"}
- accommodation (hotels/stays): {"name", "address", "check_in_date" (YYYY-MM-DD), "check_out_date", "check_in_time" (HH:mm), "check_out_time", "confirmation_number", "cost", "currency"}
- transportation (flights/trains/cars): {"type" (flight/train/shuttle/car_service/ferry/rental_car), "carrier", "departure_location", "arrival_location", "departure_date" (YYYY-MM-DD), "departure_time" (HH:mm), "arrival_date", "arrival_time", "confirmation_number", "cost", "currency"}
- activity (tours/attractions/events): {"name", "date" (YYYY-MM-DD), "start_time" (HH:mm), "end_time", "location", "notes", "cost", "currency"}

Date calculation rules:
- Trip dates are ${arrivalDate} to ${departureDate}
- If user says "Friday", "Tuesday", etc., calculate the actual YYYY-MM-DD date within the trip
- If user says "day 1", "day 3", etc., calculate from ${arrivalDate}
- Only include fields you have information for; use null for unknown fields

IMPORTANT: Never say "I can't add items" or "I don't have the ability to modify your itinerary". You DO have this ability through the JSON block. Always use it when the user wants to add something.`;
}

function extractSearchQuery(args: Record<string, unknown>): string {
  if (typeof args.query === 'string') return args.query;
  if (typeof args.q === 'string') return args.q;
  return '';
}

async function executeToolCalls(
  toolCalls: ToolCall[],
  serperApiKey: string,
  message: string
): Promise<Array<{ role: 'tool'; tool_call_id: string; content: string }>> {
  const toolResults: Array<{ role: 'tool'; tool_call_id: string; content: string }> = [];
  for (const tc of toolCalls) {
    if (tc.function.name !== 'search_web') continue;
    try {
      const argsStr = (tc.function.arguments || '').trim();
      const args = argsStr ? JSON.parse(argsStr) : {};
      const q = extractSearchQuery(args);
      const searchQuery = q || message || 'restaurant reservations';
      const results = await searchWeb(searchQuery, serperApiKey);
      const summary = (results.organic || []).slice(0, 6).map((r: any) => `${r.title}: ${r.link}`).join('\n');
      toolResults.push({ role: 'tool', tool_call_id: tc.id, content: summary || 'No results found.' });
    } catch (error_) {
      const errorMsg = error_ instanceof Error ? error_.message : 'Unknown';
      toolResults.push({ role: 'tool', tool_call_id: tc.id, content: `Search error: ${errorMsg}. You can suggest the user search Google for "[restaurant name] [city] reservations".` });
    }
  }
  return toolResults;
}

function buildSearchWebTool(serperApiKey: string | undefined): any | null {
  if (!serperApiKey) return null;
  return {
    type: 'function' as const,
    function: {
      name: 'search_web',
      description: 'Search the web for up-to-date information. Use for: restaurant booking pages (Resy, OpenTable), weather, current events, news, opening hours, exchange rates, or any query that benefits from live web results.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query, e.g. "Carbone NYC site:resy.com"' } },
        required: ['query']
      }
    }
  };
}

const DINING_KEYWORDS = /\b(restaurant|restaurants|dining|dinner|lunch|eat|food|reservation|reservations|book a table|opentable|resy|carbone)\b/i;
const RECOMMENDATION_KEYWORDS = /\b(where should i eat|booking link|reservation link)\b/i;
const WEATHER_KEYWORDS = /\b(weather|temperature|forecast|rainy|sunny|snow|humidity)\b/i;
const CURRENT_INFO_KEYWORDS = /\b(news|latest|current|today|happening|events|concerts|attractions|opening hours|closed today|exchange rate|currency)\b/i;
const WEATHER_QUESTION_KEYWORDS = /\b(what.*weather|how.*weather|recommend.*restaurant)\b/i;

function shouldForceSearch(message: string, hasTools: boolean): boolean {
  if (!hasTools) return false;
  return DINING_KEYWORDS.test(message)
    || RECOMMENDATION_KEYWORDS.test(message)
    || WEATHER_KEYWORDS.test(message)
    || CURRENT_INFO_KEYWORDS.test(message)
    || WEATHER_QUESTION_KEYWORDS.test(message);
}

async function fetchTripContext(supabase: SupabaseClient, tripId: string) {
  const { data: trip } = await supabase.from('trips').select('destination, arrival_date, departure_date, primary_destination, primary_destination_place_id').eq('trip_id', tripId).single();
  const { data: days } = await supabase.from('trip_days').select('date, title, day_activities(title, start_time)').eq('trip_id', tripId).order('date');
  const { data: accommodations } = await supabase.from('accommodations').select('hotel, hotel_address').eq('trip_id', tripId).limit(5);
  const { data: transportation } = await supabase.from('transportation').select('arrival_location, departure_location').eq('trip_id', tripId).limit(5);
  const { data: reservations } = await supabase.from('reservations').select('restaurant_name, address, number_of_people').eq('trip_id', tripId).limit(5);
  return { trip, days, accommodations, transportation, reservations };
}

function sanitizeForPrompt(input: string | null | undefined): string {
  if (!input) return '';
  return input.replace(/[\r\n]+/g, ' ').replace(/[`$\\]/g, '').slice(0, 200);
}

function buildItineraryContext(days: any[] | null): string {
  if (!days || days.length === 0) return '';
  const daysSummary = days.slice(0, 10).map((d: any) => {
    const activities = d.day_activities?.map((a: any) => sanitizeForPrompt(a.title)).join(', ') || 'no activities yet';
    const titleSuffix = d.title ? ' - ' + sanitizeForPrompt(d.title) : '';
    return d.date + titleSuffix + ':\n  ' + activities;
  }).join('\n\n');
  return '\n\nCurrent Itinerary:\n' + daysSummary;
}

function formatAccommodationLine(a: any): string {
  const dates = (a.hotel_checkin_date || 'TBD') + ' to ' + (a.hotel_checkout_date || 'TBD');
  const address = a.hotel_address ? ' (' + sanitizeForPrompt(a.hotel_address) + ')' : '';
  return '- ' + sanitizeForPrompt(a.hotel) + ': ' + dates + address;
}

function formatAccommodations(accommodations: any[] | null): string {
  return (accommodations || []).slice(0, 5)
    .map(formatAccommodationLine)
    .join('\n') || 'No accommodations added yet';
}

function formatTransportationLine(t: any): string {
  const provider = t.provider ? ' (' + sanitizeForPrompt(t.provider) + ')' : '';
  const departure = sanitizeForPrompt(t.departure_location) || 'TBD';
  const arrival = sanitizeForPrompt(t.arrival_location) || 'TBD';
  const time = t.start_time ? ' at ' + t.start_time : '';
  return '- ' + sanitizeForPrompt(t.type) + provider + ': ' + departure + ' \u2192 ' + arrival + ' on ' + t.start_date + time;
}

function formatTransportation(transportation: any[] | null): string {
  return (transportation || []).slice(0, 5)
    .map(formatTransportationLine)
    .join('\n') || 'No transportation added yet';
}

function deriveSearchLocation(primaryDestination: string | null, accommodations: any[] | null, transportation: any[] | null, tripName: string): string {
  const location = primaryDestination || accommodations?.[0]?.hotel_address || transportation?.[0]?.arrival_location || tripName;
  return location.replaceAll(/\s+/g, '+');
}

type ToolCallFollowUpParams = {
  toolCalls: ToolCall[];
  fullResponse: string;
  currentMessages: OpenAIMessage[];
  openaiOptions: OpenAIOptions;
  serperApiKey: string;
  message: string;
};

async function handleToolCallFollowUp(
  params: ToolCallFollowUpParams,
  controller: { enqueue: (chunk: Uint8Array) => void },
  encoder: TextEncoder
): Promise<string> {
  const { toolCalls, fullResponse, currentMessages, openaiOptions, serperApiKey, message } = params;
  const assistantMsg = { role: 'assistant' as const, content: fullResponse || null, tool_calls: toolCalls };
  const toolResults = await executeToolCalls(toolCalls, serperApiKey, message);
  const updatedMessages = [...currentMessages, assistantMsg, ...toolResults];
  const followRes = await callOpenAI(updatedMessages, true, { ...openaiOptions, skipTools: true });

  if (followRes.ok) {
    const { fullResponse: followContent } = await processStream(followRes, controller, encoder);
    return followContent;
  }

  const errBody = await followRes.text();
  console.error('OpenAI follow-up error:', followRes.status, errBody);
  const fallback = 'I found some booking options but had trouble formatting them. Try searching for the restaurant name plus your city on Resy or OpenTable.';
  controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify({ content: fallback })}\n\n`));
  return fallback;
}

function emitFinalEvents(
  controller: { enqueue: (chunk: Uint8Array) => void; close: () => void },
  encoder: TextEncoder,
  finalContent: string,
  fallbackMsg: string,
  model: string,
  threadId: string,
  savedId: string | undefined
): void {
  const { cleanContent, extractedItems } = parseCreateItemsBlock(finalContent);
  const contentToSave = cleanContent || finalContent;

  if (extractedItems.length > 0) {
    controller.enqueue(encoder.encode(`event: extracted_items\ndata: ${JSON.stringify({ items: extractedItems, meta: { model, source: 'conversation' } })}\n\n`));
  }
  if (fallbackMsg && finalContent === fallbackMsg) {
    controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify({ content: fallbackMsg })}\n\n`));
  }
  controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ thread_id: threadId, message_id: savedId, content: contentToSave || finalContent })}\n\n`));
  controller.close();
}

async function handleStreamResponse(
  controller: { enqueue: (chunk: Uint8Array) => void; close: () => void },
  encoder: TextEncoder,
  ctx: StreamContext
): Promise<void> {
  const currentMessages = [...ctx.openaiMsgs];
  const openaiRes = await callOpenAI(currentMessages, true, { ...ctx.openaiOptions, forceTool: ctx.forceSearch });

  if (!openaiRes.ok) {
    controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'AI request failed' })}\n\n`));
    controller.close();
    return;
  }

  const { fullResponse, toolCalls } = await processStream(openaiRes, controller, encoder);
  let lastResponse = fullResponse;

  if (toolCalls && toolCalls.length > 0 && ctx.serperApiKey) {
    lastResponse = await handleToolCallFollowUp({
      toolCalls, fullResponse, currentMessages,
      openaiOptions: ctx.openaiOptions,
      serperApiKey: ctx.serperApiKey,
      message: ctx.message
    }, controller, encoder);
  }

  const fallbackMsg = toolCalls?.length ? 'I searched for booking options but couldn\'t format the results. Try searching for the restaurant name plus your city on Resy or OpenTable.' : '';
  const finalContent = lastResponse.trim() || fallbackMsg;
  const { cleanContent } = parseCreateItemsBlock(finalContent);
  const contentToSave = cleanContent || finalContent;

  const { data: saved } = await ctx.supabase.from('ai_chat_messages').insert({ thread_id: ctx.threadId, role: 'assistant', content: contentToSave || '(No response)' }).select('id').single();
  emitFinalEvents(controller, encoder, finalContent, fallbackMsg, ctx.openaiOptions.model, ctx.threadId, saved?.id);
}

async function handlePostMessage(
  req: Request,
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
  openaiApiKey: string,
  serperApiKey: string | undefined,
  model: string,
  cors: Record<string, string> = {}
): Promise<Response> {
  const { message, thread_id } = await req.json();
  if (!message?.trim()) return jsonResponse({ error: 'Message required' }, 400, cors);
  if (message.length > 4000) return jsonResponse({ error: 'Message too long' }, 400, cors);

  const today = new Date().toISOString().split('T')[0];
  const { data: usageData } = await supabase.rpc('increment_ai_usage', { check_user_id: userId, check_date: today });
  if (usageData?.[0] && !usageData[0].allowed) {
    return jsonResponse({ code: 'DAILY_LIMIT_REACHED', message: 'Daily limit reached', used: usageData[0].current_count, limit: usageData[0].daily_limit }, 429, cors);
  }

  const threadId = await resolveThreadId(supabase, tripId, userId, thread_id || null);
  if (!threadId) return jsonResponse({ code: 'ERROR', message: 'Thread creation failed' }, 500, cors);

  await supabase.from('ai_chat_messages').insert({ thread_id: threadId, role: 'user', content: message.trim() });

  const { trip, days, accommodations, transportation, reservations } = await fetchTripContext(supabase, tripId);
  const { data: msgs } = await supabase.from('ai_chat_messages').select('role, content').eq('thread_id', threadId).order('created_at', { ascending: false }).limit(10);

  const tripName = trip?.destination || 'this trip';
  const primaryDestination = trip?.primary_destination;
  const arrivalDate = trip?.arrival_date || 'TBD';
  const departureDate = trip?.departure_date || 'TBD';
  const partySize = reservations?.find((r: any) => r.number_of_people != null)?.number_of_people;
  const partySizeContext = partySize == null ? '' : `\nParty size (from existing reservations): ${partySize}`;

  const locationContext = buildLocationContext(tripName, primaryDestination, accommodations, transportation, reservations);
  const itineraryContext = buildItineraryContext(days);
  const formattedAccommodations = formatAccommodations(accommodations);
  const formattedTransportation = formatTransportation(transportation);
  const searchLocation = deriveSearchLocation(primaryDestination, accommodations, transportation, tripName);

  const systemPrompt = buildSystemPrompt({
    tripName, locationContext, arrivalDate, departureDate,
    partySizeContext, itineraryContext, formattedAccommodations,
    formattedTransportation, searchLocation, serperApiKey
  });

  const searchWebTool = buildSearchWebTool(serperApiKey);
  const tools = searchWebTool ? [searchWebTool] : undefined;
  const openaiMsgs: OpenAIMessage[] = [{ role: 'system', content: systemPrompt }, ...(msgs || []).reverse().map((m: any) => ({ role: m.role, content: m.content }))];
  const forceSearch = shouldForceSearch(message, !!tools);
  const encoder = new TextEncoder();

  const ctx: StreamContext = {
    openaiMsgs,
    openaiOptions: { model, openaiApiKey, tools },
    forceSearch,
    serperApiKey,
    message,
    supabase,
    threadId
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await handleStreamResponse(controller, encoder, ctx);
      } catch (error_) {
        console.error('Stream error:', error_);
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'Stream error' })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, { headers: { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
}

async function authenticateUser(supabase: SupabaseClient, authHeader: string): Promise<{ userId: string; userEmail: string | undefined } | null> {
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return null;
  return { userId: userData.user.id, userEmail: userData.user.email?.toLowerCase() };
}

async function checkTripAccess(supabase: SupabaseClient, tripId: string, userId: string, userEmail: string | undefined): Promise<boolean> {
  const { data: ownedTrip } = await supabase.from('trips').select('trip_id').eq('trip_id', tripId).eq('user_id', userId).single();
  if (ownedTrip) return true;

  if (userEmail) {
    const { data: sharedTrip } = await supabase.from('trip_shares').select('id').eq('trip_id', tripId).ilike('shared_with_email', userEmail).single();
    if (sharedTrip) return true;
  }

  const { data: publicTrip } = await supabase.from('trips').select('trip_id').eq('trip_id', tripId).eq('is_public', true).single();
  return !!publicTrip;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const tripId = pathParts[1];
  const action = pathParts[2];

  if (!tripId) return jsonResponse({ error: 'Trip ID required' }, 400, corsHeaders);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ code: 'UNAUTHORIZED', message: 'Missing authorization' }, 401, corsHeaders);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const serperApiKey = Deno.env.get('SERPER_API_KEY');
  const model = Deno.env.get('OPENAI_CHAT_MODEL') || 'gpt-5.4-mini';

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const user = await authenticateUser(supabase, authHeader);
  if (!user) return jsonResponse({ code: 'UNAUTHORIZED', message: 'Invalid token' }, 401, corsHeaders);

  const hasAccess = await checkTripAccess(supabase, tripId, user.userId, user.userEmail);
  if (!hasAccess) return jsonResponse({ code: 'FORBIDDEN', message: 'Access denied' }, 403, corsHeaders);

  if (action === 'usage' && req.method === 'GET') {
    return handleUsage(supabase, user.userId, corsHeaders);
  }

  if (action === 'messages' && req.method === 'GET') {
    return handleGetMessages(supabase, tripId, user.userId, url, corsHeaders);
  }

  if (action === 'messages' && req.method === 'DELETE') {
    return handleDeleteMessages(supabase, tripId, user.userId, corsHeaders);
  }

  if (req.method === 'POST' && !action) {
    if (!openaiApiKey) return jsonResponse({ code: 'CONFIG_ERROR', message: 'OpenAI not configured' }, 500, corsHeaders);
    return handlePostMessage(req, supabase, tripId, user.userId, openaiApiKey, serperApiKey, model, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
});
