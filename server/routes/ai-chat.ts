import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';

const router = Router();

const isValidUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-5.4-mini';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Types
interface SendMessageRequest {
  message: string;
  thread_id?: string;
}

interface TripContext {
  destination: string;
  arrival_date: string;
  departure_date: string;
  days: Array<{
    date: string;
    title: string | null;
    activities: Array<{
      title: string;
      description: string | null;
      start_time: string | null;
      end_time: string | null;
    }>;
  }>;
  accommodations: Array<{
    hotel: string | null;
    hotel_checkin_date: string | null;
    hotel_checkout_date: string | null;
    hotel_address: string | null;
  }>;
  transportation: Array<{
    type: string;
    provider: string | null;
    departure_location: string | null;
    arrival_location: string | null;
    start_date: string;
    start_time: string | null;
  }>;
}

// Sanitize user-controlled strings before inserting into AI prompts
function sanitizeForPrompt(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/[\r\n]+/g, ' ')
    .replace(/[`$\\]/g, '')
    .slice(0, 200);
}

// Build system prompt with trip context
function buildSystemPrompt(tripContext: TripContext): string {
  const { destination, arrival_date, departure_date, days, accommodations, transportation } = tripContext;

  // Calculate trip duration
  const arrival = new Date(arrival_date);
  const departure = new Date(departure_date);
  const daysCount = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Format days with activities (limit to keep context manageable)
  const formattedDays = days.slice(0, 10).map(day => {
    const activitiesList = day.activities
      .slice(0, 5)
      .map(a => `  - ${sanitizeForPrompt(a.title)}${a.start_time ? ` (${a.start_time})` : ''}`)
      .join('\n');
    return `${day.date}${day.title ? ` - ${sanitizeForPrompt(day.title)}` : ''}:\n${activitiesList || '  No activities scheduled'}`;
  }).join('\n\n');

  // Format accommodations
  const formattedAccommodations = accommodations
    .filter(a => a.hotel)
    .slice(0, 5)
    .map(a => `- ${sanitizeForPrompt(a.hotel)}: ${a.hotel_checkin_date} to ${a.hotel_checkout_date}${a.hotel_address ? ` (${sanitizeForPrompt(a.hotel_address)})` : ''}`)
    .join('\n') || 'No accommodations added yet';

  // Format transportation
  const formattedTransportation = transportation
    .slice(0, 5)
    .map(t => `- ${sanitizeForPrompt(t.type)}${t.provider ? ` (${sanitizeForPrompt(t.provider)})` : ''}: ${sanitizeForPrompt(t.departure_location) || 'TBD'} → ${sanitizeForPrompt(t.arrival_location) || 'TBD'} on ${t.start_date}${t.start_time ? ` at ${t.start_time}` : ''}`)
    .join('\n') || 'No transportation added yet';

  const safeDestination = sanitizeForPrompt(destination);

  return `You are a helpful travel planning assistant for a trip to ${safeDestination}.

Trip Details:
- Destination: ${safeDestination}
- Dates: ${arrival_date} to ${departure_date}
- Duration: ${daysCount} days

Current Itinerary:
${formattedDays}

Accommodations:
${formattedAccommodations}

Transportation:
${formattedTransportation}

Guidelines:
- Provide specific, actionable suggestions tailored to ${safeDestination}
- Reference the existing itinerary when making recommendations
- Note that availability, hours, and prices should be verified by the traveler
- Use bullet points and clear formatting for readability
- Ask clarifying questions when helpful to provide better recommendations
- Be concise but thorough
- If asked about something outside your knowledge, suggest reliable local resources

CRITICAL - YOU CAN ADD ITEMS TO THE TRIP:
You have the ability to add items directly to the user's trip itinerary. This is a core feature.
When the user asks you to ADD, CREATE, BOOK, SCHEDULE, or PUT something on their trip/itinerary/calendar (examples: "add a dinner reservation", "put that on my itinerary", "schedule a tour for Tuesday", "add the Eiffel Tower visit", "book that hotel", "yes add it", "add that"), you MUST:

1. Confirm what you're adding in a brief, friendly response
2. ALWAYS include the JSON block below - this is what actually creates the item

YOU MUST output this JSON block at the END of your response:
\`\`\`create_items
[{"itemType": "reservation", "fields": {"restaurant_name": "...", ...}}]
\`\`\`

Item types and their fields:
- reservation (restaurants/dining): {"restaurant_name", "date" (YYYY-MM-DD), "time" (HH:mm), "party_size", "address", "phone", "notes"}
- accommodation (hotels/stays): {"name", "address", "check_in_date" (YYYY-MM-DD), "check_out_date", "check_in_time" (HH:mm), "check_out_time", "confirmation_number", "cost", "currency"}
- transportation (flights/trains/cars): {"type" (flight/train/shuttle/car_service/ferry/rental_car), "carrier", "departure_location", "arrival_location", "departure_date" (YYYY-MM-DD), "departure_time" (HH:mm), "arrival_date", "arrival_time", "confirmation_number", "cost", "currency"}
- activity (tours/attractions/events): {"name", "date" (YYYY-MM-DD), "start_time" (HH:mm), "end_time", "location", "notes", "cost", "currency"}

Date calculation rules:
- Trip dates are ${arrival_date} to ${departure_date}
- If user says "Friday", "Tuesday", etc., calculate the actual YYYY-MM-DD date within the trip
- If user says "day 1", "day 3", etc., calculate from ${arrival_date}
- Only include fields you have information for; use null for unknown fields

IMPORTANT: Never say "I can't add items" or "I don't have the ability to modify your itinerary". You DO have this ability through the JSON block. Always use it when the user wants to add something.`;
}

// Get user ID and email from Supabase JWT
async function getUserFromToken(authHeader: string): Promise<{ id: string; email: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return { id: data.user.id, email: data.user.email || '' };
}

// Backward-compatible wrapper
async function getUserIdFromToken(authHeader: string): Promise<string | null> {
  const user = await getUserFromToken(authHeader);
  return user?.id || null;
}

// Check if user can access trip
async function canAccessTrip(supabase: ReturnType<typeof createClient>, userId: string, tripId: string, userEmail?: string): Promise<boolean> {
  // Check if user owns the trip
  const { data: ownedTrip } = await supabase
    .from('trips')
    .select('trip_id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single();

  if (ownedTrip) return true;

  // Check if trip is shared with user by user_id
  const { data: sharedByUserId } = await supabase
    .from('trip_shares')
    .select('id')
    .eq('trip_id', tripId)
    .eq('shared_with_user_id', userId)
    .eq('share_status', 'accepted')
    .maybeSingle();

  if (sharedByUserId) return true;

  // Also check by email (shared_with_user_id may be null if user hadn't signed up when shared)
  if (userEmail) {
    const { data: sharedByEmail } = await supabase
      .from('trip_shares')
      .select('id')
      .eq('trip_id', tripId)
      .ilike('shared_with_email', userEmail.toLowerCase())
      .eq('share_status', 'accepted')
      .maybeSingle();

    if (sharedByEmail) return true;
  }

  // Check if trip is public (allow read access)
  const { data: publicTrip } = await supabase
    .from('trips')
    .select('trip_id')
    .eq('trip_id', tripId)
    .eq('is_public', true)
    .maybeSingle();

  return !!publicTrip;
}

// Get trip context for AI
async function getTripContext(supabase: ReturnType<typeof createClient>, tripId: string): Promise<TripContext | null> {
  // Get trip basic info
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('destination, arrival_date, departure_date')
    .eq('trip_id', tripId)
    .single();

  if (tripError || !trip) return null;

  // Get days with activities
  const { data: days } = await supabase
    .from('trip_days')
    .select(`
      date,
      title,
      day_activities (
        title,
        description,
        start_time,
        end_time
      )
    `)
    .eq('trip_id', tripId)
    .order('date', { ascending: true });

  // Get accommodations
  const { data: accommodations } = await supabase
    .from('accommodations')
    .select('hotel, hotel_checkin_date, hotel_checkout_date, hotel_address')
    .eq('trip_id', tripId)
    .order('hotel_checkin_date', { ascending: true });

  // Get transportation
  const { data: transportation } = await supabase
    .from('transportation')
    .select('type, provider, departure_location, arrival_location, start_date, start_time')
    .eq('trip_id', tripId)
    .order('start_date', { ascending: true });

  return {
    destination: trip.destination,
    arrival_date: trip.arrival_date,
    departure_date: trip.departure_date,
    days: (days || []).map(d => ({
      date: d.date,
      title: d.title,
      activities: (d.day_activities || []) as TripContext['days'][0]['activities']
    })),
    accommodations: accommodations || [],
    transportation: transportation || []
  };
}

// Get or create thread for user and trip
async function getOrCreateThread(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tripId: string,
  providedThreadId?: string
): Promise<string | null> {
  // If thread ID provided, verify it belongs to user
  if (providedThreadId) {
    const { data: existingThread } = await supabase
      .from('ai_chat_threads')
      .select('id')
      .eq('id', providedThreadId)
      .eq('user_id', userId)
      .single();

    if (existingThread) return existingThread.id;
  }

  // Look for existing thread for this user/trip combination
  const { data: thread } = await supabase
    .from('ai_chat_threads')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single();

  if (thread) return thread.id;

  // Create new thread
  const { data: newThread, error } = await supabase
    .from('ai_chat_threads')
    .insert({
      trip_id: tripId,
      user_id: userId
    })
    .select('id')
    .single();

  if (error || !newThread) return null;
  return newThread.id;
}

// Get recent messages for context
async function getRecentMessages(
  supabase: ReturnType<typeof createClient>,
  threadId: string,
  limit: number = 10
): Promise<Array<{ role: string; content: string }>> {
  const { data: messages } = await supabase
    .from('ai_chat_messages')
    .select('role, content')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Return in chronological order (oldest first)
  return (messages || []).reverse();
}

// Save message to database
async function saveMessage(
  supabase: ReturnType<typeof createClient>,
  threadId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>
): Promise<string | null> {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .insert({
      thread_id: threadId,
      role,
      content,
      metadata: metadata || {}
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving message:', error);
    return null;
  }
  return data.id;
}

// Check and increment usage
async function checkAndIncrementUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase.rpc('increment_ai_usage', {
    check_user_id: userId,
    check_date: today
  });

  if (error || !data || data.length === 0) {
    console.error('Error checking usage:', error);
    // Deny on error to enforce limits
    return { allowed: false, used: 0, limit: 10 };
  }

  return {
    allowed: data[0].allowed,
    used: data[0].current_count,
    limit: data[0].daily_limit
  };
}

// Send SSE event helper
function sendSSE(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function setupSSEHeaders(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

interface OpenAIStreamResult {
  fullResponse: string;
}

function extractDeltaContent(line: string): string | null {
  if (!line.startsWith('data: ')) return null;

  const data = line.slice(6);
  if (data === '[DONE]') return null;

  try {
    const parsed = JSON.parse(data);
    return parsed.choices?.[0]?.delta?.content || null;
  } catch {
    return null;
  }
}

function sendSSEError(res: Response, message: string): void {
  sendSSE(res, 'error', { code: 'INTERNAL_ERROR', message });
  res.end();
}

async function streamOpenAIResponse(
  messages: Array<{ role: string; content: string }>,
  res: Response,
  options: { maxTokens: number; filterCreateItems?: boolean }
): Promise<OpenAIStreamResult | null> {
  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: options.maxTokens
    })
  });

  if (!openaiResponse.ok) {
    const errorText = await openaiResponse.text();
    console.error('OpenAI error:', openaiResponse.status, errorText);
    sendSSEError(res, 'Failed to generate response');
    return null;
  }

  const reader = openaiResponse.body?.getReader();
  if (!reader) {
    sendSSEError(res, 'Failed to read response stream');
    return null;
  }

  const decoder = new TextDecoder();
  let fullResponse = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        const content = extractDeltaContent(line);
        if (!content) continue;

        fullResponse += content;
        const shouldFilter = options.filterCreateItems && fullResponse.includes('```create_items');
        if (!shouldFilter) {
          sendSSE(res, 'message', { content });
        }
      }
    }
  } catch (streamError) {
    console.error('Stream error:', streamError);
  }

  return { fullResponse };
}

