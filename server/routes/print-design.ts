// server/routes/print-design.ts — Print Studio generation endpoint (Pro).
//
// POST /api/trips/:tripId/print-design  { theme?: string }
//   → 200 { id, design, model }        design: sanitized PrintDesignSpec
//   → 401/403/404/429/502/503 with { code, message }
//
// Authorization: valid Supabase JWT + trip access (owner/shared/public) +
// subscription_tier === 'pro'. Generations are capped per user per day
// (counted from trip_print_designs, which this route alone writes).

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';
import { generatePrintDesign, PrintDesignError, type PrintTripRows } from '../lib/printDesign';

const router = Router();

const isValidUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// A design is a deliberate, ~$0.03 action; 10 per person per day is plenty.
const DAILY_DESIGN_LIMIT = 10;

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

async function canAccessTrip(supabase: ReturnType<typeof createClient>, userId: string, tripId: string, userEmail?: string): Promise<boolean> {
  const { data: ownedTrip } = await supabase
    .from('trips')
    .select('trip_id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single();

  if (ownedTrip) return true;

  const { data: sharedByUserId } = await supabase
    .from('trip_shares')
    .select('id')
    .eq('trip_id', tripId)
    .eq('shared_with_user_id', userId)
    .eq('share_status', 'accepted')
    .maybeSingle();

  if (sharedByUserId) return true;

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

  const { data: publicTrip } = await supabase
    .from('trips')
    .select('trip_id')
    .eq('trip_id', tripId)
    .eq('is_public', true)
    .maybeSingle();

  return !!publicTrip;
}

// Belt-and-suspenders IP limiter on top of the per-user daily DB cap.
const printDesignLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many design requests. Please try again later.' },
});

router.post('/api/trips/:tripId/print-design', printDesignLimiter, async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    if (!isValidUUID(tripId)) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Invalid trip ID' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(503).json({ code: 'CONFIG_ERROR', message: 'Print Studio is not configured on this server' });
    }

    const user = await getUserFromToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Please sign in' });
    }

    const rawTheme = (req.body || {}).theme;
    const themePrompt = typeof rawTheme === 'string' && rawTheme.trim()
      ? rawTheme.replace(/[\r\n"]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
      : null;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Pro gate — this is the paid feature.
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_tier !== 'pro') {
      return res.status(403).json({ code: 'PRO_REQUIRED', message: 'Print Studio is a WanderLuxe Pro feature' });
    }

    const hasAccess = await canAccessTrip(supabase, user.id, tripId, user.email);
    if (!hasAccess) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied to this trip' });
    }

    // Per-user daily cap, counted from the designs this route has stored.
    const todayStartUtc = new Date();
    todayStartUtc.setUTCHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from('trip_print_designs')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .gte('created_at', todayStartUtc.toISOString());

    if ((todayCount ?? 0) >= DAILY_DESIGN_LIMIT) {
      return res.status(429).json({
        code: 'DAILY_LIMIT_REACHED',
        message: `You can generate ${DAILY_DESIGN_LIMIT} designs per day. Your designs reset at midnight UTC.`,
        limit: DAILY_DESIGN_LIMIT,
      });
    }

    // Everything on the trip, fetched server-side so the payload is truthful.
    const [
      { data: trip, error: tripErr },
      { data: days },
      { data: activities },
      { data: stays },
      { data: transportation },
      { data: reservations },
      { data: otherExpenses },
    ] = await Promise.all([
      supabase.from('trips').select('destination, arrival_date, departure_date, timezone, budget').eq('trip_id', tripId).single(),
      supabase.from('trip_days').select('day_id, date, title, description').eq('trip_id', tripId).order('date'),
      supabase.from('day_activities').select('day_id, title, description, start_time, end_time, cost').eq('trip_id', tripId),
      supabase.from('accommodations').select('hotel, hotel_address, hotel_checkin_date, hotel_checkout_date, cost').eq('trip_id', tripId),
      supabase.from('transportation').select('type, provider, departure_location, arrival_location, start_date, start_time').eq('trip_id', tripId),
      supabase.from('reservations').select('restaurant_name, reservation_time, notes').eq('trip_id', tripId),
      supabase.from('other_expenses').select('description, cost').eq('trip_id', tripId),
    ]);

    if (tripErr || !trip) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Trip not found' });
    }

    const rows: PrintTripRows = {
      trip: trip as Record<string, unknown>,
      days: (days ?? []) as Record<string, unknown>[],
      activities: (activities ?? []) as Record<string, unknown>[],
      stays: (stays ?? []) as Record<string, unknown>[],
      transportation: (transportation ?? []) as Record<string, unknown>[],
      reservations: (reservations ?? []) as Record<string, unknown>[],
      otherExpenses: (otherExpenses ?? []) as Record<string, unknown>[],
    };

    const { design, model } = await generatePrintDesign(OPENAI_API_KEY, rows, themePrompt);

    const { data: inserted, error: insertErr } = await supabase
      .from('trip_print_designs')
      .insert({
        trip_id: tripId,
        created_by: user.id,
        theme_prompt: themePrompt,
        design,
        model,
      })
      .select('id, created_at')
      .single();

    if (insertErr || !inserted) {
      console.error('Failed to store print design:', insertErr);
      return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to save the design' });
    }

    return res.json({ id: inserted.id, created_at: inserted.created_at, design, model });
  } catch (error) {
    if (error instanceof PrintDesignError) {
      return res.status(error.status).json({ code: 'DESIGN_FAILED', message: error.message });
    }
    console.error('Print design error:', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

export default router;
