// Write functions for the MCP server. Each takes the per-request, user-scoped
// Supabase client (anon key + the caller's JWT) as its first argument, so RLS
// enforces all access control — never a service-role key. These mirror the
// business logic in the client-side services (day generation, owner share,
// order_index, accommodation night fan-out), which cannot be imported here
// because they use the browser Supabase singleton.

import type { SupabaseClient } from '@supabase/supabase-js';
import { addMinutesToTime, defaultReservationEnd, explicitReservationEnd, toMinutesOfDay } from '../../src/utils/timeUtils';
import { dateRange, planDateChange } from './tripDates';

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
  timezone?: string | null;
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
      timezone: input.timezone ?? null,
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

export interface UpdateTripInput {
  trip_id: string;
  destination?: string;
  budget?: number | null;
  timezone?: string | null;
  arrival_date?: string;
  departure_date?: string;
  confirm_remove_days?: boolean;
}

export type UpdateTripResult =
  | { status: 'updated'; trip_id: string; days_added: string[]; days_removed: string[] }
  | {
      status: 'confirmation_required';
      message: string;
      at_risk_days: DroppedDayReportEntry[];
    };

export async function updateTrip(
  supabase: SupabaseClient,
  input: UpdateTripInput,
): Promise<UpdateTripResult> {
  const { data: trip, error } = await supabase
    .from('trips')
    .select('trip_id,arrival_date,departure_date')
    .eq('trip_id', input.trip_id)
    .maybeSingle();
  if (error) throw new WriteError(`Failed to load trip: ${error.message}`);
  if (!trip) throw new WriteError('Trip not found, or you do not have access to it.');

  const newArrival = input.arrival_date ?? trip.arrival_date;
  const newDeparture = input.departure_date ?? trip.departure_date;
  if (newDeparture < newArrival) {
    throw new WriteError('departure_date must be on or after arrival_date.');
  }
  const datesChanged = newArrival !== trip.arrival_date || newDeparture !== trip.departure_date;

  // Non-date field updates always apply.
  const fieldUpdates: Record<string, unknown> = {};
  if (input.destination !== undefined) fieldUpdates.destination = input.destination;
  if (input.budget !== undefined) fieldUpdates.budget = input.budget;
  if (input.timezone !== undefined) fieldUpdates.timezone = input.timezone;

  if (!datesChanged) {
    if (Object.keys(fieldUpdates).length > 0) {
      const { error: updErr } = await supabase
        .from('trips')
        .update(fieldUpdates)
        .eq('trip_id', input.trip_id);
      if (updErr) throw new WriteError(`Failed to update trip: ${updErr.message}`);
    }
    return { status: 'updated', trip_id: input.trip_id, days_added: [], days_removed: [] };
  }

  const newRange = dateRange(newArrival, newDeparture);
  if (newRange.length > 366) {
    throw new WriteError('That date range is too long; a trip can span at most 366 days.');
  }

  // Date change: diff existing days against the new range.
  const { data: existingDays, error: daysErr } = await supabase
    .from('trip_days')
    .select('day_id,date')
    .eq('trip_id', input.trip_id);
  if (daysErr) throw new WriteError(`Failed to load trip days: ${daysErr.message}`);

  const { toAdd, toDrop } = planDateChange(
    (existingDays ?? []).map((d) => d.date),
    newRange,
  );
  const dropRows = (existingDays ?? []).filter((d) => toDrop.includes(d.date));

  // Content pre-check on the dropped days.
  if (dropRows.length > 0) {
    const dropIds = dropRows.map((d) => d.day_id);
    const [actRes, resRes, accRes] = await Promise.all([
      supabase.from('day_activities').select('day_id,title').in('day_id', dropIds),
      supabase.from('reservations').select('day_id,restaurant_name').in('day_id', dropIds),
      supabase.from('accommodations_days').select('day_id').in('day_id', dropIds),
    ]);
    if (actRes.error) throw new WriteError(`Failed to check activities: ${actRes.error.message}`);
    if (resRes.error) throw new WriteError(`Failed to check dining: ${resRes.error.message}`);
    if (accRes.error) throw new WriteError(`Failed to check accommodations: ${accRes.error.message}`);

    const report = buildDroppedDayReport(dropRows, {
      activities: actRes.data ?? [],
      reservations: resRes.data ?? [],
      accommodationDays: accRes.data ?? [],
    });
    const hasContent = report.some((r) => r.total > 0);

    if (hasContent && !input.confirm_remove_days) {
      return {
        status: 'confirmation_required',
        message:
          'This date change would remove days that still have items scheduled. ' +
          'Nothing has been changed. Show the user the at_risk_days, and if they confirm, ' +
          'call update_trip again with the same dates plus confirm_remove_days: true.',
        at_risk_days: report.filter((r) => r.total > 0),
      };
    }
  }

  // Apply: add new days first.
  if (toAdd.length > 0) {
    const { error: addErr } = await supabase
      .from('trip_days')
      .insert(toAdd.map((date) => ({ trip_id: input.trip_id, date })));
    if (addErr) throw new WriteError(`Failed to add new days: ${addErr.message}`);
  }

  // Cascade-delete dropped days' children, then the days themselves.
  if (dropRows.length > 0) {
    const dropIds = dropRows.map((d) => d.day_id);
    // Explicit cleanup. day_activities/reservations would also cascade from
    // trip_days, and their *_travelers junctions cascade from them — but
    // accommodations_days.day_id is ON DELETE NO ACTION, so its night mappings
    // MUST be deleted here before trip_days, or the trip_days delete fails.
    // (This removes accommodation NIGHT mappings on dropped days, not the
    // accommodation rows themselves.)
    for (const table of ['day_activities', 'reservations', 'accommodations_days'] as const) {
      const { error: delErr } = await supabase.from(table).delete().in('day_id', dropIds);
      if (delErr) throw new WriteError(`Failed to clear ${table}: ${delErr.message}`);
    }
    const { error: dropErr } = await supabase.from('trip_days').delete().in('day_id', dropIds);
    if (dropErr) throw new WriteError(`Failed to remove dropped days: ${dropErr.message}`);
  }

  // Finally, apply the date change (+ any field updates) to the trip row.
  const { error: updErr } = await supabase
    .from('trips')
    .update({ ...fieldUpdates, arrival_date: newArrival, departure_date: newDeparture })
    .eq('trip_id', input.trip_id);
  if (updErr) throw new WriteError(`Failed to update trip dates: ${updErr.message}`);

  return { status: 'updated', trip_id: input.trip_id, days_added: toAdd, days_removed: toDrop };
}

