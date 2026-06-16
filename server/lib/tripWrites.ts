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

// Re-export so the fan-out helpers below can use it without re-importing.
export { dateRange };
