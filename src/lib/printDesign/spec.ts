// src/lib/printDesign/spec.ts — the Print Studio design-spec contract.
//
// A PrintDesignSpec is what the AI creative-direction pass produces: palette,
// font pairing, decorative motif, and editorial copy for one trip. The spec is
// deliberately narrow — the AI chooses *style tokens and words*, while the
// renderer (src/pages/PrintItinerary.tsx) guarantees that every itinerary item
// appears, so a hallucinated or sloppy model response can degrade the look but
// never the content.
//
// This module is shared by the Express route (validates/sanitizes the model
// output before storing it) and the client renderer (registries → CSS). It
// must stay dependency-free and DOM-free.

import { findSlop, repairCopy, type SlopFinding } from './voice';
import { weekdayOf } from './dates';
import { resolvePalette, type PaletteAdjustment } from './palette';
import type { PrintPalette } from './palette';

// Colour and palette live in their own modules; these re-exports keep every
// existing `from '@/lib/printDesign/spec'` import working.
export { contrastRatio, isHexColor, normalizeHex, relativeLuminance } from './color';
export {
  FALLBACK_PALETTE,
  PALETTE_FLOORS,
  resolveFills,
  type PaletteAdjustment,
  type PrintFill,
  type PrintPalette,
} from './palette';

/**
 * How an edition carries colour. 'editorial' sets structure in type and
 * hairline rules; 'bold' puts the palette's fills into panels, bands and
 * badges.
 */
export const PRINT_LAYOUTS = ['editorial', 'bold'] as const;

export type PrintLayout = (typeof PRINT_LAYOUTS)[number];

export interface PrintDesignSpec {
  /** Short display name for the theme, e.g. "Aegean Deco". */
  themeName: string;
  /** One sentence on why this direction fits the trip. */
  themeRationale: string;
  palette: PrintPalette;
  /** Key into FONT_PAIRINGS. */
  fontPairing: FontPairingId;
  /** Key into MOTIFS — drives the cover pattern + section dividers. */
  motif: MotifId;
  /**
   * How the page carries colour. Absent on editions stored before 2026-09-15;
   * absent renders as 'editorial'.
   */
  layout?: PrintLayout;
  cover: {
    /** Editorial title, e.g. "Ten Days in the Aegean" — not just the destination. */
    title: string;
    /** Route line, e.g. "Athens · Santorini · Crete". */
    subtitle: string;
    /** One poetic line under the title. */
    tagline: string;
  };
  /** 2–3 sentence welcome paragraph on the opening page. */
  intro: string;
  /** One editorial line per trip day, keyed by the day's ISO date. */
  dayCaptions: Record<string, string>;
  /**
   * A short name for each day ("Lights at Sayville Falls"), keyed by ISO date.
   * Absent on editions stored before 2026-11; a day without one is headed by
   * its date alone.
   */
  dayHeadlines?: Record<string, string>;
  /**
   * The town or region the traveler is based in each day, keyed by ISO date.
   * Consecutive days in one place make a chapter; one place for the whole trip
   * makes none. Absent on older editions.
   */
  dayPlaces?: Record<string, string>;
  /** Up to MAX_FEATURE_DAYS dates the edition gives a feature page. */
  featureDays?: string[];
  /** Short sign-off line for the closing block. */
  closing: string;
}

/* =========================================================================
   Registries — the AI picks ids from these; anything else falls back.
   ========================================================================= */

export interface FontPairing {
  id: FontPairingId;
  label: string;
  /** CSS font-family for headings. */
  display: string;
  /** CSS font-family for body text. */
  body: string;
  /** Google Fonts css2 families query (without host), e.g. "family=Fraunces:wght@400;600". */
  googleQuery: string;
}

