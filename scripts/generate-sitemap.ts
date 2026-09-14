import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import {
  STATIC_ROUTES,
  renderSitemapXml,
  renderLlmsTxt,
  tripSitemapEntries,
  type PublicTripRow,
} from '../server/lib/sitemap';

/**
 * Build-time fallback for /sitemap.xml and /llms.txt.
 *
 * The live versions are served by server/routes/sitemap.ts straight from the
 * database. These files exist so the build still ships a complete sitemap when
 * Supabase is unreachable at request time, and so `vite preview` (no Express)
 * has something to serve.
 */

const SITE_URL = process.env.SITE_URL || 'https://wanderluxe.io';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function fetchPublicTrips(): Promise<PublicTripRow[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      '[sitemap] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set — skipping public trips.',
    );
    return [];
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase
    .from('trips')
    // `*` rather than a column list so a build or server that runs ahead of a
    // migration (e.g. the `title` column) still gets a sitemap.
    .select('*')
    .eq('is_public', true)
    .not('slug', 'is', null)
    .order('arrival_date', { ascending: true });

  if (error) {
    console.warn('[sitemap] Could not fetch public trips:', error.message);
    return [];
  }

  const rows = (data ?? []) as Array<PublicTripRow & { trip_id: string }>;
  if (rows.length === 0) return [];

  const hotelsByTrip = new Map<string, string[]>();
  const { data: stays } = await supabase
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

  return rows.map((row) => ({ ...row, hotels: hotelsByTrip.get(row.trip_id) ?? [] }));
}

function writePublic(fileName: string, contents: string): string {
  const publicDir = path.resolve(process.cwd(), 'public');
  fs.mkdirSync(publicDir, { recursive: true });
  const outPath = path.join(publicDir, fileName);
  fs.writeFileSync(outPath, contents, 'utf8');
  return outPath;
}

async function main() {
  const rows = await fetchPublicTrips();
  const entries = [...STATIC_ROUTES, ...tripSitemapEntries(rows)];
  const sitemapPath = writePublic('sitemap.xml', renderSitemapXml(entries, SITE_URL));
  console.log(`[sitemap] Wrote ${entries.length} entries to ${sitemapPath}`);
  const llmsPath = writePublic('llms.txt', renderLlmsTxt(rows, SITE_URL));
  console.log(`[sitemap] Wrote llms.txt to ${llmsPath}`);
}

main().catch((err) => {
  console.error('[sitemap] Generation failed:', err);
  // Don't fail the build — emit the static routes as a fallback
  writePublic('sitemap.xml', renderSitemapXml(STATIC_ROUTES, SITE_URL));
  writePublic('llms.txt', renderLlmsTxt([], SITE_URL));
  console.log('[sitemap] Wrote fallback sitemap.xml and llms.txt with static routes only.');
});
