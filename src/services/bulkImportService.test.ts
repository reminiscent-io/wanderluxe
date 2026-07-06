import { describe, it, expect, vi, beforeEach } from 'vitest';

const { insertFn, fromFn } = vi.hoisted(() => {
  const insertFn = vi.fn().mockResolvedValue({ error: null });
  const fromFn = vi.fn(() => ({ insert: insertFn }));
  return { insertFn, fromFn };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: fromFn } }));

import bulkImportService from './bulkImportService';

const { importAccommodation } = bulkImportService;

describe('importAccommodation', () => {
  beforeEach(() => {
    insertFn.mockClear();
    fromFn.mockClear();
  });

  it('includes the NOT NULL columns title and order_index in the insert payload', async () => {
    const result = await importAccommodation('trip-1', {
      name: 'Hotel Lutetia',
      check_in_date: '2026-07-01',
      check_out_date: '2026-07-04',
    });

    expect(result.success).toBe(true);
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Hotel Lutetia',
        order_index: 0,
      })
    );
  });

  it('falls back to a non-empty title when the extraction has no name', async () => {
    await importAccommodation('trip-1', {
      check_in_date: '2026-07-01',
      check_out_date: '2026-07-04',
    });

    const payload = insertFn.mock.calls[0][0];
    expect(typeof payload.title).toBe('string');
    expect(payload.title.length).toBeGreaterThan(0);
  });

  it('sends null instead of empty strings for missing check-in/check-out dates', async () => {
    await importAccommodation('trip-1', { name: 'Hotel Lutetia' });

    const payload = insertFn.mock.calls[0][0];
    expect(payload.hotel_checkin_date).toBeNull();
    expect(payload.hotel_checkout_date).toBeNull();
  });
});