export const FONT_PAIRINGS = [
  {
    id: 'house',
    label: 'DM Serif Display & DM Sans',
    display: "'DM Serif Display', Georgia, serif",
    body: "'DM Sans', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=DM+Serif+Display&family=DM+Sans:wght@400;500;700',
  },
  {
    id: 'editorial',
    label: 'Playfair Display & Source Sans 3',
    display: "'Playfair Display', Georgia, serif",
    body: "'Source Sans 3', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@400;600',
  },
  {
    id: 'romantic',
    label: 'Cormorant Garamond & Montserrat',
    display: "'Cormorant Garamond', Georgia, serif",
    body: "'Montserrat', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@400;500;600',
  },
  {
    id: 'modern',
    label: 'Fraunces & Inter',
    display: "'Fraunces', Georgia, serif",
    body: "'Inter', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600',
  },
  {
    id: 'literary',
    label: 'Libre Baskerville & Karla',
    display: "'Libre Baskerville', Georgia, serif",
    body: "'Karla', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Libre+Baskerville:wght@400;700&family=Karla:wght@400;500;700',
  },
  {
    id: 'elegant',
    label: 'Marcellus & Nunito Sans',
    display: "'Marcellus', Georgia, serif",
    body: "'Nunito Sans', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Marcellus&family=Nunito+Sans:wght@400;600;700',
  },
  {
    id: 'deco',
    label: 'Poiret One & Josefin Sans',
    display: "'Poiret One', 'Century Gothic', sans-serif",
    body: "'Josefin Sans', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Poiret+One&family=Josefin+Sans:wght@300;400;600',
  },
  {
    id: 'bold',
    label: 'Abril Fatface & Poppins',
    display: "'Abril Fatface', Georgia, serif",
    body: "'Poppins', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Abril+Fatface&family=Poppins:wght@400;500;600',
  },
  {
    id: 'classic',
    label: 'Cinzel & Raleway',
    display: "'Cinzel', Georgia, serif",
    body: "'Raleway', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Cinzel:wght@400;600&family=Raleway:wght@400;500;600',
  },
  {
    id: 'warm',
    label: 'Lora & Work Sans',
    display: "'Lora', Georgia, serif",
    body: "'Work Sans', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Lora:wght@500;600;700&family=Work+Sans:wght@400;500;600',
  },
  {
    id: 'playful',
    label: 'Fredoka & Nunito',
    display: "'Fredoka', 'Trebuchet MS', sans-serif",
    body: "'Nunito', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Fredoka:wght@400;600&family=Nunito:wght@400;600;700',
  },
  {
    id: 'poster',
    label: 'Lilita One & Poppins',
    display: "'Lilita One', Impact, sans-serif",
    body: "'Poppins', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Lilita+One&family=Poppins:wght@400;500;600',
  },
  {
    id: 'retro',
    label: 'Shrikhand & Karla',
    display: "'Shrikhand', Georgia, serif",
    body: "'Karla', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Shrikhand&family=Karla:wght@400;500;700',
  },
  {
    id: 'grotesque',
    label: 'Archivo Black & Archivo',
    display: "'Archivo Black', 'Arial Black', sans-serif",
    body: "'Archivo', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Archivo+Black&family=Archivo:wght@400;500;600',
  },
  {
    id: 'expanded',
    label: 'Unbounded & Work Sans',
    display: "'Unbounded', 'Arial Black', sans-serif",
    body: "'Work Sans', 'Helvetica Neue', sans-serif",
    googleQuery: 'family=Unbounded:wght@400;600&family=Work+Sans:wght@400;500;600',
  },
] as const;

export type FontPairingId = (typeof FONT_PAIRINGS)[number]['id'];

export const FONT_PAIRING_IDS = FONT_PAIRINGS.map((p) => p.id) as FontPairingId[];

export function getFontPairing(id: string): FontPairing {
  return (FONT_PAIRINGS.find((p) => p.id === id) ?? FONT_PAIRINGS[0]) as FontPairing;
}

export const MOTIFS = [
  'waves',
  'palms',
  'mountains',
  'deco',
  'stars',
  'botanical',
  'geometric',
  'confetti',
  'dots',
  'sunburst',
  'holly',
  'snowflakes',
  'pines',
  'ornaments',
  'leaves',
  'blossoms',
  'citrus',
  'none',
] as const;

export type MotifId = (typeof MOTIFS)[number];

/**
 * What each motif is for, in the words the model is given. A season or a
 * holiday has to be drawable: before the winter motifs existed, a "Christmas"
 * request could only reach the palette, and came back as stars.
 */
