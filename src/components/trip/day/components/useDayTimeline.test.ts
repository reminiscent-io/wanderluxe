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
  const title = (over: Partial<Transportation>, day = '2026-11-27') => getTransportDisplayInfo(leg(over), day).title;

  it('prints a flight as typed when the pair fits two lines', () => {
    expect(title({ departure_location: 'Raleigh (RDU)', arrival_location: 'Islip (ISP)' })).toBe('Raleigh (RDU) → Islip (ISP)');
  });

  it('sheds the codes before the names', () => {
    expect(title({})).toBe('Raleigh-Durham → Long Island MacArthur');
  });

  it('falls back to codes when the names alone are still too long', () => {
    expect(title({
      departure_location: 'John F. Kennedy International Airport (JFK)',
      arrival_location: 'Charles de Gaulle Airport (CDG)',
    })).toBe('JFK → CDG');
  });

  it('never shortens an endpoint that has no code', () => {
    expect(title({
      departure_location: 'John F. Kennedy International Airport (JFK)',
      arrival_location: 'Somewhere outside Paris, to be confirmed',
    })).toBe('JFK → Somewhere outside Paris, to be confirmed');
  });

  it('leaves other transport types alone', () => {
    expect(title({ type: 'train', departure_location: 'Pennsylvania Station, New York (NYP)', arrival_location: 'Huntington Station' }))
      .toBe('Pennsylvania Station, New York (NYP) → Huntington Station');
  });

  it('prints each half of an overnight flight as typed', () => {
    expect(title({ end_date: '2026-11-28' })).toBe('Raleigh-Durham (RDU) →');
    expect(title({ end_date: '2026-11-28' }, '2026-11-28')).toBe('→ Long Island MacArthur (ISP)');
  });
});
