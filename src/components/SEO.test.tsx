import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import SEO, { SITE_URL } from './SEO';

// On React 19, react-helmet-async renders plain elements and React hoists them
// into <head>. Nothing dedupes them, so each tag must come out exactly once
// per <SEO>, carrying the page's values.
const SOCIAL_TAGS = [
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[property="og:type"]',
  'meta[property="og:image"]',
  'meta[property="og:url"]',
  'meta[property="og:site_name"]',
  'meta[name="twitter:card"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
  'meta[name="twitter:image"]',
];

function content(selector: string): string | null {
  return document.head.querySelector(selector)?.getAttribute('content') ?? null;
}

describe('SEO', () => {
  it("emits each og: and twitter: tag once, with the page's values", () => {
    const { unmount } = render(
      <HelmetProvider>
        <SEO
          title="6 Days in Tokyo Itinerary"
          description="Six days in Tokyo, day by day."
          canonicalPath="/explore/6-days-in-tokyo"
          ogImage="https://example.com/tokyo.jpg"
          ogType="article"
        />
      </HelmetProvider>,
    );

    for (const selector of SOCIAL_TAGS) {
      expect(document.head.querySelectorAll(selector), selector).toHaveLength(1);
    }
    expect(content('meta[property="og:title"]')).toBe('6 Days in Tokyo Itinerary | WanderLuxe');
    expect(content('meta[name="twitter:title"]')).toBe('6 Days in Tokyo Itinerary | WanderLuxe');
    expect(content('meta[property="og:description"]')).toBe('Six days in Tokyo, day by day.');
    expect(content('meta[property="og:image"]')).toBe('https://example.com/tokyo.jpg');
    expect(content('meta[property="og:url"]')).toBe(`${SITE_URL}/explore/6-days-in-tokyo`);
    expect(content('meta[property="og:type"]')).toBe('article');

    unmount();
    expect(document.head.querySelectorAll('meta[property^="og:"]')).toHaveLength(0);
  });

  it('omits og:url when there is no canonical path', () => {
    const { unmount } = render(
      <HelmetProvider>
        <SEO title="Sign in" noIndex />
      </HelmetProvider>,
    );
    expect(document.head.querySelectorAll('meta[property="og:url"]')).toHaveLength(0);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(0);
    unmount();
  });
});
