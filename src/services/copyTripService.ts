import { supabase } from '@/integrations/supabase/client';

/**
 * Copies a public showcase trip into the signed-in user's account.
 *
 * The whole deep copy (days, stays, activities, dining, transport) happens in
 * one database transaction via the `copy_public_trip` function — doing it
 * client-side would mean a dozen round-trips and a half-copied trip whenever
 * one of them failed.
 *
 * @param sourceTripId  The public trip to copy.
 * @param newArrivalDate  ISO `YYYY-MM-DD`. Every date in the itinerary shifts
 *   by the same number of days, so the shape of the trip survives. Omit to
 *   keep the original dates.
 * @returns The new trip's id.
 */
export async function copyPublicTrip(
  sourceTripId: string,
  newArrivalDate?: string
): Promise<string> {
  // `copy_public_trip` enters the generated types only once the migration is
  // applied and types are regenerated; cast at the boundary until then.
  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: string | null; error: { message: string } | null }>;

  const { data, error } = await rpc('copy_public_trip', {
    source_trip_id: sourceTripId,
    new_arrival_date: newArrivalDate ?? null,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error('The copy did not return a new trip.');

  return data;
}

/** Shift `isoDate` by `days`, returning `YYYY-MM-DD`. */
export function shiftIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  // Construct in UTC so the result never slips a day across a DST boundary.
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().slice(0, 10);
}

/** Whole days between two ISO dates. Negative when `to` precedes `from`. */
export function daysBetweenIso(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / 86_400_000);
}
