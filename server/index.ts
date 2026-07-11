import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';
import { registerRoutes } from './routes';

const app = express();

// Trust first proxy (Replit, Cloudflare, etc.) for accurate rate limiting
app.set('trust proxy', 1);

// Canonical host enforcement: collapse www → apex and http → https for the
// production domain with a single 301, so Google sees one canonical origin
// (https://wanderluxe.io) instead of indexing duplicate homepage variants.
// Scoped to wanderluxe.io only, so Replit preview domains, Cloud Run health
// checks, and localhost are untouched. GET/HEAD only — never redirect API
// writes or CORS preflight.
const CANONICAL_HOST = 'wanderluxe.io';
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  // Strip any port so wanderluxe.io:443 still matches the canonical apex.
  const host = (req.headers.host || '').toLowerCase().split(':')[0];
  if (host !== CANONICAL_HOST && host !== `www.${CANONICAL_HOST}`) return next();
  const proto = ((req.headers['x-forwarded-proto'] as string | undefined) || req.protocol || '')
    .split(',')[0]
    .trim();
  const needsHttps = proto === 'http';
  const needsApex = host.startsWith('www.');
  if (needsHttps || needsApex) {
    // Re-anchor on the hardcoded canonical origin, carrying over only the path +
    // query parsed from the (untrusted) request URL. Reading .pathname/.search
    // discards any host the input might smuggle in — protocol-relative ("//host")
    // and backslash forms resolve away, and an absolute URL's host is dropped — so
    // the redirect target's host is never user-controlled. Closes CodeQL
    // js/server-side-unvalidated-url-redirection.
    const { pathname, search } = new URL(req.originalUrl, `https://${CANONICAL_HOST}`);
    return res.redirect(301, `https://${CANONICAL_HOST}${pathname}${search}`);
  }
  next();
});

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:5001'];

// The wanderluxe.io pattern must be anchored so the domain is either the apex
// (preceded by the scheme separator `//`) or a true subdomain (preceded by `.`).
// A bare `wanderluxe\.io$` would also match attacker domains like
// `evilwanderluxe.io`, which combined with `credentials: true` would leak
// authenticated responses. (The replit patterns already require a leading `.`.)
const allowedOriginPatterns = [/\.replit\.dev(:\d+)?$/, /\.repl\.co(:\d+)?$/, /(\/\/|\.)wanderluxe\.io(:\d+)?$/];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, mobile apps, same-origin)
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (allowedOriginPatterns.some(pattern => pattern.test(origin))) return callback(null, true);
    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://www.googletagmanager.com", "https://www.google-analytics.com", "https://us-assets.i.posthog.com", "https://creator.expediagroup.com", "https://*.expediagroup.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://*.expediagroup.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://*.expediagroup.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://plus.unsplash.com", "https://*.supabase.co", "https://maps.googleapis.com", "https://lh3.googleusercontent.com", "https://places.googleapis.com", "https://www.googletagmanager.com", "https://www.google-analytics.com", "https://*.replit.dev", "https://*.repl.co", "https://*.replit.app", "https://*.expediagroup.com", "https://*.expedia.com", "https://res.cloudinary.com"],
      connectSrc: ["'self'", "blob:", "https://*.supabase.co", "wss://*.supabase.co", "https://api.stripe.com", "https://maps.googleapis.com", "https://places.googleapis.com", "https://www.google-analytics.com", "https://region1.google-analytics.com", "https://www.googletagmanager.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://images.unsplash.com", "https://plus.unsplash.com", "https://lh3.googleusercontent.com", "https://ipapi.co", "https://us.i.posthog.com", "https://us-assets.i.posthog.com", "https://*.replit.dev", "wss://*.replit.dev", "https://*.repl.co", "wss://*.repl.co", "https://*.replit.app", "wss://*.replit.app", "https://*.expediagroup.com", "https://*.expedia.com"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://*.expediagroup.com", "https://*.expedia.com"],
      frameAncestors: ["'self'", "https://*.replit.dev", "https://*.repl.co", "https://*.replit.app"],
    },
  },
  // COEP disabled: any COEP value (require-corp or credentialless) blocks the
  // cross-origin Expedia widget iframe, whose responses carry no CORP/COEP
  // headers. Nothing in the app needs crossOriginIsolated (no SharedArrayBuffer).
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// Rate limiting to prevent DoS attacks
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
});

// Apply rate limiting to API routes only (not static files)
app.use('/api', generalLimiter);

registerRoutes(app);