// ---- Activities (day_activities) ----

export interface AddActivityInput {
  trip_id: string;
  date: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  cost?: number;
  currency?: string;
  amount_paid?: number;
  is_paid?: boolean;
  location_address?: string;
  timezone?: string | null;
}

export async function addActivity(supabase: SupabaseClient, input: AddActivityInput) {
  const dayId = await resolveDayId(supabase, input.trip_id, input.date);
  const orderIndex = await nextOrderIndex(supabase, 'day_activities', 'day_id', dayId);
  const { data, error } = await supabase
    .from('day_activities')
    .insert({
      trip_id: input.trip_id,
      day_id: dayId,
      order_index: orderIndex,
      title: input.title,
      description: input.description ?? null,
      start_time: input.start_time ?? null,
      end_time: input.end_time ?? null,
      cost: input.cost ?? null,
      currency: input.currency ?? null,
      amount_paid: input.amount_paid ?? null,
      is_paid: input.is_paid ?? null,
      location_address: input.location_address ?? null,
      timezone: input.timezone ?? null,
    })
    .select('id,day_id,title,description,start_time,end_time,cost,currency,amount_paid,is_paid,location_address,timezone')
    .single();
  if (error || !data) throw new WriteError(`Failed to add activity: ${error?.message ?? 'no row returned'}`);
  return data;
}

