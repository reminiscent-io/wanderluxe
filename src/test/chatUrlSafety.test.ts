import { describe, expect, it } from 'vitest';
import {
  normalizeMarkdownListSpacing,
  safeHref,
} from '@/components/trip/ai-assistant/chatUrlSafety';
// The server validator lives outside src/ but we can import it by relative
// path — vitest resolves it just fine and the module is pure TS with no
// Deno-specific globals.
import {
  validateAndRewriteLinks,
  rewriteMarkdownLink,
  normalizeCandidateUrl,
} from '../../supabase/functions/ai-chat/linkValidator';

describe('safeHref (client render-time safety net)', () => {
  it('passes through well-formed Google Maps URLs', () => {
    const url = 'https://www.google.com/maps/place/?q=place_id:ChIJabcdef';
    expect(safeHref(url, 'Carbone')).toBe(url);
  });

  it('passes through Wikipedia links', () => {
    const url = 'https://en.wikipedia.org/wiki/Tokyo';
    expect(safeHref(url, 'Tokyo')).toBe(url);
  });

  it('passes through Resy links (trusted travel host)', () => {
    const url = 'https://resy.com/cities/ny/venues/carbone';
    expect(safeHref(url, 'Carbone')).toBe(url);
  });

  it('replaces unknown hosts with a Google Search fallback', () => {
    const result = safeHref('https://totally-fake.example.biz/booking', 'Best Sushi Tokyo');
    expect(result).toBe(
      'https://www.google.com/search?q=Best%20Sushi%20Tokyo'
    );
  });

  it('replaces URLs that still contain the PLACE+NAME prompt placeholder', () => {
    const leaked = 'https://www.google.com/maps/search/PLACE+NAME+Paris';
    const result = safeHref(leaked, 'Eiffel Tower');
    expect(result).toBe('https://www.google.com/search?q=Eiffel%20Tower');
  });

  it('replaces unparseable href with a Google Search fallback', () => {
    expect(safeHref('not a url', 'Somewhere')).toBe(
      'https://www.google.com/search?q=Somewhere'
    );
  });

  it('replaces javascript: hrefs (XSS guard)', () => {
    expect(safeHref('javascript:alert(1)', 'Click me')).toBe(
      'https://www.google.com/search?q=Click%20me'
    );
  });

  it('falls back to a generic query when the link text is empty', () => {
    expect(safeHref('', '')).toContain('google.com/search');
  });
});

describe('normalizeMarkdownListSpacing', () => {
  it('inserts blank lines before squashed numbered items', () => {
    const squashed = 'Try these: 1. Sushi Dai. 2. Tsukiji. 3. Sukiyabashi Jiro.';
    const out = normalizeMarkdownListSpacing(squashed);
    expect(out).toContain('\n\n1.');
    expect(out).toContain('\n\n2.');
    expect(out).toContain('\n\n3.');
  });

  it('leaves already-well-formatted lists alone', () => {
    const ok = 'Try these:\n\n1. Sushi Dai\n\n2. Tsukiji\n\n3. Sukiyabashi Jiro';
    expect(normalizeMarkdownListSpacing(ok)).toBe(ok);
  });
});

describe('server-side validateAndRewriteLinks', () => {
  const searchLocation = 'Tokyo';

  it('trusts URLs that were returned by a tool call', () => {
    const verified = new Set(['https://resy.com/cities/ny/venues/carbone']);
    const md = 'Check out [Carbone](https://resy.com/cities/ny/venues/carbone) for dinner.';
    expect(validateAndRewriteLinks(md, searchLocation, verified)).toBe(md);
  });

  it('trusts Google Maps URLs on trusted hosts without tool verification', () => {
    const md = 'See [the Eiffel Tower](https://www.google.com/maps/place/?q=place_id:abc123) on your first day.';
    expect(validateAndRewriteLinks(md, searchLocation, new Set())).toBe(md);
  });

  it('rewrites a hallucinated booking-site URL to Google Search', () => {
    const md = 'Try [Fake Place](https://resy.com/cities/ny/venues/fake-hallucinated-place).';
    const out = validateAndRewriteLinks(md, searchLocation, new Set());
    expect(out).toContain('[Fake Place](https://www.google.com/search?q=');
    expect(out).not.toContain('fake-hallucinated-place');
  });

  it('rewrites URLs that contain PLACE+NAME leaked template placeholders', () => {
    const md = 'Visit [Eiffel Tower](https://www.google.com/maps/search/PLACE+NAME+Paris).';
    const out = validateAndRewriteLinks(md, 'Paris', new Set());
    expect(out).toContain('[Eiffel Tower](https://www.google.com/search?q=');
    expect(out).not.toContain('PLACE+NAME');
  });

  it('rewrites a malformed non-http URL to Google Search', () => {
    const md = 'Try [Carbone](javascript:alert(1)) for dinner.';
    const out = validateAndRewriteLinks(md, 'NYC', new Set());
    expect(out).toContain('[Carbone](https://www.google.com/search?q=');
    expect(out).not.toContain('javascript:');
  });

  it('leaves plain text and bold without links untouched', () => {
    const md = 'I recommend **Carbone** — the spicy rigatoni vodka is a classic.';
    expect(validateAndRewriteLinks(md, searchLocation, new Set())).toBe(md);
  });

  it('handles multiple links in a single string independently', () => {
    const verified = new Set(['https://www.google.com/maps/place/?q=place_id:abc']);
    const md = [
      'Day 1: [Eiffel Tower](https://www.google.com/maps/place/?q=place_id:abc)',
      'Day 2: [Louvre](https://totally-fake.example.com/louvre)',
    ].join('\n');
    const out = validateAndRewriteLinks(md, 'Paris', verified);
    expect(out).toContain('[Eiffel Tower](https://www.google.com/maps/place/?q=place_id:abc)');
    expect(out).toContain('[Louvre](https://www.google.com/search?q=');
    expect(out).not.toContain('example.com/louvre');
  });

  it('leaves malformed markdown (unclosed paren) alone so react-markdown can render it as text', () => {
    const md = 'Visit [Eiffel Tower](https://example.com/eiffel and let me know.';
    // Regex requires a closing paren, so this malformed markdown is untouched.
    // react-markdown will render the unclosed brackets as plain text, which is
    // safer than guessing what URL the model meant.
    expect(validateAndRewriteLinks(md, 'Paris', new Set())).toBe(md);
  });
});

describe('normalizeCandidateUrl', () => {
  it('strips trailing punctuation', () => {
    expect(normalizeCandidateUrl('https://example.com/foo).')).toBe('https://example.com/foo');
  });
  it('rejects non-http schemes', () => {
    expect(normalizeCandidateUrl('ftp://example.com')).toBeNull();
    expect(normalizeCandidateUrl('javascript:alert(1)')).toBeNull();
  });
  it('returns null for non-URL junk', () => {
    expect(normalizeCandidateUrl('not a url')).toBeNull();
    expect(normalizeCandidateUrl('')).toBeNull();
  });
});

describe('rewriteMarkdownLink direct', () => {
  it('returns link text with Google Search fallback that includes trip location', () => {
    const out = rewriteMarkdownLink(
      'Sukiyabashi Jiro',
      'https://unknown-host.example/',
      new Set(),
      'Tokyo'
    );
    expect(out).toContain('Sukiyabashi%20Jiro');
    expect(out).toContain('Tokyo');
  });
});
