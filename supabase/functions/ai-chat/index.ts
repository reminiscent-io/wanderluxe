import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateAndRewriteLinks } from './linkValidator.ts';

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
  forceToolName?: string | null;
  skipTools?: boolean;
};

type StreamContext = {
  openaiMsgs: OpenAIMessage[];
  openaiOptions: OpenAIOptions;
  forceToolName: string | null;
  serperApiKey: string | undefined;
  googlePlacesApiKey: string | undefined;
  searchLocation: string;
  verifiedUrls: Set<string>;
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
  serperApiKey: string | undefined;
  googlePlacesApiKey: string | undefined;
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

type PlaceResult = {
  name: string;
  place_id: string;
  formatted_address: string;
  maps_url: string;
  website?: string;
  rating?: number;
  phone?: string;
};

// Hardcoded Google Places API base. All findPlaces() fetches target this host
// and nothing else — the `query` and `place_id` values are only ever appended
// as query-string parameters via URL.searchParams, never as path segments or
// hosts. This bounds SSRF risk: the request destination is fixed at compile
// time regardless of AI-supplied input.
const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com';

async function findPlaces(query: string, apiKey: string): Promise<PlaceResult[]> {
  // Guard against pathologically long model input before hitting Google.
  const safeQuery = (query || '').slice(0, 256);

  // Text Search gives us candidates with place_id for a free-form query.
  const searchUrl = new URL('/maps/api/place/textsearch/json', GOOGLE_PLACES_BASE);
  searchUrl.searchParams.set('query', safeQuery);
  searchUrl.searchParams.set('key', apiKey);
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`Google Places text search error: ${searchRes.status}`);
  const searchJson = await searchRes.json();
  type RawPlace = {
    name?: string;
    place_id: string;
    formatted_address?: string;
    rating?: number;
  };
  const candidates: RawPlace[] = (searchJson.results || []).slice(0, 3);
  if (candidates.length === 0) return [];

  // Fetch Place Details for each candidate (website + phone). In parallel, but only top 3.
  const detailPromises = candidates.map(async (c) => {
    try {
      const detailsUrl = new URL('/maps/api/place/details/json', GOOGLE_PLACES_BASE);
      detailsUrl.searchParams.set('place_id', c.place_id);
      detailsUrl.searchParams.set('fields', 'name,place_id,formatted_address,website,rating,formatted_phone_number');
      detailsUrl.searchParams.set('key', apiKey);
      const detailRes = await fetch(detailsUrl);
      const detailJson = await detailRes.json();
      const d = detailJson.result || {};
      return {
        name: d.name || c.name,
        place_id: c.place_id,
        formatted_address: d.formatted_address || c.formatted_address || '',
        maps_url: `https://www.google.com/maps/place/?q=place_id:${c.place_id}`,
        website: d.website,
        rating: d.rating ?? c.rating,
        phone: d.formatted_phone_number,
      } as PlaceResult;
    } catch {
      return {
        name: c.name,
        place_id: c.place_id,
        formatted_address: c.formatted_address || '',
        maps_url: `https://www.google.com/maps/place/?q=place_id:${c.place_id}`,
        rating: c.rating,
      } as PlaceResult;
    }
  });
  return Promise.all(detailPromises);
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
    if (options.forceToolName) {
      body.tool_choice = { type: 'function' as const, function: { name: options.forceToolName } };
    }
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

function buildLinkPolicy(hasFindPlace: boolean, hasSerper: boolean): string {
  if (hasFindPlace && hasSerper) {
    return `## Link Policy (STRICT)
- You have two tools: \`find_place\` (Google Places — canonical names, addresses, websites, Maps URLs) and \`search_web\` (live web search for booking pages).
- Whenever you mention a specific place (restaurant, hotel, attraction, landmark), FIRST call \`find_place\` so you can link to the verified Google Maps URL or official website.
- Only use \`search_web\` for booking deep-links (Resy, OpenTable, Tock, etc.) or time-sensitive info (weather, opening hours, events).
- NEVER invent a URL. NEVER retype a URL from memory. Only use URLs that appear verbatim in a tool result.
- If neither tool returns a URL for a place, write the place name in bold with NO link. Do not make one up.`;
  }
  if (hasFindPlace) {
    return `## Link Policy (STRICT)
- You have one tool: \`find_place\` (Google Places). Call it for every specific place you mention and link to the returned website or Maps URL.
- NEVER invent a URL. NEVER retype a URL from memory. Only use URLs that appear verbatim in a tool result.
- For restaurant bookings (Resy, OpenTable, etc.) you have no search tool available — do not attempt to construct booking URLs. Recommend the restaurant and let the user search for bookings themselves.
- If \`find_place\` returns no URL for a place, write the place name in bold with NO link. Do not make one up.`;
  }
  if (hasSerper) {
    return `## Link Policy (STRICT)
- You have one tool: \`search_web\`. Call it whenever you mention a specific place and want to link to it.
- NEVER invent a URL. NEVER retype a URL from memory. Only use URLs that appear verbatim in a tool result.
- If no result exists, write the place name in bold with NO link.`;
  }
  return `## Link Policy (STRICT)
- You have no web tools available in this environment.
- Do NOT author any URLs. Any URL you write will be stripped and replaced with a Google Search fallback.
- Write place names in bold (\`**Place Name**\`) without links. The client will render a Google Search link automatically.`;
}

function buildSystemPrompt(params: SystemPromptParams): string {
  const {
    tripName, locationContext, arrivalDate, departureDate,
    partySizeContext, itineraryContext, formattedAccommodations,
    formattedTransportation, serperApiKey, googlePlacesApiKey
  } = params;

  const hasSerper = !!serperApiKey;
  const hasFindPlace = !!googlePlacesApiKey;
  const linkPolicy = buildLinkPolicy(hasFindPlace, hasSerper);

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
- Format place recommendations as: **[Place Name](verified-url)** — brief description (when you have a verified URL), otherwise **Place Name** — brief description (with no link)

${linkPolicy}

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

type ToolExecutionContext = {
  serperApiKey: string | undefined;
  googlePlacesApiKey: string | undefined;
  message: string;
  verifiedUrls: Set<string>;
};

async function executeSearchWeb(
  tc: ToolCall,
  serperApiKey: string,
  message: string,
  verifiedUrls: Set<string>,
): Promise<{ role: 'tool'; tool_call_id: string; content: string }> {
  try {
    const argsStr = (tc.function.arguments || '').trim();
    const args = argsStr ? JSON.parse(argsStr) : {};
    const q = extractSearchQuery(args);
    const searchQuery = q || message || 'restaurant reservations';
    const results = await searchWeb(searchQuery, serperApiKey);
    const organic = (results.organic || []).slice(0, 6);
    for (const r of organic) {
      if (r.link) verifiedUrls.add(r.link);
    }
    const summary = organic.map((r) => `${r.title}: ${r.link}`).join('\n');
    return { role: 'tool', tool_call_id: tc.id, content: summary || 'No results found.' };
  } catch (error_) {
    const errorMsg = error_ instanceof Error ? error_.message : 'Unknown';
    return { role: 'tool', tool_call_id: tc.id, content: `Search error: ${errorMsg}. Do not fabricate a URL; tell the user to search manually.` };
  }
}

async function executeFindPlace(
  tc: ToolCall,
  googlePlacesApiKey: string,
  verifiedUrls: Set<string>,
): Promise<{ role: 'tool'; tool_call_id: string; content: string }> {
  try {
    const argsStr = (tc.function.arguments || '').trim();
    const args = argsStr ? JSON.parse(argsStr) : {};
    const query = typeof args.query === 'string' ? args.query : '';
    if (!query) {
      return { role: 'tool', tool_call_id: tc.id, content: 'find_place error: missing "query" argument.' };
    }
    const places = await findPlaces(query, googlePlacesApiKey);
    if (places.length === 0) {
      return { role: 'tool', tool_call_id: tc.id, content: 'No matching places found.' };
    }
    for (const p of places) {
      verifiedUrls.add(p.maps_url);
      if (p.website) verifiedUrls.add(p.website);
    }
    // Give the model a compact, unambiguous structured payload so it can
    // quote verified URLs instead of authoring new ones.
    const payload = places.map((p) => ({
      name: p.name,
      address: p.formatted_address,
      rating: p.rating,
      phone: p.phone,
      website: p.website || null,
      maps_url: p.maps_url,
    }));
    return { role: 'tool', tool_call_id: tc.id, content: JSON.stringify(payload) };
  } catch (error_) {
    const errorMsg = error_ instanceof Error ? error_.message : 'Unknown';
    return { role: 'tool', tool_call_id: tc.id, content: `find_place error: ${errorMsg}. Do not fabricate a URL.` };
  }
}

async function executeToolCalls(
  toolCalls: ToolCall[],
  ctx: ToolExecutionContext,
): Promise<Array<{ role: 'tool'; tool_call_id: string; content: string }>> {
  const toolResults: Array<{ role: 'tool'; tool_call_id: string; content: string }> = [];
  for (const tc of toolCalls) {
    if (tc.function.name === 'search_web' && ctx.serperApiKey) {
      toolResults.push(await executeSearchWeb(tc, ctx.serperApiKey, ctx.message, ctx.verifiedUrls));
    } else if (tc.function.name === 'find_place' && ctx.googlePlacesApiKey) {
      toolResults.push(await executeFindPlace(tc, ctx.googlePlacesApiKey, ctx.verifiedUrls));
    } else {
      toolResults.push({ role: 'tool', tool_call_id: tc.id, content: `Tool "${tc.function.name}" is not available in this environment.` });
    }
  }
  return toolResults;
}

function buildTools(serperApiKey: string | undefined, googlePlacesApiKey: string | undefined): any[] | undefined {
  const tools: any[] = [];

  if (googlePlacesApiKey) {
    tools.push({
      type: 'function' as const,
      function: {
        name: 'find_place',
        description: 'Look up a specific place (restaurant, hotel, landmark, attraction) on Google Places. Returns verified name, address, website, phone, rating, and a canonical Google Maps URL. Use this whenever you recommend or reference a specific place so that the URL you cite is real.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Free-text place query, e.g. "Carbone restaurant NYC" or "Hotel Bel-Air Los Angeles".',
            },
          },
          required: ['query'],
        },
      },
    });
  }

  if (serperApiKey) {
    tools.push({
      type: 'function' as const,
      function: {
        name: 'search_web',
        description: 'Search the web for up-to-date information. Use only for time-sensitive queries that find_place cannot answer: restaurant booking pages (Resy, OpenTable), weather, current events, opening hours, exchange rates.',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string', description: 'Search query, e.g. "Carbone NYC site:resy.com"' } },
          required: ['query'],
        },
      },
    });
  }

  return tools.length > 0 ? tools : undefined;
}

