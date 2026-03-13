# WanderLuxe Security Audit Report

**Date:** 2026-03-13
**Scope:** Full-stack application security review
**Auditor:** Automated Security Analysis (Claude Code)

---

## Executive Summary

A comprehensive security audit of the WanderLuxe travel planning platform identified **6 Critical**, **8 High**, **6 Medium**, and **5 Low** severity issues across the full stack. The application demonstrates solid baseline security practices (Supabase RLS, JWT auth, no hardcoded secrets), but has significant gaps in CORS configuration, input validation, XSS prevention, and server hardening.

**Overall Security Posture: MODERATE - Requires remediation before handling sensitive user data at scale.**

---

## Findings Summary

| Severity | Count | Categories |
|----------|-------|------------|
| CRITICAL | 6 | CORS, SSRF, XSS, Webhook idempotency |
| HIGH | 8 | Input validation, URL validation, rate limiting, TypeScript config |
| MEDIUM | 6 | Security headers, logging, cache poisoning, prompt injection |
| LOW | 5 | Email validation, env validation, ESLint config |

---

## CRITICAL Findings

### C1. Open CORS on All Edge Functions
**Files:** `supabase/functions/_shared/cors.ts`, all Edge Function `index.ts` files
**Impact:** Any website can call your API endpoints on behalf of authenticated users

