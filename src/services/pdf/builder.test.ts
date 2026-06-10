import { describe, it, expect } from 'vitest';
import { buildDocDefinition } from './builder';
import type { PdfTripData, ResolvedPdfOptions } from './types';

const EMPTY_DATA: PdfTripData = {
  destination: 'Nowhere',
  dateRange: '',
  coverImageDataUri: '',
  coverImageRequested: false,
  days: [],
  stays: [],
  transports: [],
  diningRefs: [],
  budgetData: { budget: null, categories: [], total: 0 },
};

const OPTS: ResolvedPdfOptions = {
  showImages: true,
  showCosts: true,
  pageSize: 'LETTER',
  exportedAt: new Date('2026-06-10T09:14:00'),
};

describe('buildDocDefinition', () => {
  it('builds a LETTER doc with theme margins for empty data', () => {
    const doc = buildDocDefinition(EMPTY_DATA, OPTS);
    expect(doc.pageSize).toBe('LETTER');
    expect(doc.pageMargins).toEqual([40, 48, 40, 48]);
    expect(Array.isArray(doc.content)).toBe(true);
  });
});
