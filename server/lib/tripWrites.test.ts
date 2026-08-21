import { describe, expect, it } from 'vitest';
import { buildDroppedDayReport } from './tripWrites';

describe('buildDroppedDayReport', () => {
  const droppedDays = [
    { day_id: 'd1', date: '2026-09-14' },
    { day_id: 'd2', date: '2026-09-15' },
  ];

  it('summarizes activities, dining, and accommodation nights per dropped day', () => {
    const report = buildDroppedDayReport(droppedDays, {
      activities: [
        { day_id: 'd1', title: 'Louvre' },
        { day_id: 'd1', title: 'Seine cruise' },
      ],
      reservations: [{ day_id: 'd2', restaurant_name: 'Le Cinq' }],
      accommodationDays: [{ day_id: 'd1' }],
    });

    expect(report).toEqual([
      {
        date: '2026-09-14',
        activities: ['Louvre', 'Seine cruise'],
        dining: [],
        accommodation_nights: 1,
        total: 3,
      },
      {
        date: '2026-09-15',
        activities: [],
        dining: ['Le Cinq'],
        accommodation_nights: 0,
        total: 1,
      },
    ]);
  });

  it('returns zero-total entries for days with no content', () => {
    const report = buildDroppedDayReport(droppedDays, {
      activities: [],
      reservations: [],
      accommodationDays: [],
    });
    expect(report.every((r) => r.total === 0)).toBe(true);
    expect(report).toHaveLength(2);
  });
});

// ---- Timezone flow-through (recording fake client) ----
//
// These guard the field-wiring bug class this repo has hit before: a new
// column added to the app but silently dropped by one of these explicit
// insert/update/select lists.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  addActivity,
  updateActivity,
  addDining,
  updateDining,
  addAccommodation,
  updateAccommodation,
  addTransportation,
  updateTransportation,
  createTrip,
  updateTrip,
} from './tripWrites';

interface FakeResponse {
  data?: unknown;
  error?: { message: string } | null;
}

interface RecordedCall {
  table: string;
  method: string;
  payload?: unknown;
  columns?: string;
}

/**
 * Chainable, thenable fake of the Supabase client. Each `await` on a chain
 * consumes the next scripted response for that table; every insert/update/
 * select call is recorded for assertions.
 */
function createFakeSupabase(responses: Record<string, FakeResponse[]>) {
  const calls: RecordedCall[] = [];
  const from = (table: string) => {
    const b: Record<string, unknown> = {};
    for (const m of ['insert', 'update', 'delete', 'select', 'eq', 'in', 'order', 'limit', 'single', 'maybeSingle']) {
      b[m] = (arg?: unknown) => {
        if (m === 'insert' || m === 'update') calls.push({ table, method: m, payload: arg });
        else if (m === 'select') calls.push({ table, method: m, columns: String(arg) });
        else if (m === 'delete') calls.push({ table, method: m });
        return b;
      };
    }
    b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
      const queue = responses[table] ?? [];
      const next = queue.length > 0 ? queue.shift() : {};
      return Promise.resolve({ data: null, error: null, ...next }).then(resolve, reject);
    };
    return b;
  };
  return { supabase: { from } as unknown as SupabaseClient, calls };
}

function lastCall(calls: RecordedCall[], table: string, method: string): RecordedCall | undefined {
  return calls.filter((c) => c.table === table && c.method === method).at(-1);
}