function handleStreamError(res: Response, error: unknown, label: string): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error(`${label}:`, errorMessage);
  if (error instanceof Error && error.stack) {
    console.error('Stack:', error.stack);
  }

  if (!res.headersSent) {
    res.status(500).json({ code: 'INTERNAL_ERROR', message: errorMessage || 'An unexpected error occurred' });
    return;
  }

  sendSSE(res, 'error', { code: 'INTERNAL_ERROR', message: errorMessage || 'An unexpected error occurred' });
  res.end();
}

// Parse create_items block from AI response
interface ExtractedItem {
  id: string;
  itemType: 'accommodation' | 'transportation' | 'activity' | 'reservation';
  fields: Record<string, unknown>;
  missingRequired: string[];
  confidence: number;
  status: 'pending';
}

interface ParsedResponse {
  cleanContent: string;
  extractedItems: ExtractedItem[];
}

const REQUIRED_FIELDS_BY_TYPE: Record<string, string[]> = {
  accommodation: ['name', 'check_in_date', 'check_out_date'],
  transportation: ['type', 'departure_location', 'arrival_location', 'departure_date'],
  activity: ['name', 'date'],
  reservation: ['restaurant_name', 'date', 'time']
};

function mapRawItemToExtracted(item: Record<string, unknown>, idx: number): ExtractedItem {
  const itemType = (item.itemType as string) || 'activity';
  const fields = (item.fields as Record<string, unknown>) || item;
  const required = REQUIRED_FIELDS_BY_TYPE[itemType] || [];
  const missingRequired = required.filter(k => !fields[k]);

  return {
    id: `ai-item-${idx}-${Date.now()}`,
    itemType: itemType as ExtractedItem['itemType'],
    fields,
    missingRequired,
    confidence: 0.85,
    status: 'pending' as const
  };
}

