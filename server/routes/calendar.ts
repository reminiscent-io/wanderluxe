import { Router, Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { buildTripCalendarICS, isFeedAuthorized, type FeedInput } from '../lib/icalFeed';

const router = Router();

let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase configuration is missing');
    supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  }
  return supabase;
}

router.get('/api/trips/:tripId/calendar.ics', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const token = String(req.query.token ?? '');
    const sb = getSupabase();

    const { data: trip, error } = await sb
      .from('trips')
      .select('destination, calendar_feed_token, calendar_feed_enabled')
      .eq('trip_id', tripId)
      .maybeSingle();
    if (error) throw error;
    if (!trip || !isFeedAuthorized(trip, token)) {
      return res.status(403).send('Forbidden');
    }

    const [daysRes, actsRes, accRes, transRes, resvRes] = await Promise.all([
      sb.from('trip_days').select('day_id, date').eq('trip_id', tripId),
      sb.from('day_activities').select('id, title, day_id, start_time, end_time, description, location_address').eq('trip_id', tripId),
      sb.from('accommodations').select('stay_id, hotel, hotel_checkin_date, hotel_checkout_date, hotel_address, hotel_details').eq('trip_id', tripId),
      sb.from('transportation').select('id, type, start_date, start_time, end_date, end_time, departure_location, arrival_location, provider, details').eq('trip_id', tripId),
      sb.from('reservations').select('id, restaurant_name, day_id, reservation_time, address, notes').eq('trip_id', tripId),
    ]);

    const dayDate = new Map<string, string>((daysRes.data ?? []).map((d: { day_id: string; date: string }) => [d.day_id, String(d.date).slice(0, 10)]));

    const input: FeedInput = {
      trip: { destination: trip.destination ?? 'Trip' },
      activities: (actsRes.data ?? [])
        .map((a: any) => ({ id: a.id, title: a.title, date: dayDate.get(a.day_id) ?? '', start_time: a.start_time, end_time: a.end_time, description: a.description, location_address: a.location_address }))
        .filter((a) => a.date),
      reservations: (resvRes.data ?? [])
        .map((r: any) => ({ id: r.id, restaurant_name: r.restaurant_name, date: dayDate.get(r.day_id) ?? '', reservation_time: r.reservation_time, address: r.address, notes: r.notes }))
        .filter((r) => r.date),
      accommodations: (accRes.data ?? [])
        .map((s: any) => ({ stay_id: s.stay_id, hotel: s.hotel ?? 'Accommodation', hotel_checkin_date: s.hotel_checkin_date, hotel_checkout_date: s.hotel_checkout_date, hotel_address: s.hotel_address, hotel_details: s.hotel_details }))
        .filter((s) => s.hotel_checkin_date && s.hotel_checkout_date),
      transportation: (transRes.data ?? [])
        .map((t: any) => ({ id: t.id, type: t.type, start_date: t.start_date, start_time: t.start_time, end_date: t.end_date, end_time: t.end_time, departure_location: t.departure_location, arrival_location: t.arrival_location, provider: t.provider, details: t.details }))
        .filter((t) => t.start_date),
    };

    const ics = buildTripCalendarICS(input);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Disposition', 'inline; filename="trip.ics"');
    return res.status(200).send(ics);
  } catch (e) {
    console.error('Calendar feed error:', e instanceof Error ? e.message : e);
    return res.status(500).send('Internal Server Error');
  }
});

export default router;