export interface UpdateActivityInput {
  activity_id: string;
  date?: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  cost?: number;
  currency?: string;
  amount_paid?: number;
  is_paid?: boolean;
  location_address?: string;
  timezone?: string | null;
}

export async function updateActivity(supabase: SupabaseClient, input: UpdateActivityInput) {
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.start_time !== undefined) updates.start_time = input.start_time;
  if (input.end_time !== undefined) updates.end_time = input.end_time;
  if (input.cost !== undefined) updates.cost = input.cost;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.amount_paid !== undefined) updates.amount_paid = input.amount_paid;
  if (input.is_paid !== undefined) updates.is_paid = input.is_paid;
  if (input.location_address !== undefined) updates.location_address = input.location_address;
  if (input.timezone !== undefined) updates.timezone = input.timezone;

  // Changing the date re-resolves day_id (scoped to the activity's own trip).
  if (input.date !== undefined) {
    const { data: existing, error: exErr } = await supabase
      .from('day_activities')
      .select('trip_id')
      .eq('id', input.activity_id)
      .maybeSingle();
    if (exErr) throw new WriteError(`Failed to load activity: ${exErr.message}`);
    if (!existing) throw new WriteError('Activity not found, or you do not have access to it.');
    updates.day_id = await resolveDayId(supabase, existing.trip_id, input.date);
  }

  if (Object.keys(updates).length === 0) {
    throw new WriteError('Nothing to update: provide at least one field to change.');
  }

  const { data, error } = await supabase
    .from('day_activities')
    .update(updates)
    .eq('id', input.activity_id)
    .select('id,day_id,title,description,start_time,end_time,cost,currency,amount_paid,is_paid,location_address,timezone')
    .maybeSingle();
  if (error) throw new WriteError(`Failed to update activity: ${error.message}`);
  if (!data) throw new WriteError('Activity not found, or you do not have access to it.');
  return data;
}

export async function deleteActivity(supabase: SupabaseClient, activityId: string) {
  const { data, error } = await supabase
    .from('day_activities')
    .delete()
    .eq('id', activityId)
    .select('id');
  if (error) throw new WriteError(`Failed to delete activity: ${error.message}`);
  if (!data || data.length === 0) {
    throw new WriteError('Activity not found, or you do not have access to it.');
  }
  return { deleted: true, id: activityId };
}

// ---- Dining (reservations) ----

export interface AddDiningInput {
  trip_id: string;
  date: string;
  restaurant_name: string;
  reservation_time?: string;
  end_time?: string;
  number_of_people?: number;
  address?: string;
  confirmation_number?: string;
  notes?: string;
  cost?: number;
  currency?: string;
  amount_paid?: number;
  is_paid?: boolean;
  timezone?: string | null;
}

/**
 * A reservation has a start date and two wall-clock times but no end date, so an
 * end at or before its start has nowhere to live — it renders backwards on the
 * timeline and emits DTEND < DTSTART in the feed. The form's zod schema rejects
 * it; the MCP tools need the same guard, since their per-field regex cannot see
 * across two fields.
 */
function assertDiningTimesOrdered(reservationTime?: string | null, endTime?: string | null) {
  if (!reservationTime || !endTime) return;
  if (explicitReservationEnd(reservationTime, endTime)) return;
  throw new WriteError(
    `end_time (${endTime}) must be later than reservation_time (${reservationTime}); a reservation cannot run past midnight.`,
  );
}

