import { describe, it, expect, vi } from 'vitest';
import { buildPrintTripData, printTripDataKey } from './printTripData';

// The data module reaches the Supabase client, which validates env at import.
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

describe('printTripDataKey', () => {
  it('keys a live edition as "live" so every live reader shares one cache entry', () => {
    expect(printTripDataKey('trip-1', null)).toEqual(['print-trip-data', 'trip-1', 'live']);
  });

  it('keys a finalized edition by its timestamp so freezing swaps the source', () => {
    expect(printTripDataKey('trip-1', '2026-09-01T10:00:00Z')).toEqual([
      'print-trip-data',
      'trip-1',
      '2026-09-01T10:00:00Z',
    ]);
  });
});

describe('buildPrintTripData', () => {
  it('replays stored rows through the Studio projection', async () => {
    const trip = await buildPrintTripData({
      trip: { destination: 'Lisbon', arrival_date: '2026-05-04', departure_date: '2026-05-05' },
      days: [{ day_id: 'a', date: '2026-05-04', title: 'Arrival' }],
      stays: [],
      trans: [],
      acts: [{ day_id: 'a', title: 'Tram 28', start_time: '10:00' }],
      dine: [],
    });
    expect(trip.days[0].items.map((i) => i.title)).toEqual(['Tram 28']);
    expect(trip.cover).toBeUndefined();
  });
});