export const MOTIF_NOTES: Record<MotifId, string> = {
  waves: 'coast, islands, harbours, lakes',
  palms: 'tropics, beach resorts',
  mountains: 'alpine, hiking, national parks, ski',
  deco: 'art-deco cities, glamour, jazz-age hotels',
  stars: 'desert nights, northern lights, stargazing, New Year',
  botanical: 'gardens, countryside, weddings, anniversaries',
  geometric: 'modern cities, architecture, design trips',
  confetti: 'birthdays, parties, celebrations',
  dots: 'playful, retro, pop, family fun',
  sunburst: 'sunny, mid-century, festivals, summer',
  holly: 'Christmas: holly leaves and berries',
  snowflakes: 'winter, snow, Christmas, ski weeks',
  pines: 'Christmas trees, forests, cabins, winter woods',
  ornaments: 'Christmas baubles, holiday parties',
  leaves: 'autumn, fall foliage, harvest, Thanksgiving',
  blossoms: 'spring, cherry blossom, Japan, Easter, romance',
  citrus: 'Mediterranean, Amalfi, Sicily, Seville, summer lunches',
  none: 'let the typography carry it',
};

/** How many days an edition may give a feature page. */
const MAX_FEATURE_DAYS = 2;

/* =========================================================================
   Sanitizer — clamp whatever the model returned into a safe, printable spec
   ========================================================================= */

/**
 * Which voice checks a copy field answers to.
 *  - 'prose'  full sentences the reader reads as writing; house voice applies.
 *  - 'names'  real place names the traveler chose (the cover route line).
 *             Repaired but never rejected — "Foster City · Elevate Lounge" is
 *             the itinerary, not the model's prose, and content never degrades.
 */
type CopyMode = 'prose' | 'names';

/**
 * Collapse, repair, judge, clamp. Prose that breaks the house voice
 * (src/lib/printDesign/voice.ts) is dropped to its fallback rather than
 * printed: the renderer omits an empty tagline, intro or caption entirely, and
 * a page with one fewer line beats a page with "embark on an unforgettable
 * journey" set in 24pt on paper someone paid for.
 */
function cleanCopy(
  v: unknown,
  maxLen: number,
  mode: CopyMode,
  fallback = '',
  overflow: 'clamp' | 'drop' = 'clamp'
): string {
  if (typeof v !== 'string') return fallback;
  const collapsed = v.replace(/\s+/g, ' ').trim();
  if (!collapsed) return fallback;
  const repaired = repairCopy(collapsed);
  if (!repaired) return fallback;
  if (mode === 'prose' && findSlop(repaired).length > 0) return fallback;
  if (repaired.length <= maxLen) return repaired;
  // A headline set in 40pt display type cannot end in an ellipsis and still
  // read as designed, so short display lines are dropped rather than cut.
  return overflow === 'drop' ? fallback : `${repaired.slice(0, maxLen - 1).trimEnd()}…`;
}

const WEEKDAY_RE = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b(?!s\b)/gi;

/** The weekdays a line names, lowercased. "Sundays" (opening hours) is not a day reference. */
function weekdaysNamed(text: string): string[] {
  return [...text.matchAll(WEEKDAY_RE)].map((m) => m[1].toLowerCase());
}

/**
 * True when a day's line names a weekday the day does not fall on: "Saturday
 * brings Christmas Land" on a Sunday. A wrong day on a printed itinerary is a
 * wrong fact, so the line is dropped rather than printed.
 */
export function namesWrongWeekday(text: string, date: string): boolean {
  const actual = weekdayOf(date).toLowerCase();
  if (!actual) return false;
  return weekdaysNamed(text).some((d) => d !== actual);
}

/**
 * True when trip-level copy names a weekday the trip never touches. Only
 * checkable for a trip shorter than a week; a longer one contains every day.
 */
function namesWeekdayOutsideTrip(text: string, dayDates: string[]): boolean {
  if (dayDates.length === 0 || dayDates.length >= 7) return false;
  const inTrip = new Set(dayDates.map((d) => weekdayOf(d).toLowerCase()));
  return weekdaysNamed(text).some((d) => !inTrip.has(d));
}

/** Prose for one day: voice-gated, length-handled, and on the right weekday. */
function cleanDayLine(v: unknown, date: string, maxLen: number, overflow: 'clamp' | 'drop'): string {
  const text = cleanCopy(v, maxLen, 'prose', '', overflow);
  return text && !namesWrongWeekday(text, date) ? text : '';
}

/** Trip-level prose: voice-gated and naming only weekdays the trip contains. */
function cleanTripLine(v: unknown, maxLen: number, dayDates: string[], fallback = ''): string {
  const text = cleanCopy(v, maxLen, 'prose', fallback);
  return text && text !== fallback && namesWeekdayOutsideTrip(text, dayDates) ? fallback : text;
}