export async function addDining(supabase: SupabaseClient, input: AddDiningInput) {
  assertDiningTimesOrdered(input.reservation_time, input.end_time);
  const dayId = await resolveDayId(supabase, input.trip_id, input.date);
  const orderIndex = await nextOrderIndex(supabase, 'reservations', 'day_id', dayId);
  const { data, error } = await supabase
    .from('reservations')
    .insert({
      trip_id: input.trip_id,
      day_id: dayId,
      order_index: orderIndex,
      restaurant_name: input.restaurant_name,
      reservation_time: input.reservation_time ?? null,
      // Same 90-minute default the reservation form applies, so an
      // agent-created dinner and a hand-created one are indistinguishable.
      end_time: input.end_time ?? defaultReservationEnd(input.reservation_time),

      number_of_people: input.number_of_people ?? null,
      address: input.address ?? null,
      confirmation_number: input.confirmation_number ?? null,
      notes: input.notes ?? null,
      cost: input.cost ?? null,
      currency: input.currency ?? null,
      amount_paid: input.amount_paid ?? null,
      is_paid: input.is_paid ?? null,
      timezone: input.timezone ?? null,
    })
    .select(
      'id,day_id,restaurant_name,reservation_time,end_time,number_of_people,address,confirmation_number,notes,cost,currency,amount_paid,is_paid,timezone',
    )
    .single();
  if (error || !data) throw new WriteError(`Failed to add dining reservation: ${error?.message ?? 'no row returned'}`);
  return data;
}

export interface UpdateDiningInput {
  reservation_id: string;
  date?: string;
  restaurant_name?: string;
  reservation_time?: string;
  end_time?: string;
  number_of_people?: number;
  address?: string;
  confirmation_number?: string;
  notes?: string;
  cost?: number;
  currency?: string;
  amount_paid?: number;
  is_paid?: boolean;
  timezone?: string | null;
}

