// server/routes/print-design.ts — Print Studio generation endpoint (Pro).
//
// POST /api/trips/:tripId/print-design  { theme?: string }
//   → 200 { id, design, model }        design: sanitized PrintDesignSpec
//   → 401/403/404/429/502/503 with { code, message }
//
// POST /api/trips/:tripId/print-design/:designId/finalize  { finalize?: bool }
//   → 200 { id, finalized_at, finalized_by }
//   → 400/401/403/404 with { code, message }
//
// GET /api/print-design/quota
//   → 200 { tier, limit, used, remaining, resetsAt }
//
// Authorization: generating needs a valid Supabase JWT + trip access
// (owner/shared/public). Every signed-in member gets FREE_DAILY_DESIGNS a day;
// Pro gets PRO_DAILY_DESIGNS. The count lives in print_design_usage, which only
// the service role can touch (see 20261117000000_print_design_daily_quota.sql),
// and is spent atomically before the OpenAI call and refunded if it fails.
//
// Finalizing needs trip *edit* permission and no Pro check: the edition
// already exists, and the person proofreading a shared trip is often not the
// member who paid to generate it.

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';
import { generatePrintDesign, PrintDesignError } from '../lib/printDesign';
import { fetchTripSnapshot } from '../lib/printSnapshot';

const router = Router();

const isValidUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// A design is a deliberate, ~$0.03 action. One a day lets every member make a
// real edition of their own trip; Pro's 10 a day is plenty to iterate on one.
export const FREE_DAILY_DESIGNS = 1;
export const PRO_DAILY_DESIGNS = 10;

export function dailyDesignLimit(tier: string | null | undefined): number {
  return tier === 'pro' ? PRO_DAILY_DESIGNS : FREE_DAILY_DESIGNS;
}

/** The quota day, in UTC: the YYYY-MM-DD key and the moment it rolls over. */
export function quotaDay(now: Date = new Date()): { date: string; resetsAt: string } {
  const date = now.toISOString().slice(0, 10);
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return { date, resetsAt: next.toISOString() };
}

export function limitMessage(tier: string | null | undefined): string {
  return tier === 'pro'
    ? `You can design ${PRO_DAILY_DESIGNS} editions a day. Your count resets at midnight UTC.`
    : 'You have used today’s free edition. You get another tomorrow, or Pro designs up to 10 a day.';
}

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


/**
 * Mirrors the can_edit_trip() SQL function the RLS policies use, so the
 * finalize route and the copy-edit policy agree on who may change an edition.
 * Public visibility grants reading, never writing.
 */
async function canEditTrip(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tripId: string,
  userEmail?: string
): Promise<boolean> {
  const { data: ownedTrip } = await supabase
    .from('trips')
    .select('trip_id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle();

  if (ownedTrip) return true;

  if (!userEmail) return false;

  const { data: editShare } = await supabase
    .from('trip_shares')
    .select('id')
    .eq('trip_id', tripId)
    .ilike('shared_with_email', userEmail.toLowerCase())
    .eq('share_status', 'accepted')
    .eq('permission_level', 'edit')
    .maybeSingle();

  return !!editShare;
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

    const hasAccess = await canAccessTrip(supabase, user.id, tripId, user.email);
    if (!hasAccess) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied to this trip' });
    }

    // Every row on the trip, read server-side so the payload is truthful: the
    // same reads a finalized edition snapshots, projected the way the page
    // prints them. buildTripPayload drops every cost before the model sees it.
    // Read before spending an edition, so a missing trip costs nothing.
    const rows = await fetchTripSnapshot(supabase, tripId);
    if (!rows) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Trip not found' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    const tier = profile?.subscription_tier === 'pro' ? 'pro' : 'free';
    const limit = dailyDesignLimit(tier);
    const { date } = quotaDay();

    // Spend one edition up front (atomic, so a double tap can't spend the last
    // one twice) and give it back if anything below fails.
    const { data: consumed, error: consumeErr } = await supabase.rpc('consume_print_design', {
      p_user_id: user.id,
      p_date: date,
      p_limit: limit,
    });
    if (consumeErr) {
      console.error('consume_print_design failed:', consumeErr);
      return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Could not check your daily editions' });
    }
    const spend = Array.isArray(consumed) ? consumed[0] : consumed;
    if (!spend?.allowed) {
      return res.status(429).json({
        code: 'DAILY_LIMIT_REACHED',
        message: limitMessage(tier),
        tier,
        limit,
      });
    }

    const refund = () =>
      supabase.rpc('refund_print_design', { p_user_id: user.id, p_date: date }).then(
        ({ error }) => { if (error) console.error('refund_print_design failed:', error); },
        (err: unknown) => console.error('refund_print_design failed:', err)
      );

    let generated: Awaited<ReturnType<typeof generatePrintDesign>>;
    try {
      generated = await generatePrintDesign(OPENAI_API_KEY, rows, themePrompt);
    } catch (err) {
      await refund();
      throw err;
    }
    const { design, model } = generated;

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
      await refund();
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

// How many editions the signed-in member has left today. The dialog reads it
// to choose between the theme field and the upsell; the POST above is still
// the gate, so a stale answer here costs a toast, never an extra edition.
router.get('/api/print-design/quota', async (req: Request, res: Response) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(503).json({ code: 'CONFIG_ERROR', message: 'Print Studio is not configured on this server' });
    }

    const user = await getUserFromToken(req.headers.authorization || '');
    if (!user) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Please sign in' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { date, resetsAt } = quotaDay();

    const [{ data: profile }, { data: usage }] = await Promise.all([
      supabase.from('profiles').select('subscription_tier').eq('id', user.id).single(),
      supabase
        .from('print_design_usage')
        .select('design_count')
        .eq('user_id', user.id)
        .eq('date', date)
        .maybeSingle(),
    ]);

    const tier = profile?.subscription_tier === 'pro' ? 'pro' : 'free';
    const limit = dailyDesignLimit(tier);
    const used = (usage as { design_count?: number } | null)?.design_count ?? 0;

    return res.json({ tier, limit, used, remaining: Math.max(limit - used, 0), resetsAt });
  } catch (error) {
    console.error('Print quota error:', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

// Freezing costs one round of reads, so it gets its own, looser limiter.
const finalizeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again shortly.' },
});

