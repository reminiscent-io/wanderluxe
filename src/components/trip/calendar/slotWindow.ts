import type { EventInput } from '@fullcalendar/core';

export const DEFAULT_SLOT_MIN_TIME = '07:00:00';
const DEFAULT_START_HOUR = 7;

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
