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
] as const;

export type FontPairingId = (typeof FONT_PAIRINGS)[number]['id'];

export const FONT_PAIRING_IDS = FONT_PAIRINGS.map((p) => p.id) as FontPairingId[];

export function getFontPairing(id: string): FontPairing {
  return (FONT_PAIRINGS.find((p) => p.id === id) ?? FONT_PAIRINGS[0]) as FontPairing;
}

export const MOTIFS = [
  'waves', // coastal / island trips
  'palms', // tropical
  'mountains', // alpine / hiking
  'deco', // art-deco cities, glamour
  'stars', // desert nights, northern lights
  'botanical', // gardens, countryside
  'geometric', // modern cities
  'none', // let the typography carry it
] as const;

export type MotifId = (typeof MOTIFS)[number];

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
function cleanCopy(v: unknown, maxLen: number, mode: CopyMode, fallback = ''): string {
  if (typeof v !== 'string') return fallback;
  const collapsed = v.replace(/\s+/g, ' ').trim();
  if (!collapsed) return fallback;
  const repaired = repairCopy(collapsed);
  if (!repaired) return fallback;
  if (mode === 'prose' && findSlop(repaired).length > 0) return fallback;
  return repaired.length > maxLen ? `${repaired.slice(0, maxLen - 1).trimEnd()}…` : repaired;
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

  // Accepts either a record ({"2026-06-01": "..."}), or the array shape the
  // OpenAI strict json_schema forces ([{date, caption}]) since strict mode
  // cannot express dynamic object keys.
  const validDates = new Set(dayDates);
  const dayCaptions: Record<string, string> = {};
  const addCaption = (date: unknown, caption: unknown) => {
    if (typeof date !== 'string' || !validDates.has(date)) return;
    const text = cleanCopy(caption, 140, 'prose');
    if (text) dayCaptions[date] = text;
  };
  if (Array.isArray(r.dayCaptions)) {
    for (const entry of r.dayCaptions) {
      if (entry && typeof entry === 'object') {
        addCaption((entry as Record<string, unknown>).date, (entry as Record<string, unknown>).caption);
      }
    }
  } else if (r.dayCaptions && typeof r.dayCaptions === 'object') {
    for (const [date, caption] of Object.entries(r.dayCaptions as Record<string, unknown>)) {
      addCaption(date, caption);
    }
  }

  return {
    themeName: cleanCopy(r.themeName, 60, 'prose', 'Traveler’s Edition'),
    themeRationale: cleanCopy(r.themeRationale, 240, 'prose'),
    palette,
    fontPairing,
    motif,
    ...(layout ? { layout } : {}),
    cover: {
      title: cleanCopy(rawCover.title, 80, 'prose', 'The Itinerary'),
      subtitle: cleanCopy(rawCover.subtitle, 120, 'names'),
      tagline: cleanCopy(rawCover.tagline, 160, 'prose'),
    },
    intro: cleanCopy(r.intro, 600, 'prose'),
    dayCaptions,
    closing: cleanCopy(r.closing, 200, 'prose', 'Safe travels.'),
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
    const findings = findSlop(repairCopy(value.replace(/\s+/g, ' ').trim()));
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
