interface TripLinkFields {
  trip_id: string;
  slug?: string | null;
  is_public?: boolean | null;
}

export function buildTripPath(trip: TripLinkFields): string {
  if (trip.is_public && trip.slug) {
    return `/explore/${trip.slug}`;
  }
  return `/trip/${trip.trip_id}`;
}

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

const UNSPLASH_HOST = 'images.unsplash.com';

export function buildOgImageUrl(coverImageUrl: string | null | undefined): string | undefined {
  if (!coverImageUrl) return undefined;
  try {
    const url = new URL(coverImageUrl);
    if (url.hostname !== UNSPLASH_HOST) return coverImageUrl;
    url.searchParams.set('fit', 'crop');
    url.searchParams.set('crop', 'entropy');
    url.searchParams.set('w', '1200');
    url.searchParams.set('h', '630');
    url.searchParams.set('q', '80');
    url.searchParams.set('fm', 'jpg');
    return url.toString();
  } catch {
    return coverImageUrl;
  }
}
