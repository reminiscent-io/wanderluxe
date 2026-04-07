import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';

const router = Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-5.4-mini';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Types
interface AdminMetricsPayload {
  userCount: number;
  activeUsers7d: number;
  activeUsers30d: number;
  newUsers30d: number;
  tripStats: {
    total_trips: number;
    upcoming_trips: number;
    active_trips: number;
    past_trips: number;
  };
  groupedActions: Array<{
    label: string;
    count: number;
    uniqueUsers: number;
  }>;
  avgEventsPerDay: number;
  peakDay: { date: string; value: number };
  engagementTrend: number;
  sharingStats: {
    total_shares: number;
    shared_trips: number;
    shares_this_month: number;
  };
  dailyUniqueUsersChart: Array<{ date: string; value: number }>;
  dailyEngagementChart: Array<{ date: string; value: number }>;
  sharesOverTime: Array<{ week_start: string; share_count: number }>;
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

// Check admin status
async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  return !!data?.is_admin;
}

// Send SSE event helper
function sendSSE(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// Build the system prompt for platform analytics
function buildSystemPrompt(): string {
  return `You are a product analytics advisor for WanderLuxe, an early-stage AI-powered travel planning platform. The platform allows users to create trips, add activities/accommodations/dining/transportation, share trips with collaborators, chat with an AI assistant, and export PDF itineraries.

You are analyzing platform metrics for the admin. Provide actionable, specific insights. Be direct and concise. Use markdown formatting.

Structure your response in these 5 sections:

## Executive Summary
2-3 sentence overview of platform health.

## User Engagement
- Are users actively using the platform? How does 7-day vs 30-day activity compare?
- Is engagement trending up or down? What does the daily trend suggest?
- Which features are users gravitating toward vs ignoring?

## Feature Adoption
- Which features (Trip Planning, Activities, Dining, Accommodations, Transportation) are strongest?
- Which features should be highlighted or improved based on usage patterns?
- Are CTAs effectively driving the right user actions?

## Growth & Sharing
- How is the sharing/collaboration feature performing?
- What do the signup and sharing trends indicate about virality?
- Specific suggestions to improve sharing adoption.

## Recommended Actions
3-5 numbered, concrete actions the admin should take this week, ordered by impact.

IMPORTANT:
- Reference specific numbers from the data provided.
- Compare ratios (e.g., active users / total users) to assess health.
- Note any concerning trends or positive signals.
- Keep the total response under 600 words.
- Do not include generic advice; every point must be grounded in the data.`;
}

// Build the user message with metrics data
function buildMetricsMessage(metrics: AdminMetricsPayload): string {
  const {
    userCount, activeUsers7d, activeUsers30d, newUsers30d,
    tripStats, groupedActions, avgEventsPerDay, peakDay,
    engagementTrend, sharingStats, dailyUniqueUsersChart,
    dailyEngagementChart, sharesOverTime
  } = metrics;

  // Summarize daily unique users trend (last 7 days)
  const recentDailyUsers = dailyUniqueUsersChart.slice(-7);
  const dailyUsersTrend = recentDailyUsers
    .map(d => `${d.date}: ${d.value}`)
    .join(', ');

  // Summarize engagement chart (last 7 days)
  const recentEngagement = dailyEngagementChart.slice(-7);
  const engagementDailyTrend = recentEngagement
    .map(d => `${d.date}: ${d.value}`)
    .join(', ');

  // Summarize sharing over time
  const sharingTrend = sharesOverTime
    .slice(-6)
    .map(w => `week of ${w.week_start}: ${w.share_count}`)
    .join(', ');

  return `Here are the current platform metrics as of ${new Date().toISOString().split('T')[0]}:

USER METRICS:
- Total users: ${userCount}
- Active in last 7 days: ${activeUsers7d} (${userCount > 0 ? Math.round((activeUsers7d / userCount) * 100) : 0}% of total)
- Active in last 30 days: ${activeUsers30d} (${userCount > 0 ? Math.round((activeUsers30d / userCount) * 100) : 0}% of total)
- New signups (last 30 days): ${newUsers30d}

TRIP STATISTICS:
- Total trips created: ${tripStats.total_trips}
- Upcoming trips: ${tripStats.upcoming_trips}
- Currently active trips: ${tripStats.active_trips}
- Past trips: ${tripStats.past_trips}
- Average trips per user: ${userCount > 0 ? (tripStats.total_trips / userCount).toFixed(1) : '0'}

FEATURE USAGE (last 30 days, sorted by volume):
${groupedActions.map(a => `- ${a.label}: ${a.count} actions by ${a.uniqueUsers} unique user(s)`).join('\n')}

ENGAGEMENT VELOCITY:
- Average events per day (last 30d): ${avgEventsPerDay}
- Peak day: ${peakDay.date || 'none'} with ${peakDay.value} events
- 30-day engagement trend vs prior 30 days: ${engagementTrend > 0 ? '+' : ''}${engagementTrend}%
- Daily active users (last 7 days): ${dailyUsersTrend}
- Daily events (last 7 days): ${engagementDailyTrend}

SHARING & COLLABORATION:
- Total shares: ${sharingStats.total_shares}
- Unique shared trips: ${sharingStats.shared_trips}
- New shares this month: ${sharingStats.shares_this_month}
- Weekly sharing trend: ${sharingTrend || 'no data'}

Please analyze these metrics and provide your insights.`;
}

// Rate limiter for admin insight generation — prevents API cost abuse
const adminInsightsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many insight requests. Please try again later.' }
});