/** Day headline and place limits. Asked for shorter; these are the hard stops. */
const DAY_HEADLINE_MAX = 60;
const DAY_PLACE_MAX = 40;

/**
 * True when a theme name already ends in its own "Edition". The renderers set
 * the name inside "The ___ Edition", so a name like "Sun-Bleached Edition",
 * whether the model's or the traveler's, must not print the word twice.
 */
export function themeNameEndsInEdition(themeName: string): boolean {
  return /\bedition\s*$/i.test(themeName);
}

/**
 * Validate + clamp a raw model response into a renderable PrintDesignSpec.
 *
 * Sanitizes for legibility, not taste. Guarantees, regardless of input:
 *  - the palette is printable (resolvePalette in ./palette): every colour is a
 *    normalized #rrggbb, each text role clears its floor against the page, and
 *    each fill carries legible text. Any page colour, surface and fill passes
 *    through as sent; a text colour that misses moves in lightness only, so it
 *    keeps its hue.
 *  - layout is a known id, or absent (absent renders 'editorial')
 *  - fontPairing and motif are known registry ids
 *  - all copy is single-line-ish, length-clamped, never empty for required slots
 *  - prose copy clears the house voice: banned words, travel clichés and AI
 *    sentence shapes are dropped to the field's fallback (see ./voice.ts)
 *  - dayCaptions only contains keys from `dayDates`
 *  - sanitizing an already-sanitized design returns it unchanged
 */
export function sanitizePrintDesign(raw: unknown, dayDates: string[] = []): PrintDesignSpec {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const { palette } = resolvePalette(r.palette);

  const layout = (PRINT_LAYOUTS as readonly string[]).includes(r.layout as string)
    ? (r.layout as PrintLayout)
    : undefined;

  const fontPairing = FONT_PAIRING_IDS.includes(r.fontPairing as FontPairingId)
    ? (r.fontPairing as FontPairingId)
    : 'house';

  const motif = (MOTIFS as readonly string[]).includes(r.motif as string)
    ? (r.motif as MotifId)
    : 'none';

  const rawCover = (r.cover && typeof r.cover === 'object' ? r.cover : {}) as Record<string, unknown>;

  // Per-day copy arrives in three shapes: the model's `days` array
  // ([{date, headline, caption, place, feature}], since OpenAI strict mode
  // cannot express dynamic object keys), the older model's dayCaptions array
  // ([{date, caption}]), and the stored records this function returns.
  const validDates = new Set(dayDates);
  const isDay = (date: unknown): date is string => typeof date === 'string' && validDates.has(date);
  const dayCaptions: Record<string, string> = {};
  const dayHeadlines: Record<string, string> = {};
  const dayPlaces: Record<string, string> = {};
  const featureSet = new Set<string>();

  const addCaption = (date: unknown, caption: unknown) => {
    if (!isDay(date) || date in dayCaptions) return;
    const text = cleanDayLine(caption, date, 140, 'clamp');
    if (text) dayCaptions[date] = text;
  };
  const addHeadline = (date: unknown, headline: unknown) => {
    if (!isDay(date) || date in dayHeadlines) return;
    const text = cleanDayLine(headline, date, DAY_HEADLINE_MAX, 'drop');
    if (text) dayHeadlines[date] = text;
  };
  const addPlace = (date: unknown, place: unknown) => {
    if (!isDay(date) || date in dayPlaces) return;
    const text = cleanCopy(place, DAY_PLACE_MAX, 'names', '', 'drop');
    if (text) dayPlaces[date] = text;
  };
  const entries = (v: unknown): Array<[unknown, unknown]> =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.entries(v as Record<string, unknown>) : [];

  if (Array.isArray(r.days)) {
    for (const entry of r.days) {
      if (!entry || typeof entry !== 'object') continue;
      const e = entry as Record<string, unknown>;
      addHeadline(e.date, e.headline);
      addCaption(e.date, e.caption);
      addPlace(e.date, e.place);
      if (e.feature === true && isDay(e.date)) featureSet.add(e.date);
    }
  }
  if (Array.isArray(r.dayCaptions)) {
    for (const entry of r.dayCaptions) {
      if (entry && typeof entry === 'object') {
        addCaption((entry as Record<string, unknown>).date, (entry as Record<string, unknown>).caption);
      }
    }
  }
  for (const [date, caption] of entries(r.dayCaptions)) addCaption(date, caption);
  for (const [date, headline] of entries(r.dayHeadlines)) addHeadline(date, headline);
  for (const [date, place] of entries(r.dayPlaces)) addPlace(date, place);
  if (Array.isArray(r.featureDays)) {
    for (const date of r.featureDays) if (isDay(date)) featureSet.add(date);
  }
  // In date order, so the cap keeps the earliest rather than whichever the model listed first.
  const featureDays = dayDates.filter((d) => featureSet.has(d)).slice(0, MAX_FEATURE_DAYS);

  return {
    themeName: cleanCopy(r.themeName, 60, 'prose', 'Traveler’s'),
    themeRationale: cleanCopy(r.themeRationale, 240, 'prose'),
    palette,
    fontPairing,
    motif,
    ...(layout ? { layout } : {}),
    cover: {
      title: cleanTripLine(rawCover.title, 80, dayDates, 'The Itinerary'),
      subtitle: cleanCopy(rawCover.subtitle, 120, 'names'),
      tagline: cleanTripLine(rawCover.tagline, 160, dayDates),
    },
    intro: cleanTripLine(r.intro, 600, dayDates),
    dayCaptions,
    // Omitted when empty, so an edition stored before these existed
    // sanitizes to exactly what it was.
    ...(Object.keys(dayHeadlines).length > 0 ? { dayHeadlines } : {}),
    ...(Object.keys(dayPlaces).length > 0 ? { dayPlaces } : {}),
    ...(featureDays.length > 0 ? { featureDays } : {}),
    closing: cleanTripLine(r.closing, 200, dayDates, 'Safe travels.'),
  };
}

