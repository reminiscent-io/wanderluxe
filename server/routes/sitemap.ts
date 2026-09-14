import { Router, Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import {
  STATIC_ROUTES,
  renderSitemapXml,
  renderLlmsTxt,
  tripSitemapEntries,
  type PublicTripRow,
} from '../lib/sitemap';

/**
 * Live sitemap.xml + llms.txt.
 *
 * Both used to be static files written at build time, so a trip published on a
 * Tuesday stayed invisible to crawlers until the next deploy. They are now
 * rendered from the database on request and cached in memory for an hour.
 * The build-time files remain in dist/ as the fallback when Supabase is
 * unreachable, so a database hiccup never serves an empty sitemap.
 *
 * Registered via registerRoutes(), which runs before express.static — so this
 * route wins over dist/sitemap.xml.
 */

const router = Router();

const SITE_URL = process.env.SITE_URL || 'https://wanderluxe.io';
const CACHE_TTL_MS = 60 * 60 * 1000;

let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // Public trips are readable under RLS, so the anon key is enough here —
  // no reason to hand this route the service role.
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return supabase;
}

interface Cached {
  rows: PublicTripRow[];
  fetchedAt: number;
}
let cache: Cached | null = null;
let inflight: Promise<PublicTripRow[]> | null = null;
// After a failed fetch, serve the fallback for a minute instead of hitting a
// struggling database on every crawler request.
const FAILURE_BACKOFF_MS = 60 * 1000;
let lastFailureAt = 0;

async function fetchPublicTrips(): Promise<PublicTripRow[]> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase configuration is missing');

  const { data: trips, error } = await sb
    .from('trips')
    // `*` rather than a column list so a build or server that runs ahead of a
    // migration (e.g. the `title` column) still gets a sitemap.
    .select('*')
    .eq('is_public', true)
    .not('slug', 'is', null)
    .order('arrival_date', { ascending: true });
  if (error) throw error;

  const rows = (trips ?? []) as Array<PublicTripRow & { trip_id: string }>;
  if (rows.length === 0) return [];

  // Hotel names make the llms.txt entries concrete; a failure here only
  // costs the hotel line, never the page list.
  const hotelsByTrip = new Map<string, string[]>();
  try {
    const { data: stays } = await sb
      .from('accommodations')
      .select('trip_id, hotel, hotel_checkin_date')
      .in('trip_id', rows.map((r) => r.trip_id))
      .order('hotel_checkin_date', { ascending: true });
    for (const stay of stays ?? []) {
      if (!stay.hotel) continue;
      const list = hotelsByTrip.get(stay.trip_id) ?? [];
      if (!list.includes(stay.hotel)) list.push(stay.hotel);
      hotelsByTrip.set(stay.trip_id, list);
    }
  } catch (err) {
    console.warn('[sitemap] Could not load hotel names:', err);
  }

  return rows.map((row) => ({ ...row, hotels: hotelsByTrip.get(row.trip_id) ?? [] }));
}

async function getPublicTrips(): Promise<PublicTripRow[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache.rows;
  if (now - lastFailureAt < FAILURE_BACKOFF_MS) throw new Error('Public trip fetch is backing off');
  if (!inflight) {
    inflight = fetchPublicTrips()
      .then((rows) => {
        cache = { rows, fetchedAt: Date.now() };
        return rows;
      })
      .catch((err) => {
        lastFailureAt = Date.now();
        throw err;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Test hook: drop the in-memory cache. */
export function resetSitemapCache(): void {
  cache = null;
  lastFailureAt = 0;
}

function sendFallback(res: Response, relativePath: string, contentType: string): void {
  const candidates = [
    path.resolve(process.cwd(), 'dist', relativePath),
    path.resolve(process.cwd(), 'public', relativePath),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(fs.readFileSync(file, 'utf8'));
      return;
    }
  }
  res.status(503).send('Temporarily unavailable');
}

router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    const rows = await getPublicTrips();
    const xml = renderSitemapXml([...STATIC_ROUTES, ...tripSitemapEntries(rows)], SITE_URL);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    console.warn('[sitemap] Falling back to the built sitemap:', err);
    sendFallback(res, 'sitemap.xml', 'application/xml; charset=utf-8');
  }
});

router.get('/llms.txt', async (_req: Request, res: Response) => {
  try {
    const rows = await getPublicTrips();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(renderLlmsTxt(rows, SITE_URL));
  } catch (err) {
    console.warn('[sitemap] Falling back to the built llms.txt:', err);
    sendFallback(res, 'llms.txt', 'text/plain; charset=utf-8');
  }
});

export default router;
