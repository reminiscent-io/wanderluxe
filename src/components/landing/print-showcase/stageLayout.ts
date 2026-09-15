// The showcase stage's geometry, kept in one place so the placeholder that
// holds the stage's space before its chunk arrives is the same size as the
// stage itself, on every step.
//
// It imports nothing on purpose. The landing page's eager chunk reads it, and
// anything it pulled in would load on first paint. Every value here depends on
// width alone, never on what a step puts inside it, which is what keeps a step
// change, an edition swap or a rewritten line from moving the page.

/** Sheet height ÷ width. The sheet box and the thumbnail inside it both use it, so their heights match. */
export const SHEET_ASPECT = 1.15;

/** Inline style for a box of the sheet's shape: its height follows its width. */
export const SHEET_BOX_STYLE = { aspectRatio: `1 / ${SHEET_ASPECT}` };

/** Steps above the sheet on a phone, beside it from md up. Both children carry min-w-0. */
export const STAGE_GRID_CLASS = 'grid gap-6 md:grid-cols-[14rem_1fr] md:gap-10';

/** The rail's height below md: one chip row. From md up the sheet sets the row's height. */
export const STAGE_RAIL_CLASS = 'min-h-[2.375rem] md:min-h-0';

/** The sheet box above the note row, with the gap between them. */
export const STAGE_STACK_CLASS = 'm-0 space-y-4';

/**
 * The row under the sheet, tall enough for the tallest thing any step puts
 * there at each breakpoint: the edition chips, the editing note and the
 * Finalized line all wrap on narrow screens.
 */
export const STAGE_NOTE_ROW_CLASS = 'min-h-[6.5rem] md:min-h-[5.5rem] lg:min-h-[3rem]';