/**
 * Finalize an edition (freeze the itinerary into it), or reopen it to live.
 *
 * Finalizing is what makes a Print Studio edition a keepsake rather than a
 * view: until it happens the page re-renders from current trip data, so a
 * document generated while planning keeps up with the plan. Once frozen the
 * RLS policy also stops accepting copy edits, so reopening runs through here
 * under the service role.
 */
router.post(
  '/api/trips/:tripId/print-design/:designId/finalize',
  finalizeLimiter,
  async (req: Request, res: Response) => {
    try {
      const { tripId, designId } = req.params;
      if (!isValidUUID(tripId) || !isValidUUID(designId)) {
        return res.status(400).json({ code: 'BAD_REQUEST', message: 'Invalid trip or edition ID' });
      }

      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return res.status(503).json({ code: 'CONFIG_ERROR', message: 'Print Studio is not configured on this server' });
      }

      const user = await getUserFromToken(req.headers.authorization || '');
      if (!user) {
        return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Please sign in' });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      if (!(await canEditTrip(supabase, user.id, tripId, user.email))) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'You need edit access to this trip' });
      }

      const { data: design } = await supabase
        .from('trip_print_designs')
        .select('id, finalized_at')
        .eq('id', designId)
        .eq('trip_id', tripId)
        .maybeSingle();

      if (!design) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Edition not found' });
      }

      // Absent means finalize; only an explicit false reopens.
      const finalize = (req.body || {}).finalize !== false;

      if (!finalize) {
        const { data: reopened, error: reopenErr } = await supabase
          .from('trip_print_designs')
          .update({ content_snapshot: null, finalized_at: null, finalized_by: null })
          .eq('id', designId)
          .select('id, finalized_at, finalized_by')
          .single();

        if (reopenErr || !reopened) {
          console.error('Failed to reopen print edition:', reopenErr);
          return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to reopen this edition' });
        }
        return res.json(reopened);
      }

      // Re-finalizing an already-frozen edition would silently swap its
      // contents for a later version of the trip, which is the one thing
      // finalizing promises not to do.
      if (design.finalized_at) {
        return res.json({ id: design.id, finalized_at: design.finalized_at, already: true });
      }

      const snapshot = await fetchTripSnapshot(supabase, tripId);
      if (!snapshot) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Trip not found' });
      }

      const { data: finalized, error: finalizeErr } = await supabase
        .from('trip_print_designs')
        .update({
          content_snapshot: snapshot,
          finalized_at: new Date().toISOString(),
          finalized_by: user.id,
        })
        .eq('id', designId)
        .select('id, finalized_at, finalized_by')
        .single();

      if (finalizeErr || !finalized) {
        console.error('Failed to finalize print edition:', finalizeErr);
        return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to finalize this edition' });
      }

      return res.json(finalized);
    } catch (error) {
      console.error('Print finalize error:', error);
      return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  }
);

export default router;
