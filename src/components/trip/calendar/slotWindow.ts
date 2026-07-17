import type { EventInput } from '@fullcalendar/core';

export const DEFAULT_SLOT_MIN_TIME = '07:00:00';
export const DEFAULT_SLOT_MAX_TIME = '22:00:00';
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 22;

/**
 * Earliest hour the time grid should show: 7am, lowered to the floor hour of
 * the earliest timed event within [visibleStart, visibleEnd) so no event is
 * ever clipped. Timed events use floating `YYYY-MM-DDTHH:mm:ss` strings (see
 * eventMapping); anything else can't start before the default window.
 */
export function computeSlotMinTime(events: EventInput[], visibleStart: string, visibleEnd: string): string {
  let minHour = DEFAULT_START_HOUR;
  for (const event of events) {
    if (event.allDay || typeof event.start !== 'string' || event.start.length < 16) continue;
    const date = event.start.slice(0, 10);
    if (date < visibleStart || date >= visibleEnd) continue;
    const hour = Number(event.start.slice(11, 13));
    if (Number.isInteger(hour) && hour < minHour) minHour = hour;
  }
  return `${String(minHour).padStart(2, '0')}:00:00`;
}

/** Exclusive grid end hour a timed in-range event needs, or null if it can't affect the window. */
function requiredEndHour(event: EventInput, visibleStart: string, visibleEnd: string): number | null {
  if (event.allDay || typeof event.start !== 'string' || event.start.length < 16) return null;
  const date = event.start.slice(0, 10);
  if (date < visibleStart || date >= visibleEnd) return null;
  if (typeof event.end === 'string' && event.end.length >= 16) {
    if (event.end.slice(0, 10) > date) return 24; // runs past midnight
    const h = Number(event.end.slice(11, 13));
    const m = Number(event.end.slice(14, 16));
    if (Number.isInteger(h)) return Math.min(h + (m > 0 ? 1 : 0), 24);
  }
  // An event with no usable end still needs its start hour fully visible.
  const startHour = Number(event.start.slice(11, 13));
  return Number.isInteger(startHour) ? startHour + 1 : null;
}

/**
 * Latest hour the time grid should show: 10pm, raised to the ceiling hour of
 * the latest timed event within [visibleStart, visibleEnd) so no event is
 * ever clipped. An event ending on a later date pins the grid to midnight.
 */
export function computeSlotMaxTime(events: EventInput[], visibleStart: string, visibleEnd: string): string {
  let maxHour = DEFAULT_END_HOUR;
  for (const event of events) {
    const endHour = requiredEndHour(event, visibleStart, visibleEnd);
    if (endHour !== null && endHour > maxHour) maxHour = endHour;
  }
  return maxHour === 24 ? '24:00:00' : `${String(maxHour).padStart(2, '0')}:00:00`;
}
