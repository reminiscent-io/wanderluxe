// src/lib/printDesign/trip.ts — how the Print Studio reads a trip.
//
// One projection from raw rows to everything an edition prints, shared by the
// browser (live and finalized editions) and the Express route (the payload the
// model writes copy from). Sharing it is the point: the model captions exactly
// the days and items the page will set, so a dinner can never be captioned on
// a day it is not printed on.
//
// It reads every field a traveler can fill in, because the edition is the
// record they hand to the people they travel with: addresses, party sizes,
// confirmation codes, flight numbers, phone numbers, the links in their notes,
// and both ends of a rental car. The Simple PDF keeps its own projection
// (src/services/pdf/data.ts); this one is free to print more.
//
// Pure, dependency-free and DOM-free, with relative imports only, so the
// server bundle can use it. Image sizes are filled in later by the browser
// (resolvePrintImages in components/trip/print-studio).

import { effectiveTz, shouldShowBadge, transportTzLabels, tzAbbrev } from '../../utils/timezoneLabel';
import {
  daysBetween,
  formatClock,
  formatDateRange,
  isoDate,
  minutesOf,
  shortMonthDay,
  weekdayOf,
} from './dates';

export { formatClock, formatDateRange, weekdayOf } from './dates';

type Row = Record<string, unknown>;

/**
 * Raw rows, exactly as fetchTripRows (browser) and fetchTripSnapshot (server)
 * read them. Loosely typed on purpose: a finalized edition replays rows stored
 * months ago, and a column that is missing must read as empty, not crash.
 */
export interface PrintTripRows {
  trip: Row | null;
  days: Row[];
  stays: Row[];
  trans: Row[];
  acts: Row[];
  dine: Row[];
  otherExpenses?: Row[];
}

export type PrintItemKind = 'stay' | 'journey' | 'activity' | 'dining';

export type JourneyMode = 'flight' | 'train' | 'bus' | 'car' | 'ferry' | 'transfer' | 'other';

export interface PrintLink {
  href: string;
  /** What the link is for, when the notes said ("Tickets"); otherwise the site. */
  label: string;
  /** host + path, shortened for paper. */
  display: string;
}

export interface PrintItem {
  kind: PrintItemKind;
  /** For journeys, what moves you. Drives the icon. */
  mode?: JourneyMode;
  /** Small label above the title: "Check-in", "Pickup", "Return". */
  label?: string;
  title: string;
  /** "2:45 PM", with a zone abbreviation when it differs from the trip's. Empty when untimed. */
  time: string;
  /** End time on the same day, formatted like `time`. */
  endTime: string;
  /** An address, or a route ("Raleigh-Durham (RDU) → Long Island MacArthur (ISP)"). */
  place?: string;
  /** The traveler's own notes, with links lifted out. */
  notes?: string;
  links: PrintLink[];
  /** Short facts: party size, confirmation code, flight number, phone. */
  facts: string[];
  /** Minutes from midnight, for ordering. */
  sortKey: number;
}

export interface PrintImage {
  url: string;
  /** The CSS object-position the traveler set for this photo in the app, e.g. "center 0%". */
  position?: string;
  /** Natural size, filled in by the browser loader. Absent until it has loaded. */
  width?: number;
  height?: number;
}

export interface PrintDay {
  /** yyyy-mm-dd */
  date: string;
  index: number;
  /** "Friday" */
  weekday: string;
  /** The traveler's own title for the day. */
  title?: string;
  description?: string;
  image?: PrintImage;
  /** Where the traveler sleeps tonight, when a stay covers the night. */
  stay?: string;
  items: PrintItem[];
}

export interface PrintStay {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  notes?: string;
}

export interface PrintJourney {
  mode: JourneyMode;
  /** "Flight", "Rental Car", "Train". */
  label: string;
  provider?: string;
  number?: string;
  from?: string;
  to?: string;
  date: string;
  time: string;
  endDate?: string;
  endTime: string;
  confirmation?: string;
  notes?: string;
}

export interface PrintReservation {
  name: string;
  date?: string;
  time: string;
  party?: number;
  confirmation?: string;
  phone?: string;
  address?: string;
}

export interface PrintBudget {
  budget: number | null;
  categories: Array<{ category: string; amount: number }>;
  total: number;
}

