// WCAG AA color-contrast scan of the rendered app (axe-core `color-contrast`).
//
//   npm run contrast                          # starts its own Vite dev server (reads .env)
//   npm run contrast -- --url https://wanderluxe.io
//   npm run contrast -- /trip/<id> /budget    # extra routes (signed-out view only)
//
// Scans every route at desktop (1280) and phone (390) widths, light mode only
// (nothing ships the `dark` class). Fails with exit 1 on any contrast failure.
// "needs review" nodes (text over photos, gradients, overlaps) are reported but
// never fail the run: axe can't compute a ratio for them. Full results are
// written to node_modules/.cache/wanderluxe-contrast.json.
//
// Browser: puppeteer's Chrome, or PUPPETEER_EXECUTABLE_PATH. HTTPS_PROXY is
// passed to Chrome, since Chrome ignores it otherwise.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import puppeteer, { type Page } from 'puppeteer';
import { createServer, type ViteDevServer } from 'vite';
import { formatReport, type ContrastNode, type PageResult } from './contrastReport';

const STATIC_ROUTES = [
  '/',
  '/auth',
  '/auth/forgot-password',
  '/explore',
  '/guide',
  '/about',
  '/terms',
  '/privacy',
  '/no-such-page', // NotFound
];
const SHOWCASE_TRIPS = 3; // /explore/<slug> pages discovered from /explore
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const OUT = path.resolve('node_modules/.cache/wanderluxe-contrast.json');

const require = createRequire(import.meta.url);
const AXE_SOURCE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

function parseArgs(argv: string[]): { url?: string; routes: string[] } {
  let url: string | undefined;
  const routes: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--url') url = argv[++i];
    else if (arg.startsWith('--url=')) url = arg.slice('--url='.length);
    else if (arg.startsWith('/')) routes.push(arg);
    else throw new Error(`Unknown argument "${arg}". Routes start with "/"; use --url <base> to scan a deployed site.`);
  }
  return { url: url?.replace(/\/$/, ''), routes };
}

async function startVite(): Promise<{ server: ViteDevServer; url: string }> {
  const server = await createServer({
    server: { host: '127.0.0.1', port: 8095, strictPort: false },
    logLevel: 'error',
    clearScreen: false,
  });
  await server.listen();
  const url = server.resolvedUrls?.local[0]?.replace(/\/$/, '');
  if (!url) throw new Error('Vite dev server did not report a local URL');
  return { server, url };
}

async function settle(page: Page): Promise<void> {
  // Scroll through once so whileInView / fade-up sections reach their final colors.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 1500));
}

async function open(page: Page, url: string): Promise<void> {
  // A page that keeps a socket open (realtime, analytics) never goes idle; scan what rendered.
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }).catch((err: Error) => {
    if (!/timeout/i.test(err.message)) throw err;
  });
  const rendered = await page.evaluate(() => (document.getElementById('root')?.childElementCount ?? 0) > 0);
  if (!rendered) throw new Error('app did not render (missing .env? see the browser console)');
  await settle(page);
}

// Runs inside the page. Kept as a string because tsx/esbuild wraps named
// functions in a `__name()` helper that doesn't exist in the browser, which
// breaks any function puppeteer serializes from this file.
const RUN_AXE = `(async () => {
  const result = await window.axe.run(document, {
    runOnly: { type: 'rule', values: ['color-contrast'] },
    resultTypes: ['violations', 'incomplete'],
  });
  const pick = (rules, kind) => rules.flatMap((rule) => rule.nodes.map((n) => {
    const d = (n.any[0] && n.any[0].data) || {};
    return {
      kind,
      target: n.target.join(' '),
      html: n.html.slice(0, 220),
      fg: d.fgColor,
      bg: d.bgColor,
      ratio: d.contrastRatio,
      required: d.expectedContrastRatio,
      fontSize: d.fontSize,
      fontWeight: d.fontWeight,
      reason: d.messageKey || null,
    };
  }));
  return [...pick(result.violations, 'fail'), ...pick(result.incomplete, 'needs-review')];
})()`;

async function scanPage(page: Page, url: string): Promise<ContrastNode[]> {
  await open(page, url);
  await page.addScriptTag({ content: AXE_SOURCE });
  return (await page.evaluate(RUN_AXE)) as ContrastNode[];
}

async function discoverShowcaseRoutes(page: Page, base: string): Promise<string[]> {
  try {
    await open(page, `${base}/explore`);
    const paths = await page.$$eval('a[href^="/explore/"]', (as) =>
      as.map((a) => new URL((a as HTMLAnchorElement).href).pathname),
    );
    return [...new Set(paths)].slice(0, SHOWCASE_TRIPS);
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  const { url, routes: extraRoutes } = parseArgs(process.argv.slice(2));
  const vite = url ? null : await startVite();
  const base = url ?? vite!.url;

  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      ...(proxy ? [`--proxy-server=${proxy}`, '--proxy-bypass-list=localhost;127.0.0.1'] : []),
    ],
  });

  const results: PageResult[] = [];
  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.setViewport({ width: VIEWPORTS[0].width, height: VIEWPORTS[0].height });

    const showcase = await discoverShowcaseRoutes(page, base);
    if (!showcase.length) console.warn('[contrast] No showcase trips found on /explore (Supabase unreachable?); skipping trip pages.');
    const routes = [...new Set([...STATIC_ROUTES, ...showcase, ...extraRoutes])];
    console.log(`[contrast] Scanning ${routes.length} routes x ${VIEWPORTS.length} viewports at ${base}`);

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      for (const route of routes) {
        try {
          results.push({ route, viewport: vp.name, nodes: await scanPage(page, base + route) });
        } catch (err) {
          results.push({ route, viewport: vp.name, error: (err as Error).message.slice(0, 200) });
        }
      }
    }
  } finally {
    await browser.close();
    await vite?.server.close();
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));

  const report = formatReport(results);
  console.log(`\n${report.text}\n\nFull results: ${path.relative(process.cwd(), OUT)}`);
  if (report.failures > 0 || report.errors > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[contrast]', err);
  process.exit(1);
});