const DINING_KEYWORDS = /\b(restaurant|restaurants|dining|dinner|lunch|eat|food|reservation|reservations|book a table|opentable|resy|carbone)\b/i;
const PLACE_KEYWORDS = /\b(hotel|hotels|attraction|attractions|landmark|museum|park|bar|bars|cafe|neighborhood|things to do|visit|sightseeing|activity|activities|recommend)\b/i;
const BOOKING_KEYWORDS = /\b(booking link|reservation link|book a table)\b/i;
const WEATHER_KEYWORDS = /\b(weather|temperature|forecast|rainy|sunny|snow|humidity)\b/i;
const CURRENT_INFO_KEYWORDS = /\b(news|latest|current|today|happening|events|concerts|opening hours|closed today|exchange rate|currency)\b/i;

function chooseForcedTool(
  message: string,
  hasFindPlace: boolean,
  hasSearchWeb: boolean,
): string | null {
  // When the message is explicitly about live/web info, prefer web search.
  if (hasSearchWeb && (
    BOOKING_KEYWORDS.test(message)
    || WEATHER_KEYWORDS.test(message)
    || CURRENT_INFO_KEYWORDS.test(message)
  )) {
    return 'search_web';
  }
  // Otherwise for dining / place recommendations, prefer structured Google Places.
  if (hasFindPlace && (DINING_KEYWORDS.test(message) || PLACE_KEYWORDS.test(message))) {
    return 'find_place';
  }
  // Dining without find_place → fall back to search_web if available.
  if (hasSearchWeb && DINING_KEYWORDS.test(message)) {
    return 'search_web';
  }
  return null;
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
  toolCtx: ToolExecutionContext;
};