export interface PrintTrip {
  destination: string;
  startDate: string | null;
  endDate: string | null;
  /** "December 18–21, 2026" */
  dateRange: string;
  nights: number;
  timezone: string | null;
  cover?: PrintImage;
  days: PrintDay[];
  stays: PrintStay[];
  journeys: PrintJourney[];
  reservations: PrintReservation[];
  budget: PrintBudget;
}

/* =========================================================================
   Small readers
   ========================================================================= */

const str = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t : undefined;
};

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};

function withZone(time: string, entityTz: unknown, tripTz: string | null, onDate: string): string {
  if (!time) return '';
  const tz = str(entityTz) ?? null;
  if (!shouldShowBadge(tz, tripTz)) return time;
  const label = tzAbbrev(effectiveTz(tz, tripTz)!, onDate);
  return label ? `${time} ${label}` : time;
}

/* =========================================================================
   Notes and links
   ========================================================================= */

const URL_RE = /https?:\/\/[^\s<>"'()[\]{}]+/gi;

/**
 * A lead-in that only announces the link after it: "Link for tickets:",
 * "Ticket Link:", "Tickets:", "Book here:". Anchored to the end of the text
 * before the URL, so words earlier in the note are never touched.
 */
const LEAD_IN_RE =
  /(?:^|(?<=[\s.;,(]))((?:(?:ticket|booking|reservation|registration)s?\s+)?(?:link|url|tickets?|book(?:\s+here)?|reserve|register|website|info|details)(?:\s+(?:for|to)\s+[a-z]+(?:\s+[a-z]+){0,2})?)\s*[:\-–]?\s*$/i;

function shortDisplay(url: URL): string {
  const host = url.hostname.replace(/^www\./i, '');
  const segments = url.pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (!first) return host;
  if (first.length > 24) return `${host}/…`;
  return segments.length > 1 || url.search ? `${host}/${first}/…` : `${host}/${first}`;
}

/**
 * Lift the links out of a traveler's note. A URL on paper is a wall of
 * characters nobody types back in, so the page prints a short label and the
 * shared PDF keeps the real link underneath. The words around the link stay
 * exactly as written, minus a lead-in that only announced the link.
 */
export function extractLinks(text: string | undefined): { notes?: string; links: PrintLink[] } {
  if (!text) return { links: [] };
  const links: PrintLink[] = [];
  let out = '';
  let last = 0;
  URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_RE.exec(text)) !== null) {
    const raw = m[0].replace(/[.,;:!?]+$/, '');
    let before = text.slice(last, m.index);
    let label = '';
    const lead = LEAD_IN_RE.exec(before);
    if (lead) {
      label = /ticket/i.test(lead[1]) ? 'Tickets' : /book|reserv|regist/i.test(lead[1]) ? 'Booking' : '';
      before = before.slice(0, lead.index);
    }
    let parsed: URL | null = null;
    try {
      parsed = new URL(raw);
    } catch {
      parsed = null;
    }
    if (parsed) {
      out += before;
      const display = shortDisplay(parsed);
      links.push({ href: parsed.href, label: label || display, display });
    } else {
      out += text.slice(last, m.index) + raw;
    }
    last = m.index + raw.length;
  }
  out += text.slice(last);
  const notes = out
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .replace(/^[\s.;:,–-]+/, '')
    .replace(/[\s;:,–-]+$/, '')
    .trim();
  return { notes: notes || undefined, links };
}

function websiteLink(v: unknown): PrintLink | null {
  const raw = str(v);
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return { href: url.href, label: 'Website', display: shortDisplay(url) };
  } catch {
    return null;
  }
}

/* =========================================================================
   Places and journeys
   ========================================================================= */

/**
 * "Raleigh-Durham International Airport (RDU)" → "Raleigh-Durham (RDU)".
 * Only touches names that carry an airport code, so a street address or a
 * station name prints exactly as entered.
 */
export function shortPlace(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const m = /^(.*?)\s*\(([A-Z]{3})\)\s*$/.exec(name);
  if (!m) return name;
  const base = m[1]
    .replace(/\b(international|intl\.?|regional|municipal)\b/gi, '')
    .replace(/\bairport\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s,–-]+$/, '')
    .trim();
  return base ? `${base} (${m[2]})` : `(${m[2]})`;
}

