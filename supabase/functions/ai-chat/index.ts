import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS'
};

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const tripId = pathParts[1];
  const action = pathParts[2];

  if (!tripId) {
    return new Response(JSON.stringify({ error: 'Trip ID required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'Missing authorization' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const serperApiKey = Deno.env.get('SERPER_API_KEY');
  const model = Deno.env.get('OPENAI_CHAT_MODEL') || 'gpt-4o-mini';

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const userId = userData.user.id;
  const userEmail = userData.user.email?.toLowerCase();

  // Check if user owns the trip
  const { data: ownedTrip } = await supabase.from('trips').select('trip_id').eq('trip_id', tripId).eq('user_id', userId).single();

  // Check if trip is shared with user by EMAIL (not user_id, which is NULL for email invites)
  let sharedTrip = null;
  if (!ownedTrip && userEmail) {
    const { data } = await supabase.from('trip_shares').select('id').eq('trip_id', tripId).ilike('shared_with_email', userEmail).single();
    sharedTrip = data;
  }

  // Check if trip is public
  let isPublicTrip = false;
  if (!ownedTrip && !sharedTrip) {
    const { data: publicTrip } = await supabase.from('trips').select('trip_id').eq('trip_id', tripId).eq('is_public', true).single();
    isPublicTrip = !!publicTrip;
  }

  if (!ownedTrip && !sharedTrip && !isPublicTrip) {
    return new Response(JSON.stringify({ code: 'FORBIDDEN', message: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (action === 'usage' && req.method === 'GET') {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.rpc('get_ai_usage', { check_user_id: userId, check_date: today });
    const tomorrow = new Date(); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1); tomorrow.setUTCHours(0,0,0,0);
    return new Response(JSON.stringify({ used: data?.[0]?.current_count || 0, limit: data?.[0]?.daily_limit || 15, tier: data?.[0]?.subscription_tier || 'free', resetAt: tomorrow.toISOString() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (action === 'messages' && req.method === 'GET') {
    const { data: thread } = await supabase.from('ai_chat_threads').select('id').eq('trip_id', tripId).eq('user_id', userId).single();
    if (!thread) return new Response(JSON.stringify({ messages: [], thread_id: null, hasMore: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Pagination: limit and offset (offset is from the end, newest messages first)
    const limit = parseInt(url.searchParams.get('limit') || '5');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get total count first
    const { count: totalCount } = await supabase.from('ai_chat_messages').select('id', { count: 'exact', head: true }).eq('thread_id', thread.id);

    // Fetch messages with pagination (newest first for offset calculation, then reverse for display)
    const { data: messages } = await supabase
      .from('ai_chat_messages')
      .select('id, role, content, metadata, created_at')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Reverse to get chronological order for display
    const orderedMessages = (messages || []).reverse();
    const hasMore = offset + limit < (totalCount || 0);

    return new Response(JSON.stringify({ messages: orderedMessages, thread_id: thread.id, hasMore, totalCount }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (action === 'messages' && req.method === 'DELETE') {
    await supabase.from('ai_chat_threads').delete().eq('trip_id', tripId).eq('user_id', userId);
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (req.method === 'POST' && !action) {
    if (!openaiApiKey) return new Response(JSON.stringify({ code: 'CONFIG_ERROR', message: 'OpenAI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    
    const { message, thread_id } = await req.json();
    if (!message?.trim()) return new Response(JSON.stringify({ error: 'Message required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const today = new Date().toISOString().split('T')[0];
    const { data: usageData } = await supabase.rpc('increment_ai_usage', { check_user_id: userId, check_date: today });
    if (usageData?.[0] && !usageData[0].allowed) {
      return new Response(JSON.stringify({ code: 'DAILY_LIMIT_REACHED', message: 'Daily limit reached', used: usageData[0].current_count, limit: usageData[0].daily_limit }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let threadId = thread_id;
    if (threadId) {
      const { data: t } = await supabase.from('ai_chat_threads').select('id').eq('id', threadId).eq('user_id', userId).single();
      if (!t) threadId = null;
    }
    if (!threadId) {
      const { data: existing } = await supabase.from('ai_chat_threads').select('id').eq('trip_id', tripId).eq('user_id', userId).single();
      if (existing) threadId = existing.id;
      else {
        const { data: newT } = await supabase.from('ai_chat_threads').insert({ trip_id: tripId, user_id: userId }).select('id').single();
        threadId = newT?.id;
      }
    }
    if (!threadId) return new Response(JSON.stringify({ code: 'ERROR', message: 'Thread creation failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    await supabase.from('ai_chat_messages').insert({ thread_id: threadId, role: 'user', content: message.trim() });

    // Fetch trip details and related data for context
    const { data: trip } = await supabase.from('trips').select('destination, arrival_date, departure_date, primary_destination, primary_destination_place_id').eq('trip_id', tripId).single();
    const { data: days } = await supabase.from('trip_days').select('date, title, day_activities(title, start_time)').eq('trip_id', tripId).order('date');
    const { data: msgs } = await supabase.from('ai_chat_messages').select('role, content').eq('thread_id', threadId).order('created_at', { ascending: false }).limit(10);

    // Fetch accommodations, transportation, and reservations to infer actual location
    const { data: accommodations } = await supabase.from('accommodations').select('hotel, hotel_address').eq('trip_id', tripId).limit(5);
    const { data: transportation } = await supabase.from('transportation').select('arrival_location, departure_location').eq('trip_id', tripId).limit(5);
    const { data: reservations } = await supabase.from('reservations').select('restaurant_name, address, number_of_people').eq('trip_id', tripId).limit(5);

    // Build location context from multiple sources
    const locationHints: string[] = [];

    // Add hotel addresses (often the most reliable location indicator)
    accommodations?.forEach((a: any) => {
      if (a.hotel_address) locationHints.push(a.hotel_address);
      else if (a.hotel) locationHints.push(a.hotel);
    });

    // Add transportation destinations
    transportation?.forEach((t: any) => {
      if (t.arrival_location) locationHints.push(t.arrival_location);
    });

    // Add restaurant addresses
    reservations?.forEach((r: any) => {
      if (r.address) locationHints.push(r.address);
    });

    // Determine the best location context
    const tripName = trip?.destination || 'this trip';
    const primaryDestination = trip?.primary_destination;
    const inferredLocations = locationHints.length > 0 ? locationHints.slice(0, 3).join('; ') : null;

    // Build location description for the prompt
    // Priority: primary_destination > inferred from bookings > trip name
    let locationContext: string;
    if (primaryDestination) {
      locationContext = `The trip "${tripName}" is to ${primaryDestination}.`;
    } else if (inferredLocations) {
      locationContext = `The trip is named "${tripName}". Based on booked accommodations, transportation, and reservations, the locations include: ${inferredLocations}.`;
    } else {
      locationContext = `The trip destination is: ${tripName}.`;
    }

    // Build itinerary summary if available
    let itineraryContext = '';
    const formattedDays: string[] = [];
    if (days && days.length > 0) {
      const daysSummary = days.slice(0, 10).map((d: any) => {
        const activities = d.day_activities?.map((a: any) => a.title).join(', ') || 'no activities yet';
        return `${d.date}${d.title ? ` - ${d.title}` : ''}:\n  ${activities}`;
      }).join('\n\n');
      itineraryContext = `\n\nCurrent Itinerary:\n${daysSummary}`;
    }

    // Format accommodations for create_items context
    const formattedAccommodations = (accommodations || []).slice(0, 5)
      .map((a: any) => `- ${a.hotel}: ${a.hotel_checkin_date || 'TBD'} to ${a.hotel_checkout_date || 'TBD'}${a.hotel_address ? ` (${a.hotel_address})` : ''}`)
      .join('\n') || 'No accommodations added yet';

    // Format transportation
    const formattedTransportation = (transportation || []).slice(0, 5)
      .map((t: any) => `- ${t.type}${t.provider ? ` (${t.provider})` : ''}: ${t.departure_location || 'TBD'} → ${t.arrival_location || 'TBD'} on ${t.start_date}${t.start_time ? ` at ${t.start_time}` : ''}`)
      .join('\n') || 'No transportation added yet';

    // Use a reasonable search location (primary destination > first hotel address > trip name)
    const searchLocation = (primaryDestination || accommodations?.[0]?.hotel_address || transportation?.[0]?.arrival_location || tripName).replace(/\s+/g, '+');

    const arrivalDate = trip?.arrival_date || 'TBD';
    const departureDate = trip?.departure_date || 'TBD';
    const partySize = reservations?.find((r: any) => r.number_of_people != null)?.number_of_people;
    const partySizeContext = partySize != null ? `\nParty size (from existing reservations): ${partySize}` : '';

    const systemPrompt = `You are a helpful travel assistant for a trip to ${tripName}. ${locationContext}
Trip dates: ${arrivalDate} to ${departureDate}.${partySizeContext}${itineraryContext}

Accommodations:
${formattedAccommodations}

Transportation:
${formattedTransportation}

Guidelines:
- Be concise and helpful
- Use markdown formatting for readability
- When recommending hotels or attractions, make the name a clickable link using Google Maps or Google Search URLs
- For restaurants, use the Restaurant Booking Links workflow below — you may use direct booking URLs (Resy, OpenTable, etc.) when found via search
- IMPORTANT for non-restaurant places: Only use Google Maps or Google Search URL formats (never IP addresses or made-up URLs):
  - Google Maps: https://www.google.com/maps/search/PLACE+NAME+${searchLocation}
  - Google Search: https://www.google.com/search?q=PLACE+NAME+${searchLocation}
- Format: **[Place Name](url)** - Brief description

## Restaurant Booking Links

When you recommend, suggest, or discuss a specific restaurant for a user's trip, you MUST find booking links. ${serperApiKey ? 'Use the search_web tool to search. ' : 'Provide a Google Search link for the user to find booking pages. Only include Resy/OpenTable URLs if you are confident from your knowledge; otherwise say "Search for reservations" with the link. Always add: "Verify the link before booking."'}Follow this workflow:

### Step 1: Identify the Restaurant
Extract the restaurant name, city, and neighborhood (if known) from the conversation context or the trip destination.

### Step 2: Search for Booking Links
${serperApiKey ? `Call the search_web tool with these queries in priority order until you find results:
1. "[restaurant name] [city] site:resy.com"
2. "[restaurant name] [city] site:opentable.com"
3. "[restaurant name] [city] reservations" (fallback — catches Tock, Yelp, SevenRooms, direct sites)

For international destinations, also try: TheFork (Europe), Tabelog/Hotpepper (Japan), TableCheck, or "[restaurant] [city] reservations" for local platforms.` : 'Provide a Google Search link: https://www.google.com/search?q=RESTAURANT+NAME+PLUS+CITY+reservations (replace with actual names). Only include Resy/OpenTable URLs if confident from your knowledge; otherwise use the search link. Always add: "Verify the link before booking."'}

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

    const searchWebTool = serperApiKey ? {
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
    } : null;

    const openaiMsgs = [{ role: 'system' as const, content: systemPrompt }, ...(msgs || []).reverse().map((m: any) => ({ role: m.role, content: m.content }))];
    const tools = searchWebTool ? [searchWebTool] : undefined;

    // Force search_web when the message would benefit from live web data
    const searchKeywords = /\b(restaurant|restaurants|dining|dinner|lunch|eat|food|reservation|reservations|book a table|opentable|resy|carbone|where should i eat|recommend.*restaurant|booking link|reservation link|weather|temperature|forecast|rainy|sunny|snow|humidity|what.*weather|how.*weather|news|latest|current|today|happening|events|concerts|attractions|opening hours|closed today|exchange rate|currency)\b/i;
    const forceSearch = !!(tools && message && searchKeywords.test(message));

    async function callOpenAI(
      messages: Array<{ role: string; content?: string | null; tool_calls?: any[]; tool_call_id?: string; name?: string }>,
      stream: boolean,
      options?: { forceTool?: boolean; skipTools?: boolean }
    ) {
      const body: Record<string, unknown> = {
        model,
        messages,
        stream,
        temperature: 0.7,
        max_tokens: 1500
      };
      if (tools && !options?.skipTools) {
        body.tools = tools;
        if (options?.forceTool) body.tool_choice = { type: 'function' as const, function: { name: 'search_web' } };
      }
      return fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }

    const encoder = new TextEncoder();
    let fullResponse = '';
    const finalThreadId = threadId;

    function parseCreateItemsBlock(response: string): { cleanContent: string; extractedItems: Array<{ id: string; itemType: string; fields: Record<string, unknown>; missingRequired: string[]; confidence: number; status: 'pending' }> } {
      const createItemsRegex = /```create_items\s*([\s\S]*?)```/;
      const match = response.match(createItemsRegex);
      if (!match) return { cleanContent: response, extractedItems: [] };
      const jsonStr = match[1].trim();
      let items: Array<{ id: string; itemType: string; fields: Record<string, unknown>; missingRequired: string[]; confidence: number; status: 'pending' }> = [];
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
      } catch (_e) { /* ignore parse errors */ }
      const cleanContent = response.replace(createItemsRegex, '').trim();
      return { cleanContent, extractedItems: items };
    }

    async function processStream(
      openaiRes: Response,
      controller: { enqueue: (chunk: Uint8Array) => void },
      _messages: typeof openaiMsgs
    ): Promise<{ fullResponse: string; toolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }> | null }> {
      const reader = openaiRes.body!.getReader();
      const decoder = new TextDecoder();
      let content = '';
      const toolCallsAcc: Array<{ id: string; type: string; function: { name: string; arguments: string } }> = [];
      const tcArgs: Record<number, string> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const delta = data.choices?.[0]?.delta;
              const fin = data.choices?.[0]?.finish_reason;
              if (delta?.content) {
                content += delta.content;
                controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify({ content: delta.content })}\n\n`));
              }
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0;
                  if (!toolCallsAcc[idx]) toolCallsAcc[idx] = { id: tc.id || `call_${idx}`, type: tc.type || 'function', function: { name: tc.function?.name || '', arguments: '' } };
                  if (tc.id) toolCallsAcc[idx].id = tc.id;
                  if (tc.function?.name) toolCallsAcc[idx].function.name = tc.function.name;
                  if (tc.function?.arguments) tcArgs[idx] = (tcArgs[idx] || '') + tc.function.arguments;
                }
              }
            } catch (_) {}
          }
        }
      }

      const withIndex = toolCallsAcc.map((tc, i) => (tc ? { tc, i } : null)).filter(Boolean) as Array<{ tc: { id: string; type: string; function: { name: string; arguments: string } }; i: number }>;
      const toolCalls = withIndex.length > 0 ? withIndex.map(({ tc, i }) => ({
        ...tc,
        function: { ...tc.function, arguments: tcArgs[i] ?? tc.function?.arguments ?? '' }
      })) : null;

      return { fullResponse: content, toolCalls };
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages = [...openaiMsgs];
          let lastResponse = '';
          let openaiRes = await callOpenAI(currentMessages, true, { forceTool: forceSearch });

          if (!openaiRes.ok) {
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'AI request failed' })}\n\n`));
            controller.close();
            return;
          }

          const { fullResponse, toolCalls } = await processStream(openaiRes, controller, currentMessages);
          lastResponse = fullResponse;

          if (toolCalls && toolCalls.length > 0 && serperApiKey) {
            const assistantMsg = { role: 'assistant' as const, content: fullResponse || null, tool_calls: toolCalls };
            const toolResults: Array<{ role: 'tool'; tool_call_id: string; content: string }> = [];
            for (const tc of toolCalls) {
              if (tc.function.name === 'search_web') {
                try {
                  const argsStr = (tc.function.arguments || '').trim();
                  const args = argsStr ? JSON.parse(argsStr) : {};
                  const q = typeof args.query === 'string' ? args.query : (typeof args.q === 'string' ? args.q : '');
                  const searchQuery = q || message || 'restaurant reservations';
                  const results = await searchWeb(searchQuery, serperApiKey);
                  const summary = (results.organic || []).slice(0, 6).map((r: any) => `${r.title}: ${r.link}`).join('\n');
                  toolResults.push({ role: 'tool', tool_call_id: tc.id, content: summary || 'No results found.' });
                } catch (e) {
                  toolResults.push({ role: 'tool', tool_call_id: tc.id, content: `Search error: ${e instanceof Error ? e.message : 'Unknown'}. You can suggest the user search Google for "[restaurant name] [city] reservations".` });
                }
              }
            }
            currentMessages = [...currentMessages, assistantMsg, ...toolResults];
            const followRes = await callOpenAI(currentMessages, true, { skipTools: true });
            if (followRes.ok) {
              const { fullResponse: followContent } = await processStream(followRes, controller, currentMessages);
              lastResponse = followContent;
              // If model requested another tool call (shouldn't happen with skipTools), ignore to avoid infinite loop
            } else {
              const errBody = await followRes.text();
              console.error('OpenAI follow-up error:', followRes.status, errBody);
              lastResponse = 'I found some booking options but had trouble formatting them. Try searching for the restaurant name plus your city on Resy or OpenTable.';
              controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify({ content: lastResponse })}\n\n`));
            }
          }

          const fallbackMsg = toolCalls?.length ? 'I searched for booking options but couldn\'t format the results. Try searching for the restaurant name plus your city on Resy or OpenTable.' : '';
          const finalContent = lastResponse.trim() || fallbackMsg;
          const { cleanContent, extractedItems } = parseCreateItemsBlock(finalContent);
          const contentToSave = cleanContent || finalContent;
          if (extractedItems.length > 0) {
            controller.enqueue(encoder.encode(`event: extracted_items\ndata: ${JSON.stringify({ items: extractedItems, meta: { model, source: 'conversation' } })}\n\n`));
          }
          if (fallbackMsg && finalContent === fallbackMsg) {
            controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify({ content: fallbackMsg })}\n\n`));
          }
          const { data: saved } = await supabase.from('ai_chat_messages').insert({ thread_id: finalThreadId, role: 'assistant', content: contentToSave || '(No response)' }).select('id').single();
          controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ thread_id: finalThreadId, message_id: saved?.id, content: contentToSave || finalContent })}\n\n`));
          controller.close();
        } catch (e) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'Stream error' })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
