import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
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
      .map(a => `  - ${a.title}${a.start_time ? ` (${a.start_time})` : ''}`)
      .join('\n');
    return `${day.date}${day.title ? ` - ${day.title}` : ''}:\n${activitiesList || '  No activities scheduled'}`;
  }).join('\n\n');

  // Format accommodations
  const formattedAccommodations = accommodations
    .filter(a => a.hotel)
    .slice(0, 5)
    .map(a => `- ${a.hotel}: ${a.hotel_checkin_date} to ${a.hotel_checkout_date}${a.hotel_address ? ` (${a.hotel_address})` : ''}`)
    .join('\n') || 'No accommodations added yet';

  // Format transportation
  const formattedTransportation = transportation
    .slice(0, 5)
    .map(t => `- ${t.type}${t.provider ? ` (${t.provider})` : ''}: ${t.departure_location || 'TBD'} → ${t.arrival_location || 'TBD'} on ${t.start_date}${t.start_time ? ` at ${t.start_time}` : ''}`)
    .join('\n') || 'No transportation added yet';

  return `You are a helpful travel planning assistant for a trip to ${destination}.

Trip Details:
- Destination: ${destination}
- Dates: ${arrival_date} to ${departure_date}
- Duration: ${daysCount} days

Current Itinerary:
${formattedDays}

Accommodations:
${formattedAccommodations}

Transportation:
${formattedTransportation}

Guidelines:
- Provide specific, actionable suggestions tailored to ${destination}
- Reference the existing itinerary when making recommendations
- Note that availability, hours, and prices should be verified by the traveler
- Use bullet points and clear formatting for readability
- Ask clarifying questions when helpful to provide better recommendations
- Be concise but thorough
- If asked about something outside your knowledge, suggest reliable local resources`;
}

// Get user ID from Supabase JWT
async function getUserIdFromToken(authHeader: string): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

// Check if user can access trip
async function canAccessTrip(supabase: ReturnType<typeof createClient>, userId: string, tripId: string): Promise<boolean> {
  // Check if user owns the trip
  const { data: ownedTrip } = await supabase
    .from('trips')
    .select('trip_id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single();

  if (ownedTrip) return true;

  // Check if trip is shared with user
  const { data: sharedTrip } = await supabase
    .from('trip_shares')
    .select('id')
    .eq('trip_id', tripId)
    .eq('shared_with_user_id', userId)
    .single();

  return !!sharedTrip;
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
function sendSSE(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
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
    const userId = await getUserIdFromToken(req.headers.authorization || '');

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify trip access
    const hasAccess = await canAccessTrip(supabase, userId, tripId);
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
    const userId = await getUserIdFromToken(req.headers.authorization || '');

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify trip access
    const hasAccess = await canAccessTrip(supabase, userId, tripId);
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

// Main streaming chat endpoint
router.post('/api/trips/:tripId/assistant', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { message, thread_id }: SendMessageRequest = req.body;

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get user ID from auth
    const userId = await getUserIdFromToken(req.headers.authorization || '');
    if (!userId) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Please sign in to use the assistant'
      });
    }

    // Initialize Supabase with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify trip access
    const hasAccess = await canAccessTrip(supabase, userId, tripId);
    if (!hasAccess) {
      return res.status(403).json({
        code: 'TRIP_ACCESS_DENIED',
        message: 'You do not have access to this trip'
      });
    }

    // Check usage limit
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

    // Get or create thread
    const threadId = await getOrCreateThread(supabase, userId, tripId, thread_id);
    if (!threadId) {
      return res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Failed to create conversation thread'
      });
    }

    // Save user message
    const userMessageId = await saveMessage(supabase, threadId, 'user', message.trim());
    if (!userMessageId) {
      return res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Failed to save message'
      });
    }

    // Get trip context
    const tripContext = await getTripContext(supabase, tripId);
    if (!tripContext) {
      return res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Failed to load trip data'
      });
    }

    // Get recent messages for context
    const recentMessages = await getRecentMessages(supabase, threadId, 10);

    // Build messages array for OpenAI
    const systemPrompt = buildSystemPrompt(tripContext);
    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...recentMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
    ];

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Call OpenAI with streaming
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: openaiMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI error:', openaiResponse.status, errorText);
      sendSSE(res, 'error', {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate response'
      });
      return res.end();
    }

    // Process streaming response
    let fullResponse = '';
    const reader = openaiResponse.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      sendSSE(res, 'error', {
        code: 'INTERNAL_ERROR',
        message: 'Failed to read response stream'
      });
      return res.end();
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                sendSSE(res, 'message', { content });
              }
            } catch {
              // Skip invalid JSON chunks
            }
          }
        }
      }
    } catch (streamError) {
      console.error('Stream error:', streamError);
    }

    // Save assistant response
    const assistantMessageId = await saveMessage(supabase, threadId, 'assistant', fullResponse, {
      model: MODEL,
      tokens: { completion: fullResponse.length } // Approximate
    });

    // Send done event
    sendSSE(res, 'done', {
      thread_id: threadId,
      message_id: assistantMessageId
    });

    res.end();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Chat error:', errorMessage);
    if (errorStack) console.error('Stack:', errorStack);

    // If headers not sent, send JSON error
    if (!res.headersSent) {
      return res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: errorMessage || 'An unexpected error occurred'
      });
    }

    // If streaming, send SSE error
    sendSSE(res, 'error', {
      code: 'INTERNAL_ERROR',
      message: errorMessage || 'An unexpected error occurred'
    });
    res.end();
  }
});

export default router;
