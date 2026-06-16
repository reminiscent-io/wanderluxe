import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = process.env.SITE_URL || 'https://wanderluxe.io';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: string;
}

const STATIC_ROUTES: SitemapEntry[] = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/explore', changefreq: 'daily', priority: '0.9' },
  { loc: '/about', changefreq: 'monthly', priority: '0.7' },
  { loc: '/terms', changefreq: 'yearly', priority: '0.3' },
  { loc: '/privacy', changefreq: 'yearly', priority: '0.3' },
];

async function fetchPublicTrips(): Promise<SitemapEntry[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      '[sitemap] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set — skipping public trips.',
    );
    return [];
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase
    .from('trips')
    .select('slug, created_at')
    .eq('is_public', true)
    .not('slug', 'is', null);

  if (error) {
    console.warn('[sitemap] Could not fetch public trips:', error.message);
    return [];
  }

  return (data ?? [])
    .filter((row: { slug: string | null }): row is { slug: string; created_at?: string | null } =>
      typeof row.slug === 'string' && row.slug.length > 0,
    )
    .map((row) => ({
      loc: `/explore/${row.slug}`,
      lastmod: row.created_at?.split('T')[0],
      changefreq: 'weekly' as const,
      priority: '0.9',
    }));
}

function renderXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const parts = [`    <loc>${SITE_URL}${entry.loc}</loc>`];
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

async function main() {
  const tripEntries = await fetchPublicTrips();
  const allEntries = [...STATIC_ROUTES, ...tripEntries];
  const xml = renderXml(allEntries);

  const publicDir = path.resolve(process.cwd(), 'public');
  const outPath = path.join(publicDir, 'sitemap.xml');
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log(`[sitemap] Wrote ${allEntries.length} entries to ${outPath}`);
}

main().catch((err) => {
  console.error('[sitemap] Generation failed:', err);
  // Don't fail the build — emit a minimal sitemap with static routes as fallback
  const fallback = renderXml(STATIC_ROUTES);
  const outPath = path.resolve(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(outPath, fallback, 'utf8');
  console.log('[sitemap] Wrote fallback sitemap with static routes only.');
});
