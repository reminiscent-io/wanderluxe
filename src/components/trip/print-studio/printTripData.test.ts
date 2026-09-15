import { describe, it, expect } from 'vitest';
import { PRINT_OPTS, CONTENT_WIDTH, printTripDataKey } from './printTripData';

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

  it('pins the options the document is measured at', () => {
    expect(PRINT_OPTS).toEqual({ showImages: true, showCosts: true });
    expect(CONTENT_WIDTH).toBe(800);
  });
});