describe('timezone flows through write payloads and return selects', () => {
  it('addActivity persists timezone and selects it back', async () => {
    const { supabase, calls } = createFakeSupabase({
      trip_days: [{ data: { day_id: 'day-1' } }],
      day_activities: [{ data: [] }, { data: { id: 'a1' } }],
    });
    await addActivity(supabase, {
      trip_id: 'trip-1',
      date: '2026-09-14',
      title: 'Sushi class',
      timezone: 'Asia/Tokyo',
    });
    expect(lastCall(calls, 'day_activities', 'insert')?.payload).toMatchObject({ timezone: 'Asia/Tokyo' });
    expect(lastCall(calls, 'day_activities', 'select')?.columns?.split(',')).toContain('timezone');
  });

  it('updateActivity sets timezone and allows null to re-inherit the trip zone', async () => {
    const { supabase, calls } = createFakeSupabase({
      day_activities: [{ data: { id: 'a1' } }],
    });
    await updateActivity(supabase, { activity_id: 'a1', timezone: null });
    expect(lastCall(calls, 'day_activities', 'update')?.payload).toMatchObject({ timezone: null });
  });

  it('addDining persists timezone and selects it back', async () => {
    const { supabase, calls } = createFakeSupabase({
      trip_days: [{ data: { day_id: 'day-1' } }],
      reservations: [{ data: [] }, { data: { id: 'r1' } }],
    });
    await addDining(supabase, {
      trip_id: 'trip-1',
      date: '2026-09-14',
      restaurant_name: 'Le Cinq',
      timezone: 'Europe/Paris',
    });
    expect(lastCall(calls, 'reservations', 'insert')?.payload).toMatchObject({ timezone: 'Europe/Paris' });
    expect(lastCall(calls, 'reservations', 'select')?.columns?.split(',')).toContain('timezone');
  });

  it('addDining defaults the end time to 90 minutes after the start', async () => {
    const { supabase, calls } = createFakeSupabase({
      trip_days: [{ data: { day_id: 'day-1' } }],
      reservations: [{ data: [] }, { data: { id: 'r1' } }],
    });
    await addDining(supabase, {
      trip_id: 'trip-1',
      date: '2026-09-14',
      restaurant_name: 'Le Cinq',
      reservation_time: '19:30',
    });
    expect(lastCall(calls, 'reservations', 'insert')?.payload).toMatchObject({ end_time: '21:00' });
    expect(lastCall(calls, 'reservations', 'select')?.columns?.split(',')).toContain('end_time');
  });

  it('addDining keeps an explicit end time over the default', async () => {
    const { supabase, calls } = createFakeSupabase({
      trip_days: [{ data: { day_id: 'day-1' } }],
      reservations: [{ data: [] }, { data: { id: 'r1' } }],
    });
    await addDining(supabase, {
      trip_id: 'trip-1',
      date: '2026-09-14',
      restaurant_name: 'Le Cinq',
      reservation_time: '19:30',
      end_time: '22:45',
    });
    expect(lastCall(calls, 'reservations', 'insert')?.payload).toMatchObject({ end_time: '22:45' });
  });

  it('updateDining passes the end time through', async () => {
    const { supabase, calls } = createFakeSupabase({
      reservations: [{ data: { trip_id: 't1', reservation_time: '19:00:00', end_time: '20:30:00' } }, { data: { id: 'r1' } }],
    });
    await updateDining(supabase, { reservation_id: 'r1', end_time: '22:00' });
    expect(lastCall(calls, 'reservations', 'update')?.payload).toMatchObject({ end_time: '22:00' });
  });

  it('updateDining shifts the end with the start so the booking keeps its length', async () => {
    const { supabase, calls } = createFakeSupabase({
      reservations: [{ data: { trip_id: 't1', reservation_time: '19:00:00', end_time: '22:00:00' } }, { data: { id: 'r1' } }],
    });
    // A 3-hour dinner pushed two hours later is still a 3-hour dinner.
    await updateDining(supabase, { reservation_id: 'r1', reservation_time: '21:00' });
    expect(lastCall(calls, 'reservations', 'update')?.payload).toMatchObject({
      reservation_time: '21:00',
      end_time: '23:59',
    });
  });

  it('updateDining leaves a NULL end alone when only the start moves', async () => {
    const { supabase, calls } = createFakeSupabase({
      reservations: [{ data: { trip_id: 't1', reservation_time: '19:00:00', end_time: null } }, { data: { id: 'r1' } }],
    });
    await updateDining(supabase, { reservation_id: 'r1', reservation_time: '21:00' });
    expect(lastCall(calls, 'reservations', 'update')?.payload).not.toHaveProperty('end_time');
  });

  it('rejects a dining end time that is not after the start', async () => {
    const { supabase } = createFakeSupabase({
      trip_days: [{ data: { day_id: 'day-1' } }],
      reservations: [{ data: [] }, { data: { id: 'r1' } }],
    });
    await expect(
      addDining(supabase, { trip_id: 'trip-1', date: '2026-09-14', restaurant_name: 'Le Cinq', reservation_time: '19:30', end_time: '00:30' }),
    ).rejects.toThrow(/must be later than/);

    const upd = createFakeSupabase({
      reservations: [{ data: { trip_id: 't1', reservation_time: '19:00:00', end_time: '20:30:00' } }, { data: { id: 'r1' } }],
    });
    await expect(
      updateDining(upd.supabase, { reservation_id: 'r1', end_time: '18:00' }),
    ).rejects.toThrow(/must be later than/);
  });

  it('updateDining passes timezone through', async () => {
    const { supabase, calls } = createFakeSupabase({
      reservations: [{ data: { id: 'r1' } }],
    });
    await updateDining(supabase, { reservation_id: 'r1', timezone: 'Europe/Paris' });
    expect(lastCall(calls, 'reservations', 'update')?.payload).toMatchObject({ timezone: 'Europe/Paris' });
  });

  it('addAccommodation persists timezone and selects it back', async () => {
    const { supabase, calls } = createFakeSupabase({
      accommodations: [{ data: [] }, { data: { stay_id: 's1' } }],
      trip_days: [{ data: [] }],
    });
    await addAccommodation(supabase, {
      trip_id: 'trip-1',
      hotel: 'Park Hyatt',
      hotel_checkin_date: '2026-09-14',
      hotel_checkout_date: '2026-09-16',
      timezone: 'Asia/Tokyo',
    });
    expect(lastCall(calls, 'accommodations', 'insert')?.payload).toMatchObject({ timezone: 'Asia/Tokyo' });
    expect(lastCall(calls, 'accommodations', 'select')?.columns?.split(',')).toContain('timezone');
  });

  it('updateAccommodation passes timezone through', async () => {
    const { supabase, calls } = createFakeSupabase({
      accommodations: [{ data: { stay_id: 's1', trip_id: 'trip-1' } }],
    });
    await updateAccommodation(supabase, { stay_id: 's1', timezone: 'Asia/Tokyo' });
    expect(lastCall(calls, 'accommodations', 'update')?.payload).toMatchObject({ timezone: 'Asia/Tokyo' });
  });

  it('addTransportation persists both per-leg zones and selects them back', async () => {
    const { supabase, calls } = createFakeSupabase({
      transportation: [{ data: { id: 't1' } }],
    });
    await addTransportation(supabase, {
      trip_id: 'trip-1',
      type: 'flight',
      start_date: '2026-09-14',
      departure_timezone: 'America/New_York',
      arrival_timezone: 'Europe/London',
    });
    expect(lastCall(calls, 'transportation', 'insert')?.payload).toMatchObject({
      departure_timezone: 'America/New_York',
      arrival_timezone: 'Europe/London',
    });
    const columns = lastCall(calls, 'transportation', 'select')?.columns?.split(',');
    expect(columns).toContain('departure_timezone');
    expect(columns).toContain('arrival_timezone');
  });

  it('updateTransportation passes per-leg zones through, including null', async () => {
    const { supabase, calls } = createFakeSupabase({
      transportation: [{ data: { id: 't1' } }],
    });
    await updateTransportation(supabase, {
      id: 't1',
      departure_timezone: 'Europe/London',
      arrival_timezone: null,
    });
    expect(lastCall(calls, 'transportation', 'update')?.payload).toMatchObject({
      departure_timezone: 'Europe/London',
      arrival_timezone: null,
    });
  });

  it('createTrip persists the trip default timezone', async () => {
    const { supabase, calls } = createFakeSupabase({
      trips: [{ data: { trip_id: 'trip-1' } }],
      profiles: [{ data: null }],
      trip_shares: [{}],
      trip_days: [{}],
    });
    await createTrip(
      supabase,
      { userId: 'u1', email: 'kevin@wanderluxe.io' },
      {
        destination: 'Tokyo, Japan',
        arrival_date: '2026-09-14',
        departure_date: '2026-09-16',
        timezone: 'Asia/Tokyo',
      },
    );
    expect(lastCall(calls, 'trips', 'insert')?.payload).toMatchObject({ timezone: 'Asia/Tokyo' });
  });

  it('updateTrip applies timezone as a plain field update', async () => {
    const { supabase, calls } = createFakeSupabase({
      trips: [
        { data: { trip_id: 'trip-1', arrival_date: '2026-09-14', departure_date: '2026-09-16' } },
        {},
      ],
    });
    await updateTrip(supabase, { trip_id: 'trip-1', timezone: 'Asia/Tokyo' });
    expect(lastCall(calls, 'trips', 'update')?.payload).toMatchObject({ timezone: 'Asia/Tokyo' });
  });
});
