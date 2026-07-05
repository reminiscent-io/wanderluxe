/**
 * Single source of truth for the PDF document's visual system.
 * Every size, color, and spacing in the export must come from here —
 * builder.test.ts enforces this with invariant tests.
 */

export const COLORS = {
  earth: '#6B6354',
  earthLight: '#8A7F6C',
  earthMid: '#A89B8E',
  sand: '#FAF9F7',
  accent: '#5C544A',
  sunset: '#D97706',
  white: '#FFFFFF',
  rule: '#E6E2DE',      // hairline table separators
  totalFill: '#F5F3F2', // budget total row background
} as const;

/** Point sizes. One scale for the whole document — no arithmetic on these. */
export const TYPE = {
  display: 24, // cover title
  title: 16,   // page-level headings ("Reference Information")
  section: 12, // section + day headings, cover subtitle
  body: 10,    // item titles, primary text
  detail: 9,   // secondary text, time column, day descriptions
  caption: 8.5,// header/footer chrome, table cells, costs, tags
} as const;

/** Vertical rhythm (points). */
export const SPACE = { xs: 2, sm: 4, md: 8, lg: 12, xl: 16, xxl: 24 } as const;

export const FONTS = { serif: 'DMSerifDisplay', sans: 'DMSans' } as const;

export type PdfPageSize = 'LETTER' | 'A4';

export const PAGE = {
  /** [left, top, right, bottom] — 40/48pt clears every consumer printer's dead zone. */
  margins: [40, 48, 40, 48] as [number, number, number, number],
  headerOffsetY: 20,    // header text offset inside the top margin band
  footerOffsetY: 18,    // footer text offset inside the bottom margin band
  timeColWidth: 56,
  thumbSize: 28,        // square thumbnail box (points)
  thumbScale: 3,        // bitmap supersampling for thumbnails (~216 DPI)
  coverImageHeight: 240,
  coverScale: 2,        // bitmap supersampling for the cover (~144 DPI)
} as const;

const PAGE_WIDTHS: Record<PdfPageSize, number> = { A4: 595.28, LETTER: 612 };

export function innerPageWidth(
  pageSize: PdfPageSize,
  margins: [number, number, number, number]
): number {
  return PAGE_WIDTHS[pageSize] - margins[0] - margins[2];
}

/** US locales print on Letter; everyone else on A4. Used only as a UI default. */
export function defaultPageSize(): PdfPageSize {
  const loc = (Intl.DateTimeFormat().resolvedOptions().locale || '').toLowerCase();
  return loc.startsWith('en-us') ? 'LETTER' : 'A4';
}