All Edge Functions use wildcard CORS:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // Open to everyone
};
```

**Risk:** Cross-origin attacks, API abuse, CSRF on authenticated endpoints.

**Fix:** Restrict to your domain(s):
```typescript
const ALLOWED_ORIGINS = ['https://wanderluxe.io', 'https://www.wanderluxe.io'];
const origin = req.headers.get('origin');
const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
```

---

### C2. Open CORS on Express Server
**File:** `server/index.ts:15`

```typescript
app.use(cors());  // No restrictions - allows any origin
```

**Fix:**
```typescript
app.use(cors({
  origin: ['https://wanderluxe.io', 'https://www.wanderluxe.io'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
```

---

### C3. SSRF Vulnerability in URL Metadata Fetcher
**File:** `supabase/functions/fetch-url-metadata/index.ts`

The function fetches arbitrary user-supplied URLs without validation:
```typescript
const response = await fetch(url);  // No validation!
```

**Risk:** Attackers can access internal services (`localhost`, `192.168.x.x`, `10.x.x.x`), scan ports, or cause DoS.

**Fix:**
```typescript
function isUrlSafe(urlStr: string): boolean {
  const url = new URL(urlStr);
  const blocked = [/^localhost$/i, /^127\./, /^192\.168\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./];
  return !blocked.some(p => p.test(url.hostname)) && ['http:', 'https:'].includes(url.protocol);
}
```

---

### C4. XSS via Unsanitized Google Places HTML Attributions
**Files:**
- `src/components/trip/accommodation/AccommodationForm.tsx:505`
- `src/components/trip/dining/RestaurantReservationForm.tsx:389`
- `src/components/trip/_shared/PhotoStrip.tsx:160`

```typescript
dangerouslySetInnerHTML={{ __html: attribution }}  // No sanitization!
```

**Risk:** If Google Places API responses are intercepted (MITM) or compromised, arbitrary JavaScript executes in users' browsers. DOMPurify v3.3.1 is already in your dependencies but unused here.

**Fix:**
```typescript
import DOMPurify from 'dompurify';
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(attribution) }}
```

---

### C5. Unvalidated Restaurant Website URL Field
**File:** `src/components/trip/dining/RestaurantReservationForm.tsx:74`

```typescript
website: z.string().optional().nullable(),  // No URL validation
```

Compare with hotel URL which is properly validated:
```typescript
hotel_url: z.string().url().optional().or(z.literal("")),  // Correct
```

**Risk:** Users can enter `javascript:alert('XSS')` as a website URL. When collaborators click it, JavaScript executes.

**Fix:**
```typescript
website: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
```

---

### C6. Stripe Webhook Missing Idempotency Protection
**File:** `server/routes/stripe.ts` (lines 319-367)

Signature verification is present, but there's no protection against replayed events:
```typescript
const event = await stripeClient.webhooks.constructEventAsync(req.body, sig, webhookSecret);
// No idempotency check - event could be processed twice!
switch (event.type) {
  case 'checkout.session.completed':
    await handleCheckoutCompleted(sb, event);  // Could run twice!
```

**Risk:** Duplicate payment processing, inconsistent subscription state.

**Fix:** Store `event.id` in a `webhook_events` table with a unique constraint. Check if event was already processed before handling.

---

## HIGH Findings

### H1. Missing URL Protocol Whitelist for Rendered Links
**Files:** `src/components/trip/dining/RestaurantCard.tsx:32-40`, `src/components/trip/accommodation/HotelStayCard.tsx:84`

Links only check for `tel:` protocol but allow `javascript:`, `data:`, `vbscript:`:
```typescript
<a href={href} target={href.startsWith('tel:') ? undefined : "_blank"}>
```

**Fix:** Create a URL validation utility:
```typescript
function isValidUrl(url: string): boolean {
  try { return ['http:', 'https:', 'tel:', 'mailto:'].includes(new URL(url).protocol); }
  catch { return false; }
}
```

---

### H2. Google Places Photo Proxy - No Auth, No Size Limits
**File:** `supabase/functions/google-places-proxy/index.ts`

- Photo proxy allows unauthenticated access with only in-memory rate limiting (lost on restart)
- No validation of `maxwidth`/`maxheight` parameters (attacker can request enormous images)
- No Content-Length check before proxying

**Fix:** Validate dimensions (`Math.min(parseInt(maxwidth), 1200)`) and add persistent rate limiting.

---

### H3. Insufficient Input Validation on Admin Insights Endpoint
**File:** `server/routes/admin-insights.ts:188-192`

Only one field validated out of an entire metrics payload:
```typescript
if (typeof metrics.userCount !== 'number') { ... }
// All other fields unchecked!
```

**Fix:** Use Zod schema to validate the complete `AdminMetricsPayload`.

---

### H4. Missing Message Length Validation in AI Chat
**File:** `server/routes/ai-chat.ts:813-816`

No max length on messages sent to OpenAI:
```typescript
if (!message || typeof message !== 'string' || message.trim().length === 0) { ... }
// No max length check - user can send 1GB message
```

**Fix:** Add `if (message.length > 5000) return res.status(413).json({ error: 'Message too long' });`

---

### H5. Loose TypeScript Configuration
**File:** `tsconfig.app.json:18-22`

```json
"strict": false,
"noImplicitAny": false,
"noUnusedParameters": false,
"noFallthroughCasesInSwitch": false
```

**Risk:** Type errors that could catch null pointer dereferences, incorrect assignments, and logic bugs are silently ignored.

**Fix:** Enable `"strict": true` and incrementally fix type errors.

---

### H6. Missing Rate Limiting on Stripe Payment Endpoints
**File:** `server/routes/stripe.ts`

Checkout creation, portal, and other payment endpoints rely only on the global rate limiter (100 req/15min per IP).

**Fix:** Add endpoint-specific rate limiters (e.g., 5 checkout requests/minute per IP).

---

### H7. Image URL XSS Risk in Invite Preview
**File:** `server/routes/invite-preview.ts:87`

```typescript
const imageUrl = preview.cover_image_url || fallback;
// imageUrl could be "javascript:..." - escapeHtml won't catch protocol injection
```

**Fix:** Validate URL protocol before rendering:
```typescript
const parsed = new URL(imageUrl);
if (!['http:', 'https:'].includes(parsed.protocol)) imageUrl = fallbackUrl;
```

---

### H8. `@vitejs/plugin-react-swc` Pinned to "latest"
**File:** `package.json:125`

```json
"@vitejs/plugin-react-swc": "latest"
```

**Risk:** Breaks reproducible builds. A breaking change in a new major version could silently introduce issues.

**Fix:** Pin to a specific version: `"@vitejs/plugin-react-swc": "^4.0.0"`

---

## MEDIUM Findings

### M1. Missing Security Headers
**File:** `server/index.ts`

No CSP, X-Frame-Options, X-Content-Type-Options, HSTS, or Referrer-Policy headers.

**Fix:** Add `helmet` middleware:
```bash
bun add helmet
```
```typescript
import helmet from 'helmet';
app.use(helmet());
```

---

### M2. Sensitive Information in Console Logs
**Files:** `server/routes/stripe.ts` (lines 78, 101, 123, 149, 164), various Edge Functions

User IDs, subscription statuses, and payment events logged to console:
```typescript
console.log(`User ${userId} upgraded to Pro`);
console.log(`User ${userId} payment failed`);
```

**Fix:** Use structured logging, redact PII, and reduce log verbosity in production.

---

### M3. Service Worker Cache Poisoning Risk
**File:** `public/sw.js:40-62`

Caches ALL 200 responses indiscriminately, including dynamic content and API responses. No cache expiration except version bump.

**Fix:** Restrict caching to static assets only (HTML, icons, manifest).

---

### M4. Prompt Injection via User Data in AI Chat
**File:** `supabase/functions/ai-chat/index.ts`

User-controlled trip names, destinations, and hotel addresses are interpolated into the system prompt without sanitization.

**Fix:** Escape special characters or pass user data as structured context rather than string interpolation.

---

### M5. CSS Injection in Chart Component
**File:** `src/components/ui/chart.tsx:86-99`

Color values rendered via `dangerouslySetInnerHTML` into `<style>` tags without validation.

**Fix:** Validate color values against a regex (hex, rgb, hsl, named colors only).

---

### M6. Overly Broad Vite Allowed Hosts
**File:** `vite.config.ts:20-27`

Wildcard patterns `.replit.dev` and `.repl.co` match ANY subdomain, including those from other users.

**Fix:** Remove wildcards; use specific hostnames for development.

---

## LOW Findings

### L1. Weak Email Validation
**File:** `supabase/functions/send-share-notification/index.ts:15`

Regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` accepts invalid emails like `a@b.c`.

### L2. Environment Variables Not Validated at Startup
**Files:** `server/index.ts`, various Edge Functions - env vars checked at runtime rather than startup.

### L3. Hardcoded Admin Email Fallback
**File:** `src/hooks/use-trip-permissions.tsx:89` - fallback `'kevin@wanderluxe.io'` exposed in frontend code.

### L4. ESLint `no-unused-vars` Disabled
**File:** `eslint.config.js:26` - allows dead code to accumulate.

### L5. Vite Dev Proxy `secure: false`
**File:** `vite.config.ts:42` - disables HTTPS cert validation in development proxy.

---

## Passing Security Checks

| Check | Status |
|-------|--------|
| No hardcoded API keys/secrets in source | PASS |
| .env files excluded from git | PASS |
| Supabase service role key server-side only | PASS |
| VITE_ prefix only for safe client vars | PASS |
| Stripe webhook signature verification | PASS |
| Admin endpoints require auth + admin check | PASS |
| RLS policies on all user-facing tables | PASS |
| No `eval()` or `Function()` usage | PASS |
| Source maps disabled in production | PASS |
| Global rate limiting configured | PASS |
| React Markdown sanitizes HTML by default | PASS |
| Email templates properly escape HTML | PASS |
| JWT-based auth (inherently CSRF-resistant) | PASS |

---

## Remediation Priority

### Immediate (This Week)
1. **C1/C2** - Restrict CORS to production domains (~1 hour)
2. **C3** - Add SSRF protection to URL metadata fetcher (~1 hour)
3. **C4** - Sanitize Google Places attributions with DOMPurify (~30 min)
4. **C5** - Add `.url()` validation to restaurant website field (~15 min)
5. **H1** - Add URL protocol whitelist utility (~1 hour)

### Next Sprint
6. **C6** - Add webhook idempotency table (~2 hours)
7. **M1** - Add helmet security headers (~30 min)
8. **H3/H4** - Add Zod validation to admin and chat endpoints (~2 hours)
9. **H6** - Add per-endpoint rate limiters for Stripe (~1 hour)
10. **H5** - Enable TypeScript strict mode (~4+ hours, incremental)

### Backlog
11. **M2** - Implement structured logging (~2 hours)
12. **M3** - Restrict service worker caching scope (~1 hour)
13. **H2** - Add auth and size limits to photo proxy (~2 hours)
14. All LOW severity items

---

## Report Notes

- No `.env` files or secrets were found committed to git history
- Database security (RLS) is well-implemented across all user-facing tables
- Authentication flow via Supabase Auth is properly configured
- The application uses parameterized queries throughout (no raw SQL injection vectors found)
