// The Print Studio's view of a trip — shared by the edition page and the
// dialog's free preview so both read one React Query cache entry. An edition
// opened straight after upgrading then renders from a warm cache.

/** Options the document is always measured at: it is a keepsake, so photos and costs are in. */
export const PRINT_OPTS = { showImages: true, showCosts: true } as const;

/** Width the cover image is cropped to. Matches the document's measure. */
export const CONTENT_WIDTH = 800;

/**
 * Cache key for one trip's print data. `finalizedAt` is part of the key so
 * freezing or reopening an edition swaps the source of the itinerary rather
 * than serving a stale render; `null` means the live trip.
 */
export function printTripDataKey(tripId: string | undefined, finalizedAt: string | null) {
  return ['print-trip-data', tripId, finalizedAt ?? 'live'];
}
