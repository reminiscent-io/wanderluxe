interface TripLinkFields {
  trip_id: string;
  slug?: string | null;
  is_public?: boolean | null;
}

interface TripTitleFields {
  destination: string;
  title?: string | null;
}

/**
 * What a trip is called on cards, headings and <title> tags. Public showcase
 * trips carry an explicit title ("6 Days in Tokyo"); everything else is named
 * by its destination, which is also the fallback when the column is empty.
 */
export function tripTitle(trip: TripTitleFields): string {
  const title = trip.title?.trim();
  return title && title.length > 0 ? title : trip.destination;
}

export function buildTripPath(trip: TripLinkFields): string {
  if (trip.is_public && trip.slug) {
    return `/explore/${trip.slug}`;
  }
  return `/trip/${trip.trip_id}`;
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
