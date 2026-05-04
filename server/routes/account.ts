import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import type { Tables } from '../../src/integrations/supabase/types';

type DayActivityRow = Tables<'day_activities'>;
type AccommodationRow = Tables<'accommodations'>;
type TransportationRow = Tables<'transportation'>;
type ReservationRow = Tables<'reservations'>;
type OtherExpenseRow = Tables<'other_expenses'>;
type TripShareRow = Tables<'trip_shares'>;
type TripDayRow = Tables<'trip_days'> & { day_activities?: DayActivityRow[] };

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
// Output is curated for human readability: internal IDs, telemetry, and join-table
// plumbing are stripped; entities are nested under their natural parent.
router.get('/api/account/export', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromToken(req.headers.authorization || '');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const supabase = getServiceClient();
    const userId = user.id;

    const [profileResult, tripsResult, sharedWithMeResult, chatThreadsResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('trips').select('*').eq('user_id', userId),
      supabase
        .from('trip_shares')
        .select('permission_level, share_status, created_at, trip_id, is_owner')
        .eq('shared_with_user_id', userId),
      supabase.from('ai_chat_threads').select('id, title, trip_id, created_at').eq('user_id', userId),
    ]);

    const profile = profileResult.data;

    // Build trips with nested days/activities/accommodations/etc.
    const trips = [];
    for (const trip of tripsResult.data || []) {
      const [daysRes, accommodationsRes, transportationRes, reservationsRes, expensesRes, collaboratorsRes] =
        await Promise.all([
          supabase
            .from('trip_days')
            .select('day_id, date, title, description, image_url, day_activities(*)')
            .eq('trip_id', trip.trip_id)
            .order('date', { ascending: true }),
          supabase.from('accommodations').select('*').eq('trip_id', trip.trip_id),
          supabase.from('transportation').select('*').eq('trip_id', trip.trip_id).order('start_date'),
          supabase.from('reservations').select('*').eq('trip_id', trip.trip_id),
          supabase.from('other_expenses').select('*').eq('trip_id', trip.trip_id).order('date'),
          supabase
            .from('trip_shares')
            .select('first_name, last_name, shared_with_email, permission_level, share_status, is_owner')
            .eq('trip_id', trip.trip_id),
        ]);

      const days = ((daysRes.data ?? []) as TripDayRow[]).map((d) => ({
        date: d.date,
        title: d.title || null,
        description: d.description || null,
        image_url: d.image_url || null,
        activities: (d.day_activities ?? [])
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((a) => ({
            title: a.title,
            description: a.description || null,
            start_time: a.start_time || null,
            end_time: a.end_time || null,
            cost: a.cost,
            currency: a.currency,
            amount_paid: a.amount_paid,
            is_paid: a.is_paid,
            location: a.location_address
              ? {
                  address: a.location_address,
                  phone: a.location_phone || null,
                  website: a.location_website || null,
                  rating: a.location_rating ?? null,
                }
              : null,
          })),
      }));

      const accommodations = ((accommodationsRes.data ?? []) as AccommodationRow[])
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((a) => ({
          title: a.title,
          hotel: a.hotel || null,
          address: a.hotel_address || null,
          phone: a.hotel_phone || null,
          website: a.hotel_website || a.hotel_url || null,
          checkin_date: a.hotel_checkin_date || null,
          checkin_time: a.checkin_time || null,
          checkout_date: a.hotel_checkout_date || null,
          checkout_time: a.checkout_time || null,
          description: a.description || null,
          notes: a.hotel_details || null,
          cost: a.cost,
          currency: a.currency,
          amount_paid: a.amount_paid,
          is_paid: a.is_paid,
        }));

      const transportation = ((transportationRes.data ?? []) as TransportationRow[]).map((t) => ({
        type: t.type,
        provider: t.provider || null,
        flight_number: t.flight_number || null,
        confirmation_number: t.confirmation_number || null,
        from: t.departure_location || null,
        to: t.arrival_location || null,
        start_date: t.start_date,
        start_time: t.start_time || null,
        end_date: t.end_date || null,
        end_time: t.end_time || null,
        details: t.details || null,
        cost: t.cost,
        currency: t.currency,
      }));

      const dining_reservations = ((reservationsRes.data ?? []) as ReservationRow[])
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((r) => ({
          restaurant: r.restaurant_name,
          address: r.address || null,
          phone: r.phone_number || null,
          website: r.website || null,
          reservation_time: r.reservation_time || null,
          number_of_people: r.number_of_people ?? null,
          confirmation_number: r.confirmation_number || null,
          notes: r.notes || null,
          cost: r.cost,
          currency: r.currency,
          amount_paid: r.amount_paid,
          is_paid: r.is_paid,
        }));

      const other_expenses = ((expensesRes.data ?? []) as OtherExpenseRow[]).map((e) => ({
        description: e.description,
        date: e.date,
        cost: e.cost,
        currency: e.currency,
        amount_paid: e.amount_paid,
        is_paid: e.is_paid,
      }));

      const collaborators = ((collaboratorsRes.data ?? []) as TripShareRow[]).map((c) => ({
        first_name: c.first_name || null,
        last_name: c.last_name || null,
        email: c.shared_with_email || null,
        role: c.is_owner ? 'owner' : c.permission_level,
        status: c.share_status,
      }));

      trips.push({
        destination: trip.destination,
        primary_destination: trip.primary_destination || null,
        arrival_date: trip.arrival_date,
        departure_date: trip.departure_date,
        budget: trip.budget,
        visibility: trip.is_public ? 'public' : 'private',
        cover_image: trip.cover_image_url
          ? {
              url: trip.cover_image_url,
              photographer: trip.cover_image_photographer || null,
            }
          : null,
        created_at: trip.created_at,
        collaborators,
        days,
        accommodations,
        transportation,
        dining_reservations,
        other_expenses,
      });
    }

    // AI chats — look up trip destination for context
    const tripIdToDestination = new Map<string, string>();
    for (const t of tripsResult.data || []) tripIdToDestination.set(t.trip_id, t.destination);

    const ai_chats = [];
    for (const thread of chatThreadsResult.data || []) {
      const { data: messages } = await supabase
        .from('ai_chat_messages')
        .select('role, content, created_at')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });

      ai_chats.push({
        title: thread.title || null,
        trip_destination: tripIdToDestination.get(thread.trip_id) || null,
        created_at: thread.created_at,
        messages: ((messages ?? []) as Pick<Tables<'ai_chat_messages'>, 'role' | 'content' | 'created_at'>[]).map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.created_at,
        })),
      });
    }

    const shared_with_me = ((sharedWithMeResult.data ?? []) as TripShareRow[]).map((s) => ({
      role: s.is_owner ? 'owner' : s.permission_level,
      status: s.share_status,
      shared_at: s.created_at,
    }));

    const exportData = {
      _readme:
        'This is your personal data export from WanderLuxe. It includes your profile, ' +
        'trips you own (with all itinerary details), AI chat history, and a list of trips ' +
        'others have shared with you. Trip data belonging to other users is not included. ' +
        'Internal database identifiers and analytics telemetry have been omitted for clarity.',
      exported_at: new Date().toISOString(),
      account: {
        email: user.email,
        member_since: profile?.created_at || null,
      },
      profile: profile
        ? {
            full_name: profile.full_name || null,
            username: profile.username || null,
            home_location: profile.home_location || null,
            avatar_url: profile.avatar_url || null,
            plan: {
              tier: profile.subscription_tier || 'free',
              ai_messages_per_day: profile.ai_messages_limit ?? null,
              ai_imports_per_day: profile.ai_imports_limit ?? null,
            },
          }
        : null,
      trips,
      shared_with_me,
      ai_chats,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="wanderluxe-data-export-${new Date().toISOString().split('T')[0]}.json"`
    );
    return res.json(exportData);
  } catch (error) {
    console.error('Data export error:', error);
    return res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;