/* =========================================================================
   Copy audit — observability for what the voice gate dropped
   ========================================================================= */

/** One prose field the model wrote, paired with the rules it broke. */
export interface CopyAudit {
  /** Dotted path into the raw response, e.g. "cover.tagline". */
  field: string;
  findings: SlopFinding[];
}

/**
 * Report which prose fields sanitizePrintDesign will drop, and why. Purely
 * observational — the server logs this so a drift in model voice shows up as
 * blank taglines with a reason attached, rather than as silence.
 */
export function auditPrintCopy(raw: unknown): CopyAudit[] {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const cover = (r.cover && typeof r.cover === 'object' ? r.cover : {}) as Record<string, unknown>;

  const fields: Array<[string, unknown]> = [
    ['themeName', r.themeName],
    ['themeRationale', r.themeRationale],
    ['cover.title', cover.title],
    ['cover.tagline', cover.tagline],
    ['intro', r.intro],
    ['closing', r.closing],
  ];

  if (Array.isArray(r.days)) {
    for (const entry of r.days) {
      if (entry && typeof entry === 'object') {
        const e = entry as Record<string, unknown>;
        fields.push([`days.${String(e.date ?? '?')}.headline`, e.headline]);
        fields.push([`days.${String(e.date ?? '?')}.caption`, e.caption]);
      }
    }
  }

  if (Array.isArray(r.dayCaptions)) {
    for (const entry of r.dayCaptions) {
      if (entry && typeof entry === 'object') {
        const e = entry as Record<string, unknown>;
        fields.push([`dayCaptions.${String(e.date ?? '?')}`, e.caption]);
      }
    }
  } else if (r.dayCaptions && typeof r.dayCaptions === 'object') {
    for (const [date, caption] of Object.entries(r.dayCaptions as Record<string, unknown>)) {
      fields.push([`dayCaptions.${date}`, caption]);
    }
  }

  const audits: CopyAudit[] = [];
  for (const [field, value] of fields) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const text = repairCopy(value.replace(/\s+/g, ' ').trim());
    const findings = findSlop(text);
    const date = /^(?:days|dayCaptions)\.(\d{4}-\d{2}-\d{2})/.exec(field)?.[1];
    if (date && namesWrongWeekday(text, date)) {
      findings.push({ rule: 'wrong weekday', match: `${weekdaysNamed(text).join(', ')} on a ${weekdayOf(date)}` });
    }
    if (findings.length > 0) audits.push({ field, findings });
  }
  return audits;
}

/**
 * Report what resolvePalette changes in the model's palette, and why. Purely
 * observational: the server logs it, so a model that keeps sending pastel text
 * colours shows up as a line with ratios attached rather than as a quiet shift
 * in every edition's colours.
 */
export function auditPrintPalette(raw: unknown): PaletteAdjustment[] {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return resolvePalette(r.palette).adjustments;
}
