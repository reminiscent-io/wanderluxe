import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateAndRewriteLinks } from './linkValidator.ts';
import {
  enrichPlaceCards,
  parsePlaceCardsBlock,
  type PlaceCard,
  type PlaceResult,
} from './placeCards.ts';
import { hasCreateItemsMarker, parseCreateItemsBlock } from './createItems.ts';
import { chooseForcedTool } from './toolForcing.ts';

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

// Hardcoded model — locked at the function layer so no request path or env
// override can redirect traffic to a different (potentially unvetted) model.
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

type GeminiFunctionCall = { name: string; args: Record<string, unknown> };

type GeminiFunctionResponse = { name: string; response: Record<string, unknown> };

type GeminiPart =
  | { text: string }
  | { functionCall: GeminiFunctionCall }
  | { functionResponse: GeminiFunctionResponse };

type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };

type GeminiFunctionDeclaration = {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
};

type GeminiTool = { functionDeclarations: GeminiFunctionDeclaration[] };

type GeminiToolMode = 'AUTO' | 'ANY' | 'NONE';

type GeminiOptions = {
  apiKey: string;
  tools?: GeminiTool[];
  toolMode?: GeminiToolMode;
  allowedFunctionNames?: string[];
  skipTools?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
};

type StreamContext = {
  systemInstruction: string;
  contents: GeminiContent[];
  geminiOptions: GeminiOptions;
  forceToolName: string | null;
  serperApiKey: string | undefined;
  googlePlacesApiKey: string | undefined;
  searchLocation: string;
  verifiedUrls: Set<string>;
  placesById: Map<string, PlaceResult>;
  supabaseUrl: string;
  arrivalDate: string;
  departureDate: string;
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
      detailsUrl.searchParams.set('fields', 'name,place_id,formatted_address,website,rating,formatted_phone_number,photos,price_level');
      detailsUrl.searchParams.set('key', apiKey);
      const detailRes = await fetch(detailsUrl);
      const detailJson = await detailRes.json();
      const d = detailJson.result || {};
      const firstPhoto = Array.isArray(d.photos) && d.photos.length > 0 ? d.photos[0] : null;
      return {
        name: d.name || c.name,
        place_id: c.place_id,
        formatted_address: d.formatted_address || c.formatted_address || '',
        maps_url: `https://www.google.com/maps/place/?q=place_id:${c.place_id}`,
        website: d.website,
        rating: d.rating ?? c.rating,
        phone: d.formatted_phone_number,
        price_level: typeof d.price_level === 'number' ? d.price_level : undefined,
        photo_reference: firstPhoto?.photo_reference,
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

type GeminiStreamState = { textContent: string; functionCalls: GeminiFunctionCall[] };

// Gemini streams SSE messages of the shape
//   data: {"candidates":[{"content":{"role":"model","parts":[...parts]}, "finishReason":...}]}
// Parts can be either {text} or {functionCall:{name,args}}. Unlike OpenAI,
// functionCall arrives as a complete object in a single chunk — not as
// incremental argument deltas — so no accumulator is needed.
function processGeminiStreamLine(
  line: string,
  state: GeminiStreamState,
  controller: { enqueue: (chunk: Uint8Array) => void },
  encoder: TextEncoder
): void {
  if (!line.startsWith('data: ')) return;
  const payload = line.slice(6).trim();
  if (!payload) return;
  try {
    const data = JSON.parse(payload);
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (typeof part?.text === 'string' && part.text.length > 0) {
        state.textContent += part.text;
        controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify({ content: part.text })}\n\n`));
      } else if (part?.functionCall && typeof part.functionCall.name === 'string') {
        state.functionCalls.push({
          name: part.functionCall.name,
          args: (part.functionCall.args as Record<string, unknown>) || {},
        });
      }
    }
  } catch { /* ignore malformed SSE chunks */ }
}

async function processGeminiStream(
  geminiRes: Response,
  controller: { enqueue: (chunk: Uint8Array) => void },
  encoder: TextEncoder
): Promise<GeminiStreamState> {
  const reader = geminiRes.body!.getReader();
  const decoder = new TextDecoder();
  const state: GeminiStreamState = { textContent: '', functionCalls: [] };
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE messages are \n\n delimited. Each message can contain multiple
    // lines; we only care about `data:` lines.
    let boundary: number;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const message = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      for (const line of message.split('\n')) {
        processGeminiStreamLine(line, state, controller, encoder);
      }
    }
  }
  if (buffer.trim()) {
    for (const line of buffer.split('\n')) {
      processGeminiStreamLine(line, state, controller, encoder);
    }
  }

  return state;
}

async function callGemini(
  systemInstruction: string,
  contents: GeminiContent[],
  stream: boolean,
  options: GeminiOptions,
): Promise<Response> {
  const endpoint = stream ? 'streamGenerateContent' : 'generateContent';
  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:${endpoint}${stream ? '?alt=sse' : ''}`;

  const body: Record<string, unknown> = {
    contents,
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxOutputTokens ?? 2000,
    },
  };

  if (options.tools && !options.skipTools) {
    body.tools = options.tools;
    if (options.toolMode) {
      body.toolConfig = {
        functionCallingConfig: {
          mode: options.toolMode,
          ...(options.allowedFunctionNames && options.allowedFunctionNames.length > 0
            ? { allowedFunctionNames: options.allowedFunctionNames }
            : {}),
        },
      };
    }
  }

  return fetch(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': options.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

  // Hydrate placeCards from metadata so the client can render them without
  // re-streaming. Leave metadata in place for other consumers.
  type ChatMessageWithMetadata = {
    id: string;
    role: string;
    content: string;
    metadata?: { placeCards?: unknown[] } | null;
    created_at: string;
  };
  const orderedMessages = ((messages ?? []) as ChatMessageWithMetadata[]).reverse().map((m) => ({
    ...m,
    placeCards: m.metadata && Array.isArray(m.metadata.placeCards) ? m.metadata.placeCards : undefined,
  }));
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

type AccommodationLite = { hotel_address?: string | null; hotel?: string | null; hotel_checkin_date?: string | null; hotel_checkout_date?: string | null };
type TransportationLite = { type?: string | null; provider?: string | null; arrival_location?: string | null; departure_location?: string | null; start_date?: string | null; end_date?: string | null };
type ReservationLite = { address?: string | null; restaurant_name?: string | null; reservation_time?: string | null; number_of_people?: number | null };

function buildLocationContext(
  tripName: string,
  primaryDestination: string | null,
  accommodations: AccommodationLite[] | null,
  transportation: TransportationLite[] | null,
  reservations: ReservationLite[] | null
): string {
  const locationHints: string[] = [];

  accommodations?.forEach((a) => {
    if (a.hotel_address) locationHints.push(sanitizeForPrompt(a.hotel_address));
    else if (a.hotel) locationHints.push(sanitizeForPrompt(a.hotel));
  });

  transportation?.forEach((t) => {
    if (t.arrival_location) locationHints.push(sanitizeForPrompt(t.arrival_location));
  });

  reservations?.forEach((r) => {
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

  const placeCardsPolicy = hasFindPlace
    ? `## Rich Place Cards (PREFERRED for recommendations)
When you recommend one or more restaurants, attractions, bars, landmarks, activities, or hotels, output a \`place_cards\` JSON block at the END of your response INSTEAD of listing them in prose. The client renders these as rich cards with photos, ratings, and one-tap "Add to trip" buttons.

Rules:
- You MUST call \`find_place\` for each recommendation BEFORE writing your prose response. If you have not already called it in this turn, call it now. Do NOT recommend a place from memory — the place_id you need for the card only exists in a find_place tool result.
- Keep your prose to 1–2 sentences of introduction ("Here are three standout dinner spots in Montmartre:"). DO NOT list the places in the prose — the cards ARE the list.
- Supported itemTypes for \`suggested_add\`: \`reservation\` (dining), \`activity\` (attractions/tours/landmarks/bars), \`accommodation\` (hotels/stays).
- Include a \`suggested_add\` block ONLY when the user gave specific dates (and time, for reservations) that fall within ${arrivalDate}..${departureDate}. When in doubt, omit it — the user can still tap the card to see it on the map.
- Set \`"is_stay": true\` on EVERY card that represents a hotel, resort, B&B, hostel, or other lodging — even when you can't include a \`suggested_add\` block (e.g. the user hasn't given check-in/out dates). This lets the client offer a "Book on Expedia" link.
- If you cannot produce cards (e.g. \`find_place\` returned no results for the user's query), explicitly say so in prose ("I couldn't find verified results for that in ${safeTripName}") rather than silently falling back to a markdown list.
- Before finishing your response, verify that every place you recommended has a corresponding entry in the \`place_cards\` block.

Format (one entry per place):
\`\`\`place_cards
[
  {
    "place_id": "ChIJ...",                           // REQUIRED, from find_place result
    "blurb": "One sentence on why it's worth going.", // ≤200 chars
    "tags": ["Italian", "Date night"],                // optional, max 4 short tags
    "booking_url": "https://resy.com/...",            // optional, only if you have a verified booking URL from search_web
    "is_stay": true,                                  // optional; set true for hotels/lodging
    "suggested_add": {                                // optional
      "itemType": "reservation",                      // "reservation" | "activity" | "accommodation"
      // For reservation / activity:
      "date": "YYYY-MM-DD",                           // within ${arrivalDate}..${departureDate}
      "time": "HH:mm",                                // REQUIRED for reservation, optional for activity
      "end_time": "HH:mm",                            // optional, activity only
      "party_size": 2,                                // optional, reservation only
      // For accommodation (hotels):
      "check_in_date": "YYYY-MM-DD",                  // within trip window
      "check_out_date": "YYYY-MM-DD",                 // within trip window, after check_in_date
      "check_in_time": "HH:mm",                       // optional
      "check_out_time": "HH:mm",                      // optional
      "notes": "Short note"                           // optional
    }
  }
]
\`\`\`
Do NOT invent place_id, name, address, website, rating, or phone — the server fills these in from Google Places. You only author blurb, tags, booking_url, is_stay, and the optional suggested_add block.`
    : '';

  return `You are a helpful travel assistant for a trip to ${safeTripName}. ${locationContext}
Trip dates: ${arrivalDate} to ${departureDate}.${partySizeContext}${itineraryContext}

Accommodations:
${formattedAccommodations}

Transportation:
${formattedTransportation}

Guidelines:
- Be concise and helpful
- Use markdown formatting for readability. IMPORTANT: When writing numbered lists, put each item on its own line with a blank line between items for proper rendering
- When listing multiple recommendations, prefer the \`place_cards\` block (see below) over a markdown list.
- For places that cannot be shown as cards (e.g. hotels in phase 1, or when find_place is unavailable), format as: **[Place Name](verified-url)** — brief description (when you have a verified URL), otherwise **Place Name** — brief description (with no link)

${placeCardsPolicy}

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
The block MUST be wrapped in triple backticks exactly as shown above. NEVER emit the create_items marker or its JSON as plain text — without the fences the item is not created and the user sees raw JSON.

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
  placesById: Map<string, PlaceResult>;
};

async function executeSearchWeb(
  call: GeminiFunctionCall,
  serperApiKey: string,
  message: string,
  verifiedUrls: Set<string>,
): Promise<GeminiFunctionResponse> {
  try {
    const q = extractSearchQuery(call.args);
    const searchQuery = q || message || 'restaurant reservations';
    const results = await searchWeb(searchQuery, serperApiKey);
    const organic = (results.organic || []).slice(0, 6);
    for (const r of organic) {
      if (r.link) verifiedUrls.add(r.link);
    }
    return {
      name: 'search_web',
      response: {
        results: organic.map((r) => ({ title: r.title, link: r.link, snippet: r.snippet || '' })),
      },
    };
  } catch (error_) {
    const errorMsg = error_ instanceof Error ? error_.message : 'Unknown';
    return {
      name: 'search_web',
      response: { error: `Search error: ${errorMsg}. Do not fabricate a URL; tell the user to search manually.` },
    };
  }
}

async function executeFindPlace(
  call: GeminiFunctionCall,
  googlePlacesApiKey: string,
  verifiedUrls: Set<string>,
  placesById: Map<string, PlaceResult>,
): Promise<GeminiFunctionResponse> {
  try {
    const query = typeof call.args.query === 'string' ? call.args.query : '';
    if (!query) {
      return { name: 'find_place', response: { error: 'missing "query" argument' } };
    }
    const places = await findPlaces(query, googlePlacesApiKey);
    if (places.length === 0) {
      return { name: 'find_place', response: { results: [], message: 'No matching places found.' } };
    }
    for (const p of places) {
      verifiedUrls.add(p.maps_url);
      if (p.website) verifiedUrls.add(p.website);
      placesById.set(p.place_id, p);
    }
    // Give the model a compact, unambiguous structured payload so it can
    // quote verified URLs instead of authoring new ones. place_id is included
    // so the model can reference cards in a `place_cards` block.
    const results = places.map((p) => ({
      place_id: p.place_id,
      name: p.name,
      address: p.formatted_address,
      rating: p.rating,
      price_level: p.price_level,
      phone: p.phone,
      website: p.website || null,
      maps_url: p.maps_url,
    }));
    return { name: 'find_place', response: { results } };
  } catch (error_) {
    const errorMsg = error_ instanceof Error ? error_.message : 'Unknown';
    return { name: 'find_place', response: { error: `${errorMsg}. Do not fabricate a URL.` } };
  }
}

async function executeToolCalls(
  functionCalls: GeminiFunctionCall[],
  ctx: ToolExecutionContext,
): Promise<GeminiFunctionResponse[]> {
  const results: GeminiFunctionResponse[] = [];
  for (const call of functionCalls) {
    if (call.name === 'search_web' && ctx.serperApiKey) {
      results.push(await executeSearchWeb(call, ctx.serperApiKey, ctx.message, ctx.verifiedUrls));
    } else if (call.name === 'find_place' && ctx.googlePlacesApiKey) {
      results.push(await executeFindPlace(call, ctx.googlePlacesApiKey, ctx.verifiedUrls, ctx.placesById));
    } else {
      results.push({ name: call.name, response: { error: `Tool "${call.name}" is not available in this environment.` } });
    }
  }
  return results;
}

function buildTools(
  serperApiKey: string | undefined,
  googlePlacesApiKey: string | undefined,
): GeminiTool[] | undefined {
  const decls: GeminiFunctionDeclaration[] = [];

  if (googlePlacesApiKey) {
    decls.push({
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
    });
  }

  if (serperApiKey) {
    decls.push({
      name: 'search_web',
      description: 'Search the web for up-to-date information. Use only for time-sensitive queries that find_place cannot answer: restaurant booking pages (Resy, OpenTable), weather, current events, opening hours, exchange rates.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query, e.g. "Carbone NYC site:resy.com"' } },
        required: ['query'],
      },
    });
  }

  return decls.length > 0 ? [{ functionDeclarations: decls }] : undefined;
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

type DayWithActivities = { date: string; title?: string | null; day_activities?: { title: string; start_time?: string | null }[] | null };

function buildItineraryContext(days: DayWithActivities[] | null): string {
  if (!days || days.length === 0) return '';
  const daysSummary = days.slice(0, 10).map((d) => {
    const activities = d.day_activities?.map((a) => sanitizeForPrompt(a.title)).join(', ') || 'no activities yet';
    const titleSuffix = d.title ? ' - ' + sanitizeForPrompt(d.title) : '';
    return d.date + titleSuffix + ':\n  ' + activities;
  }).join('\n\n');
  return '\n\nCurrent Itinerary:\n' + daysSummary;
}

function formatAccommodationLine(a: AccommodationLite & { start_time?: string | null }): string {
  const dates = (a.hotel_checkin_date || 'TBD') + ' to ' + (a.hotel_checkout_date || 'TBD');
  const address = a.hotel_address ? ' (' + sanitizeForPrompt(a.hotel_address) + ')' : '';
  return '- ' + sanitizeForPrompt(a.hotel) + ': ' + dates + address;
}

function formatAccommodations(accommodations: AccommodationLite[] | null): string {
  return (accommodations || []).slice(0, 5)
    .map(formatAccommodationLine)
    .join('\n') || 'No accommodations added yet';
}

function formatTransportationLine(t: TransportationLite & { start_time?: string | null }): string {
  const provider = t.provider ? ' (' + sanitizeForPrompt(t.provider) + ')' : '';
  const departure = sanitizeForPrompt(t.departure_location) || 'TBD';
  const arrival = sanitizeForPrompt(t.arrival_location) || 'TBD';
  const time = t.start_time ? ' at ' + t.start_time : '';
  return '- ' + sanitizeForPrompt(t.type) + provider + ': ' + departure + ' \u2192 ' + arrival + ' on ' + t.start_date + time;
}

function formatTransportation(transportation: TransportationLite[] | null): string {
  return (transportation || []).slice(0, 5)
    .map(formatTransportationLine)
    .join('\n') || 'No transportation added yet';
}

function deriveSearchLocation(primaryDestination: string | null, accommodations: AccommodationLite[] | null, transportation: TransportationLite[] | null, tripName: string): string {
  const location = primaryDestination || accommodations?.[0]?.hotel_address || transportation?.[0]?.arrival_location || tripName;
  return location.replaceAll(/\s+/g, '+');
}

type ToolCallFollowUpParams = {
  functionCalls: GeminiFunctionCall[];
  textSoFar: string;
  contents: GeminiContent[];
  systemInstruction: string;
  geminiOptions: GeminiOptions;
  toolCtx: ToolExecutionContext;
};

async function handleToolCallFollowUp(
  params: ToolCallFollowUpParams,
  controller: { enqueue: (chunk: Uint8Array) => void },
  encoder: TextEncoder
): Promise<string> {
  const { functionCalls, textSoFar, contents, systemInstruction, geminiOptions, toolCtx } = params;

  // Re-inject the model's turn (any text it produced + its function calls),
  // then a user turn containing the matching functionResponse parts. This is
  // Gemini's equivalent of OpenAI's tool-result messages.
  const modelParts: GeminiPart[] = [];
  if (textSoFar) modelParts.push({ text: textSoFar });
  for (const call of functionCalls) modelParts.push({ functionCall: call });

  const toolResponses = await executeToolCalls(functionCalls, toolCtx);
  const responseParts: GeminiPart[] = toolResponses.map((r) => ({ functionResponse: r }));

  const updatedContents: GeminiContent[] = [
    ...contents,
    { role: 'model', parts: modelParts },
    { role: 'user', parts: responseParts },
  ];

  const followRes = await callGemini(systemInstruction, updatedContents, true, { ...geminiOptions, skipTools: true });

  if (followRes.ok && followRes.body) {
    const followState = await processGeminiStream(followRes, controller, encoder);
    return followState.textContent;
  }

  const errBody = await followRes.text().catch(() => '');
  console.error('Gemini follow-up error:', followRes.status, errBody);
  const fallback = 'I found some booking options but had trouble formatting them. Try searching for the restaurant name plus your city on Resy or OpenTable.';
  controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify({ content: fallback })}\n\n`));
  return fallback;
}

type FinalEventsParams = {
  finalContent: string;
  fallbackMsg: string;
  placeCards: PlaceCard[];
  model: string;
  threadId: string;
  savedId: string | undefined;
};

function emitFinalEvents(
  controller: { enqueue: (chunk: Uint8Array) => void; close: () => void },
  encoder: TextEncoder,
  params: FinalEventsParams,
): void {
  const { finalContent, fallbackMsg, placeCards, model, threadId, savedId } = params;
  const { cleanContent, extractedItems } = parseCreateItemsBlock(finalContent);
  const contentToSave = cleanContent || finalContent;

  if (extractedItems.length > 0) {
    controller.enqueue(encoder.encode(`event: extracted_items\ndata: ${JSON.stringify({ items: extractedItems, meta: { model, source: 'conversation' } })}\n\n`));
  }
  if (placeCards.length > 0) {
    controller.enqueue(encoder.encode(`event: place_cards\ndata: ${JSON.stringify({ cards: placeCards })}\n\n`));
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
  const geminiRes = await callGemini(ctx.systemInstruction, ctx.contents, true, {
    ...ctx.geminiOptions,
    toolMode: ctx.forceToolName ? 'ANY' : 'AUTO',
    allowedFunctionNames: ctx.forceToolName ? [ctx.forceToolName] : undefined,
  });

  if (!geminiRes.ok || !geminiRes.body) {
    const errBody = await geminiRes.text().catch(() => '');
    console.error('Gemini error:', geminiRes.status, errBody);
    controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'AI request failed' })}\n\n`));
    controller.close();
    return;
  }

  const firstPass = await processGeminiStream(geminiRes, controller, encoder);
  let lastResponse = firstPass.textContent;

  const toolCtx: ToolExecutionContext = {
    serperApiKey: ctx.serperApiKey,
    googlePlacesApiKey: ctx.googlePlacesApiKey,
    message: ctx.message,
    verifiedUrls: ctx.verifiedUrls,
    placesById: ctx.placesById,
  };

  const hasToolSupport = !!ctx.serperApiKey || !!ctx.googlePlacesApiKey;
  if (firstPass.functionCalls.length > 0 && hasToolSupport) {
    lastResponse = await handleToolCallFollowUp({
      functionCalls: firstPass.functionCalls,
      textSoFar: firstPass.textContent,
      contents: ctx.contents,
      systemInstruction: ctx.systemInstruction,
      geminiOptions: ctx.geminiOptions,
      toolCtx,
    }, controller, encoder);
  }

  const fallbackMsg = firstPass.functionCalls.length > 0 ? 'I searched for booking options but couldn\'t format the results. Try searching for the restaurant name plus your city on Resy or OpenTable.' : '';
  const rawFinal = lastResponse.trim() || fallbackMsg;

  // Strip structured blocks before URL validation so JSON payloads aren't touched.
  const { cleanContent: afterCreateItems, extractedItems } = parseCreateItemsBlock(rawFinal);
  if (extractedItems.length === 0 && hasCreateItemsMarker(rawFinal)) {
    console.warn(
      '[ai-chat] create_items marker detected but no items extracted. Response length:',
      rawFinal.length
    );
  }
  const { cleanContent: prosePart, rawCards } = parsePlaceCardsBlock(afterCreateItems);

  const { cards: placeCards, drops: placeCardDrops } = enrichPlaceCards(
    rawCards,
    ctx.placesById,
    ctx.verifiedUrls,
    ctx.supabaseUrl,
    ctx.arrivalDate,
    ctx.departureDate,
  );

  if (rawCards.length > 0 || placeCardDrops.length > 0) {
    console.log('[ai-chat] place_cards summary', {
      total: rawCards.length,
      kept: placeCards.length,
      drops: placeCardDrops,
    });
  }

  // Replace any AI-authored URLs with Google Search fallbacks unless they
  // were returned by a tool or point to a trusted host (Google, Wikipedia).
  const validatedProse = validateAndRewriteLinks(prosePart, ctx.searchLocation, ctx.verifiedUrls);

  // Re-attach the create_items block (unchanged) so the import flow still works.
  const finalContent = extractedItems.length > 0
    ? `${validatedProse}\n\n\`\`\`create_items\n${JSON.stringify(extractedItems.map((it) => ({ itemType: it.itemType, fields: it.fields })))}\n\`\`\``
    : validatedProse;
  const contentToSave = validatedProse;

  const metadata = placeCards.length > 0 ? { placeCards } : {};
  const { data: saved } = await ctx.supabase
    .from('ai_chat_messages')
    .insert({ thread_id: ctx.threadId, role: 'assistant', content: contentToSave || '(No response)', metadata })
    .select('id')
    .single();
  emitFinalEvents(controller, encoder, {
    finalContent,
    fallbackMsg,
    placeCards,
    model: GEMINI_MODEL,
    threadId: ctx.threadId,
    savedId: saved?.id,
  });
}

async function handlePostMessage(
  req: Request,
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
  geminiApiKey: string,
  serperApiKey: string | undefined,
  googlePlacesApiKey: string | undefined,
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
  const partySize = (reservations as ReservationLite[] | null)?.find((r) => r.number_of_people != null)?.number_of_people;
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

  // Convert chat history to Gemini `contents`. Gemini uses 'model' for
  // assistant turns (not 'assistant') and has no system role — the system
  // prompt is passed separately via systemInstruction.
  type ChatHistoryMessage = { role: string; content: string | null };
  const contents: GeminiContent[] = ((msgs ?? []) as ChatHistoryMessage[])
    .reverse()
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: String(m.content ?? '') }],
    }));

  const forceToolName = chooseForcedTool(message, !!googlePlacesApiKey, !!serperApiKey);
  const encoder = new TextEncoder();

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';

  const ctx: StreamContext = {
    systemInstruction: systemPrompt,
    contents,
    geminiOptions: { apiKey: geminiApiKey, tools },
    forceToolName,
    serperApiKey,
    googlePlacesApiKey,
    searchLocation,
    verifiedUrls: new Set<string>(),
    placesById: new Map<string, PlaceResult>(),
    supabaseUrl,
    arrivalDate,
    departureDate,
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
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  const serperApiKey = Deno.env.get('SERPER_API_KEY');
  const googlePlacesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

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
    if (!geminiApiKey) return jsonResponse({ code: 'CONFIG_ERROR', message: 'Gemini not configured' }, 500, corsHeaders);
    return handlePostMessage(req, supabase, tripId, user.userId, geminiApiKey, serperApiKey, googlePlacesApiKey, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
});
