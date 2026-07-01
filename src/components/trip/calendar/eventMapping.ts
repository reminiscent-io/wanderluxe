import type { EventInput } from '@fullcalendar/core';
import type { DayActivity, RestaurantReservation } from '@/types/trip';

export type CalendarEntityType = 'activity' | 'dining' | 'accommodation' | 'transportation';

const UID_SEP = ':';

export function makeEventId(type: CalendarEntityType, recordId: string): string {
  return `${type}${UID_SEP}${recordId}`;
}

export function parseEventId(eventId: string): { entityType: CalendarEntityType; recordId: string } {
  const idx = eventId.indexOf(UID_SEP);
  return {
    entityType: eventId.slice(0, idx) as CalendarEntityType,
    recordId: eventId.slice(idx + 1),
  };
}

/** Combine `YYYY-MM-DD` + `HH:MM(:SS)` into a floating (no-timezone) local datetime string. */
export function combineDateTime(date: string, time: string): string {
  const hhmm = time.length >= 5 ? time.slice(0, 5) : time;
  return `${date}T${hhmm}:00`;
}

export function mapActivityToEvent(activity: DayActivity, dayDate: string): EventInput | null {
  if (!dayDate) return null;
  if (!activity.start_time) {
    return {
      id: makeEventId('activity', activity.id),
      title: activity.title,
      start: dayDate,
      allDay: true,
      extendedProps: { entityType: 'activity', record: activity },
    };
  }
  return {
    id: makeEventId('activity', activity.id),
    title: activity.title,
    start: combineDateTime(dayDate, activity.start_time),
    end: activity.end_time ? combineDateTime(dayDate, activity.end_time) : undefined,
    allDay: false,
    extendedProps: { entityType: 'activity', record: activity },
  };
}

export function mapReservationToEvent(reservation: RestaurantReservation, dayDate: string): EventInput | null {
  if (!dayDate) return null;
  if (!reservation.reservation_time) {
    return {
      id: makeEventId('dining', reservation.id),
      title: reservation.restaurant_name,
      start: dayDate,
      allDay: true,
      extendedProps: { entityType: 'dining', record: reservation },
    };
  }
  return {
    id: makeEventId('dining', reservation.id),
    title: reservation.restaurant_name,
    start: combineDateTime(dayDate, reservation.reservation_time),
    allDay: false,
    extendedProps: { entityType: 'dining', record: reservation },
  };
}
