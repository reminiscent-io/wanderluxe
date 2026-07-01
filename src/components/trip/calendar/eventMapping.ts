import type { EventInput } from '@fullcalendar/core';
import { addDays, format, parse } from 'date-fns';
import type { DayActivity, RestaurantReservation, HotelStay, Transportation } from '@/types/trip';

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

/** Exclusive all-day end: last inclusive date + 1 day, as YYYY-MM-DD. */
function exclusiveEnd(lastInclusiveDate: string): string {
  return format(addDays(parse(lastInclusiveDate, 'yyyy-MM-dd', new Date()), 1), 'yyyy-MM-dd');
}

export function transportationTitle(t: Transportation): string {
  const label = t.type ? t.type.charAt(0).toUpperCase() + t.type.slice(1) : 'Transport';
  if (t.departure_location && t.arrival_location) {
    return `${label}: ${t.departure_location} to ${t.arrival_location}`;
  }
  return t.provider ? `${label} · ${t.provider}` : label;
}

export function mapAccommodationToEvent(stay: HotelStay): EventInput | null {
  if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return null;
  return {
    id: makeEventId('accommodation', stay.stay_id),
    title: stay.hotel,
    start: stay.hotel_checkin_date,
    end: exclusiveEnd(stay.hotel_checkout_date),
    allDay: true,
    extendedProps: { entityType: 'accommodation', record: stay },
  };
}

export function mapTransportationToEvent(t: Transportation): EventInput | null {
  if (!t.start_date) return null;
  const sameDay = !t.end_date || t.end_date === t.start_date;
  if (sameDay && t.start_time) {
    return {
      id: makeEventId('transportation', t.id),
      title: transportationTitle(t),
      start: combineDateTime(t.start_date, t.start_time),
      end: t.end_time ? combineDateTime(t.start_date, t.end_time) : undefined,
      allDay: false,
      extendedProps: { entityType: 'transportation', record: t },
    };
  }
  return {
    id: makeEventId('transportation', t.id),
    title: transportationTitle(t),
    start: t.start_date,
    end: exclusiveEnd(t.end_date ?? t.start_date),
    allDay: true,
    extendedProps: { entityType: 'transportation', record: t },
  };
}
