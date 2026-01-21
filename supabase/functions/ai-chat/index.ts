import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS'
};

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

  const { data: ownedTrip } = await supabase.from('trips').select('trip_id').eq('trip_id', tripId).eq('user_id', userId).single();
  const { data: sharedTrip } = await supabase.from('trip_shares').select('id').eq('trip_id', tripId).eq('shared_with_user_id', userId).single();
  if (!ownedTrip && !sharedTrip) {
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

    const { data: trip } = await supabase.from('trips').select('destination, arrival_date, departure_date').eq('trip_id', tripId).single();
    const { data: days } = await supabase.from('trip_days').select('date, title, day_activities(title, start_time)').eq('trip_id', tripId).order('date');
    const { data: msgs } = await supabase.from('ai_chat_messages').select('role, content').eq('thread_id', threadId).order('created_at', { ascending: false }).limit(10);

    const destination = trip?.destination || 'unknown';
    const systemPrompt = `You are a helpful travel assistant for a trip to ${destination} from ${trip?.arrival_date} to ${trip?.departure_date}.

Guidelines:
- Be concise and helpful
- Use markdown formatting for readability
- When recommending hotels, restaurants, or attractions, make the name a clickable link
- IMPORTANT: Only use these URL formats (never use IP addresses or made-up URLs):
  - Google Maps: https://www.google.com/maps/search/PLACE+NAME+${destination.replace(/\s+/g, '+')}
  - Google Search: https://www.google.com/search?q=PLACE+NAME+${destination.replace(/\s+/g, '+')}
- Replace PLACE+NAME with the actual place name using + for spaces
- Format: **[Place Name](google maps or search url)** - Brief description
- Example: **[The Ritz-Carlton](https://www.google.com/maps/search/The+Ritz-Carlton+${destination.replace(/\s+/g, '+')})** - Luxury hotel with excellent service`;
    const openaiMsgs = [{ role: 'system', content: systemPrompt }, ...(msgs || []).reverse().map((m: any) => ({ role: m.role, content: m.content }))];

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: openaiMsgs, stream: true, temperature: 0.7, max_tokens: 1000 })
    });

    if (!openaiRes.ok) return new Response(JSON.stringify({ code: 'OPENAI_ERROR', message: 'AI request failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const encoder = new TextEncoder();
    let fullResponse = '';
    const finalThreadId = threadId;

    const stream = new ReadableStream({
      async start(controller) {
        const reader = openaiRes.body!.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
              if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
                try {
                  const content = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content;
                  if (content) { fullResponse += content; controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify({ content })}\n\n`)); }
                } catch {}
              }
            }
          }
          const { data: saved } = await supabase.from('ai_chat_messages').insert({ thread_id: finalThreadId, role: 'assistant', content: fullResponse }).select('id').single();
          controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ thread_id: finalThreadId, message_id: saved?.id })}\n\n`));
          controller.close();
        } catch (e) { controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'Stream error' })}\n\n`)); controller.close(); }
      }
    });

    return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
