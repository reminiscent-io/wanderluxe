/**
 * Locale-pinned formatters for the PDF.
 * en-US is intentional: the exported document must look identical no matter
 * which browser/locale generated it.
 */

import { parseISO, format as fnsFormat, isSameDay } from 'date-fns';

export function fmtMoney(amount: number, currency?: string | null): string {
  const code = currency || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).format(amount);
  } catch {
    // Unknown/invalid ISO code in user data — show it verbatim.
    return `${code} ${amount.toFixed(2)}`;
  }
}

/** Format a snake_case transport type into Title Case (e.g. "car_service" → "Car Service") */
export function formatType(raw: string | null | undefined): string {
  if (!raw) return 'Transport';
  return raw.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// Fixed-width, anchored time matcher: "8:05 am" (linear; no catastrophic backtracking)
const TIME_RE = /^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])m\s*$/i;

const asDate = (d: string) => parseISO(d);
export const sameDay = (a: string, b: string) => isSameDay(asDate(a), asDate(b));

export const fmtDate = (d: string, pat = 'EEEE, MMMM d, yyyy') => fnsFormat(parseISO(d), pat);
export const fmtShort = (d: string) => fnsFormat(parseISO(d), 'MMM d');

export function fmtTime(t?: string | null) {
  if (!t) return '';
  try {
    // ISO string → format directly
    if (t.includes('T')) return fnsFormat(parseISO(t), 'h:mm a');

    // "HH:mm" → convert to 12-hour with am/pm
    const parts = t.split(':');
    const h = parseInt(parts[0] ?? '0', 10);
    const m = parseInt(parts[1] ?? '0', 10);
    if (isNaN(h) || isNaN(m)) return '';
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return fnsFormat(d, 'h:mm a');
  } catch {
    return '';
  }
}

export function minsFromTime(s: string): number {
  // Accept "8:05 am" or "8 am" (minutes optional)
  const m = TIME_RE.exec(s);
  if (!m) return 9999;
  const hh = parseInt(m[1], 10) % 12;
  const mm = m[2] ? parseInt(m[2], 10) : 0;
  const mer = (m[3] || 'a').toLowerCase();
  return (mer === 'p' ? hh + 12 : hh) * 60 + mm;
}

export function sanitizeFilename(input?: string | null): string {
  // Linear-time sanitizer (no regex backtracking)
  const s = (input || 'itinerary').toLowerCase();
  let out = '';
  let prevUnderscore = false;

  for (let i = 0; i < s.length && out.length < 120; i++) {
    const ch = s[i];
    const code = ch.charCodeAt(0);
    const isAlnum = (code >= 48 && code <= 57) || (code >= 97 && code <= 122);
    if (isAlnum) {
      out += ch;
      prevUnderscore = false;
    } else if (!prevUnderscore) {
      out += '_';
      prevUnderscore = true;
    }
  }

  // Trim leading/trailing underscores (no regex)
  while (out.startsWith('_')) out = out.slice(1);
  while (out.endsWith('_')) out = out.slice(0, -1);

  return out || 'itinerary';
}
