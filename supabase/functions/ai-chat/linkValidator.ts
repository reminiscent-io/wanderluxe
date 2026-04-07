// Link validation / rewriting for AI chat responses.
//
// After the model generates its final response, we walk every markdown link
// and decide whether to trust the URL or replace it with a Google Search
// fallback built from the link text. The goal is simple: the user should
// never click an AI-authored URL that 404s or leads somewhere unexpected.
//
// Trust rules (applied in order):
//   1. URLs that the server verified came from a tool result (verifiedUrls)
//      are trusted verbatim.
//   2. URLs on a small allowlist of highly stable hosts (Google, Wikipedia)
//      are trusted after parsing.
//   3. Everything else — including hallucinated booking-site URLs — is
//      rewritten to a Google Search for the link text plus trip location.
//
// This module is intentionally pure (no Deno / Node globals beyond the URL
// constructor) so that it can be imported from both the Deno edge function
// and the Node-based vitest test suite.

export const TRUSTED_HOST_SUFFIXES = [
  'google.com',
  'google.co.uk',
  'goo.gl',
  'wikipedia.org',
  'wikimedia.org',
];

export function hostIsTrusted(host: string): boolean {
  const h = host.toLowerCase();
  return TRUSTED_HOST_SUFFIXES.some((suffix) => h === suffix || h.endsWith('.' + suffix));
}

export function googleSearchFallback(text: string, searchLocation: string): string {
  const cleanLocation = (searchLocation || '').replaceAll('+', ' ').trim();
  const query = cleanLocation ? `${text} ${cleanLocation}` : text;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function normalizeCandidateUrl(raw: string): string | null {
  let url = (raw || '').trim();
  // Drop trailing punctuation the model sometimes glues onto URLs.
  url = url.replace(/[),.;:!?'"*_\]]+$/, '');
  if (!url) return null;
  // Only accept https URLs. We never want to render a clear-text link from
  // the model — if a URL arrives as http:// we rewrite it to a Google Search
  // for the link text instead (see rewriteMarkdownLink).
  if (!/^https:\/\//i.test(url)) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function containsPlaceholder(url: string): boolean {
  const upper = url.toUpperCase();
  return (
    upper.includes('PLACE+NAME') ||
    upper.includes('PLACE%20NAME') ||
    upper.includes('RESTAURANT+NAME') ||
    upper.includes('RESTAURANT%20NAME') ||
    upper.includes('${') // leaked template literal
  );
}

export function rewriteMarkdownLink(
  text: string,
  rawUrl: string,
  verifiedUrls: Set<string>,
  searchLocation: string,
): string {
  if (verifiedUrls.has(rawUrl)) return `[${text}](${rawUrl})`;

  const normalized = normalizeCandidateUrl(rawUrl);
  if (normalized && verifiedUrls.has(normalized)) return `[${text}](${normalized})`;
  if (!normalized) return `[${text}](${googleSearchFallback(text, searchLocation)})`;

  if (containsPlaceholder(normalized)) {
    return `[${text}](${googleSearchFallback(text, searchLocation)})`;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return `[${text}](${googleSearchFallback(text, searchLocation)})`;
  }

  if (hostIsTrusted(parsed.host)) {
    return `[${text}](${parsed.toString()})`;
  }
  return `[${text}](${googleSearchFallback(text, searchLocation)})`;
}

/**
 * Walks every well-formed markdown link in `markdown` and rewrites each one
 * according to the trust rules above. Malformed markdown (unclosed brackets,
 * missing parens) is left alone — react-markdown will render it as plain
 * text on the client, which is safer than guessing what the model meant.
 */
export function validateAndRewriteLinks(
  markdown: string,
  searchLocation: string,
  verifiedUrls: Set<string> = new Set(),
): string {
  return markdown.replaceAll(
    /\[([^\]\n]+)\]\(([^)\s]+)\)/g,
    (_match, text, url) => rewriteMarkdownLink(text, url, verifiedUrls, searchLocation),
  );
}
