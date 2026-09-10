// server/lib/printSnapshot.ts — freezing an edition's itinerary.
//
// A Print Studio edition renders live from current trip data until someone
// finalizes it. Finalizing stores the trip's rows as they stand, and from then
// on the page draws from that copy instead of the tables.
//
// The snapshot is taken server-side under the service role rather than posted
// up by the browser. The client already has this data on screen, so this is
// not about secrecy — it is about the document staying a truthful record of
// what was booked. A snapshot the client composed would be a snapshot the
// client could compose freely, and "the renderer draws every item from the
// database" is the invariant the whole feature rests on.
//
// SHAPE CONTRACT: the object returned here is consumed by buildPdfTripData in
// src/services/pdf/data.ts and must match its PdfTripRows interface. The two
// cannot share a type — server/ is built by esbuild and sits outside every
// tsconfig project, and the client module pulls in the browser Supabase
// client — so the guard is a test: src/services/pdf/snapshot.test.ts renders a
// snapshot of this shape and fails if the renderer stops understanding it.

import type { SupabaseClient } from '@supabase/supabase-js';

/** Mirrors PdfTripRows in src/services/pdf/data.ts. */
export interface PrintSnapshot {
  trip: Record<string, unknown> | null;
  days: Record<string, unknown>[];
  stays: Record<string, unknown>[];
  trans: Record<string, unknown>[];
  acts: Record<string, unknown>[];
  dine: Record<string, unknown>[];
  otherExpenses: Record<string, unknown>[];
  /** Stamped so a stored snapshot can be read back without guessing its era. */
  snapshotVersion: 1;
}

export const SNAPSHOT_VERSION = 1 as const;

/**
 * Read every row the printed document is built from.
 *
 * Deliberately the same seven reads, with the same column lists, that
 * fetchTripRows performs on the client — a finalized edition and a live one
 * differ in *when* the rows were read, never in which rows they are.
 */
export async function fetchTripSnapshot(
  supabase: SupabaseClient,
  tripId: string
): Promise<PrintSnapshot | null> {
  const [
    { data: trip, error: tripErr },
    { data: days, error: daysErr },
    { data: stays },
    { data: trans },
    { data: acts },
    { data: dine },
    { data: otherExpenses },
  ] = await Promise.all([
    supabase
      .from('trips')
      .select('destination,arrival_date,departure_date,cover_image_url,budget,timezone')
      .eq('trip_id', tripId)
      .single(),
    supabase.from('trip_days').select('day_id,date,title,description').eq('trip_id', tripId).order('date'),
    supabase.from('accommodations').select('*').eq('trip_id', tripId),
    supabase.from('transportation').select('*').eq('trip_id', tripId),
    supabase.from('day_activities').select('*').eq('trip_id', tripId),
    supabase.from('reservations').select('*').eq('trip_id', tripId),
    supabase.from('other_expenses').select('*').eq('trip_id', tripId),
  ]);

  if (tripErr || !trip || daysErr) return null;

  return {
    trip: trip as Record<string, unknown>,
    days: (days ?? []) as Record<string, unknown>[],
    stays: (stays ?? []) as Record<string, unknown>[],
    trans: (trans ?? []) as Record<string, unknown>[],
    acts: (acts ?? []) as Record<string, unknown>[],
    dine: (dine ?? []) as Record<string, unknown>[],
    otherExpenses: (otherExpenses ?? []) as Record<string, unknown>[],
    snapshotVersion: SNAPSHOT_VERSION,
  };
}
