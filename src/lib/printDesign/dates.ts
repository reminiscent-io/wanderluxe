// src/lib/printDesign/dates.ts — calendar dates and wall-clock times for print.
//
// Dates are ISO calendar dates read in UTC, so no zone can move a day. Times
// are floating wall-clock values ("14:45"), formatted but never converted.
// Dependency-free and DOM-free, like the rest of this folder.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** yyyy-mm-dd, or '' for anything that is not a calendar date. */
export function isoDate(v: unknown): string {
  if (typeof v !== 'string') return '';
  const m = ISO_DATE.exec(v.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

function utcDate(iso: string): Date | null {
  const m = ISO_DATE.exec(iso);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** "Friday" for "2026-12-18". Empty for a non-date. */
export function weekdayOf(iso: string): string {
  const d = utcDate(iso);
  return d ? WEEKDAYS[d.getUTCDay()] : '';
}

/** Whole days from a to b. */
export function daysBetween(a: string, b: string): number {
  const da = utcDate(a);
  const db = utcDate(b);
  if (!da || !db) return 0;
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

/** "December 18" */
export function monthDay(iso: string): string {
  const d = utcDate(iso);
  return d ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}` : '';
}

/** "Dec 18" */
export function shortMonthDay(iso: string): string {
  const d = utcDate(iso);
  return d ? `${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}` : '';
}

/**
 * "December 18–21, 2026", "June 28 – July 3, 2026",
 * "December 30, 2025 – January 2, 2026", or one date for a day trip.
 */
export function formatDateRange(start: string | null, end: string | null): string {
  const a = start ? utcDate(start) : null;
  const b = end ? utcDate(end) : null;
  if (!a && !b) return '';
  if (!a || !b || a.getTime() === b.getTime()) {
    const d = (a ?? b)!;
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  }
  const [ay, am, ad] = [a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()];
  const [by, bm, bd] = [b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()];
  if (ay !== by) return `${MONTHS[am]} ${ad}, ${ay} – ${MONTHS[bm]} ${bd}, ${by}`;
  if (am !== bm) return `${MONTHS[am]} ${ad} – ${MONTHS[bm]} ${bd}, ${ay}`;
  return `${MONTHS[am]} ${ad}–${bd}, ${ay}`;
}

const CLOCK = /^(?:\d{4}-\d{2}-\d{2}T)?(\d{1,2}):(\d{2})/;

/** Minutes from midnight for "14:45", "14:45:00" or an ISO timestamp; null when untimed. */
export function minutesOf(t: unknown): number | null {
  if (typeof t !== 'string') return null;
  const m = CLOCK.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** "2:45 PM" for "14:45:00". Empty when untimed. */
export function formatClock(t: unknown): string {
  const mins = minutesOf(t);
  if (mins === null) return '';
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}
