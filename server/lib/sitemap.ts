/**
 * Sitemap + llms.txt builders, shared by the build-time script
 * (scripts/generate-sitemap.ts) and the live Express route
 * (server/routes/sitemap.ts). One renderer, so the file Google fetches at
 * runtime and the fallback baked into dist/ can never drift apart.
 *
 * Dependency-free on purpose: no Supabase import here. Callers fetch the
 * public-trip rows and hand them in.
 */

export const SITE_URL_DEFAULT = 'https://wanderluxe.io';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: string;
}

/**
 * Every indexable static route. Keep in step with scripts/prerender.ts and
 * prerenderedFileFor() in server/index.ts — a route listed here should also be
 * prerendered so crawlers get real HTML, not the empty SPA shell.
 */
export const STATIC_ROUTES: SitemapEntry[] = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/explore', changefreq: 'daily', priority: '0.9' },
  { loc: '/guide', changefreq: 'monthly', priority: '0.7' },
  { loc: '/about', changefreq: 'monthly', priority: '0.7' },
  { loc: '/terms', changefreq: 'yearly', priority: '0.3' },
  { loc: '/privacy', changefreq: 'yearly', priority: '0.3' },
];

/** The subset of a public trip row the sitemap and llms.txt need. */
export interface PublicTripRow {
  slug: string | null;
  destination: string;
  /** "N Days in X" for showcase trips; falls back to destination when null. */
  title?: string | null;
  summary?: string | null;
  arrival_date?: string | null;
  departure_date?: string | null;
  created_at?: string | null;
  hidden?: boolean | null;
  /** Hotel names for the trip, when the caller joined accommodations. */
  hotels?: string[];
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Public trips that are safe to publish: a valid slug and not hidden. */
export function indexablePublicTrips<T extends PublicTripRow>(rows: T[]): (T & { slug: string })[] {
  return rows.filter(
    (row): row is T & { slug: string } =>
      typeof row.slug === 'string' && SLUG_PATTERN.test(row.slug) && row.hidden !== true,
  );
}

export function tripSitemapEntries(rows: PublicTripRow[]): SitemapEntry[] {
  return indexablePublicTrips(rows).map((row) => ({
    loc: `/explore/${row.slug}`,
    lastmod: row.created_at?.split('T')[0],
    changefreq: 'weekly' as const,
    priority: '0.9',
  }));
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderSitemapXml(entries: SitemapEntry[], siteUrl = SITE_URL_DEFAULT): string {
  const urls = entries
    .map((entry) => {
      const parts = [`    <loc>${escapeXml(`${siteUrl}${entry.loc}`)}</loc>`];
      if (entry.lastmod) parts.push(`    <lastmod>${entry.lastmod}</lastmod>`);
      if (entry.changefreq) parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      if (entry.priority) parts.push(`    <priority>${entry.priority}</priority>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/** Whole nights between two ISO dates, or null when either is missing. */
export function nightsBetween(arrival?: string | null, departure?: string | null): number | null {
  if (!arrival || !departure) return null;
  const ms = Date.parse(`${departure}T00:00:00Z`) - Date.parse(`${arrival}T00:00:00Z`);
  if (Number.isNaN(ms) || ms <= 0) return null;
  return Math.round(ms / 86_400_000);
}

/**
 * llms.txt per https://llmstxt.org: an H1, a blockquote summary, then H2
 * sections whose entries are markdown links with a one-line description.
 * The itinerary list is generated from the same rows as the sitemap so an AI
 * crawler and a search crawler always see the same set of pages.
 */
export function renderLlmsTxt(rows: PublicTripRow[], siteUrl = SITE_URL_DEFAULT): string {
  const trips = indexablePublicTrips(rows);

  const itineraryLines = trips.map((trip) => {
    const nights = nightsBetween(trip.arrival_date, trip.departure_date);
    const facts: string[] = [];
    if (nights) facts.push(`${nights} ${nights === 1 ? 'night' : 'nights'}`);
    if (trip.hotels && trip.hotels.length > 0) facts.push(trip.hotels.join(', '));
    const description = trip.summary?.trim() || facts.join(' · ') || 'Day-by-day itinerary.';
    const prefix = facts.length && trip.summary ? `${facts.join(' · ')}. ` : '';
    const name = trip.title?.trim() || trip.destination;
    return `- [${name}](${siteUrl}/explore/${trip.slug}): ${prefix}${description}`;
  });

  return `# WanderLuxe

> WanderLuxe is a free collaborative trip planner. A group builds one shared itinerary of flights, hotels, dining and activities; everyone can see and edit it in real time, view it as a timeline, calendar or map, and export it as a PDF or a live calendar feed. An AI assistant turns pasted booking confirmations into itinerary items and finds real places with working links.

Planning is free with no limits. The only paid feature is the Print Studio, a keepsake printed edition of a finished trip.

## Product

- [How WanderLuxe works](${siteUrl}/guide): Plain-language guide to planning day by day, sharing with companions, calendar sync, PDF export, the map and calendar views, and the AI connector.
- [About WanderLuxe](${siteUrl}/about): Who the product is for and what it does.
- [Explore itineraries](${siteUrl}/explore): Index of every public showcase itinerary.

## Itineraries

${itineraryLines.length ? itineraryLines.join('\n') : '- No public itineraries are published yet.'}

## Integrations

- [MCP server discovery](${siteUrl}/.well-known/oauth-protected-resource): WanderLuxe exposes a Model Context Protocol server (OAuth 2.1) so an AI client can read and edit a signed-in user's trips.

## Optional

- [Terms of Service](${siteUrl}/terms)
- [Privacy Policy](${siteUrl}/privacy)
`;
}
