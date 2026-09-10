// src/lib/printDesign/edits.ts — the traveler's own words.
//
// A generated edition is a starting point, not a verdict. This module holds
// the contract for the copy a person writes over the top of it: which fields
// are editable, how their text is cleaned, and how the two layers combine at
// render time.
//
// The overrides live beside the AI's spec rather than replacing it. That is
// what makes "revert to the original" free, keeps the model's version around
// for the copy audit, and means a sloppy edit costs one line instead of the
// whole design.
//
// Shared by the client editor and the Express route. Dependency-free and
// DOM-free, like ./spec.ts.

import type { PrintDesignSpec } from './spec';

/* =========================================================================
   The editable surface
   ========================================================================= */

export interface EditableField {
  /** Dotted path, matching the key used in the overrides record. */
  key: string;
  /** Short label for the editor UI. */
  label: string;
  /** One line of guidance shown under the input. */
  hint: string;
  /** Max characters, matching the clamp sanitizePrintDesign applies to the AI. */
  max: number;
  /**
   * Required slots fall back to the AI's line when blanked — a cover with no
   * title is a broken page, not an editorial choice. Optional slots honour a
   * blank as "print nothing", so a tagline can be deleted outright.
   */
  required: boolean;
  /** Roomy input in the editor. */
  multiline: boolean;
}

/** Day captions are keyed `day.<ISO date>`; everything else is fixed. */
export const DAY_CAPTION_PREFIX = 'day.';
export const DAY_CAPTION_MAX = 140;

export const EDITABLE_FIELDS: readonly EditableField[] = [
  {
    key: 'cover.title',
    label: 'Cover title',
    hint: 'The big line on the front. Yours to name.',
    max: 80,
    required: true,
    multiline: false,
  },
  {
    key: 'cover.tagline',
    label: 'Cover tagline',
    hint: 'One line under the title. Leave empty to drop it.',
    max: 160,
    required: false,
    multiline: false,
  },
  {
    key: 'cover.subtitle',
    label: 'Route line',
    hint: 'Usually the places, in order.',
    max: 120,
    required: false,
    multiline: false,
  },
  {
    key: 'themeName',
    label: 'Edition name',
    hint: 'Prints as “The ___ Edition”.',
    max: 60,
    required: true,
    multiline: false,
  },
  {
    key: 'themeRationale',
    label: 'Edition note',
    hint: 'The small italic line beside the edition name.',
    max: 240,
    required: false,
    multiline: true,
  },
  {
    key: 'intro',
    label: 'Opening paragraph',
    hint: 'The welcome on the first page.',
    max: 600,
    required: false,
    multiline: true,
  },
  {
    key: 'closing',
    label: 'Sign-off',
    hint: 'The last line of the document.',
    max: 200,
    required: true,
    multiline: false,
  },
] as const;

const FIELD_BY_KEY = new Map(EDITABLE_FIELDS.map((f) => [f.key, f]));

/** Field key → the traveler's text. Absent key means "use the AI's line". */
export type PrintCopyOverrides = Record<string, string>;

/* =========================================================================
   Cleaning
   ========================================================================= */

/**
 * Control characters, including the stray newlines a paste drags in.
 *
 * no-control-regex is disabled deliberately: matching control characters is
 * the entire purpose here, and they reach this field routinely — pasting a
 * line out of a confirmation email or a PDF brings them along.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]+/g;

/**
 * Clean one human-written line.
 *
 * Deliberately NOT the treatment the model's prose gets in ./spec.ts. There,
 * cleanCopy runs findSlop and drops anything that trips the house voice —
 * right for a machine writing on someone's behalf, wrong for the person
 * themselves. If a traveler wants to call it the trip of a lifetime on their
 * own keepsake, that is not slop, it is the point. Nothing here judges the
 * words; it only makes them safe to set in type.
 *
 * Also skips repairCopy's em-dash rewrite: a person who typed an em dash
 * meant it.
 */