export async function updateDining(supabase: SupabaseClient, input: UpdateDiningInput) {
  const updates: Record<string, unknown> = {};
  if (input.restaurant_name !== undefined) updates.restaurant_name = input.restaurant_name;
  if (input.reservation_time !== undefined) updates.reservation_time = input.reservation_time;
  if (input.end_time !== undefined) updates.end_time = input.end_time;
  if (input.number_of_people !== undefined) updates.number_of_people = input.number_of_people;
  if (input.address !== undefined) updates.address = input.address;
  if (input.confirmation_number !== undefined) updates.confirmation_number = input.confirmation_number;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.cost !== undefined) updates.cost = input.cost;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.amount_paid !== undefined) updates.amount_paid = input.amount_paid;
  if (input.is_paid !== undefined) updates.is_paid = input.is_paid;
  if (input.timezone !== undefined) updates.timezone = input.timezone;

  // Anything that touches one half of the time pair has to see the other half:
  // to shift the end with the start, and to range-check an end against a start
  // the caller did not resend.
  const movingStart = input.reservation_time !== undefined && input.end_time === undefined;
  const needsExisting = input.date !== undefined || movingStart || input.end_time !== undefined;

  if (needsExisting) {
    const { data: existing, error: exErr } = await supabase
      .from('reservations')
      .select('trip_id,reservation_time,end_time')
      .eq('id', input.reservation_id)
      .maybeSingle();
    if (exErr) throw new WriteError(`Failed to load reservation: ${exErr.message}`);
    if (!existing) throw new WriteError('Reservation not found, or you do not have access to it.');

    if (input.date !== undefined) {
      updates.day_id = await resolveDayId(supabase, existing.trip_id, input.date);
    }

    if (input.end_time !== undefined) {
      assertDiningTimesOrdered(input.reservation_time ?? existing.reservation_time, input.end_time);
    }

    // "Push dinner to 9pm" on a 19:00-20:30 row must not store 21:00-20:30.
    // Shift the end by the same delta so the booking keeps its length.
    if (movingStart) {
      const previousStart = toMinutesOfDay(existing.reservation_time);
      const previousEnd = toMinutesOfDay(existing.end_time);
      if (previousStart !== null && previousEnd !== null && previousEnd > previousStart) {
        updates.end_time = addMinutesToTime(input.reservation_time, previousEnd - previousStart);
      } else if (existing.end_time) {
        // An end we cannot shift coherently is worse than none at all.
        updates.end_time = defaultReservationEnd(input.reservation_time);
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new WriteError('Nothing to update: provide at least one field to change.');
  }

  const { data, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', input.reservation_id)
    .select(
      'id,day_id,restaurant_name,reservation_time,end_time,number_of_people,address,confirmation_number,notes,cost,currency,amount_paid,is_paid,timezone',
    )
    .maybeSingle();
  if (error) throw new WriteError(`Failed to update reservation: ${error.message}`);
  if (!data) throw new WriteError('Reservation not found, or you do not have access to it.');
  return data;
}

export async function deleteDining(supabase: SupabaseClient, reservationId: string) {
  const { data, error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', reservationId)
    .select('id');
  if (error) throw new WriteError(`Failed to delete reservation: ${error.message}`);
  if (!data || data.length === 0) {
    throw new WriteError('Reservation not found, or you do not have access to it.');
  }
  return { deleted: true, id: reservationId };
}

// ---- Accommodations ----

/** Fan out accommodations_days for a stay across its nights' trip days. */
async function fanOutAccommodationDays(
  supabase: SupabaseClient,
  stayId: string,
  tripId: string,
  checkinDate: string,
  checkoutDate: string,
): Promise<void> {
  const nights = dateRange(checkinDate, checkoutDate);
  const { data: days, error } = await supabase
    .from('trip_days')
    .select('day_id,date')
    .eq('trip_id', tripId);
  if (error) throw new WriteError(`Failed to load trip days: ${error.message}`);

  const dayByDate = new Map((days ?? []).map((d) => [d.date, d.day_id]));
  const rows = nights
    .map((date) => {
      const dayId = dayByDate.get(date);
      return dayId ? { stay_id: stayId, day_id: dayId, date } : null;
    })
    .filter((r): r is { stay_id: string; day_id: string; date: string } => r !== null);

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from('accommodations_days').insert(rows);
    if (insErr) throw new WriteError(`Failed to map accommodation nights: ${insErr.message}`);
  }
}

export interface AddAccommodationInput {
  trip_id: string;
  hotel: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  hotel_address?: string;
  checkin_time?: string;
  checkout_time?: string;
  hotel_phone?: string;
  hotel_website?: string;
  hotel_details?: string;
  cost?: number;
  currency?: string;
  amount_paid?: number;
  is_paid?: boolean;
  timezone?: string | null;
}

export async function addAccommodation(supabase: SupabaseClient, input: AddAccommodationInput) {
  if (input.hotel_checkout_date < input.hotel_checkin_date) {
    throw new WriteError('hotel_checkout_date must be on or after hotel_checkin_date.');
  }
  const orderIndex = await nextOrderIndex(supabase, 'accommodations', 'trip_id', input.trip_id);
  const { data, error } = await supabase
    .from('accommodations')
    .insert({
      trip_id: input.trip_id,
      order_index: orderIndex,
      title: input.hotel,
      hotel: input.hotel,
      hotel_address: input.hotel_address ?? null,
      hotel_checkin_date: input.hotel_checkin_date,
      hotel_checkout_date: input.hotel_checkout_date,
      checkin_time: input.checkin_time ?? null,
      checkout_time: input.checkout_time ?? null,
      hotel_phone: input.hotel_phone ?? null,
      hotel_website: input.hotel_website ?? null,
      hotel_details: input.hotel_details ?? null,
      cost: input.cost ?? null,
      currency: input.currency ?? null,
      amount_paid: input.amount_paid ?? null,
      is_paid: input.is_paid ?? null,
      timezone: input.timezone ?? null,
    })
    .select(
      'stay_id,hotel,hotel_address,hotel_checkin_date,hotel_checkout_date,checkin_time,checkout_time,hotel_phone,hotel_website,hotel_details,cost,currency,amount_paid,is_paid,timezone',
    )
    .single();
  if (error || !data) throw new WriteError(`Failed to add accommodation: ${error?.message ?? 'no row returned'}`);

  await fanOutAccommodationDays(
    supabase,
    data.stay_id,
    input.trip_id,
    input.hotel_checkin_date,
    input.hotel_checkout_date,
  );
  return data;
}

export interface UpdateAccommodationInput {
  stay_id: string;
  hotel?: string;
  hotel_address?: string;
  hotel_checkin_date?: string;
  hotel_checkout_date?: string;
  checkin_time?: string;
  checkout_time?: string;
  hotel_phone?: string;
  hotel_website?: string;
  hotel_details?: string;
  cost?: number;
  currency?: string;
  amount_paid?: number;
  is_paid?: boolean;
  timezone?: string | null;
}

export async function updateAccommodation(supabase: SupabaseClient, input: UpdateAccommodationInput) {
  const updates: Record<string, unknown> = {};
  if (input.hotel !== undefined) {
    updates.hotel = input.hotel;
    updates.title = input.hotel; // title tracks hotel name, matching the app
  }
  if (input.hotel_address !== undefined) updates.hotel_address = input.hotel_address;
  if (input.hotel_checkin_date !== undefined) updates.hotel_checkin_date = input.hotel_checkin_date;
  if (input.hotel_checkout_date !== undefined) updates.hotel_checkout_date = input.hotel_checkout_date;
  if (input.checkin_time !== undefined) updates.checkin_time = input.checkin_time;
  if (input.checkout_time !== undefined) updates.checkout_time = input.checkout_time;
  if (input.hotel_phone !== undefined) updates.hotel_phone = input.hotel_phone;
  if (input.hotel_website !== undefined) updates.hotel_website = input.hotel_website;
  if (input.hotel_details !== undefined) updates.hotel_details = input.hotel_details;
  if (input.cost !== undefined) updates.cost = input.cost;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.amount_paid !== undefined) updates.amount_paid = input.amount_paid;
  if (input.is_paid !== undefined) updates.is_paid = input.is_paid;
  if (input.timezone !== undefined) updates.timezone = input.timezone;

  if (Object.keys(updates).length === 0) {
    throw new WriteError('Nothing to update: provide at least one field to change.');
  }

  const datesChanged =
    input.hotel_checkin_date !== undefined || input.hotel_checkout_date !== undefined;

  // When changing either date, validate the EFFECTIVE range (new value or the
  // existing one) before writing, so we never persist checkin > checkout (which
  // would also wipe the night mappings via the re-fan with nothing to re-insert).
  if (datesChanged) {
    const { data: existing, error: exErr } = await supabase
      .from('accommodations')
      .select('hotel_checkin_date,hotel_checkout_date')
      .eq('stay_id', input.stay_id)
      .maybeSingle();
    if (exErr) throw new WriteError(`Failed to load accommodation: ${exErr.message}`);
    if (!existing) throw new WriteError('Accommodation not found, or you do not have access to it.');
    const effectiveCheckin = input.hotel_checkin_date ?? existing.hotel_checkin_date;
    const effectiveCheckout = input.hotel_checkout_date ?? existing.hotel_checkout_date;
    if (effectiveCheckin && effectiveCheckout && effectiveCheckout < effectiveCheckin) {
      throw new WriteError('hotel_checkout_date must be on or after hotel_checkin_date.');
    }
  }

  const { data, error } = await supabase
    .from('accommodations')
    .update(updates)
    .eq('stay_id', input.stay_id)
    .select(
      'stay_id,trip_id,hotel,hotel_address,hotel_checkin_date,hotel_checkout_date,checkin_time,checkout_time,hotel_phone,hotel_website,hotel_details,cost,currency,amount_paid,is_paid,timezone',
    )
    .maybeSingle();
  if (error) throw new WriteError(`Failed to update accommodation: ${error.message}`);
  if (!data) throw new WriteError('Accommodation not found, or you do not have access to it.');

  // If either date changed, re-fan the night mappings.
  if (datesChanged) {
    if (data.hotel_checkin_date && data.hotel_checkout_date) {
      const { error: delErr } = await supabase
        .from('accommodations_days')
        .delete()
        .eq('stay_id', input.stay_id);
      if (delErr) throw new WriteError(`Failed to clear accommodation nights: ${delErr.message}`);
      await fanOutAccommodationDays(
        supabase,
        input.stay_id,
        data.trip_id,
        data.hotel_checkin_date,
        data.hotel_checkout_date,
      );
    }
  }
  const { trip_id: _omit, ...rest } = data;
  return rest;
}

export async function deleteAccommodation(supabase: SupabaseClient, stayId: string) {
  // Clear night mappings first (don't rely on FK cascade config).
  const { error: daysErr } = await supabase
    .from('accommodations_days')
    .delete()
    .eq('stay_id', stayId);
  if (daysErr) throw new WriteError(`Failed to clear accommodation nights: ${daysErr.message}`);

  const { data, error } = await supabase
    .from('accommodations')
    .delete()
    .eq('stay_id', stayId)
    .select('stay_id');
  if (error) throw new WriteError(`Failed to delete accommodation: ${error.message}`);
  if (!data || data.length === 0) {
    throw new WriteError('Accommodation not found, or you do not have access to it.');
  }
  return { deleted: true, stay_id: stayId };
}

// ---- Transportation ----

export type TransportationType =
  | 'flight'
  | 'train'
  | 'car_service'
  | 'shuttle'
  | 'ferry'
  | 'rental_car';

export interface AddTransportationInput {
  trip_id: string;
  type: TransportationType;
  start_date: string;
  provider?: string;
  details?: string;
  flight_number?: string;
  confirmation_number?: string;
  departure_location?: string;
  arrival_location?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  cost?: number;
  currency?: string;
  departure_timezone?: string | null;
  arrival_timezone?: string | null;
}

const TRANSPORT_SELECT =
  'id,type,provider,details,flight_number,confirmation_number,departure_location,arrival_location,start_date,start_time,end_date,end_time,cost,currency,departure_timezone,arrival_timezone';

export async function addTransportation(supabase: SupabaseClient, input: AddTransportationInput) {
  const { data, error } = await supabase
    .from('transportation')
    .insert({
      trip_id: input.trip_id,
      type: input.type,
      start_date: input.start_date,
      provider: input.provider ?? null,
      details: input.details ?? null,
      flight_number: input.flight_number ?? null,
      confirmation_number: input.confirmation_number ?? null,
      departure_location: input.departure_location ?? null,
      arrival_location: input.arrival_location ?? null,
      start_time: input.start_time ?? null,
      end_date: input.end_date ?? null,
      end_time: input.end_time ?? null,
      cost: input.cost ?? null,
      currency: input.currency ?? null,
      departure_timezone: input.departure_timezone ?? null,
      arrival_timezone: input.arrival_timezone ?? null,
    })
    .select(TRANSPORT_SELECT)
    .single();
  if (error || !data) throw new WriteError(`Failed to add transportation: ${error?.message ?? 'no row returned'}`);
  return data;
}

export interface UpdateTransportationInput {
  id: string;
  type?: TransportationType;
  start_date?: string;
  provider?: string;
  details?: string;
  flight_number?: string;
  confirmation_number?: string;
  departure_location?: string;
  arrival_location?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  cost?: number;
  currency?: string;
  departure_timezone?: string | null;
  arrival_timezone?: string | null;
}

export async function updateTransportation(supabase: SupabaseClient, input: UpdateTransportationInput) {
  const updates: Record<string, unknown> = {};
  if (input.type !== undefined) updates.type = input.type;
  if (input.start_date !== undefined) updates.start_date = input.start_date;
  if (input.provider !== undefined) updates.provider = input.provider;
  if (input.details !== undefined) updates.details = input.details;
  if (input.flight_number !== undefined) updates.flight_number = input.flight_number;
  if (input.confirmation_number !== undefined) updates.confirmation_number = input.confirmation_number;
  if (input.departure_location !== undefined) updates.departure_location = input.departure_location;
  if (input.arrival_location !== undefined) updates.arrival_location = input.arrival_location;
  if (input.start_time !== undefined) updates.start_time = input.start_time;
  if (input.end_date !== undefined) updates.end_date = input.end_date;
  if (input.end_time !== undefined) updates.end_time = input.end_time;
  if (input.cost !== undefined) updates.cost = input.cost;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.departure_timezone !== undefined) updates.departure_timezone = input.departure_timezone;
  if (input.arrival_timezone !== undefined) updates.arrival_timezone = input.arrival_timezone;

  if (Object.keys(updates).length === 0) {
    throw new WriteError('Nothing to update: provide at least one field to change.');
  }

  const { data, error } = await supabase
    .from('transportation')
    .update(updates)
    .eq('id', input.id)
    .select(TRANSPORT_SELECT)
    .maybeSingle();
  if (error) throw new WriteError(`Failed to update transportation: ${error.message}`);
  if (!data) throw new WriteError('Transportation not found, or you do not have access to it.');
  return data;
}

