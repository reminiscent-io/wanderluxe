import ical from 'ical-generator';

export interface FeedTrip { destination: string; }
export interface FeedActivity { id: string; title: string; date: string; start_time: string | null; end_time: string | null; description: string | null; location_address: string | null; }
export interface FeedReservation { id: string; restaurant_name: string; date: string; reservation_time: string | null; address: string | null; notes: string | null; }
export interface FeedAccommodation { stay_id: string; hotel: string; hotel_checkin_date: string; hotel_checkout_date: string; hotel_address: string | null; hotel_details: string | null; }
export interface FeedTransportation { id: string; type: string; start_date: string; start_time: string | null; end_date: string | null; end_time: string | null; departure_location: string | null; arrival_location: string | null; provider: string | null; details: string | null; }
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
function transportTitle(t: FeedTransportation): string {
  const label = t.type ? t.type.charAt(0).toUpperCase() + t.type.slice(1) : 'Transport';
  if (t.departure_location && t.arrival_location) return `${label}: ${t.departure_location} to ${t.arrival_location}`;
  // Mirror the in-app calendar's fallback so a subscribed feed shows the same summary.
  return t.provider ? `${label} · ${t.provider}` : label;
}

export function buildTripCalendarICS(input: FeedInput): string {
  const cal = ical({ name: `${input.trip.destination} Itinerary` });
  cal.prodId({ company: 'WanderLuxe', product: 'Itinerary', language: 'EN' });

  for (const a of input.activities) {
    if (!a.date) continue;
    if (a.start_time) {
      cal.createEvent({
        id: `activity-${a.id}@wanderluxe.io`,
        start: floatingDate(a.date, a.start_time),
        end: a.end_time ? floatingDate(a.date, a.end_time) : floatingDate(a.date, a.start_time),
        floating: true,
        summary: a.title,
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
      cal.createEvent({ id: `dining-${r.id}@wanderluxe.io`, start: floatingDate(r.date, r.reservation_time), end: floatingDate(r.date, r.reservation_time), floating: true, summary: r.restaurant_name, location: r.address ?? undefined, description: r.notes ?? undefined });
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
    const sameDay = !t.end_date || t.end_date === t.start_date;
    if (sameDay && t.start_time) {
      cal.createEvent({ id: `transportation-${t.id}@wanderluxe.io`, start: floatingDate(t.start_date, t.start_time), end: t.end_time ? floatingDate(t.start_date, t.end_time) : floatingDate(t.start_date, t.start_time), floating: true, summary: transportTitle(t), location: t.departure_location ?? undefined, description: t.details ?? undefined });
    } else {
      cal.createEvent({ id: `transportation-${t.id}@wanderluxe.io`, start: dateOnly(t.start_date), end: plusOneDay(t.end_date ?? t.start_date), allDay: true, summary: transportTitle(t), location: t.departure_location ?? undefined, description: t.details ?? undefined });
    }
  }

  return cal.toString();
}
