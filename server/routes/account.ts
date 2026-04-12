import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getUserFromToken(authHeader: string): Promise<{ id: string; email: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email || '' };
}

// ── DELETE /api/account ──────────────────────────────────────────────
// Permanently deletes the authenticated user's account and all associated data.
router.delete('/api/account', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromToken(req.headers.authorization || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const supabase = getServiceClient();
    const userId = user.id;

    // Delete user data in dependency order (children before parents).
    // Using service role key bypasses RLS so we can clean up everything.

    // 1. AI chat messages & threads
    const { data: threads } = await supabase
      .from('ai_chat_threads')
      .select('id')
      .eq('user_id', userId);
    if (threads?.length) {
      const threadIds = threads.map(t => t.id);
      await supabase.from('ai_chat_messages').delete().in('thread_id', threadIds);
      await supabase.from('ai_chat_threads').delete().eq('user_id', userId);
    }

    // 2. AI usage tracking
    await supabase.from('user_ai_usage').delete().eq('user_id', userId);

    // 3. Engagement & analytics
    await supabase.from('user_engagement_events').delete().eq('user_id', userId);
    await supabase.from('trip_view_status').delete().eq('user_id', userId);

    // 4. Trip shares (both directions)
    await supabase.from('trip_shares').delete().eq('shared_with_user_id', userId);

    // 5. Trips owned by this user and all sub-entities
    const { data: trips } = await supabase
      .from('trips')
      .select('id')
      .eq('user_id', userId);

    if (trips?.length) {
      const tripIds = trips.map(t => t.id);

      // Sub-entity travelers
      for (const tripId of tripIds) {
        const { data: activities } = await supabase
          .from('day_activities')
          .select('id, day_id')
          .in('day_id', (
            await supabase.from('trip_days').select('id').eq('trip_id', tripId)
          ).data?.map(d => d.id) || []);

        if (activities?.length) {
          await supabase.from('day_activity_travelers').delete().in('activity_id', activities.map(a => a.id));
        }

        const { data: accommodations } = await supabase
          .from('accommodations')
          .select('id')
          .eq('trip_id', tripId);
        if (accommodations?.length) {
          const accIds = accommodations.map(a => a.id);
          await supabase.from('accommodation_travelers').delete().in('accommodation_id', accIds);
          await supabase.from('accommodations_days').delete().in('accommodation_id', accIds);
        }

        const { data: transports } = await supabase
          .from('transportation')
          .select('id')
          .eq('trip_id', tripId);
        if (transports?.length) {
          await supabase.from('transportation_travelers').delete().in('transportation_id', transports.map(t => t.id));
        }

        const { data: reservations } = await supabase
          .from('reservations')
          .select('id')
          .eq('trip_id', tripId);
        if (reservations?.length) {
          await supabase.from('reservation_travelers').delete().in('reservation_id', reservations.map(r => r.id));
        }

        // Delete sub-entities
        await supabase.from('day_activities').delete().in('day_id',
          (await supabase.from('trip_days').select('id').eq('trip_id', tripId)).data?.map(d => d.id) || []
        );
        await supabase.from('trip_days').delete().eq('trip_id', tripId);
        await supabase.from('accommodations').delete().eq('trip_id', tripId);
        await supabase.from('transportation').delete().eq('trip_id', tripId);
        await supabase.from('reservations').delete().eq('trip_id', tripId);
        await supabase.from('other_expenses').delete().eq('trip_id', tripId);
        await supabase.from('trip_shares').delete().eq('trip_id', tripId);
        await supabase.from('trip_invite_links').delete().eq('trip_id', tripId);
      }

      // Delete the trips themselves
      await supabase.from('trips').delete().eq('user_id', userId);
    }

    // 6. Profile
    await supabase.from('profiles').delete().eq('id', userId);

    // 7. Delete the auth user (must be last)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError);
      return res.status(500).json({ error: 'Failed to delete account. Please contact support.' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return res.status(500).json({ error: 'Failed to delete account. Please contact support.' });
  }
});

// ── GET /api/account/export ──────────────────────────────────────────
// Returns all personal data for the authenticated user as JSON (GDPR Article 20).
router.get('/api/account/export', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromToken(req.headers.authorization || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const supabase = getServiceClient();
    const userId = user.id;

    // Collect all user data
    const [
      profileResult,
      tripsResult,
      sharesResult,
      chatThreadsResult,
      usageResult,
      engagementResult,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('trips').select('*').eq('user_id', userId),
      supabase.from('trip_shares').select('*').eq('shared_with_user_id', userId),
      supabase.from('ai_chat_threads').select('*').eq('user_id', userId),
      supabase.from('user_ai_usage').select('*').eq('user_id', userId),
      supabase.from('user_engagement_events').select('*').eq('user_id', userId),
    ]);

    // For each trip, gather sub-entities
    const tripDetails = [];
    for (const trip of tripsResult.data || []) {
      const [days, accommodations, transportation, reservations, expenses] = await Promise.all([
        supabase.from('trip_days').select('*, day_activities(*)').eq('trip_id', trip.id),
        supabase.from('accommodations').select('*').eq('trip_id', trip.id),
        supabase.from('transportation').select('*').eq('trip_id', trip.id),
        supabase.from('reservations').select('*').eq('trip_id', trip.id),
        supabase.from('other_expenses').select('*').eq('trip_id', trip.id),
      ]);

      tripDetails.push({
        ...trip,
        days: days.data || [],
        accommodations: accommodations.data || [],
        transportation: transportation.data || [],
        reservations: reservations.data || [],
        expenses: expenses.data || [],
      });
    }

    // Gather chat messages for each thread
    const chatData = [];
    for (const thread of chatThreadsResult.data || []) {
      const { data: messages } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });

      chatData.push({ ...thread, messages: messages || [] });
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      account: {
        email: user.email,
        user_id: userId,
      },
      profile: profileResult.data || null,
      trips: tripDetails,
      shared_trips: sharesResult.data || [],
      ai_chat: chatData,
      ai_usage: usageResult.data || [],
      engagement_events: engagementResult.data || [],
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="wanderluxe-data-export-${new Date().toISOString().split('T')[0]}.json"`);
    return res.json(exportData);
  } catch (error) {
    console.error('Data export error:', error);
    return res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;
