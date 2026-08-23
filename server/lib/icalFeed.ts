import ical from 'ical-generator';
import { effectiveReservationEnd } from '../../src/utils/timeUtils';
import { effectiveTz, shouldShowBadge, tzAbbrev, transportTzLabels } from '../../src/utils/timezoneLabel';

export interface FeedTrip { destination: string; timezone: string | null; }
export interface FeedActivity { id: string; title: string; date: string; start_time: string | null; end_time: string | null; description: string | null; location_address: string | null; timezone: string | null; }
export interface FeedReservation { id: string; restaurant_name: string; date: string; reservation_time: string | null; end_time: string | null; address: string | null; notes: string | null; timezone: string | null; }
export interface FeedAccommodation { stay_id: string; hotel: string; hotel_checkin_date: string; hotel_checkout_date: string; hotel_address: string | null; hotel_details: string | null; }
export interface FeedTransportation { id: string; type: string; start_date: string; start_time: string | null; end_date: string | null; end_time: string | null; departure_location: string | null; arrival_location: string | null; provider: string | null; details: string | null; departure_timezone: string | null; arrival_timezone: string | null; }
export interface FeedInput {
  trip: FeedTrip;
  activities: FeedActivity[];
  reservations: FeedReservation[];
  accommodations: FeedAccommodation[];
  transportation: FeedTransportation[];
}

export function isFeedAuthorized(
  trip: { calendar_feed_enabled: boolean | null; calendar_feed_token: string | null },
  token: string,
): boolean {
  return !!token && !!trip.calendar_feed_enabled && !!trip.calendar_feed_token && trip.calendar_feed_token === token;
}

/** Build a Date whose UTC fields equal the wall-clock; with `floating:true` this serialises without Z. */
function floatingDate(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.slice(0, 5).split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
}
function dateOnly(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function plusOneDay(date: string): Date {
  const base = dateOnly(date);
  return new Date(base.getTime() + 24 * 60 * 60 * 1000);
}
/**
 * A rental car is a resource you hold, not a leg you ride. The two moments a
 * subscriber needs on their calendar are the counter visits at each end; the
 * days in between are just days you happen to have keys. Emitting the booking
 * as one pickup->return block leaves an event "in progress" for the whole
 * rental, which a phone then reports as the current/next thing all week.
 */
const RENTAL_PICKUP_MINUTES = 60;
const RENTAL_RETURN_MINUTES = 30;

function plusMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60 * 1000);
}

/** "Rental Car Pickup: Nice Airport" — wording mirrors the in-app timeline rows. */
function rentalTitle(t: FeedTransportation, phase: 'pickup' | 'return'): string {
  const label = phase === 'pickup' ? 'Rental Car Pickup' : 'Rental Car Return';
  const detail = (phase === 'pickup' ? t.departure_location : t.arrival_location) || t.provider;
  return detail ? `${label}: ${detail}` : label;
}

function transportTitle(t: FeedTransportation): string {
  const label = t.type ? t.type.charAt(0).toUpperCase() + t.type.slice(1) : 'Transport';
  if (t.departure_location && t.arrival_location) return `${label}: ${t.departure_location} to ${t.arrival_location}`;
  // Mirror the in-app calendar's fallback so a subscribed feed shows the same summary.
  return t.provider ? `${label} · ${t.provider}` : label;
}

/** "Louvre (BST)" when the entity zone diverges from the trip zone; title otherwise. */
function summaryWithTz(title: string, entityTz: string | null, tripTz: string | null, onDate: string): string {
  const suffix = shouldShowBadge(entityTz, tripTz) ? tzAbbrev(effectiveTz(entityTz, tripTz)!, onDate) : '';
  return suffix ? `${title} (${suffix})` : title;
}

/** Zone note for a transport summary: "(EDT -> GMT+1)" cross-zone, "(EDT)" single-zone divergence, '' otherwise. */
function transportTzNote(t: FeedTransportation, tripTz: string | null): string {
  const labels = transportTzLabels(t.departure_timezone, t.arrival_timezone, tripTz, t.start_date);
  if (labels.dep && labels.arr && labels.dep !== labels.arr) return ` (${labels.dep} -> ${labels.arr})`;
  return labels.dep ? ` (${labels.dep})` : '';
}

/**
 * Two short bookends instead of one multi-day block. Each end is timed when we
 * know its wall-clock, and falls back to an all-day marker on its own date when
 * we don't — never a span, which is the shape that caused the problem.
 */
