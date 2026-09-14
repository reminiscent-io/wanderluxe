// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  STATIC_ROUTES,
  indexablePublicTrips,
  nightsBetween,
  renderLlmsTxt,
  renderSitemapXml,
  tripSitemapEntries,
  type PublicTripRow,
} from './sitemap';

const tokyo: PublicTripRow = {
  slug: 'tokyo-japan-6-nights',
  destination: 'Tokyo, Japan',
  summary: 'Six nights at Aman Tokyo with sushi counters, Meiji Shrine at dawn, and a day trip to Hakone.',
  arrival_date: '2026-09-17',
  departure_date: '2026-09-23',
  created_at: '2026-03-31T10:00:00Z',
  hidden: false,
  hotels: ['Aman Tokyo'],
};

describe('indexablePublicTrips', () => {
  it('keeps only rows with a valid slug that are not hidden', () => {
    const rows: PublicTripRow[] = [
      tokyo,
      { ...tokyo, slug: null },
      { ...tokyo, slug: 'Bad Slug!' },
      { ...tokyo, slug: 'hidden-trip', hidden: true },
    ];
    expect(indexablePublicTrips(rows).map((r) => r.slug)).toEqual(['tokyo-japan-6-nights']);
  });
});

describe('renderSitemapXml', () => {
  it('lists the static routes, including the guide, before trip pages', () => {
    const xml = renderSitemapXml([...STATIC_ROUTES, ...tripSitemapEntries([tokyo])]);
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual([
      'https://wanderluxe.io/',
      'https://wanderluxe.io/explore',
      'https://wanderluxe.io/guide',
      'https://wanderluxe.io/about',
      'https://wanderluxe.io/terms',
      'https://wanderluxe.io/privacy',
      'https://wanderluxe.io/explore/tokyo-japan-6-nights',
    ]);
    expect(xml).toContain('<lastmod>2026-03-31</lastmod>');
  });

  it('escapes XML-significant characters in URLs', () => {
    const xml = renderSitemapXml([{ loc: '/explore?search=a&b' }], 'https://example.com');
    expect(xml).toContain('<loc>https://example.com/explore?search=a&amp;b</loc>');
  });
});

describe('nightsBetween', () => {
  it('counts whole nights and rejects reversed or missing dates', () => {
    expect(nightsBetween('2026-09-17', '2026-09-23')).toBe(6);
    expect(nightsBetween('2026-09-23', '2026-09-17')).toBeNull();
    expect(nightsBetween(null, '2026-09-17')).toBeNull();
  });
});

describe('renderLlmsTxt', () => {
  it('follows the llms.txt shape and lists every indexable trip with its facts', () => {
    const text = renderLlmsTxt([tokyo, { ...tokyo, slug: null, destination: 'Unlisted' }]);
    expect(text.startsWith('# WanderLuxe\n\n> ')).toBe(true);
    expect(text).toContain('## Itineraries');
    expect(text).toContain(
      '- [Tokyo, Japan](https://wanderluxe.io/explore/tokyo-japan-6-nights): 6 nights · Aman Tokyo. Six nights at Aman Tokyo',
    );
    expect(text).not.toContain('Unlisted');
    expect(text).toContain('(https://wanderluxe.io/guide)');
  });

  it('says so when nothing is published rather than emitting an empty section', () => {
    expect(renderLlmsTxt([])).toContain('- No public itineraries are published yet.');
  });
});