const CREATE_ITEMS_REGEX = /```create_items\s*([\s\S]*?)```/;

function parseCreateItemsBlock(response: string): ParsedResponse {
  const match = response.match(CREATE_ITEMS_REGEX);

  if (!match) {
    return { cleanContent: response, extractedItems: [] };
  }

  const jsonStr = match[1].trim();
  let items: ExtractedItem[] = [];

  try {
    const parsed = JSON.parse(jsonStr);
    const rawItems = Array.isArray(parsed) ? parsed : [parsed];
    items = rawItems.map(mapRawItemToExtracted);
  } catch (e) {
    console.error('Failed to parse create_items JSON:', e);
  }

  const cleanContent = response.replace(CREATE_ITEMS_REGEX, '').trim();
  return { cleanContent, extractedItems: items };
}

function buildAnonSystemPrompt(basePrompt: string): string {
  return basePrompt.replace(
    /CRITICAL - YOU CAN ADD ITEMS TO THE TRIP:[\s\S]*$/,
    'NOTE: You are assisting an anonymous visitor viewing this trip. You can answer questions about the itinerary and provide travel recommendations, but you cannot modify the trip. If the user wants to add items, suggest they sign up for a free account.'
  );
}

function buildOpenAIMessages(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage?: string
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  ];
  if (userMessage) {
    messages.push({ role: 'user', content: userMessage });
  }
  return messages;
}

