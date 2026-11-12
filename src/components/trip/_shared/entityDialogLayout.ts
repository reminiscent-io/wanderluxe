/**
 * Shared layout for the four entity edit dialogs (activity, dining, stay,
 * transport). The action row is a tinted band running edge to edge under the
 * form, so it reads as a footer rather than one more field.
 *
 * The band has to bleed past the dialog's padding, which takes three parts:
 * - the dialog drops its bottom padding (the band pads itself instead),
 * - the scroll area bleeds to the dialog edges and re-pads its content,
 *   since a scroller clips anything that pokes past its own box,
 * - the footer bleeds to the scroll area's edges.
 * The bleed sizes mirror DialogContent's sheet padding (p-4, sm:p-6).
 */

/** Pass to DialogContent (mobileSheet) alongside its other props. */
export const ENTITY_DIALOG_CONTENT = 'pb-0 sm:pb-0';

/** The flex-1 scroll area that wraps the form. */
export const ENTITY_DIALOG_SCROLL =
  'flex-1 overflow-y-auto overflow-x-hidden scrollbar-none -mx-4 px-4 sm:-mx-6 sm:px-6';

/**
 * The sticky Delete / Cancel / Save row. Bottom padding clears the iOS home
 * indicator, since the dialog no longer pads under it.
 */
export const ENTITY_DIALOG_FOOTER =
  'sticky bottom-0 z-10 -mx-4 px-4 sm:-mx-6 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:py-4 sm:rounded-b-lg bg-secondary border-t border-border flex items-center justify-between';
