// The Print Studio's view of a trip — shared by the edition page and the
// dialog's free preview so both read one React Query cache entry. An edition
// opened straight after upgrading then renders from a warm cache.
//
// Rows come from the same reads the Simple PDF makes (fetchTripRows) or from
// a finalized edition's snapshot, and go through the Studio's own projection
// (src/lib/printDesign/trip.ts). Photos are then loaded once, at their natural
// size: the page lays a photo out at its own proportions instead of cropping
// it, so it has to know them before it draws.

import { fetchTripRows } from '@/services/pdf/data';
import { buildPrintTrip, type PrintImage, type PrintTrip, type PrintTripRows } from '@/lib/printDesign/trip';

/** How long one photo may take before the edition draws without it. */
const IMAGE_WAIT_MS = 8000;

/**
 * Load one photo and read its natural size. Resolves null when it cannot load
 * in time, so a dead link costs a picture, never the edition. Plain <img>, no
 * canvas: no CORS is needed, and the browser's cache then serves the print.
 */
function loadImageSize(url: string): Promise<{ width: number; height: number } | null> {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), IMAGE_WAIT_MS);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img.naturalWidth > 0 ? { width: img.naturalWidth, height: img.naturalHeight } : null);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.decoding = 'async';
    img.src = url;
  });
}

async function sized(image: PrintImage | undefined): Promise<PrintImage | undefined> {
  if (!image?.url) return undefined;
  const size = await loadImageSize(image.url);
  return size ? { ...image, ...size } : undefined;
}

/** Fill in every photo's natural size; drop the ones that will not load. */
async function resolvePrintImages(trip: PrintTrip): Promise<PrintTrip> {
  const [cover, ...dayImages] = await Promise.all([sized(trip.cover), ...trip.days.map((d) => sized(d.image))]);
  return {
    ...trip,
    cover,
    days: trip.days.map((day, i) => ({ ...day, image: dayImages[i] })),
  };
}

/** Rows (live or snapshot) to a printable trip, photos measured. */
export function buildPrintTripData(rows: PrintTripRows): Promise<PrintTrip> {
  return resolvePrintImages(buildPrintTrip(rows));
}

/** The live trip, as the Studio prints it. */
export async function fetchPrintTripData(tripId: string): Promise<PrintTrip> {
  return buildPrintTripData(await fetchTripRows(tripId));
}

/**
 * Cache key for one trip's print data. `finalizedAt` is part of the key so
 * freezing or reopening an edition swaps the source of the itinerary rather
 * than serving a stale render; `null` means the live trip.
 */
export function printTripDataKey(tripId: string | undefined, finalizedAt: string | null) {
  return ['print-trip-data', tripId, finalizedAt ?? 'live'];
}