export function cleanUserCopy(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const collapsed = value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
  if (collapsed.length <= max) return collapsed;
  return `${collapsed.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Validate a raw overrides object from the client or the database.
 *
 * Unknown keys are dropped, day captions are restricted to real trip dates
 * (the same rule sanitizePrintDesign applies to the model), and every value is
 * cleaned and clamped. Returns a fresh object, never the input.
 */
export function sanitizeCopyOverrides(raw: unknown, dayDates: string[] = []): PrintCopyOverrides {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const validDates = new Set(dayDates);
  const out: PrintCopyOverrides = {};

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    let max: number;

    if (key.startsWith(DAY_CAPTION_PREFIX)) {
      // An override for a day the trip no longer has would be invisible and
      // would linger through date changes, so it does not survive the round
      // trip. When dayDates is empty the caller does not know the trip shape,
      // so captions pass through unfiltered.
      const date = key.slice(DAY_CAPTION_PREFIX.length);
      if (!date) continue;
      if (dayDates.length > 0 && !validDates.has(date)) continue;
      max = DAY_CAPTION_MAX;
    } else {
      const field = FIELD_BY_KEY.get(key);
      if (!field) continue;
      max = field.max;
    }

    const cleaned = cleanUserCopy(value, max);
    if (cleaned === null) continue;
    out[key] = cleaned;
  }

  return out;
}

/* =========================================================================
   Combining
   ========================================================================= */

/**
 * Metadata for any editable key, including the per-day caption slots that are
 * not in the fixed registry. The editor and the sanitizer both go through
 * here, so a limit can never drift between what the UI enforces and what the
 * contract allows.
 */
export function fieldForKey(key: string): EditableField {
  if (key.startsWith(DAY_CAPTION_PREFIX)) {
    return {
      key,
      label: 'Day caption',
      hint: 'One line for this day. Leave empty to drop it.',
      max: DAY_CAPTION_MAX,
      required: false,
      multiline: false,
    };
  }
  return (
    FIELD_BY_KEY.get(key) ?? {
      key,
      label: 'Text',
      hint: '',
      max: DAY_CAPTION_MAX,
      required: false,
      multiline: false,
    }
  );
}

/**
 * Keep only the edits that actually say something different. An override
 * identical to the AI's line is noise: it would light the edited mark, survive
 * a regeneration it no longer matches, and mean nothing.
 */
export function pruneCopyOverrides(
  design: PrintDesignSpec,
  overrides: PrintCopyOverrides
): PrintCopyOverrides {
  const out: PrintCopyOverrides = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== originalCopy(design, key)) out[key] = value;
  }
  return out;
}

/** The AI's text for one editable key, so the editor can show what it replaced. */
export function originalCopy(design: PrintDesignSpec, key: string): string {
  if (key.startsWith(DAY_CAPTION_PREFIX)) {
    return design.dayCaptions[key.slice(DAY_CAPTION_PREFIX.length)] ?? '';
  }
  switch (key) {
    case 'cover.title': return design.cover.title;
    case 'cover.tagline': return design.cover.tagline;
    case 'cover.subtitle': return design.cover.subtitle;
    case 'themeName': return design.themeName;
    case 'themeRationale': return design.themeRationale;
    case 'intro': return design.intro;
    case 'closing': return design.closing;
    default: return '';
  }
}

/** Pick the value that should print: the traveler's, or the AI's underneath. */
function resolve(design: PrintDesignSpec, overrides: PrintCopyOverrides, key: string): string {
  const edited = overrides[key];
  if (edited === undefined) return originalCopy(design, key);
  // Blanking a required slot means "I did not want to write this", not "print
  // an empty cover" — fall back rather than break the page.
  if (edited === '' && FIELD_BY_KEY.get(key)?.required) return originalCopy(design, key);
  return edited;
}

/**
 * Layer the traveler's copy over the AI's spec. Palette, fonts and motif are
 * untouched: this is a words-only edit, so the sanitized visual guarantees
 * from ./spec.ts carry through unchanged.
 */
export function applyCopyOverrides(
  design: PrintDesignSpec,
  overrides: PrintCopyOverrides | null | undefined
): PrintDesignSpec {
  if (!overrides || Object.keys(overrides).length === 0) return design;

  const dayCaptions = { ...design.dayCaptions };
  for (const [key, value] of Object.entries(overrides)) {
    if (!key.startsWith(DAY_CAPTION_PREFIX)) continue;
    const date = key.slice(DAY_CAPTION_PREFIX.length);
    if (value) dayCaptions[date] = value;
    else delete dayCaptions[date];
  }

  return {
    ...design,
    themeName: resolve(design, overrides, 'themeName'),
    themeRationale: resolve(design, overrides, 'themeRationale'),
    cover: {
      title: resolve(design, overrides, 'cover.title'),
      subtitle: resolve(design, overrides, 'cover.subtitle'),
      tagline: resolve(design, overrides, 'cover.tagline'),
    },
    intro: resolve(design, overrides, 'intro'),
    closing: resolve(design, overrides, 'closing'),
    dayCaptions,
  };
}

/** How many fields the traveler actually changed, for the edited badge. */
export function countCopyEdits(
  design: PrintDesignSpec,
  overrides: PrintCopyOverrides | null | undefined
): number {
  if (!overrides) return 0;
  let n = 0;
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== originalCopy(design, key)) n += 1;
  }
  return n;
}
