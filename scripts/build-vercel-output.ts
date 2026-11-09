/**
 * Turns `npm run build`'s dist/ into Vercel's Build Output API layout
 * (.vercel/output). Run after the normal build: `npm run build:vercel`.
 *
 *   static/                 the Vite bundle + prerendered HTML, served by the CDN
 *   functions/server.func/  server/app.ts bundled into one ESM file, plus the
 *                           dist/ HTML + JSON it reads at runtime
 *   config.json             routing: Express-owned paths → server, prerendered
 *                           pages → their HTML, everything else → index.html
 *
 * The CDN never runs Express, so the headers Express would add are copied in
 * here: helmet's security headers (captured by running the real middleware,
 * so server/securityHeaders.ts stays the one source) and the cache policy
 * from cacheControlFor() in server/app.ts.
 */
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response } from 'express';
import { securityHeaders } from '../server/securityHeaders';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, '.vercel', 'output');
const STATIC_OUT = path.join(OUT, 'static');
const FUNC_NAME = 'server';
const FUNC_OUT = path.join(OUT, 'functions', `${FUNC_NAME}.func`);
const SERVER = `/${FUNC_NAME}`;

// Files the Express app reads from dist/ at runtime: index.html for the SPA
// fallback, prerendered pages, redirects.json + slug-redirects.json for the
// legacy 301s, and the build-time sitemap.xml/llms.txt fallbacks.
const FUNCTION_DIST_FILE = /\.(html|json|xml|txt)$/;

const ONE_YEAR = 60 * 60 * 24 * 365;
const ONE_WEEK = 60 * 60 * 24 * 7;
const ONE_HOUR = 60 * 60;

function walk(dir: string, rel = ''): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...walk(dir, relPath));
    else files.push(relPath);
  }
  return files;
}

function copy(from: string, to: string): void {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

/** Run helmet once against a stub response and keep what it sets. */
function captureSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const res = {
    setHeader(name: string, value: string | number | readonly string[]) {
      headers[name] = Array.isArray(value) ? value.join(', ') : String(value);
    },
    removeHeader() {},
    getHeader(name: string) {
      return headers[name];
    },
  } as unknown as Response;
  let nextCalled = false;
  securityHeaders({ method: 'GET', headers: {} } as Request, res, (err?: unknown) => {
    if (err) throw err;
    nextCalled = true;
  });
  if (!nextCalled || !headers['Content-Security-Policy']) {
    throw new Error('[vercel-output] helmet did not produce a Content-Security-Policy header');
  }
  return headers;
}

async function main(): Promise<void> {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    throw new Error('[vercel-output] dist/index.html missing: run `npm run build` first');
  }
  fs.rmSync(OUT, { recursive: true, force: true });

  // 1. Static files. dist/server is the Replit/Cloud Run bundle; not served.
  const distFiles = walk(DIST).filter((f) => !f.startsWith('server/'));
  for (const file of distFiles) copy(path.join(DIST, file), path.join(STATIC_OUT, file));

  // 2. The Express app as one function. Everything is bundled, so the
  //    function needs no node_modules.
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'server', 'app.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    outfile: path.join(FUNC_OUT, 'index.mjs'),
    banner: {
      js: [
        "import { createRequire as __wlCreateRequire } from 'module';",
        "import { fileURLToPath as __wlFileURLToPath } from 'url';",
        "import { dirname as __wlDirname } from 'path';",
        'const require = __wlCreateRequire(import.meta.url);',
        'const __filename = __wlFileURLToPath(import.meta.url);',
        'const __dirname = __wlDirname(__filename);',
      ].join('\n'),
    },
    logLevel: 'warning',
  });
  // The app resolves dist/ from process.cwd(), which is the function root.
  for (const file of distFiles.filter((f) => FUNCTION_DIST_FILE.test(f))) {
    copy(path.join(DIST, file), path.join(FUNC_OUT, 'dist', file));
  }
  const nodeMajor = process.versions.node.split('.')[0];
  fs.writeFileSync(
    path.join(FUNC_OUT, '.vc-config.json'),
    JSON.stringify(
      {
        runtime: `nodejs${nodeMajor}.x`,
        handler: 'index.mjs',
        launcherType: 'Nodejs',
        // Express parses its own bodies; Vercel's helpers would get in the way
        // of the raw body the Stripe webhook verifies.
        shouldAddHelpers: false,
        // AI chat streams SSE.
        supportsResponseStreaming: true,
        maxDuration: 300,
      },
      null,
      2,
    ),
  );

  // 3. Routing.
  // Prerendered pages (dist/<route>/index.html) are served straight from the
  // CDN. Only pages that exist get a route, so a failed prerender falls
  // through to the SPA instead of 404ing.
  const prerendered = distFiles
    .filter((f) => f.endsWith('/index.html'))
    .map((f) => f.slice(0, -'/index.html'.length))
    .filter((route) => /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(route))
    .sort();

  const routes = [
    // Headers first, with continue so routing carries on.
    { src: '^/.*$', headers: captureSecurityHeaders(), continue: true },
    {
      src: '^/(?!assets/).*\\.(?:png|jpe?g|webp|gif|svg|ico|ttf|woff2?)$',
      headers: { 'Cache-Control': `public, max-age=${ONE_WEEK}` },
      continue: true,
    },
    {
      src: '^/robots\\.txt$',
      headers: { 'Cache-Control': `public, max-age=${ONE_HOUR}` },
      continue: true,
    },
    {
      src: '^/(?:sw\\.js|version\\.json|manifest\\.json)$',
      headers: { 'Cache-Control': 'no-cache' },
      continue: true,
    },
    {
      src: '^/assets/.*$',
      headers: { 'Cache-Control': `public, max-age=${ONE_YEAR}, immutable` },
      continue: true,
    },
    // Express-owned paths. Ahead of the filesystem so the live sitemap.xml and
    // llms.txt win over the build-time copies in static/.
    {
      src: '^/(?:api(?:/.*)?|mcp/?|\\.well-known/oauth-protected-resource(?:/.*)?|sitemap\\.xml|llms\\.txt|invite/[^/]+/?)$',
      dest: SERVER,
    },
    ...prerendered.map((route) => ({ src: `^/${route}/?$`, dest: `/${route}/index.html` })),
    { handle: 'filesystem' },
    // /trip/{uuid} and renamed /explore/{slug} 301s live in Express
    // (redirects.json, slug-redirects.json); it serves the SPA otherwise.
    { src: '^/(?:trip|explore)(?:/.*)?$', dest: SERVER },
    // SPA fallback.
    { src: '^/.*$', dest: '/index.html' },
  ];

  fs.writeFileSync(path.join(OUT, 'config.json'), JSON.stringify({ version: 3, routes }, null, 2));

  console.log(
    `[vercel-output] ${distFiles.length} static files, ${prerendered.length} prerendered routes, ` +
      `function ${FUNC_NAME} on nodejs${nodeMajor}.x`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
