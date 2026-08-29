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

export interface PrintPalette {
  /** Deep brand hue — headings, day numerals, icon strokes. */
  primary: string;
  /** Supporting hue — section rules, secondary accents. */
  secondary: string;
  /** Page ground. Must stay light: this is a printed page. */
  background: string;
  /** Card/section fill, one step off the background. */
  surface: string;
  /** Body text. Contrast against background is enforced. */
  ink: string;
  /** Meta text (times, captions). Contrast is enforced (relaxed AA). */
  muted: string;
  /** Small highlights — icon chips, cost tags. */
  accent: string;
}

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
   Color math — tiny, dependency-free WCAG helpers
   ========================================================================= */

const HEX_RE = /^#([0-9a-f]{6})$/i;

export function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && HEX_RE.test(v.trim());
}

export function normalizeHex(v: string): string {
  return `#${HEX_RE.exec(v.trim())![1].toLowerCase()}`;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const m = HEX_RE.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return (
    0.2126 * channel((n >> 16) & 0xff) +
    0.7152 * channel((n >> 8) & 0xff) +
    0.0722 * channel(n & 0xff)
  );
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/* =========================================================================
   Sanitizer — clamp whatever the model returned into a safe, printable spec
   ========================================================================= */

export const FALLBACK_PALETTE: PrintPalette = {
  primary: '#3f4a5c',
  secondary: '#8a6f52',
  background: '#faf8f4',
  surface: '#f1ece3',
  ink: '#2b2620',
  muted: '#6b6257',
  accent: '#b0562e',
};

function cleanText(v: unknown, maxLen: number, fallback = ''): string {
  if (typeof v !== 'string') return fallback;
  const t = v.replace(/\s+/g, ' ').trim();
  if (!t) return fallback;
  return t.length > maxLen ? `${t.slice(0, maxLen - 1).trimEnd()}…` : t;
}

function cleanHex(v: unknown, fallback: string): string {
  return isHexColor(v) ? normalizeHex(v) : fallback;
}

/**
 * Validate + clamp a raw model response into a renderable PrintDesignSpec.
 *
 * Guarantees, regardless of input:
 *  - every color is a normalized #rrggbb hex
 *  - the page background is light enough to print (luminance >= 0.5)
 *  - ink/background >= 4.5:1, muted/background >= 3:1, primary/background >= 3:1
 *    (falling back to the neutral palette member when the model's choice fails)
 *  - fontPairing and motif are known registry ids
 *  - all copy is single-line-ish, length-clamped, never empty for required slots
 *  - dayCaptions only contains keys from `dayDates`
 */
export function sanitizePrintDesign(raw: unknown, dayDates: string[] = []): PrintDesignSpec {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawPalette = (r.palette && typeof r.palette === 'object' ? r.palette : {}) as Record<string, unknown>;

  let background = cleanHex(rawPalette.background, FALLBACK_PALETTE.background);
  // A dark page ground wastes toner and breaks the "printed keepsake" brief.
  if (relativeLuminance(background) < 0.5) background = FALLBACK_PALETTE.background;

  let surface = cleanHex(rawPalette.surface, FALLBACK_PALETTE.surface);
  if (relativeLuminance(surface) < 0.4) surface = background;

  let ink = cleanHex(rawPalette.ink, FALLBACK_PALETTE.ink);
  if (contrastRatio(ink, background) < 4.5) ink = FALLBACK_PALETTE.ink;

  let muted = cleanHex(rawPalette.muted, FALLBACK_PALETTE.muted);
  if (contrastRatio(muted, background) < 3) muted = FALLBACK_PALETTE.muted;

  let primary = cleanHex(rawPalette.primary, FALLBACK_PALETTE.primary);
  if (contrastRatio(primary, background) < 3) primary = ink;

  const secondary = cleanHex(rawPalette.secondary, FALLBACK_PALETTE.secondary);
  const accent = cleanHex(rawPalette.accent, FALLBACK_PALETTE.accent);

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
    const text = cleanText(caption, 140);
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
    themeName: cleanText(r.themeName, 60, 'Traveler’s Edition'),
    themeRationale: cleanText(r.themeRationale, 240),
    palette: { primary, secondary, background, surface, ink, muted, accent },
    fontPairing,
    motif,
    cover: {
      title: cleanText(rawCover.title, 80, 'The Itinerary'),
      subtitle: cleanText(rawCover.subtitle, 120),
      tagline: cleanText(rawCover.tagline, 160),
    },
    intro: cleanText(r.intro, 600),
    dayCaptions,
    closing: cleanText(r.closing, 200, 'Safe travels.'),
  };
}
