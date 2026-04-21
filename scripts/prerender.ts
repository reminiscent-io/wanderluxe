import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const ROUTES_TO_PRERENDER = ['/', '/explore', '/about', '/terms', '/privacy'];
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const PORT = Number(process.env.PRERENDER_PORT || 4173);

function mimeTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': case '.mjs': return 'application/javascript';
    case '.css': return 'text/css';
    case '.json': return 'application/json';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.ico': return 'image/x-icon';
    case '.woff': return 'font-woff';
    case '.woff2': return 'font-woff2';
    case '.txt': return 'text/plain';
    case '.xml': return 'application/xml';
    default: return 'application/octet-stream';
  }
}

function startStaticServer() {
  return new Promise<{ close: () => Promise<void> }>((resolve, reject) => {
    const server = createServer((req, res) => {
      const rawUrl = (req.url || '/').split('?')[0];
      // Decode and strip leading slashes; block any traversal before joining.
      let decoded: string;
      try {
        decoded = decodeURIComponent(rawUrl);
      } catch {
        res.statusCode = 400;
        res.end('Bad request');
        return;
      }
      const indexFile = path.join(DIST_DIR, 'index.html');
      let filePath = indexFile;
      if (!decoded.includes('\0') && !decoded.split(/[\\/]+/).includes('..')) {
        const candidate = path.resolve(DIST_DIR, `.${decoded}`);
        if (
          (candidate === DIST_DIR || candidate.startsWith(DIST_DIR + path.sep)) &&
          fs.existsSync(candidate) &&
          !fs.statSync(candidate).isDirectory()
        ) {
          filePath = candidate;
        }
      }
      try {
        const contents = fs.readFileSync(filePath);
        res.setHeader('Content-Type', mimeTypeFor(filePath));
        res.end(contents);
      } catch {
        res.statusCode = 404;
        res.end('Not found');
      }
    });

    server.on('error', reject);
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[prerender] Static server listening on http://127.0.0.1:${PORT}`);
      resolve({
        close: () =>
          new Promise<void>((ok, fail) =>
            server.close((err) => (err ? fail(err) : ok())),
          ),
      });
    });
  });
}

async function prerenderRoute(browser: puppeteer.Browser, route: string) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const url = `http://127.0.0.1:${PORT}${route}`;
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

  const staticServer = await startStaticServer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const route of ROUTES_TO_PRERENDER) {
      try {
        await prerenderRoute(browser, route);
      } catch (err) {
        console.warn(`[prerender] Failed to render ${route}:`, err);
      }
    }
  } finally {
    await browser.close();
    await staticServer.close();
  }

  console.log('[prerender] Done.');
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? '');

if (isMain) {
  main().catch((err) => {
    console.error('[prerender] Failed:', err);
    // Don't fail the build — prerendering is an enhancement
    process.exit(0);
  });
}
