// Client-side URL safety net for AI chat responses.
//
// The authoritative URL validation happens server-side in the ai-chat Edge
// Function (see supabase/functions/ai-chat/linkValidator.ts). This module is
// a defense-in-depth layer that runs during streaming (when we're displaying
// raw, partially-arrived tokens) and for any cached historical messages that
// predate the server fix.
//
// `safeHref` is called from the ReactMarkdown `a` component override — every
// link the user could possibly click passes through here before its `href`
// is set on the DOM.

// Hosts that are trustworthy enough to render as-is. The server-side
// validator is stricter (only Google/Wikipedia + tool-verified URLs pass) so
// this list is primarily a safety net during streaming and for cached
// historical messages. Anything not on this list is replaced with a Google
// Search fallback built from the link text.
const TRUSTED_HOST_SUFFIXES = [
  // Search & reference
  'google.com',
  'google.co.uk',
  'goo.gl',
  'wikipedia.org',
  'wikimedia.org',
  // Booking platforms (common targets of hallucinated URLs — keeping them
  // on-domain at least keeps the user on a real site)
  'resy.com',
  'opentable.com',
  'exploretock.com',
  'yelp.com',
  'sevenrooms.com',
  'thefork.com',
  'tripadvisor.com',
  'booking.com',
  'airbnb.com',
  'hotels.com',
  'expedia.com',
  'kayak.com',
  'skyscanner.com',
  'getyourguide.com',
  'viator.com',
  'guide.michelin.com',
];

function hostIsTrusted(host: string): boolean {
  const h = host.toLowerCase();
  return TRUSTED_HOST_SUFFIXES.some((suffix) => h === suffix || h.endsWith('.' + suffix));
}

function googleSearchFallback(text: string): string {
  const q = (text || '').trim() || 'travel';
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

/**
 * Validate an AI-generated href. Returns either the original URL (if trusted)
 * or a Google Search fallback built from the link text. Never returns an
 * unparseable or non-http(s) URL.
 */
export function safeHref(rawHref: string, linkText: string): string {
  if (!rawHref) return googleSearchFallback(linkText);

  let parsed: URL;
  try {
    parsed = new URL(rawHref);
  } catch {
    return googleSearchFallback(linkText);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return googleSearchFallback(linkText);
  }

  const fullUrl = parsed.toString();
  const upper = fullUrl.toUpperCase();
  if (
    upper.includes('PLACE+NAME') ||
    upper.includes('PLACE%20NAME') ||
    upper.includes('RESTAURANT+NAME') ||
    upper.includes('RESTAURANT%20NAME')
  ) {
    return googleSearchFallback(linkText);
  }

  if (hostIsTrusted(parsed.host)) {
    return fullUrl;
  }
  return googleSearchFallback(linkText);
}

/**
 * Ensures each numbered list item starts on its own line so ReactMarkdown
 * renders them as a list rather than a squashed paragraph. This is the only
 * piece of the old `sanitizeMarkdownLinks` we still need client-side — URL
 * repair now happens at render time via `safeHref`.
 */
export function normalizeMarkdownListSpacing(content: string): string {
  if (!content) return content;
  // Match " 2. " (digit + period + space) not already at line start and insert
  // a blank line before it so it becomes a new list item.
  return content.replaceAll(/([^\n])(\s)(\d+)\.\s/g, '$1\n\n$3. ');
}