function addRentalCarEvents(cal: ReturnType<typeof ical>, t: FeedTransportation, tripTz: string | null): void {
  const returnDate = t.end_date ?? t.start_date;
  const details = t.details ?? undefined;

  if (t.start_time) {
    const start = floatingDate(t.start_date, t.start_time);
    cal.createEvent({
      id: `transportation-${t.id}-pickup@wanderluxe.io`,
      start,
      end: plusMinutes(start, RENTAL_PICKUP_MINUTES),
      floating: true,
      summary: summaryWithTz(rentalTitle(t, 'pickup'), t.departure_timezone, tripTz, t.start_date),
      location: t.departure_location ?? undefined,
      description: details,
    });
  } else {
    cal.createEvent({
      id: `transportation-${t.id}-pickup@wanderluxe.io`,
      start: dateOnly(t.start_date),
      end: plusOneDay(t.start_date),
      allDay: true,
      summary: rentalTitle(t, 'pickup'),
      location: t.departure_location ?? undefined,
      description: details,
    });
  }

  // Nothing is known about the return beyond the pickup day itself — a second
  // event there would just duplicate the first.
  if (returnDate === t.start_date && !t.end_time) return;

  if (t.end_time) {
    const start = floatingDate(returnDate, t.end_time);
    cal.createEvent({
      id: `transportation-${t.id}-return@wanderluxe.io`,
      start,
      end: plusMinutes(start, RENTAL_RETURN_MINUTES),
      floating: true,
      summary: summaryWithTz(rentalTitle(t, 'return'), t.arrival_timezone, tripTz, returnDate),
      location: t.arrival_location ?? undefined,
      description: details,
    });
  } else {
    cal.createEvent({
      id: `transportation-${t.id}-return@wanderluxe.io`,
      start: dateOnly(returnDate),
      end: plusOneDay(returnDate),
      allDay: true,
      summary: rentalTitle(t, 'return'),
      location: t.arrival_location ?? undefined,
      description: details,
    });
  }
}

export function buildTripCalendarICS(input: FeedInput): string {
  const cal = ical({ name: `${input.trip.destination} Itinerary` });
  cal.prodId({ company: 'WanderLuxe', product: 'Itinerary', language: 'EN' });
  const tripTz = input.trip.timezone;

  for (const a of input.activities) {
    if (!a.date) continue;
    if (a.start_time) {
      cal.createEvent({
        id: `activity-${a.id}@wanderluxe.io`,
        start: floatingDate(a.date, a.start_time),
        // Omit end (rather than duplicate start) when unknown: a zero-duration
        // DTEND==DTSTART violates RFC 5545; ical-generator emits DTSTART alone.
        end: a.end_time ? floatingDate(a.date, a.end_time) : undefined,
        floating: true,
        summary: summaryWithTz(a.title, a.timezone, tripTz, a.date),
        location: a.location_address ?? undefined,
        description: a.description ?? undefined,
      });
    } else {
      cal.createEvent({ id: `activity-${a.id}@wanderluxe.io`, start: dateOnly(a.date), end: plusOneDay(a.date), allDay: true, summary: a.title, location: a.location_address ?? undefined, description: a.description ?? undefined });
    }
  }

  for (const r of input.reservations) {
    if (!r.date) continue;
    if (r.reservation_time) {
      // Unlike an activity, a dinner always gets an end: a subscriber wants the
      // hour blocked out, and a DTSTART with no DTEND is zero-duration per
      // RFC 5545. An unset end_time falls back to the 90-minute default.
      const end = effectiveReservationEnd(r.reservation_time, r.end_time);
      cal.createEvent({ id: `dining-${r.id}@wanderluxe.io`, start: floatingDate(r.date, r.reservation_time), end: end ? floatingDate(r.date, end) : undefined, floating: true, summary: summaryWithTz(r.restaurant_name, r.timezone, tripTz, r.date), location: r.address ?? undefined, description: r.notes ?? undefined });
    } else {
      cal.createEvent({ id: `dining-${r.id}@wanderluxe.io`, start: dateOnly(r.date), end: plusOneDay(r.date), allDay: true, summary: r.restaurant_name, location: r.address ?? undefined, description: r.notes ?? undefined });
    }
  }

  for (const s of input.accommodations) {
    if (!s.hotel_checkin_date || !s.hotel_checkout_date) continue;
    cal.createEvent({ id: `accommodation-${s.stay_id}@wanderluxe.io`, start: dateOnly(s.hotel_checkin_date), end: plusOneDay(s.hotel_checkout_date), allDay: true, summary: `Stay: ${s.hotel}`, location: s.hotel_address ?? undefined, description: s.hotel_details ?? undefined });
  }

  for (const t of input.transportation) {
    if (!t.start_date) continue;
    if (t.type === 'rental_car') {
      addRentalCarEvents(cal, t, tripTz);
      continue;
    }
    const sameDay = !t.end_date || t.end_date === t.start_date;
    // Emit a timed event whenever we have a start time AND a real end (an end
    // time, possibly on a later day) or the leg is same-day. This keeps the
    // departure/arrival times for overnight/red-eye legs instead of collapsing
    // them into a vague all-day block.
    if (t.start_time && (t.end_time || sameDay)) {
      cal.createEvent({ id: `transportation-${t.id}@wanderluxe.io`, start: floatingDate(t.start_date, t.start_time), end: t.end_time ? floatingDate(t.end_date ?? t.start_date, t.end_time) : undefined, floating: true, summary: `${transportTitle(t)}${transportTzNote(t, tripTz)}`, location: t.departure_location ?? undefined, description: t.details ?? undefined });
    } else {
      cal.createEvent({ id: `transportation-${t.id}@wanderluxe.io`, start: dateOnly(t.start_date), end: plusOneDay(t.end_date ?? t.start_date), allDay: true, summary: transportTitle(t), location: t.departure_location ?? undefined, description: t.details ?? undefined });
    }
  }

  return cal.toString();
}