// Health check endpoint
router.get('/api/ai-chat/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'AI Chat service is running' });
});

// Get usage stats
router.get('/api/trips/:tripId/assistant/usage', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromToken(req.headers.authorization || '');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('get_ai_usage', {
      check_user_id: userId,
      check_date: today
    });

    if (error || !data || data.length === 0) {
      return res.status(500).json({ error: 'Failed to get usage' });
    }

    // Calculate reset time (midnight UTC)
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return res.json({
      used: data[0].current_count,
      limit: data[0].daily_limit,
      tier: data[0].subscription_tier,
      resetAt: tomorrow.toISOString()
    });
  } catch (error) {
    console.error('Error getting usage:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get AI import usage stats
router.get('/api/ai-imports/usage', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromToken(req.headers.authorization || '');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('get_ai_import_usage', {
      check_user_id: userId,
      check_date: today
    });

    if (error || !data || data.length === 0) {
      // Return default if function doesn't exist yet or error
      return res.json({
        used: 0,
        limit: 5,
        tier: 'free',
        resetAt: new Date(new Date().setUTCDate(new Date().getUTCDate() + 1)).toISOString()
      });
    }

    // Calculate reset time (midnight UTC)
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return res.json({
      used: data[0].current_count,
      limit: data[0].daily_limit,
      tier: data[0].subscription_tier,
      resetAt: tomorrow.toISOString()
    });
  } catch (error) {
    console.error('Error getting import usage:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Increment AI import usage (called before extraction)
router.post('/api/ai-imports/usage', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromToken(req.headers.authorization || '');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('increment_ai_import_usage', {
      check_user_id: userId,
      check_date: today
    });

    if (error || !data || data.length === 0) {
      console.error('Error incrementing import usage:', error);
      return res.status(500).json({ error: 'Failed to check usage limits' });
    }

    if (!data[0].allowed) {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      return res.status(429).json({
        code: 'DAILY_LIMIT_REACHED',
        message: 'You have reached your daily import limit',
        limit: data[0].daily_limit,
        used: data[0].current_count,
        resetAt: tomorrow.toISOString()
      });
    }

    return res.json({
      allowed: data[0].allowed,
      used: data[0].current_count,
      limit: data[0].daily_limit
    });
  } catch (error) {
    console.error('Error incrementing import usage:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat history
router.get('/api/trips/:tripId/assistant/messages', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    if (!isValidUUID(tripId)) return res.status(400).json({ error: 'Invalid trip ID' });
    const authUser = await getUserFromToken(req.headers.authorization || '');

    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = authUser.id;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify trip access
    const hasAccess = await canAccessTrip(supabase, userId, tripId, authUser.email);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this trip' });
    }

    // Get thread
    const { data: thread } = await supabase
      .from('ai_chat_threads')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .single();

    if (!thread) {
      return res.json({ messages: [], thread_id: null });
    }

    // Get messages
    const { data: messages } = await supabase
      .from('ai_chat_messages')
      .select('id, role, content, metadata, created_at')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });

    return res.json({
      messages: messages || [],
      thread_id: thread.id
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear chat history
router.delete('/api/trips/:tripId/assistant/messages', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    if (!isValidUUID(tripId)) return res.status(400).json({ error: 'Invalid trip ID' });
    const authUser = await getUserFromToken(req.headers.authorization || '');

    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = authUser.id;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify trip access
    const hasAccess = await canAccessTrip(supabase, userId, tripId, authUser.email);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this trip' });
    }

    // Get and delete thread (cascade will delete messages)
    const { error } = await supabase
      .from('ai_chat_threads')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing thread:', error);
      return res.status(500).json({ error: 'Failed to clear chat' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error clearing chat:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Rate limiter for anonymous chat - stricter than general limiter
const anonChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' }
});

// Anonymous chat endpoint - no auth, public trips only, no DB persistence
router.post('/api/trips/:tripId/assistant/anon', anonChatLimiter, async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    if (!isValidUUID(tripId)) return res.status(400).json({ error: 'Invalid trip ID' });
    const { message, messages: previousMessages } = req.body as {
      message: string;
      messages?: Array<{ role: string; content: string }>;
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message exceeds maximum length of 2000 characters' });
    }

    // Validate previousMessages array
    let historyMessages: Array<{ role: string; content: string }> = [];
    if (previousMessages) {
      if (!Array.isArray(previousMessages)) {
        return res.status(400).json({ error: 'Messages must be an array' });
      }
      historyMessages = previousMessages
        .slice(-8)
        .filter((msg): msg is { role: string; content: string } => {
          if (typeof msg !== 'object' || !msg) return false;
          const { role, content } = msg as Record<string, unknown>;
          // Only allow user/assistant roles — reject system role injection
          if (typeof role !== 'string' || !['user', 'assistant'].includes(role)) return false;
          if (typeof content !== 'string' || content.length === 0 || content.length > 2000) return false;
          return true;
        });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('trip_id, is_public')
      .eq('trip_id', tripId)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Trip not found' });
    }

    if (!trip.is_public) {
      return res.status(403).json({ code: 'NOT_PUBLIC', message: 'This trip is not publicly accessible' });
    }

    const tripContext = await getTripContext(supabase, tripId);
    if (!tripContext) {
      return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to load trip data' });
    }

    const anonSystemPrompt = buildAnonSystemPrompt(buildSystemPrompt(tripContext));
    const openaiMessages = buildOpenAIMessages(anonSystemPrompt, historyMessages, message.trim());

    setupSSEHeaders(res);

    const result = await streamOpenAIResponse(openaiMessages, res, { maxTokens: 800, filterCreateItems: true });
    if (!result) return;

    sendSSE(res, 'done', { thread_id: null, message_id: `anon-${Date.now()}` });
    res.end();
  } catch (error) {
    handleStreamError(res, error, 'Anon chat error');
  }
});

// Main streaming chat endpoint
router.post('/api/trips/:tripId/assistant', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    if (!isValidUUID(tripId)) return res.status(400).json({ error: 'Invalid trip ID' });
    const { message, thread_id }: SendMessageRequest = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 4000) {
      return res.status(400).json({ error: 'Message exceeds maximum length' });
    }

    const authUser = await getUserFromToken(req.headers.authorization || '');
    if (!authUser) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Please sign in to use the assistant' });
    }
    const userId = authUser.id;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const hasAccess = await canAccessTrip(supabase, userId, tripId, authUser.email);
    if (!hasAccess) {
      return res.status(403).json({ code: 'TRIP_ACCESS_DENIED', message: 'You do not have access to this trip' });
    }

    const usage = await checkAndIncrementUsage(supabase, userId);
    if (!usage.allowed) {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      return res.status(429).json({
        code: 'DAILY_LIMIT_REACHED',
        message: 'You have reached your daily message limit',
        limit: usage.limit,
        used: usage.used,
        resetAt: tomorrow.toISOString()
      });
    }

    const threadId = await getOrCreateThread(supabase, userId, tripId, thread_id);
    if (!threadId) {
      return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to create conversation thread' });
    }

    const userMessageId = await saveMessage(supabase, threadId, 'user', message.trim());
    if (!userMessageId) {
      return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to save message' });
    }

    const tripContext = await getTripContext(supabase, tripId);
    if (!tripContext) {
      return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to load trip data' });
    }

    const recentMessages = await getRecentMessages(supabase, threadId, 10);
    const openaiMessages = buildOpenAIMessages(buildSystemPrompt(tripContext), recentMessages);

    setupSSEHeaders(res);

    const result = await streamOpenAIResponse(openaiMessages, res, { maxTokens: 1000 });
    if (!result) return;

    const { cleanContent, extractedItems } = parseCreateItemsBlock(result.fullResponse);

    const assistantMessageId = await saveMessage(supabase, threadId, 'assistant', cleanContent, {
      model: MODEL,
      tokens: { completion: result.fullResponse.length },
      hasExtractedItems: extractedItems.length > 0
    });

    if (extractedItems.length > 0) {
      sendSSE(res, 'extracted_items', {
        items: extractedItems,
        meta: { model: MODEL, source: 'conversation' }
      });
    }

    sendSSE(res, 'done', { thread_id: threadId, message_id: assistantMessageId });
    res.end();
  } catch (error) {
    handleStreamError(res, error, 'Chat error');
  }
});

export default router;
