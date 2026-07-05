import 'dotenv/config';
import puppeteer, { type Browser } from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { preview } from 'vite';
import { createClient } from '@supabase/supabase-js';

const STATIC_ROUTES = ['/', '/explore', '/about', '/terms', '/privacy'];
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const PORT = Number(process.env.PRERENDER_PORT || 4173);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function fetchPublicTrips(): Promise<Array<{ trip_id: string; slug: string }>> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('[prerender] VITE_SUPABASE_URL/ANON_KEY missing — skipping per-trip prerender.');
    return [];
  }
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('trips')
    .select('trip_id, slug')
    .eq('is_public', true)
    .not('slug', 'is', null);
  if (error) {
    console.warn('[prerender] Could not fetch public trips:', error.message);
    return [];
  }
  return (data ?? [])
    .filter((r): r is { trip_id: string; slug: string } =>
      typeof r.slug === 'string' && SLUG_PATTERN.test(r.slug)
    );
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