// POST /api/admin/insights — Generate a new AI insight
router.post('/api/admin/insights', adminInsightsLimiter, async (req: Request, res: Response) => {
  try {
    // Authenticate
    const userId = await getUserIdFromToken(req.headers.authorization || '');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify admin
    const admin = await isAdmin(userId);
    if (!admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Validate payload
    const metrics: AdminMetricsPayload = req.body;
    if (typeof metrics.userCount !== 'number') {
      return res.status(400).json({ error: 'Invalid metrics payload' });
    }

    // Build messages
    const systemPrompt = buildSystemPrompt();
    const userMessage = buildMetricsMessage(metrics);

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
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        stream: true,
        temperature: 0.3,
        max_completion_tokens: 1500
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI error:', openaiResponse.status, errorText);
      sendSSE(res, 'error', { message: 'Failed to generate insight' });
      return res.end();
    }

    // Process streaming response
    let fullResponse = '';
    const reader = openaiResponse.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      sendSSE(res, 'error', { message: 'Failed to read response stream' });
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

    // Save completed insight to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: inserted, error: insertError } = await supabase
      .from('admin_insights')
      .insert({
        admin_user_id: userId,
        insight_text: fullResponse,
        metrics_snapshot: metrics,
        model: MODEL
      })
      .select('id, created_at')
      .single();

    if (insertError) {
      console.error('Failed to save insight:', insertError);
    }

    // Send done event
    sendSSE(res, 'done', {
      insight_id: inserted?.id || null,
      created_at: inserted?.created_at || new Date().toISOString()
    });

    res.end();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Admin insights error:', errorMessage);

    if (!res.headersSent) {
      return res.status(500).json({ error: errorMessage });
    }

    sendSSE(res, 'error', { message: errorMessage });
    res.end();
  }
});

// GET /api/admin/insights — Fetch insight history
router.get('/api/admin/insights', async (req: Request, res: Response) => {
  try {
    const userId = await getUserIdFromToken(req.headers.authorization || '');
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const admin = await isAdmin(userId);
    if (!admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
      .from('admin_insights')
      .select('id, insight_text, metrics_snapshot, model, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch insights:', error);
      return res.status(500).json({ error: 'Failed to fetch insights' });
    }

    return res.json({ insights: data || [] });
  } catch (error) {
    console.error('Fetch insights error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
