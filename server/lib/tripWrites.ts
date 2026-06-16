// Write functions for the MCP server. Each takes the per-request, user-scoped
// Supabase client (anon key + the caller's JWT) as its first argument, so RLS
// enforces all access control — never a service-role key. These mirror the
// business logic in the client-side services (day generation, owner share,
// order_index, accommodation night fan-out), which cannot be imported here
// because they use the browser Supabase singleton.

import type { SupabaseClient } from '@supabase/supabase-js';
import { dateRange } from './tripDates';

/** A user-facing error whose message is safe to return verbatim via toolError. */
export class WriteError extends Error {}

/** Context derived from the validated JWT (never from tool input). */
export interface UserContext {
  userId: string;
  email: string | null;
}

/**
 * Resolve a trip day's id from its date. Days are addressed by date, never by
 * day_id, throughout the tool surface. Throws a clear WriteError when the date
 * is outside the trip's range.
 */
async function resolveDayId(
  supabase: SupabaseClient,
  tripId: string,
  date: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('trip_days')
    .select('day_id')
    .eq('trip_id', tripId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw new WriteError(`Failed to resolve the day for ${date}: ${error.message}`);
  if (!data) {
    throw new WriteError(
      `No day matches ${date} on this trip. That date is outside the trip's range — ` +
        `update the trip's dates first, or pick a date within the range.`,
    );
  }
  return data.day_id;
}

/**
 * Next order_index within a scope (max existing + 1), matching how the app
 * orders app-created items. `scopeColumn` is 'day_id' (activities, dining) or
 * 'trip_id' (accommodations).
 */
async function nextOrderIndex(
  supabase: SupabaseClient,
  table: 'day_activities' | 'reservations' | 'accommodations',
  scopeColumn: 'day_id' | 'trip_id',
  scopeValue: string,
): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .select('order_index')
    .eq(scopeColumn, scopeValue)
    .order('order_index', { ascending: false })
    .limit(1);
  if (error) throw new WriteError(`Failed to compute order: ${error.message}`);
  return (data?.[0]?.order_index ?? -1) + 1;
}

/**
 * Insert the owner row into trip_shares, mirroring the app's
 * addOwnerToTripShares. Best-effort: a failure here must not abort trip
 * creation (the trip is already accessible via trips.user_id ownership).
 */
async function addOwnerShare(
  supabase: SupabaseClient,
  tripId: string,
  ctx: UserContext,
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', ctx.userId)
      .maybeSingle();

    const email = ctx.email?.toLowerCase() ?? null;
    let firstName = 'User';
    let lastName: string | null = null;
    if (profile?.full_name?.trim()) {
      const parts = profile.full_name.trim().split(' ').filter(Boolean);
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || null;
    } else if (email) {
      const prefix = email.split('@')[0] || 'User';
      firstName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }

    await supabase.from('trip_shares').insert({
      trip_id: tripId,
      shared_by_user_id: ctx.userId,
      shared_with_user_id: ctx.userId,
      first_name: firstName,
      last_name: lastName,
      shared_with_email: email,
      permission_level: 'edit',
    });
  } catch (err) {
    console.error('addOwnerShare failed (continuing):', err);
  }
}

// ---- Trip ----

export interface CreateTripInput {
  destination: string;
  arrival_date: string;
  departure_date: string;
  budget?: number | null;
}

export async function createTrip(
  supabase: SupabaseClient,
  ctx: UserContext,
  input: CreateTripInput,
): Promise<{ trip_id: string; day_dates: string[] }> {
  // Validate the range before any insert, so an invalid range never creates an orphan trip.
  if (input.departure_date < input.arrival_date) {
    throw new WriteError('departure_date must be on or after arrival_date.');
  }
  const dates = dateRange(input.arrival_date, input.departure_date);
  if (dates.length === 0) {
    throw new WriteError('The trip must span at least one day.');
  }
  if (dates.length > 366) {
    throw new WriteError('That date range is too long; a trip can span at most 366 days.');
  }

  // 1. Insert the trip, with user_id pinned to the authenticated user.
  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      user_id: ctx.userId,
      destination: input.destination,
      arrival_date: input.arrival_date,
      departure_date: input.departure_date,
      budget: input.budget ?? null,
      is_public: false,
    })
    .select('trip_id')
    .single();
  if (error || !trip) throw new WriteError(`Failed to create trip: ${error?.message ?? 'no row returned'}`);

  // 2. Owner share BEFORE days/children — child-table RLS can depend on it.
  await addOwnerShare(supabase, trip.trip_id, ctx);

  // 3. Generate one trip_days row per date in the range.
  const rows = dates.map((date) => ({ trip_id: trip.trip_id, date }));
  const { error: daysError } = await supabase.from('trip_days').insert(rows);
  if (daysError) {
    // Compensating cleanup so a days-insert failure doesn't leave an orphan trip
    // (there is no whole-trip delete tool). Best-effort; ignore cleanup errors.
    await supabase.from('trip_shares').delete().eq('trip_id', trip.trip_id);
    await supabase.from('trips').delete().eq('trip_id', trip.trip_id);
    throw new WriteError(`Failed to generate the trip's days, so the trip was not created: ${daysError.message}`);
  }

  return { trip_id: trip.trip_id, day_dates: dates };
}

// ---- Date-change content pre-check (pure) ----

export interface DroppedDayReportEntry {
  date: string;
  activities: string[];
  dining: string[];
  accommodation_nights: number;
  total: number;
}

/**
 * Pure: given the dropped days and the items currently scheduled on them,
 * build a per-day report of what would be lost. `total` is the count of items
 * at risk on that day.
 */
export function buildDroppedDayReport(
  droppedDays: Array<{ day_id: string; date: string }>,
  content: {
    activities: Array<{ day_id: string; title: string }>;
    reservations: Array<{ day_id: string; restaurant_name: string }>;
    accommodationDays: Array<{ day_id: string }>;
  },
): DroppedDayReportEntry[] {
  return droppedDays.map((day) => {
    const activities = content.activities
      .filter((a) => a.day_id === day.day_id)
      .map((a) => a.title);
    const dining = content.reservations
      .filter((r) => r.day_id === day.day_id)
      .map((r) => r.restaurant_name);
    const accommodationNights = content.accommodationDays.filter(
      (ad) => ad.day_id === day.day_id,
    ).length;
    return {
      date: day.date,
      activities,
      dining,
      accommodation_nights: accommodationNights,
      total: activities.length + dining.length + accommodationNights,
    };
  });
}
