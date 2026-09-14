import 'dotenv/config';
import puppeteer, { type Browser } from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { preview } from 'vite';
import { createClient } from '@supabase/supabase-js';

// Keep in step with STATIC_ROUTES in server/lib/sitemap.ts and
// prerenderedFileFor() in server/index.ts.
const STATIC_ROUTES = ['/', '/explore', '/guide', '/about', '/terms', '/privacy'];
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const PORT = Number(process.env.PRERENDER_PORT || 4173);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface PublicTripRoute {
  trip_id: string;
  slug: string;
  previous_slugs: string[];
}

async function fetchPublicTrips(): Promise<PublicTripRoute[]> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('[prerender] VITE_SUPABASE_URL/ANON_KEY missing — skipping per-trip prerender.');
    return [];
  }
  const supabase = createClient(url, key);
  // `*` so a build that runs before the `previous_slugs` migration still
  // prerenders every page; the column just reads as undefined.
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('is_public', true)
    .not('slug', 'is', null);
  if (error) {
    console.warn('[prerender] Could not fetch public trips:', error.message);
    return [];
  }
  return (data ?? [])
    .filter((r): r is typeof r & { slug: string } =>
      typeof r.slug === 'string' && SLUG_PATTERN.test(r.slug) && r.hidden !== true,
    )
    .map((r) => ({
      trip_id: r.trip_id,
      slug: r.slug,
      previous_slugs: Array.isArray(r.previous_slugs)
        ? r.previous_slugs.filter((s: unknown): s is string => typeof s === 'string' && SLUG_PATTERN.test(s))
        : [],
    }));
}

// Strict route guard: static routes are hardcoded, and dynamic /explore/{slug}
// routes only reach here after the slug has matched SLUG_PATTERN. Anything else
// is refused so no untrusted string can shape a filesystem write.
const STATIC_ROUTE_SET = new Set(STATIC_ROUTES);
const EXPLORE_SLUG_ROUTE = /^\/explore\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isSafeRoute(route: string): boolean {
  return STATIC_ROUTE_SET.has(route) || EXPLORE_SLUG_ROUTE.test(route);
}

async function prerenderRoute(browser: Browser, origin: string, route: string) {
  if (!isSafeRoute(route)) {
    throw new Error(`[prerender] Refusing to render unsafe route: ${route}`);
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const url = `${origin}${route}`;
  console.log(`[prerender] Rendering ${url}`);

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

  // Allow helmet/async renders to settle
  await new Promise((r) => setTimeout(r, 500));

  // The app writes measured layout variables (--app-height, --app-nav-h, the
  // trip hero bounds) inline on <html>. Snapshotting them would hand every
  // visitor this 1280x800 browser's numbers on first paint, 8px too tall a
  // header on a phone. The stylesheet defaults are right at every width, and
  // the app re-measures on boot.
  await page.evaluate(() => document.documentElement.removeAttribute('style'));

  const html = await page.content();
  await page.close();

  const outDir =
    route === '/' ? DIST_DIR : path.join(DIST_DIR, route.replace(/^\//, ''));
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'index.html');
  fs.writeFileSync(outFile, html, 'utf8');
  console.log(`[prerender] Wrote ${outFile}`);
}

async function main() {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    console.error('[prerender] dist/index.html not found — run `vite build` first.');
    process.exit(1);
  }

  const publicTrips = await fetchPublicTrips();
  const tripRoutes = publicTrips.map((t) => `/explore/${t.slug}`);
  const routesToPrerender = [...STATIC_ROUTES, ...tripRoutes];

  // Emit UUID → slug redirects map for the Express server's 301 handler.
  const redirects: Record<string, string> = {};
  for (const trip of publicTrips) {
    redirects[trip.trip_id.toLowerCase()] = trip.slug;
  }
  fs.writeFileSync(
    path.join(DIST_DIR, 'redirects.json'),
    JSON.stringify(redirects, null, 2),
    'utf8',
  );
  console.log(`[prerender] Wrote redirects.json with ${Object.keys(redirects).length} entries.`);

  // Old slug → current slug, so a renamed itinerary keeps the URL Google
  // already indexed (server/index.ts turns these into 301s). A slug that is
  // live for another trip is never a redirect source.
  const liveSlugs = new Set(publicTrips.map((t) => t.slug));
  const slugRedirects: Record<string, string> = {};
  for (const trip of publicTrips) {
    for (const old of trip.previous_slugs) {
      if (old !== trip.slug && !liveSlugs.has(old)) slugRedirects[old] = trip.slug;
    }
  }
  fs.writeFileSync(
    path.join(DIST_DIR, 'slug-redirects.json'),
    JSON.stringify(slugRedirects, null, 2),
    'utf8',
  );
  console.log(`[prerender] Wrote slug-redirects.json with ${Object.keys(slugRedirects).length} entries.`);

  // Use Vite's programmatic preview server to serve dist/ — safer than a
  // hand-rolled static server and avoids user-input-to-path expressions.
  const server = await preview({
    preview: { port: PORT, host: '127.0.0.1', strictPort: true },
  });
  const origin = `http://127.0.0.1:${PORT}`;
  console.log(`[prerender] Preview server listening on ${origin}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const route of routesToPrerender) {
      try {
        await prerenderRoute(browser, origin, route);
      } catch (err) {
        console.warn(`[prerender] Failed to render ${route}:`, err);
      }
    }
  } finally {
    await browser.close();
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
  }

  console.log(`[prerender] Done. Rendered ${routesToPrerender.length} routes.`);
}

main().catch((err) => {
  console.error('[prerender] Failed:', err);
  // Don't fail the build — prerendering is an enhancement
  process.exit(0);
});
