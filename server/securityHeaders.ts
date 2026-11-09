import helmet from 'helmet';

// The site's security headers (CSP and the rest of helmet's set). Express
// applies this to every response it serves. On Vercel the CDN serves the
// static bundle and prerendered HTML without touching Express, so
// scripts/build-vercel-output.ts runs this same middleware once at build time
// and copies the headers it sets into the CDN routes. Edit the policy here and
// both paths pick it up.
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://www.googletagmanager.com", "https://www.google-analytics.com", "https://us-assets.i.posthog.com", "https://creator.expediagroup.com", "https://*.expediagroup.com", "https://maps.googleapis.com", "https://maps.gstatic.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      // Maps JS builds vector tiles in blob: workers.
      workerSrc: ["'self'", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://*.expediagroup.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://*.expediagroup.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://plus.unsplash.com", "https://*.supabase.co", "https://maps.googleapis.com", "https://lh3.googleusercontent.com", "https://places.googleapis.com", "https://www.googletagmanager.com", "https://www.google-analytics.com", "https://*.replit.dev", "https://*.repl.co", "https://*.replit.app", "https://*.expediagroup.com", "https://*.expedia.com", "https://res.cloudinary.com", "https://*.googleapis.com", "https://*.gstatic.com", "https://*.ggpht.com"],
      connectSrc: ["'self'", "blob:", "https://*.supabase.co", "wss://*.supabase.co", "https://api.stripe.com", "https://maps.googleapis.com", "https://places.googleapis.com", "https://www.google-analytics.com", "https://region1.google-analytics.com", "https://www.googletagmanager.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://images.unsplash.com", "https://plus.unsplash.com", "https://lh3.googleusercontent.com", "https://ipapi.co", "https://us.i.posthog.com", "https://us-assets.i.posthog.com", "https://*.replit.dev", "wss://*.replit.dev", "https://*.repl.co", "wss://*.repl.co", "https://*.replit.app", "wss://*.replit.app", "https://*.expediagroup.com", "https://*.expedia.com", "https://*.googleapis.com", "https://*.gstatic.com"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://*.expediagroup.com", "https://*.expedia.com"],
      frameAncestors: ["'self'", "https://*.replit.dev", "https://*.repl.co", "https://*.replit.app"],
    },
  },
  // COEP disabled: any COEP value (require-corp or credentialless) blocks the
  // cross-origin Expedia widget iframe, whose responses carry no CORP/COEP
  // headers. Nothing in the app needs crossOriginIsolated (no SharedArrayBuffer).
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});
