import puppeteer, { type Browser } from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { preview } from 'vite';

const ROUTES_TO_PRERENDER = ['/', '/explore', '/about', '/terms', '/privacy'];
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const PORT = Number(process.env.PRERENDER_PORT || 4173);

async function prerenderRoute(browser: Browser, origin: string, route: string) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const url = `${origin}${route}`;
  console.log(`[prerender] Rendering ${url}`);

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

  // Allow helmet/async renders to settle
  await new Promise((r) => setTimeout(r, 500));

  const html = await page.content();
  await page.close();

  // Derived path is built from the hardcoded ROUTES_TO_PRERENDER list only.
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
    for (const route of ROUTES_TO_PRERENDER) {
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

  console.log('[prerender] Done.');
}

main().catch((err) => {
  console.error('[prerender] Failed:', err);
  // Don't fail the build — prerendering is an enhancement
  process.exit(0);
});
