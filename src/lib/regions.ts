/**
 * Region grouping for the Explore index.
 *
 * Showcase trips carry a `destination` of the form "Place, Country". The
 * country tail maps to one of four regions so the index reads as a map, not a
 * date list. Anything unrecognised lands in "More destinations" rather than
 * being dropped, so a new country never hides a page.
 */

export const REGIONS = [
  'Europe',
  'Asia & Pacific',
  'Americas',
  'Africa & Middle East',
  'More destinations',
] as const;

export type Region = (typeof REGIONS)[number];

const COUNTRY_REGION: Record<string, Region> = {
  // Europe
  italy: 'Europe', france: 'Europe', spain: 'Europe', portugal: 'Europe', greece: 'Europe',
  'united kingdom': 'Europe', uk: 'Europe', england: 'Europe', scotland: 'Europe', ireland: 'Europe',
  germany: 'Europe', austria: 'Europe', switzerland: 'Europe', netherlands: 'Europe', belgium: 'Europe',
  denmark: 'Europe', sweden: 'Europe', norway: 'Europe', finland: 'Europe', iceland: 'Europe',
  croatia: 'Europe', montenegro: 'Europe', slovenia: 'Europe', 'czech republic': 'Europe', czechia: 'Europe',
  hungary: 'Europe', poland: 'Europe', turkey: 'Europe', türkiye: 'Europe', malta: 'Europe', cyprus: 'Europe',
  // Asia & Pacific
  japan: 'Asia & Pacific', china: 'Asia & Pacific', 'hong kong': 'Asia & Pacific', taiwan: 'Asia & Pacific',
  'south korea': 'Asia & Pacific', korea: 'Asia & Pacific', thailand: 'Asia & Pacific', vietnam: 'Asia & Pacific',
  cambodia: 'Asia & Pacific', laos: 'Asia & Pacific', indonesia: 'Asia & Pacific', bali: 'Asia & Pacific',
  singapore: 'Asia & Pacific', malaysia: 'Asia & Pacific', philippines: 'Asia & Pacific', india: 'Asia & Pacific',
  'sri lanka': 'Asia & Pacific', nepal: 'Asia & Pacific', bhutan: 'Asia & Pacific', maldives: 'Asia & Pacific',
  australia: 'Asia & Pacific', 'new zealand': 'Asia & Pacific', fiji: 'Asia & Pacific',
  'french polynesia': 'Asia & Pacific',
  // Americas (incl. Caribbean)
  usa: 'Americas', 'united states': 'Americas', 'united states of america': 'Americas', us: 'Americas',
  canada: 'Americas', mexico: 'Americas', 'costa rica': 'Americas', panama: 'Americas', belize: 'Americas',
  guatemala: 'Americas', colombia: 'Americas', peru: 'Americas', chile: 'Americas', argentina: 'Americas',
  brazil: 'Americas', uruguay: 'Americas', ecuador: 'Americas', 'french west indies': 'Americas',
  'saint barthélemy': 'Americas', 'st. barthélemy': 'Americas', 'st barths': 'Americas', bahamas: 'Americas',
  jamaica: 'Americas', barbados: 'Americas', 'turks and caicos': 'Americas', 'cayman islands': 'Americas',
  'dominican republic': 'Americas', 'puerto rico': 'Americas', anguilla: 'Americas', 'st. lucia': 'Americas',
  'saint lucia': 'Americas', antigua: 'Americas', bermuda: 'Americas', hawaii: 'Americas',
  // Africa & Middle East
  'south africa': 'Africa & Middle East', morocco: 'Africa & Middle East', kenya: 'Africa & Middle East',
  tanzania: 'Africa & Middle East', botswana: 'Africa & Middle East', namibia: 'Africa & Middle East',
  rwanda: 'Africa & Middle East', uganda: 'Africa & Middle East', egypt: 'Africa & Middle East',
  mauritius: 'Africa & Middle East', seychelles: 'Africa & Middle East', zambia: 'Africa & Middle East',
  zimbabwe: 'Africa & Middle East', mozambique: 'Africa & Middle East', 'united arab emirates': 'Africa & Middle East',
  uae: 'Africa & Middle East', dubai: 'Africa & Middle East', 'abu dhabi': 'Africa & Middle East',
  oman: 'Africa & Middle East', qatar: 'Africa & Middle East', jordan: 'Africa & Middle East',
  israel: 'Africa & Middle East', 'saudi arabia': 'Africa & Middle East',
};

function normalize(part: string): string {
  return part.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Region for a destination string. Reads the country from the last
 * comma-separated part first, then falls back to any recognised part, so
 * "Sabi Sands & Cape Town, South Africa" and "Dubai" both resolve.
 */
export function regionFor(destination: string | null | undefined): Region {
  if (!destination) return 'More destinations';
  const parts = destination.split(',').map(normalize).filter(Boolean);
  for (const part of [...parts].reverse()) {
    const hit = COUNTRY_REGION[part];
    if (hit) return hit;
  }
  // A place name may carry the country inside it ("Hawaii", "Bali").
  for (const key of Object.keys(COUNTRY_REGION)) {
    if (parts.some((part) => part.includes(key))) return COUNTRY_REGION[key];
  }
  return 'More destinations';
}

/** Group items by region, in the canonical region order, skipping empty regions. */
export function groupByRegion<T>(items: T[], destinationOf: (item: T) => string | null | undefined): Array<{ region: Region; items: T[] }> {
  const buckets = new Map<Region, T[]>();
  for (const item of items) {
    const region = regionFor(destinationOf(item));
    const list = buckets.get(region) ?? [];
    list.push(item);
    buckets.set(region, list);
  }
  return REGIONS.filter((region) => buckets.has(region)).map((region) => ({ region, items: buckets.get(region)! }));
}