const MODE_BY_TYPE: Record<string, JourneyMode> = {
  flight: 'flight',
  train: 'train',
  rail: 'train',
  bus: 'bus',
  coach: 'bus',
  rental_car: 'car',
  car: 'car',
  car_service: 'car',
  taxi: 'car',
  rideshare: 'car',
  ferry: 'ferry',
  boat: 'ferry',
  cruise: 'ferry',
  shuttle: 'transfer',
  transfer: 'transfer',
};

function journeyMode(type: string | undefined): JourneyMode {
  return (type && MODE_BY_TYPE[type.toLowerCase()]) || 'other';
}

/** "rental_car" → "Rental Car" */
function typeLabel(type: string | undefined): string {
  if (!type) return 'Transport';
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function journeyFacts(t: Row): string[] {
  const facts: string[] = [];
  const provider = str(t.provider);
  const number = str(t.flight_number);
  if (provider) facts.push(provider);
  if (number && !(provider && provider.replace(/\s/g, '').includes(number.replace(/\s/g, '')))) {
    facts.push(`${journeyMode(str(t.type)) === 'flight' ? 'Flight' : 'No.'} ${number}`);
  }
  const conf = str(t.confirmation_number);
  if (conf) facts.push(`Confirmation ${conf}`);
  return facts;
}

/* =========================================================================
   Projection
   ========================================================================= */

// Untimed items still need a place in the day: plans at 8:00 like the Simple
// PDF, and a hotel's doors at the hours hotels actually keep.
const UNTIMED_PLAN = 8 * 60;
const UNTIMED_CHECK_IN = 15 * 60;
const UNTIMED_CHECK_OUT = 11 * 60;

function sortKey(time: unknown, fallback: number): number {
  return minutesOf(time) ?? fallback;
}

const byDate = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Project raw rows into the edition's model of the trip. */
export function buildPrintTrip(rows: PrintTripRows): PrintTrip {
  const trip = rows.trip ?? {};
  const tripTz = str(trip.timezone) ?? null;

  const days = [...(rows.days ?? [])]
    .map((d) => ({ row: d, date: isoDate(d.date) }))
    .filter((d) => d.date)
    .sort((a, b) => byDate(a.date, b.date));

  const startDate = isoDate(trip.arrival_date) || days[0]?.date || null;
  const endDate = isoDate(trip.departure_date) || days[days.length - 1]?.date || null;

  const stays = (rows.stays ?? []).filter((s) => str(s.hotel) || str(s.title));
  const trans = rows.trans ?? [];
  const acts = rows.acts ?? [];
  const dine = rows.dine ?? [];

  const printDays: PrintDay[] = days.map(({ row, date }, index) => {
    const items: PrintItem[] = [];
    let stayTonight: string | undefined;

    /* stays ---------------------------------------------------------------- */
    for (const s of stays) {
      const name = (str(s.hotel) ?? str(s.title)) as string;
      const checkIn = isoDate(s.hotel_checkin_date);
      const checkOut = isoDate(s.hotel_checkout_date);
      if (!checkIn) continue;
      if (date >= checkIn && (!checkOut || date < checkOut)) stayTonight ??= name;

      if (date === checkIn) {
        const phone = str(s.hotel_phone);
        const site = websiteLink(s.hotel_website);
        const { notes, links } = extractLinks(str(s.hotel_details));
        items.push({
          kind: 'stay',
          label: 'Check-in',
          title: name,
          time: withZone(formatClock(s.checkin_time), s.timezone, tripTz, date),
          endTime: '',
          place: str(s.hotel_address),
          notes,
          links: site ? [...links, site] : links,
          facts: phone ? [phone] : [],
          sortKey: sortKey(s.checkin_time, UNTIMED_CHECK_IN),
        });
      } else if (date === checkOut) {
        items.push({
          kind: 'stay',
          label: 'Check-out',
          title: name,
          time: withZone(formatClock(s.checkout_time), s.timezone, tripTz, date),
          endTime: '',
          links: [],
          facts: [],
          sortKey: sortKey(s.checkout_time, UNTIMED_CHECK_OUT),
        });
      }
    }

    /* journeys ------------------------------------------------------------- */
    for (const t of trans) {
      const start = isoDate(t.start_date);
      if (!start) continue;
      const end = isoDate(t.end_date) || start;
      if (date !== start && date !== end) continue;

      const type = str(t.type);
      const mode = journeyMode(type);
      const from = str(t.departure_location);
      const to = str(t.arrival_location);
      const route = from && to && from !== to ? `${shortPlace(from)} → ${shortPlace(to)}` : shortPlace(from ?? to);
      const zones = transportTzLabels(str(t.departure_timezone), str(t.arrival_timezone), tripTz, date);
      const dep = formatClock(t.start_time);
      const arr = formatClock(t.end_time);
      const depLabeled = dep && zones.dep ? `${dep} ${zones.dep}` : dep;
      const arrLabeled = arr && zones.arr ? `${arr} ${zones.arr}` : arr;
      const { notes, links } = extractLinks(str(t.details));
      const facts = journeyFacts(t);

      // A rental car is two moments, not a week-long block: the counter on the
      // way in and the counter on the way out. Same split as the timeline.
      if (type === 'rental_car') {
        if (date === start) {
          items.push({
            kind: 'journey',
            mode,
            label: 'Pickup',
            title: 'Rental car',
            time: depLabeled,
            endTime: start === end ? arrLabeled : '',
            place: shortPlace(from),
            notes,
            links,
            facts,
            sortKey: sortKey(t.start_time, UNTIMED_PLAN),
          });
        } else {
          items.push({
            kind: 'journey',
            mode,
            label: 'Return',
            title: 'Rental car',
            time: arrLabeled,
            endTime: '',
            place: shortPlace(to ?? from),
            links: [],
            facts: [],
            sortKey: sortKey(t.end_time, UNTIMED_PLAN),
          });
        }
        continue;
      }

      const name = typeLabel(type);
      if (date === start) {
        const sameDay = end === start;
        items.push({
          kind: 'journey',
          mode,
          title: to ? `${name} to ${shortPlace(to)}` : name,
          time: depLabeled,
          endTime: sameDay ? arrLabeled : '',
          place: route,
          notes,
          links,
          facts: sameDay || !arr ? facts : [...facts, `Arrives ${shortMonthDay(end)}, ${arrLabeled}`],
          sortKey: sortKey(t.start_time, UNTIMED_PLAN),
        });
      } else {
        items.push({
          kind: 'journey',
          mode,
          label: 'Arrival',
          title: to ? `Arrive in ${shortPlace(to)}` : `${name} arrives`,
          time: arrLabeled,
          endTime: '',
          place: route,
          links: [],
          facts: [],
          sortKey: sortKey(t.end_time, UNTIMED_PLAN),
        });
      }
    }

    /* activities ----------------------------------------------------------- */
    for (const a of acts) {
      if (a.day_id !== row.day_id) continue;
      const { notes, links } = extractLinks(str(a.description));
      const site = websiteLink(a.location_website);
      const phone = str(a.location_phone);
      items.push({
        kind: 'activity',
        title: str(a.title) ?? 'Activity',
        time: withZone(formatClock(a.start_time), a.timezone, tripTz, date),
        endTime: withZone(formatClock(a.end_time), a.timezone, tripTz, date),
        place: str(a.location_address),
        notes,
        links: site ? [...links, site] : links,
        facts: phone ? [phone] : [],
        sortKey: sortKey(a.start_time, UNTIMED_PLAN),
      });
    }

    /* dining --------------------------------------------------------------- */
    for (const r of dine) {
      // reservation_time is a time-of-day column, so the day comes from day_id.
      if (!r.day_id || r.day_id !== row.day_id) continue;
      const { notes, links } = extractLinks(str(r.notes));
      const site = websiteLink(r.website);
      const facts: string[] = [];
      const party = num(r.number_of_people);
      if (party && party > 0) facts.push(`Party of ${party}`);
      const conf = str(r.confirmation_number);
      if (conf) facts.push(`Confirmation ${conf}`);
      const phone = str(r.phone_number);
      if (phone) facts.push(phone);
      items.push({
        kind: 'dining',
        title: str(r.restaurant_name) ?? 'Reservation',
        time: withZone(formatClock(r.reservation_time), r.timezone, tripTz, date),
        endTime: withZone(formatClock(r.end_time), r.timezone, tripTz, date),
        place: str(r.address),
        notes,
        links: site ? [...links, site] : links,
        facts,
        sortKey: sortKey(r.reservation_time, UNTIMED_PLAN),
      });
    }

    // Stable: equal times keep the order above (stays, travel, plans, meals).
    items.sort((a, b) => a.sortKey - b.sortKey);

    const imageUrl = str(row.image_url);
    return {
      date,
      index,
      weekday: weekdayOf(date),
      title: str(row.title),
      description: str(row.description),
      ...(imageUrl ? { image: { url: imageUrl, position: str(row.image_position) } } : {}),
      ...(stayTonight ? { stay: stayTonight } : {}),
      items,
    };
  });

  /* trip-level lists -------------------------------------------------------- */
  const printStays: PrintStay[] = stays
    .map((s) => ({
      name: (str(s.hotel) ?? str(s.title)) as string,
      address: str(s.hotel_address),
      phone: str(s.hotel_phone),
      website: str(s.hotel_website),
      checkIn: isoDate(s.hotel_checkin_date),
      checkOut: isoDate(s.hotel_checkout_date),
      checkInTime: formatClock(s.checkin_time),
      checkOutTime: formatClock(s.checkout_time),
      notes: extractLinks(str(s.hotel_details)).notes,
    }))
    .sort((a, b) => byDate(a.checkIn, b.checkIn));

  const journeys: PrintJourney[] = [...trans]
    .filter((t) => isoDate(t.start_date))
    // Sort on the raw columns: the formatted "2:45 PM" would read as 2:45 AM.
    .sort(
      (a, b) =>
        byDate(isoDate(a.start_date), isoDate(b.start_date)) ||
        (minutesOf(a.start_time) ?? 0) - (minutesOf(b.start_time) ?? 0)
    )
    .map((t) => {
      const type = str(t.type);
      const start = isoDate(t.start_date);
      const end = isoDate(t.end_date);
      return {
        mode: journeyMode(type),
        label: typeLabel(type),
        provider: str(t.provider),
        number: str(t.flight_number),
        from: shortPlace(str(t.departure_location)),
        to: shortPlace(str(t.arrival_location)),
        date: start,
        time: formatClock(t.start_time),
        ...(end && end !== start ? { endDate: end } : {}),
        endTime: formatClock(t.end_time),
        confirmation: str(t.confirmation_number),
        notes: extractLinks(str(t.details)).notes,
      };
    });

  const dateByDay = new Map(days.map((d) => [d.row.day_id, d.date]));
  const reservations: PrintReservation[] = [...dine]
    .sort(
      (a, b) =>
        byDate(dateByDay.get(a.day_id) ?? '', dateByDay.get(b.day_id) ?? '') ||
        (minutesOf(a.reservation_time) ?? 0) - (minutesOf(b.reservation_time) ?? 0)
    )
    .map((r) => {
      const party = num(r.number_of_people);
      return {
        name: str(r.restaurant_name) ?? 'Reservation',
        date: dateByDay.get(r.day_id),
        time: formatClock(r.reservation_time),
        ...(party && party > 0 ? { party } : {}),
        confirmation: str(r.confirmation_number),
        phone: str(r.phone_number),
        address: str(r.address),
      };
    });

  /* budget, for the opt-in Ledger only -------------------------------------- */
  const categories: Record<string, number> = {};
  const add = (category: string, list: Row[] | undefined) => {
    for (const r of list ?? []) {
      const cost = num(r.cost);
      if (cost) categories[category] = (categories[category] ?? 0) + cost;
    }
  };
  add('Activities', acts);
  add('Accommodations', rows.stays);
  add('Transportation', trans);
  add('Dining', dine);
  add('Other', rows.otherExpenses);
  const budgetCategories = Object.entries(categories)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const coverUrl = str(trip.cover_image_url);
  return {
    destination: str(trip.destination) ?? 'Trip',
    startDate,
    endDate,
    dateRange: formatDateRange(startDate, endDate),
    nights: startDate && endDate ? Math.max(0, daysBetween(startDate, endDate)) : 0,
    timezone: tripTz,
    ...(coverUrl ? { cover: { url: coverUrl, position: str(trip.cover_image_position) } } : {}),
    days: printDays,
    stays: printStays,
    journeys,
    reservations,
    budget: {
      budget: num(trip.budget) ?? null,
      categories: budgetCategories,
      total: budgetCategories.reduce((n, c) => n + c.amount, 0),
    },
  };
}

/** Whether the trip has anything for the Ledger to show: costs, or a budget to hold them against. */
export function hasPrintLedger(trip: PrintTrip): boolean {
  return trip.budget.total > 0 || trip.budget.budget != null;
}
