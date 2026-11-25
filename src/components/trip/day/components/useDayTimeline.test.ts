import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { getTransportDisplayInfo } from './useDayTimeline';
import type { Transportation } from '@/types/trip';

const leg = (over: Partial<Transportation>) => ({
  id: 't1',
  type: 'flight',
  start_date: '2026-11-27',
  end_date: '2026-11-27',
  start_time: '12:00',
  end_time: '14:20',
  departure_location: 'Raleigh-Durham (RDU)',
  arrival_location: 'Long Island MacArthur (ISP)',
  ...over,
}) as Transportation;

describe('getTransportDisplayInfo titles', () => {
  it('shortens a flight to its IATA codes', () => {
    expect(getTransportDisplayInfo(leg({}), '2026-11-27').title).toBe('RDU → ISP');
  });

  it('keeps an endpoint without a code as typed', () => {
    expect(getTransportDisplayInfo(leg({ arrival_location: 'Islip' }), '2026-11-27').title).toBe('RDU → Islip');
  });

  it('leaves other transport types alone', () => {
    const train = leg({ type: 'train', departure_location: 'Penn Station (NYP)', arrival_location: 'Huntington' });
    expect(getTransportDisplayInfo(train, '2026-11-27').title).toBe('Penn Station (NYP) → Huntington');
  });

  it('uses the code on both halves of an overnight flight', () => {
    const redEye = leg({ end_date: '2026-11-28' });
    expect(getTransportDisplayInfo(redEye, '2026-11-27').title).toBe('RDU →');
    expect(getTransportDisplayInfo(redEye, '2026-11-28').title).toBe('→ ISP');
  });
});