async function handleToolCallFollowUp(
  params: ToolCallFollowUpParams,
  controller: { enqueue: (chunk: Uint8Array) => void },
  encoder: TextEncoder
): Promise<string> {
  const { toolCalls, fullResponse, currentMessages, openaiOptions, toolCtx } = params;
  const assistantMsg = { role: 'assistant' as const, content: fullResponse || null, tool_calls: toolCalls };
  const toolResults = await executeToolCalls(toolCalls, toolCtx);
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
  const openaiRes = await callOpenAI(currentMessages, true, { ...ctx.openaiOptions, forceToolName: ctx.forceToolName });

  if (!openaiRes.ok) {
    controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'AI request failed' })}\n\n`));
    controller.close();
    return;
  }

  const { fullResponse, toolCalls } = await processStream(openaiRes, controller, encoder);
  let lastResponse = fullResponse;

  const toolCtx: ToolExecutionContext = {
    serperApiKey: ctx.serperApiKey,
    googlePlacesApiKey: ctx.googlePlacesApiKey,
    message: ctx.message,
    verifiedUrls: ctx.verifiedUrls,
  };

  const hasToolSupport = !!ctx.serperApiKey || !!ctx.googlePlacesApiKey;
  if (toolCalls && toolCalls.length > 0 && hasToolSupport) {
    lastResponse = await handleToolCallFollowUp({
      toolCalls, fullResponse, currentMessages,
      openaiOptions: ctx.openaiOptions,
      toolCtx,
    }, controller, encoder);
  }

  const fallbackMsg = toolCalls?.length ? 'I searched for booking options but couldn\'t format the results. Try searching for the restaurant name plus your city on Resy or OpenTable.' : '';
  const rawFinal = lastResponse.trim() || fallbackMsg;

  // Strip any `create_items` block before URL validation so we don't touch JSON.
  const { cleanContent, extractedItems } = parseCreateItemsBlock(rawFinal);
  const prosePart = cleanContent || rawFinal;

  // Replace any AI-authored URLs with Google Search fallbacks unless they
  // were returned by a tool or point to a trusted host (Google, Wikipedia).
  const validatedProse = validateAndRewriteLinks(prosePart, ctx.searchLocation, ctx.verifiedUrls);

  // Re-attach the create_items block (unchanged) so the import flow still works.
  const finalContent = extractedItems.length > 0
    ? `${validatedProse}\n\n\`\`\`create_items\n${JSON.stringify(extractedItems.map((it) => ({ itemType: it.itemType, fields: it.fields })))}\n\`\`\``
    : validatedProse;
  const contentToSave = validatedProse;

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
  googlePlacesApiKey: string | undefined,
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
    formattedTransportation, serperApiKey, googlePlacesApiKey
  });

  const tools = buildTools(serperApiKey, googlePlacesApiKey);
  const openaiMsgs: OpenAIMessage[] = [{ role: 'system', content: systemPrompt }, ...(msgs || []).reverse().map((m: any) => ({ role: m.role, content: m.content }))];
  const forceToolName = chooseForcedTool(message, !!googlePlacesApiKey, !!serperApiKey);
  const encoder = new TextEncoder();

  const ctx: StreamContext = {
    openaiMsgs,
    openaiOptions: { model, openaiApiKey, tools },
    forceToolName,
    serperApiKey,
    googlePlacesApiKey,
    searchLocation,
    verifiedUrls: new Set<string>(),
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
  const googlePlacesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
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
    return handlePostMessage(req, supabase, tripId, user.userId, openaiApiKey, serperApiKey, googlePlacesApiKey, model, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
});
