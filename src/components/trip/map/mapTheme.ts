import type { CalendarEntityType } from '../calendar/eventMapping';

/**
 * Literal hex, not Tailwind classes or CSS vars: the Google Maps API takes
 * colors as strings for polylines, and marker SVGs need concrete fills.
 *
 * Entity tones are the saturated "list dot" variants already established in
 * calendarTheme.css, so a stay looks the same colour family in both views.
 */
export const MAP_COLORS = {
  cream: '#FDFCF8',
  /** --primary, Roasted Bronze. Carries selection and focus throughout. */
  bronze: '#60432E',
  border: '#DDD4C8',
  ink: '#1F1B18',
  muted: '#8A7F6C',
} as const;

export const ENTITY_TONES: Record<CalendarEntityType, string> = {
  activity: '#B7A988',
  dining: '#C9975F',
  accommodation: '#A99F8C',
  transportation: '#8A7F6C',
};

/**
 * Day-to-day distinction is a luminance-and-weight ramp, never a hue ramp:
 * the warm palette has no cool end to run to, and sunset is reserved as a
 * conversion accent. The ramp is only orientation — the real reading mechanism
 * is the focus state below.
 */
const RAMP_FROM = { r: 0x5c, g: 0x54, b: 0x4a }; // earth-600
const RAMP_TO = { r: 0x8a, g: 0x7f, b: 0x6c }; // sand-500 — floored here, or a
// long trip's late days wash out entirely against a light basemap.

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');

export function dayRampColor(dayIndex: number, dayCount: number): string {
  const t = dayCount <= 1 ? 0 : Math.min(1, Math.max(0, dayIndex / (dayCount - 1)));
  const r = RAMP_FROM.r + (RAMP_TO.r - RAMP_FROM.r) * t;
  const g = RAMP_FROM.g + (RAMP_TO.g - RAMP_FROM.g) * t;
  const b = RAMP_FROM.b + (RAMP_TO.b - RAMP_FROM.b) * t;
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export interface StrokeStyle {
  color: string;
  opacity: number;
  weight: number;
}

export type DayEmphasis = 'normal' | 'focused' | 'dimmed';

/**
 * Focus is what actually lets someone read a specific day out of a full trip:
 * the chosen day snaps to bronze at full weight while everything else recedes.
 */
export function segmentStroke(
  dayIndex: number,
  dayCount: number,
  emphasis: DayEmphasis = 'normal',
  inferred = false,
): StrokeStyle {
  if (emphasis === 'focused') {
    return { color: MAP_COLORS.bronze, opacity: inferred ? 0.5 : 0.95, weight: 4 };
  }

  const t = dayCount <= 1 ? 0 : Math.min(1, Math.max(0, dayIndex / (dayCount - 1)));
  const base: StrokeStyle = {
    color: dayRampColor(dayIndex, dayCount),
    opacity: 0.9 - 0.35 * t,
    weight: 3.5 - t,
  };

  if (emphasis === 'dimmed') return { ...base, opacity: 0.25 };
  // An inferred order is drawn faintly — the line is a guess, and should look it.
  return inferred ? { ...base, opacity: base.opacity * 0.45 } : base;
}

/** Dashed-line recipe: Maps draws dashes as repeated icons over a clear stroke. */
export const DASH_SYMBOL = { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 };
export const AIR_DASH_REPEAT = '14px';
export const SEA_DASH_REPEAT = '10px';

export const MARKER_SIZE = {
  coin: 28,
  star: 34,
  gate: 28,
  /** Whole-trip mode renders bare dots — 150 full markers is too heavy. */
  dot: 10,
} as const;

/**
 * AdvancedMarker requires a map ID, and supplying one makes inline `styles`
 * inert — so the warm basemap is configured in the Cloud Console. Falling back
 * to the demo style keeps the view working on a fresh checkout instead of
 * crashing on a missing env var.
 */
export const DEMO_MAP_ID = 'DEMO_MAP_ID';

export function resolveMapId(configured?: string | null): string {
  return configured?.trim() || DEMO_MAP_ID;
}
