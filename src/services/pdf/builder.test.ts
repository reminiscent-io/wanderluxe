import { describe, it, expect } from 'vitest';
import { buildDocDefinition } from './builder';
import type { PdfTripData, ResolvedPdfOptions } from './types';
import type { ContextPageSize } from 'pdfmake/interfaces';
import { romeTrip, FIXTURE_OPTS } from './fixtures';
import { TYPE, COLORS } from './theme';

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

/** Recursively collect every value stored under `key`, skipping functions. */
function collect(node: unknown, key: string, out: unknown[]): void {
  if (Array.isArray(node)) {
    node.forEach((n) => collect(n, key, out));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === key) out.push(v);
      collect(v, key, out);
    }
  }
}

// pdfmake DynamicContent takes (currentPage, pageCount, pageSize)
const PAGE_CTX: ContextPageSize = { width: 612, height: 792, orientation: 'portrait' };

function docWithChrome(doc: ReturnType<typeof buildDocDefinition>) {
  const header = typeof doc.header === 'function' ? doc.header(1, 5, PAGE_CTX) : doc.header;
  const footer = typeof doc.footer === 'function' ? doc.footer(1, 5, PAGE_CTX) : doc.footer;
  return [doc.content, doc.styles, doc.defaultStyle, header, footer];
}

describe('buildDocDefinition snapshots', () => {
  it('matches snapshot: images + costs, LETTER', () => {
    expect(buildDocDefinition(romeTrip(), FIXTURE_OPTS)).toMatchSnapshot();
  });

  it('matches snapshot: no images, no costs, A4', () => {
    // Mirror the data layer: when showImages is off it never fetches a cover.
    const data = { ...romeTrip(), coverImageDataUri: '', coverImageRequested: false };
    expect(
      buildDocDefinition(data, { ...FIXTURE_OPTS, showImages: false, showCosts: false, pageSize: 'A4' })
    ).toMatchSnapshot();
  });
});

describe('consistency invariants', () => {
  const allowedSizes = new Set<number>(Object.values(TYPE));
  const allowedColors = new Set<string>(Object.values(COLORS));

  it('every fontSize in the document comes from the type scale', () => {
    const sizes: unknown[] = [];
    collect(docWithChrome(buildDocDefinition(romeTrip(), FIXTURE_OPTS)), 'fontSize', sizes);
    expect(sizes.length).toBeGreaterThan(0);
    for (const s of sizes) expect(allowedSizes).toContain(s as number);
  });

  it('every color and fillColor comes from the palette', () => {
    const doc = buildDocDefinition(romeTrip(), FIXTURE_OPTS);
    const colors: unknown[] = [];
    collect(docWithChrome(doc), 'color', colors);
    collect(docWithChrome(doc), 'fillColor', colors);
    collect(docWithChrome(doc), 'lineColor', colors);
    expect(colors.length).toBeGreaterThan(0);
    for (const c of colors) expect(allowedColors).toContain(c as string);
  });

  it('contains no airplane glyph or other non-font characters', () => {
    const json = JSON.stringify(buildDocDefinition(romeTrip(), FIXTURE_OPTS).content);
    expect(json).not.toContain('✈');
  });

  it('footer pins the export timestamp from options', () => {
    const doc = buildDocDefinition(romeTrip(), FIXTURE_OPTS);
    const footer = typeof doc.footer === 'function' ? doc.footer(2, 7, PAGE_CTX) : doc.footer;
    expect(JSON.stringify(footer)).toMatch(/Page 2 of 7/);
    expect(JSON.stringify(footer)).toMatch(/Jun 10, 2026/);
  });

  it('day headings carry orphan protection', () => {
    const doc = buildDocDefinition(romeTrip(), FIXTURE_OPTS);
    const levels: unknown[] = [];
    collect(doc.content, 'headlineLevel', levels);
    // 3 day headers + section headings in budget/reference sections
    expect(levels.filter((l) => l === 1).length).toBeGreaterThanOrEqual(3);
  });
});