export async function deleteTransportation(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('transportation')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new WriteError(`Failed to delete transportation: ${error.message}`);
  if (!data || data.length === 0) {
    throw new WriteError('Transportation not found, or you do not have access to it.');
  }
  return { deleted: true, id };
}

// ---- Other expenses ----

const EXPENSE_SELECT = 'id,description,date,cost,currency,amount_paid,is_paid';

export interface AddExpenseInput {
  trip_id: string;
  description: string;
  cost: number;
  currency: string;
  date?: string;
  amount_paid?: number;
  is_paid?: boolean;
}

export async function addExpense(supabase: SupabaseClient, input: AddExpenseInput) {
  const { data, error } = await supabase
    .from('other_expenses')
    .insert({
      trip_id: input.trip_id,
      description: input.description,
      cost: input.cost,
      currency: input.currency,
      date: input.date ?? null,
      amount_paid: input.amount_paid ?? null,
      is_paid: input.is_paid ?? null,
    })
    .select(EXPENSE_SELECT)
    .single();
  if (error || !data) throw new WriteError(`Failed to add expense: ${error?.message ?? 'no row returned'}`);
  return data;
}

export interface UpdateExpenseInput {
  id: string;
  description?: string;
  cost?: number;
  currency?: string;
  date?: string;
  amount_paid?: number;
  is_paid?: boolean;
}

export async function updateExpense(supabase: SupabaseClient, input: UpdateExpenseInput) {
  const updates: Record<string, unknown> = {};
  if (input.description !== undefined) updates.description = input.description;
  if (input.cost !== undefined) updates.cost = input.cost;
  if (input.currency !== undefined) updates.currency = input.currency;
  if (input.date !== undefined) updates.date = input.date;
  if (input.amount_paid !== undefined) updates.amount_paid = input.amount_paid;
  if (input.is_paid !== undefined) updates.is_paid = input.is_paid;

  if (Object.keys(updates).length === 0) {
    throw new WriteError('Nothing to update: provide at least one field to change.');
  }

  const { data, error } = await supabase
    .from('other_expenses')
    .update(updates)
    .eq('id', input.id)
    .select(EXPENSE_SELECT)
    .maybeSingle();
  if (error) throw new WriteError(`Failed to update expense: ${error.message}`);
  if (!data) throw new WriteError('Expense not found, or you do not have access to it.');
  return data;
}

export async function deleteExpense(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('other_expenses')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new WriteError(`Failed to delete expense: ${error.message}`);
  if (!data || data.length === 0) {
    throw new WriteError('Expense not found, or you do not have access to it.');
  }
  return { deleted: true, id };
}
