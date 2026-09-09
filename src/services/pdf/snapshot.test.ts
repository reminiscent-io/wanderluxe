// The snapshot shape contract, tested end to end.
//
// server/lib/printSnapshot.ts builds the frozen itinerary a finalized Print
// Studio edition renders from, and src/services/pdf/data.ts renders it. They
// cannot share a type: server/ sits outside every tsconfig project and is
// bundled by esbuild, and this module pulls in the browser Supabase client.
// So the contract is held here instead — the real server function, fed by a
// stub client, handed straight to the real renderer.
//
// If either side drifts, this fails rather than a finalized edition rendering
// as an empty document in someone's browser months later.

import { describe, it, expect, vi } from 'vitest';

// data.ts imports the browser Supabase client for the live-fetch path, which
// wants real env vars. Nothing here touches it — both cases render from rows
// handed in directly.
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
import { fetchTripSnapshot, SNAPSHOT_VERSION } from '../../../server/lib/printSnapshot';
import { buildPdfTripData, type PdfTripRows } from './data';

/* -------------------------------------------------------------- the rows -- */

type Row = Record<string, unknown>;

const TRIP: Row = {
  destination: 'Naxos',
  arrival_date: '2026-06-01',
  departure_date: '2026-06-03',
  cover_image_url: null,
  budget: 4000,
  timezone: 'Europe/Athens',
};

const DAYS: Row[] = [
  { day_id: 'day-1', date: '2026-06-01', title: 'Arrival', description: 'Ferry in.' },
  { day_id: 'day-2', date: '2026-06-02', title: 'Inland', description: null },
];

const STAYS: Row[] = [
  {
    stay_id: 'stay-1',
    hotel: 'Hotel Kalimera',
    hotel_address: 'Chora, Naxos',
    hotel_checkin_date: '2026-06-01',
    hotel_checkout_date: '2026-06-03',
    checkin_time: '15:00',
    checkout_time: '11:00',
    cost: 900,
    currency: 'EUR',
    timezone: null,
    hotel_phone: '+30 22850 00000',
    image_url: null,
  },
];

const TRANS: Row[] = [
  {
    id: 'trans-1',
    type: 'ferry',
    provider: 'Blue Star',
    departure_location: 'Piraeus',
    arrival_location: 'Naxos',
    start_date: '2026-06-01',
    start_time: '07:25',
    end_time: '12:40',
    cost: 120,
    currency: 'EUR',
    confirmation_number: 'BS-4471',
    departure_timezone: null,
    arrival_timezone: null,
    details: null,
  },
];

const ACTS: Row[] = [
  {
    id: 'act-1',
    day_id: 'day-2',
    title: 'Drive to Apeiranthos',
    description: 'Marble village, slow lunch.',
    start_time: '10:00',
    end_time: '15:00',
    cost: 40,
    currency: 'EUR',
    timezone: null,
    image_url: null,
  },
];

const DINE: Row[] = [
  {
    id: 'res-1',
    day_id: 'day-1',
    restaurant_name: 'To Elliniko',
    reservation_time: '21:00',
    end_time: null,
    cost: 85,
    currency: 'EUR',
    confirmation_number: 'TE-9',
    timezone: null,
    notes: null,
    address: null,
  },
];

const OTHER: Row[] = [{ id: 'exp-1', description: 'Ferry parking', cost: 30, currency: 'EUR' }];

const TABLE_DATA: Record<string, unknown> = {
  trips: TRIP,
  trip_days: DAYS,
  accommodations: STAYS,
  transportation: TRANS,
  day_activities: ACTS,
  reservations: DINE,
  other_expenses: OTHER,
};

/* ------------------------------------------------------- the stub client -- */

/**
 * Enough of the Supabase query builder for fetchTripSnapshot: every step
 * returns the same thenable, so `.select().eq().order()` and
 * `.select().eq().single()` both resolve to { data, error }.
 */
function stubClient(data: Record<string, unknown> = TABLE_DATA) {
  const make = (table: string) => {
    const result: { data: unknown; error: unknown } = { data: data[table] ?? null, error: null };
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      single: () => Promise.resolve(result),
      maybeSingle: () => Promise.resolve(result),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
    };
    return chain;
  };
  return { from: (table: string) => make(table) } as never;
}

/* -------------------------------------------------------------- the test -- */

describe('print snapshot → document', () => {
  it('produces every key the renderer reads', async () => {
    const snapshot = await fetchTripSnapshot(stubClient(), 'trip-1');
    expect(snapshot).not.toBeNull();

    const rendererKeys: Array<keyof PdfTripRows> = [
      'trip',
      'days',
      'stays',
      'trans',
      'acts',
      'dine',
      'otherExpenses',
    ];
    for (const key of rendererKeys) {
      expect(snapshot).toHaveProperty(key);
    }
    expect(snapshot!.snapshotVersion).toBe(SNAPSHOT_VERSION);
  });

  it('renders a complete document straight from a snapshot', async () => {
    const snapshot = await fetchTripSnapshot(stubClient(), 'trip-1');
    const doc = await buildPdfTripData(
      snapshot as unknown as PdfTripRows,
      { showImages: false, showCosts: true },
      800
    );

    expect(doc.destination).toBe('Naxos');
    expect(doc.days).toHaveLength(2);

    // The whole point of freezing rows rather than a rendered file: every
    // booked item still has to come out the other side.
    const titles = doc.days.flatMap((d) => d.items.map((i) => i.title)).join(' | ');
    expect(titles).toContain('Hotel Kalimera');
    expect(titles).toContain('Drive to Apeiranthos');
    expect(titles).toContain('To Elliniko');

    expect(doc.stays.map((s) => s.hotel)).toContain('Hotel Kalimera');
    expect(doc.transports.map((t) => t.to)).toContain('Naxos');
    expect(doc.diningRefs.map((r) => r.confirmationNumber)).toContain('TE-9');

    // Costs from all five sources reach the ledger.
    expect(doc.budgetData.total).toBe(900 + 120 + 40 + 85 + 30);
    expect(doc.budgetData.budget).toBe(4000);
  });

  it('renders the same document from a snapshot as from live rows', async () => {
    // A finalized edition and a live one differ only in when the rows were
    // read — never in how they are drawn.
    const snapshot = await fetchTripSnapshot(stubClient(), 'trip-1');
    const fromSnapshot = await buildPdfTripData(
      snapshot as unknown as PdfTripRows,
      { showImages: false, showCosts: true },
      800
    );
    const fromLive = await buildPdfTripData(
      {
        trip: TRIP,
        days: DAYS,
        stays: STAYS,
        trans: TRANS,
        acts: ACTS,
        dine: DINE,
        otherExpenses: OTHER,
      } as unknown as PdfTripRows,
      { showImages: false, showCosts: true },
      800
    );

    expect(fromSnapshot).toEqual(fromLive);
  });

  it('returns null when the trip is gone, so finalize 404s instead of freezing nothing', async () => {
    const snapshot = await fetchTripSnapshot(stubClient({ ...TABLE_DATA, trips: null }), 'trip-1');
    expect(snapshot).toBeNull();
  });
});