// Simple health check route
app.get('/api/health', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

// Serve static files and handle SPA routing
const distPath = path.resolve(process.cwd(), 'dist');
const indexPath = path.join(distPath, 'index.html');

// Routes that may have prerendered HTML emitted by scripts/prerender.ts.
// A switch statement (below) maps request paths to hardcoded filenames so
// no user-controlled string ever reaches the filesystem.
const prerenderedExplore = path.join(distPath, 'explore', 'index.html');
const prerenderedAbout = path.join(distPath, 'about', 'index.html');
const prerenderedTerms = path.join(distPath, 'terms', 'index.html');
const prerenderedPrivacy = path.join(distPath, 'privacy', 'index.html');

// Build the allow-list of /explore/{slug} prerendered slugs by scanning dist/explore/*/index.html.
// Membership check + strict slug regex means no user-controlled path can ever escape this set.
const exploreSlugs = new Set<string>();
try {
  const exploreDir = path.join(distPath, 'explore');
  if (fs.existsSync(exploreDir) && fs.statSync(exploreDir).isDirectory()) {
    for (const entry of fs.readdirSync(exploreDir, { withFileTypes: true })) {
      if (
        entry.isDirectory() &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name) &&
        fs.existsSync(path.join(exploreDir, entry.name, 'index.html'))
      ) {
        exploreSlugs.add(entry.name);
      }
    }
  }
} catch (err) {
  console.warn('[server] Failed to scan prerendered /explore slugs:', err);
}

// UUID → slug redirect map, emitted by scripts/prerender.ts at build time.
// Used to issue 301 redirects from legacy /trip/{uuid} URLs to /explore/{slug}.
let uuidToSlug: Record<string, string> = {};
try {
  const redirectsPath = path.join(distPath, 'redirects.json');
  if (fs.existsSync(redirectsPath)) {
    const parsed = JSON.parse(fs.readFileSync(redirectsPath, 'utf8'));
    if (parsed && typeof parsed === 'object') {
      uuidToSlug = parsed as Record<string, string>;
    }
  }
} catch (err) {
  console.warn('[server] Failed to load redirects.json:', err);
}

const UUID_TRIP_PATH = /^\/trip\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/.*)?$/i;
const EXPLORE_SLUG_PATH = /^\/explore\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

function prerenderedFileFor(normalizedPath: string): string | null {
  switch (normalizedPath) {
    case '/explore': return prerenderedExplore;
    case '/about': return prerenderedAbout;
    case '/terms': return prerenderedTerms;
    case '/privacy': return prerenderedPrivacy;
  }
  const exploreMatch = EXPLORE_SLUG_PATH.exec(normalizedPath);
  if (exploreMatch && exploreSlugs.has(exploreMatch[1])) {
    return path.join(distPath, 'explore', exploreMatch[1], 'index.html');
  }
  return null;
}

// Check if dist folder exists and serve static files
if (fs.existsSync(distPath)) {
  // redirect:false so canonical no-trailing-slash routes (e.g. /explore/{slug},
  // matching the sitemap + <link rel="canonical">) fall through to the
  // SPA/prerender handler below and are served directly, instead of serve-static
  // 301-redirecting them to a trailing-slash variant the canonical tag never
  // points to. Static asset files (with extensions) are unaffected.
  app.use(express.static(distPath, { redirect: false }));

  // 301-redirect legacy /trip/{uuid} URLs for public trips to their /explore/{slug} canonical.
  app.get(/^\/trip\/[0-9a-fA-F-]+(?:\/.*)?$/, (req, res, next) => {
    const match = UUID_TRIP_PATH.exec(req.path);
    if (!match) return next();
    const slug = uuidToSlug[match[1].toLowerCase()];
    if (!slug) return next();
    const suffix = match[2] ?? '';
    return res.redirect(301, `/explore/${slug}${suffix}`);
  });

  // Handle SPA routing - prefer prerendered HTML for known public routes,
  // fall back to index.html for everything else (client-side routing).
  // Use regex pattern compatible with Express 5.x
  app.get(/^(?!\/api).*$/, (req, res) => {
    const normalizedPath = (req.path || '/').replace(/\/$/, '') || '/';
    const prerenderedPath = prerenderedFileFor(normalizedPath);

    if (prerenderedPath && fs.existsSync(prerenderedPath)) {
      return res.sendFile(prerenderedPath);
    }

    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(503).send('Application is starting up. Please try again in a moment.');
    }
  });
} else if (process.env.NODE_ENV === 'production') {
  // In production without dist folder, return helpful message
  app.get(/^(?!\/api).*$/, (req, res) => {
    res.status(503).send('Application build not found. Please run "npm run build" first.');
  });
}

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Cloud Run sets PORT env var; fall back to 5001 (5000 used by macOS AirPlay)
const PORT = process.env.PORT || 5001;
const httpServer = createServer(app);

// Start server on 0.0.0.0 to accept external connections
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Static files: ${fs.existsSync(distPath) ? 'Available' : 'Not found'}`);
});

export default httpServer;