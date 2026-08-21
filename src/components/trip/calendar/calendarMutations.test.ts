import { describe, it, expect, vi, beforeEach } from 'vitest';

const { updateEq, updateFn, selectMaybeSingle, fromFn, updateAccommodation } = vi.hoisted(() => {
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const updateFn = vi.fn(() => ({ eq: updateEq }));
  const selectMaybeSingle = vi.fn();
  const fromFn = vi.fn((table: string) => {
    if (table === 'trip_days') {
      return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: selectMaybeSingle }) }) }) };
    }
    return { update: updateFn };
  });
  const updateAccommodation = vi.fn().mockResolvedValue({});
  return { updateEq, updateFn, selectMaybeSingle, fromFn, updateAccommodation };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: fromFn } }));
vi.mock('@/services/accommodation/accommodationService', () => ({ updateAccommodation: (...a: unknown[]) => updateAccommodation(...a) }));

import { applyDropPatch } from './calendarMutations';

describe('applyDropPatch', () => {
  beforeEach(() => { updateFn.mockClear(); updateEq.mockClear(); updateAccommodation.mockClear(); selectMaybeSingle.mockReset(); });

  it('updates an activity day_id + times after resolving the day', async () => {
    selectMaybeSingle.mockResolvedValue({ data: { day_id: 'd2' }, error: null });
    await applyDropPatch({ entityType: 'activity', recordId: 'a1', date: '2026-07-02', startTime: '09:15', endTime: '10:00' }, 't1', null);
    expect(updateFn).toHaveBeenCalledWith({ day_id: 'd2', start_time: '09:15', end_time: '10:00' });
    expect(updateEq).toHaveBeenCalledWith('id', 'a1');
  });

  it('updates a reservation day_id + times after resolving the day', async () => {
    selectMaybeSingle.mockResolvedValue({ data: { day_id: 'd2' }, error: null });
    await applyDropPatch({ entityType: 'dining', recordId: 'r1', date: '2026-07-02', time: '19:30', endTime: '21:45' }, 't1', null);
    expect(updateFn).toHaveBeenCalledWith({ day_id: 'd2', reservation_time: '19:30', end_time: '21:45' });
    expect(updateEq).toHaveBeenCalledWith('id', 'r1');
  });

  it('throws when the target date has no trip day', async () => {
    selectMaybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(applyDropPatch({ entityType: 'dining', recordId: 'r1', date: '2030-01-01', time: '20:00', endTime: null }, 't1', null)).rejects.toThrow();
  });

  it('updates transportation dates/times directly', async () => {
    await applyDropPatch({ entityType: 'transportation', recordId: 'tr1', startDate: '2026-07-01', startTime: null, endDate: '2026-07-02', endTime: null }, 't1', null);
    expect(updateFn).toHaveBeenCalledWith({ start_date: '2026-07-01', start_time: null, end_date: '2026-07-02', end_time: null });
  });

  it('reconstructs form data and delegates accommodation to updateAccommodation', async () => {
    const stay = { stay_id: 's1', hotel: 'Lutetia', hotel_details: null, hotel_url: null, hotel_address: null, hotel_phone: null, hotel_website: null, hotel_place_id: null, checkin_time: '15:00', checkout_time: '11:00', cost: 300, currency: 'EUR' };
    await applyDropPatch({ entityType: 'accommodation', recordId: 's1', checkinDate: '2026-07-01', checkoutDate: '2026-07-04' }, 't1', stay);
    expect(updateAccommodation).toHaveBeenCalledWith('s1', expect.objectContaining({ hotel: 'Lutetia', hotel_checkin_date: '2026-07-01', hotel_checkout_date: '2026-07-04', cost: '300', currency: 'EUR' }));
  });
});
