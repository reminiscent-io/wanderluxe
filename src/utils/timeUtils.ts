/**
 * Wall-clock time arithmetic on `HH:MM` strings.
 *
 * Every time in this app is a floating wall-clock value (see CLAUDE.md §17) —
 * never a `Date`. Constructing a `Date` from one silently pins it to the
 * browser's zone and reintroduces the DST bugs the floating model exists to
 * avoid, so everything here is string-in / string-out.
 *
 * Postgres hands back `HH:MM:SS` while every write path in the app stores
 * `HH:MM`, so all inputs tolerate both and all outputs are `HH:MM`.
 */

/** A dinner with no stated end is treated as lasting this long. */
export const DEFAULT_RESERVATION_DURATION_MINUTES = 90;

const HHMM = /^(\d{1,2}):(\d{2})/;

/** Normalize `HH:MM:SS` / `H:MM` to `HH:MM`. Returns null for anything unparseable. */
export const toHHMM = (time?: string | null): string | null => {
  if (!time) return null;
  const m = HHMM.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
};

/** Minutes since midnight, or null if the time is unparseable. */
export const toMinutesOfDay = (time?: string | null): number | null => {
  const hhmm = toHHMM(time);
  if (!hhmm) return null;
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
};

/**
 * Add minutes to a wall-clock time, clamping at 23:59 rather than wrapping.
 *
 * Wrapping past midnight would produce an end that sorts *before* its start:
 * nothing in the schema carries an end date, so a 23:00 dinner ending 00:30
 * has no representation. Callers get null instead of a value that would render
 * backwards on the calendar or emit DTEND < DTSTART in the iCal feed.
 */
export const addMinutesToTime = (time?: string | null, minutes = 0): string | null => {
  const start = toMinutesOfDay(time);
  if (start === null) return null;
  const total = Math.min(start + minutes, 23 * 60 + 59);
  if (total <= start) return null;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** The end time a new reservation gets when the user hasn't set one. */
export const defaultReservationEnd = (reservationTime?: string | null): string | null =>
  addMinutesToTime(reservationTime, DEFAULT_RESERVATION_DURATION_MINUTES);

/**
 * The end the user actually entered, or null. Rejects an end at or before the
 * start: a reservation carries no end DATE, so such a value cannot be laid out
 * on a single day and would render backwards everywhere.
 *
 * This is what almost every reader wants — including the calendar chip, whose
 * height AND printed time text both come from the event's `end`. Fabricating
 * one there would make the chip claim a range the user never typed.
 */
export const explicitReservationEnd = (
  reservationTime?: string | null,
  endTime?: string | null,
): string | null => {
  const start = toMinutesOfDay(reservationTime);
  const end = toMinutesOfDay(endTime);
  if (start === null || end === null || end <= start) return null;
  return toHHMM(endTime);
};

/**
 * The end for a reader that MUST have one — today just the iCal feed, where a
 * DTSTART with no DTEND is zero-duration per RFC 5545 and shows as an instant
 * in a subscriber's calendar.
 *
 * Use this only where omitting the end is worse than estimating it, and never
 * where the result could be written back: the 90-minute fallback is a display
 * convenience, not a fact about the booking.
 */
export const effectiveReservationEnd = (
  reservationTime?: string | null,
  endTime?: string | null,
): string | null =>
  explicitReservationEnd(reservationTime, endTime) ?? defaultReservationEnd(reservationTime);

/**
 * Wall-clock minutes between two times, or null when the pair cannot describe
 * a duration: either side unparseable, or an end that is not after its start
 * (see `explicitReservationEnd` for why a backwards range is never valid).
 */
export const durationMinutes = (
  start?: string | null,
  end?: string | null,
): number | null => {
  const from = toMinutesOfDay(start);
  const to = toMinutesOfDay(end);
  if (from === null || to === null || to <= from) return null;
  return to - from;
};

/** `45` → `45m`, `95` → `1h 35m`, `120` → `2h`. */
export const formatDurationShort = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};
