// src/lib/printDesign/plan.ts — how an edition is broken into pages.
//
// The Print Studio prints on Letter paper, portrait, one fixed page at a
// time. Before anything is drawn, this module reads the trip the way a
// designer would and decides what goes on which sheet:
//
//  - Length. A weekend gets a page per day and room to breathe; a month gets
//    paired days and a two-page overview.
//  - Density. Each day is weighed by how much it actually holds, so a day with
//    one dinner can share a sheet and a day with eleven plans gets one alone.
//  - Locations. Consecutive days in one place (dayPlaces, from the design) make
//    a leg; a multi-place trip of any length opens each long leg with a
//    chapter page, and marks the short ones on the day itself.
//
// Estimates only choose between layouts (pair or not, bookings on the
// overview or on their own page). They never split a day: the renderer
// measures every page in the browser with the real fonts, and when something
// overflows it hands back a remedy (FitFeedback) and the plan is rebuilt with
// it. A day breaks only where it really ran out of paper, between two items.
//
// Pure, dependency-free and DOM-free.

import type { PrintDesignSpec } from './spec';
import type { PrintDay, PrintItem, PrintTrip } from './trip';

/* =========================================================================
   Geometry — CSS px at 96 per inch, the unit the renderer lays pages out in
   ========================================================================= */

/** US Letter, portrait: 8.5in × 11in. */
export const SHEET = { width: 816, height: 1056 } as const;

/** The live area of a page once the margins and the running foot are taken. */
const BODY_HEIGHT = 900;

/** What a day's header takes on a page of its own, and on a shared one. */
const SOLO_HEADER = 250;
const PAIR_HEADER = 132;
/** The gap and rule between two days on one sheet. */
const PAIR_GUTTER = 44;

/** A trip gets chapter pages from this many days, for legs of at least CHAPTER_MIN_LEG days. */
const CHAPTER_MIN_TRIP = 8;
const CHAPTER_MIN_LEG = 3;

/** Room for one day's items on a shared sheet. */
const HALF_BODY = (BODY_HEIGHT - PAIR_GUTTER) / 2 - PAIR_HEADER;
/** Room for one day's items on a sheet of its own. */
const FULL_BODY = BODY_HEIGHT - SOLO_HEADER;

/* =========================================================================
   Types
   ========================================================================= */

export type TripLength = 'single' | 'short' | 'week' | 'long' | 'epic';

type DayDensity = 'open' | 'light' | 'full' | 'packed';

export interface Leg {
  /** As the design named it; '' when the design named no places. */
  place: string;
  /** First and last day index, inclusive. */
  from: number;
  to: number;
}

interface DayAnalysis {
  /** Estimated height of the day's items, in px. */
  weight: number;
  density: DayDensity;
}

export interface TripAnalysis {
  dayCount: number;
  itemCount: number;
  length: TripLength;
  days: DayAnalysis[];
  legs: Leg[];
  /** Index of the day with the most on it, or null for an empty trip. */
  busiest: number | null;
}

/** One line of the bookings reference: an index into the trip's own lists. */
export type DetailRow =
  | { section: 'journeys'; index: number }
  | { section: 'stays'; index: number }
  | { section: 'reservations'; index: number };

export type PlanPage =
  | { kind: 'cover' }
  /** Day rows [from, to) of the at-a-glance list. Compact keeps each day to one line of summary. */
  | { kind: 'overview'; from: number; to: number; part: number; parts: number; details: boolean; compact: boolean }
  | { kind: 'chapter'; leg: number }
  /** Items [from, to) of one day. Tight closes the spacing before the day is split. */
  | { kind: 'day'; day: number; from: number; to: number; part: number; parts: number; feature: boolean; tight: boolean }
  | { kind: 'pair'; days: [number, number] }
  /** Booking rows [from, to). */
  | { kind: 'details'; from: number; to: number; part: number; parts: number }
  | { kind: 'ledger' }
  | { kind: 'back' };

export interface EditionPlan {
  pages: PlanPage[];
  analysis: TripAnalysis;
  /** 1-based page number each day starts on. */
  dayPages: number[];
  detailRows: DetailRow[];
  /** Whether a leg is marked on its first day's page rather than by a chapter page. */
  legBanners: boolean[];
}

/**
 * Remedies from the renderer's overflow check, as tokens. A page that runs
 * long is tightened before it is split, so a few pixels never cost a page:
 *   solo:<date>                 the day may not share a sheet
 *   tight:<date>                close that day's spacing (first remedy)
 *   break:day:<date>:<i>        start a new page at item i of that day (0: the
 *                               schedule starts on the page after the header)
 *   compact:overview            one line of summary per day (first remedy)
 *   break:overview:<i>          start a new overview page at day row i
 *   break:details:<i>           start a new bookings page at row i
 *   details:own                 bookings get their own page, off the overview
 * Tokens only ever add constraints, so the fit loop always converges.
 */
type FitFeedback = readonly string[];

export interface PlanOptions {
  showBudget?: boolean;
  feedback?: FitFeedback;
}

/* =========================================================================
   Analysis
   ========================================================================= */

export function lengthOf(dayCount: number): TripLength {
  if (dayCount <= 1) return 'single';
  if (dayCount <= 3) return 'short';
  if (dayCount <= 8) return 'week';
  if (dayCount <= 16) return 'long';
  return 'epic';
}

const lines = (text: string | undefined, perLine: number) =>
  text ? text.split('\n').reduce((n, part) => n + Math.max(1, Math.ceil(part.length / perLine)), 0) : 0;

/**
 * A rough height for one item card, in px. Only ever used to choose a layout;
 * the renderer measures the real thing before anything is split.
 */
function estimateItem(item: PrintItem): number {
  const title = lines(item.title, 44) * 23;
  const label = item.label ? 16 : 0;
  const place = lines(item.place, 66) * 19;
  const notes = lines(item.notes, 64) * 20;
  const meta = [...item.facts, ...item.links.map((l) => `${l.label} ${l.display}`)].join(' · ');
  const metaLines = lines(meta, 70) * 19;
  return Math.max(46, label + title + place + notes + metaLines) + 22;
}

function estimateDay(day: PrintDay): number {
  const description = lines(day.description, 70) * 21;
  return day.items.reduce((n, item) => n + estimateItem(item), 0) + description;
}

function densityOf(day: PrintDay, weight: number): DayDensity {
  if (day.items.length === 0 && !day.description) return 'open';
  if (weight <= HALF_BODY) return 'light';
  if (weight <= FULL_BODY) return 'full';
  return 'packed';
}

/**
 * Consecutive days the design places in the same town make one leg. A day
 * with no place takes its neighbour's, so a gap in the model's answer never
 * invents a chapter.
 */
export function legsOf(trip: PrintTrip, design: Pick<PrintDesignSpec, 'dayPlaces'>): Leg[] {
  const n = trip.days.length;
  if (n === 0) return [];
  const places = trip.days.map((d) => design.dayPlaces?.[d.date]?.trim() ?? '');
  for (let i = 1; i < n; i++) if (!places[i]) places[i] = places[i - 1];
  for (let i = n - 2; i >= 0; i--) if (!places[i]) places[i] = places[i + 1];

  const legs: Leg[] = [];
  for (let i = 0; i < n; i++) {
    const last = legs[legs.length - 1];
    if (last && last.place.toLowerCase() === places[i].toLowerCase()) last.to = i;
    else legs.push({ place: places[i], from: i, to: i });
  }
  return legs;
}

export function analyzeTrip(trip: PrintTrip, design: Pick<PrintDesignSpec, 'dayPlaces'>): TripAnalysis {
  const days = trip.days.map((day) => {
    const weight = estimateDay(day);
    return { weight, density: densityOf(day, weight) };
  });
  let busiest: number | null = null;
  trip.days.forEach((day, i) => {
    if (day.items.length === 0) return;
    if (busiest === null || days[i].weight > days[busiest].weight) busiest = i;
  });
  return {
    dayCount: trip.days.length,
    itemCount: trip.days.reduce((n, d) => n + d.items.length, 0),
    length: lengthOf(trip.days.length),
    days,
    legs: legsOf(trip, design),
    busiest,
  };
}

/* =========================================================================
   Bookings reference
   ========================================================================= */

/**
 * The rows worth a reference page: every journey and stay, and the
 * reservations that carry something to quote at a desk (a confirmation code
 * or a phone number). A booking with nothing to look up is already on its day.
 */
function detailRowsOf(trip: PrintTrip): DetailRow[] {
  const rows: DetailRow[] = [];
  trip.journeys.forEach((_, index) => rows.push({ section: 'journeys', index }));
  trip.stays.forEach((_, index) => rows.push({ section: 'stays', index }));
  trip.reservations.forEach((r, index) => {
    if (r.confirmation || r.phone) rows.push({ section: 'reservations', index });
  });
  return rows;
}

/**
 * Whether the bookings earn a place at all: something to quote (a code, a
 * flight number, a phone) or somewhere to sleep. Three flights with no codes
 * are already on their days.
 */
function hasDetails(trip: PrintTrip): boolean {
  return (
    trip.stays.length > 0 ||
    trip.journeys.some((j) => j.confirmation || j.number) ||
    trip.reservations.some((r) => r.confirmation || r.phone)
  );
}

/* =========================================================================
   The plan
   ========================================================================= */

/**
 * Split [0, count) at the given indices into page ranges. A day may also break
 * at 0: its header, photo and notes take a page and the schedule starts on the
 * next, for a day whose first item would not fit under them.
 */
function ranges(count: number, breaks: number[], allowLeadingBreak = false): Array<[number, number]> {
  const cuts = [...new Set(breaks)]
    .filter((b) => (b > 0 || (allowLeadingBreak && b === 0)) && b < count)
    .sort((a, b) => a - b);
  const out: Array<[number, number]> = [];
  let from = 0;
  for (const cut of cuts) {
    out.push([from, cut]);
    from = cut;
  }
  out.push([from, count]);
  return out;
}

function breaksFor(feedback: Set<string>, stream: string): number[] {
  const prefix = `break:${stream}:`;
  const out: number[] = [];
  for (const token of feedback) {
    if (token.startsWith(prefix)) {
      const n = Number(token.slice(prefix.length));
      if (Number.isInteger(n)) out.push(n);
    }
  }
  return out;
}

/**
 * Lay the trip out on Letter pages: cover, the trip at a glance, chapters,
 * days, bookings, the opt-in Ledger, and a back page.
 */
export function planEdition(
  trip: PrintTrip,
  design: Pick<PrintDesignSpec, 'dayPlaces' | 'featureDays'>,
  options: PlanOptions = {}
): EditionPlan {
  const feedback = new Set(options.feedback ?? []);
  const analysis = analyzeTrip(trip, design);
  const { dayCount, length, legs } = analysis;
  const features = new Set(design.featureDays ?? []);
  const pages: PlanPage[] = [{ kind: 'cover' }];

  /* bookings: on the overview when they are few, or a page of their own --- */
  const detailRows = hasDetails(trip) ? detailRowsOf(trip) : [];
  const overviewPossible = dayCount >= 2;
  const detailsOnOverview =
    detailRows.length > 0 &&
    overviewPossible &&
    !feedback.has('details:own') &&
    detailRows.length <= 6 &&
    dayCount <= 8;

  /* the trip at a glance ---------------------------------------------------- */
  if (overviewPossible) {
    const parts = ranges(dayCount, breaksFor(feedback, 'overview'));
    parts.forEach(([from, to], i) =>
      pages.push({
        kind: 'overview',
        from,
        to,
        part: i + 1,
        parts: parts.length,
        details: detailsOnOverview && i === parts.length - 1,
        compact: detailsOnOverview || feedback.has('compact:overview'),
      })
    );
  }

  /* chapters: a place gets an opening page when the trip is long enough to need
     signposts and the leg is long enough to deserve one; a shorter leg is
     marked by a banner on its first day ---------------------------------------- */
  const multiPlace = legs.length >= 2 && legs.length <= 8;
  const legBanners = legs.map((leg) => {
    if (!multiPlace) return false;
    return !(dayCount >= CHAPTER_MIN_TRIP && leg.to - leg.from + 1 >= CHAPTER_MIN_LEG);
  });

  /* days ---------------------------------------------------------------------- */
  const dayPages: number[] = new Array(dayCount).fill(0);
  // Short trips get a page a day: there are few of them, and room is the point.
  const pairing = length === 'week' || length === 'long' || length === 'epic';
  const lightish = (i: number) => {
    const d = analysis.days[i].density;
    return d === 'open' || d === 'light';
  };
  const mustStandAlone = (i: number) => {
    const day = trip.days[i];
    return (
      features.has(day.date) ||
      feedback.has(`solo:${day.date}`) ||
      breaksFor(feedback, `day:${day.date}`).length > 0 ||
      // A traveler's own photo of the day earns it a sheet, until the trip is
      // long enough that sheets cost more than photos.
      (!!day.image && length !== 'long' && length !== 'epic')
    );
  };

  legs.forEach((leg, legIndex) => {
    if (multiPlace && !legBanners[legIndex]) pages.push({ kind: 'chapter', leg: legIndex });
    let i = leg.from;
    while (i <= leg.to) {
      const j = i + 1;
      const canPair =
        pairing &&
        j <= leg.to &&
        lightish(i) &&
        lightish(j) &&
        !mustStandAlone(i) &&
        !mustStandAlone(j);
      if (canPair) {
        pages.push({ kind: 'pair', days: [i, j] });
        dayPages[i] = pages.length;
        dayPages[j] = pages.length;
        i += 2;
        continue;
      }
      const day = trip.days[i];
      const parts = ranges(day.items.length, breaksFor(feedback, `day:${day.date}`), true);
      parts.forEach(([from, to], p) => {
        pages.push({
          kind: 'day',
          day: i,
          from,
          to,
          part: p + 1,
          parts: parts.length,
          feature: features.has(day.date),
          tight: feedback.has(`tight:${day.date}`),
        });
        if (p === 0) dayPages[i] = pages.length;
      });
      i += 1;
    }
  });

  /* bookings, ledger, back ---------------------------------------------------- */
  if (detailRows.length > 0 && !detailsOnOverview) {
    const parts = ranges(detailRows.length, breaksFor(feedback, 'details'));
    parts.forEach(([from, to], i) => pages.push({ kind: 'details', from, to, part: i + 1, parts: parts.length }));
  }
  if (options.showBudget && (trip.budget.total > 0 || trip.budget.budget != null)) {
    pages.push({ kind: 'ledger' });
  }
  pages.push({ kind: 'back' });

  return { pages, analysis, dayPages, detailRows, legBanners };
}

/**
 * The plan in a sentence, for the edition's toolbar: what the Studio decided
 * and why the page count is what it is.
 */
export function describePlan(plan: EditionPlan, trip: PrintTrip): string {
  const { dayCount, legs } = plan.analysis;
  const parts: string[] = [`${plan.pages.length} pages`, dayCount === 1 ? 'one day' : `${dayCount} days`];
  const chapters = plan.pages.filter((p) => p.kind === 'chapter').length;
  if (chapters > 0) parts.push(`${chapters} chapters`);
  else if (legs.length >= 2) parts.push(`${legs.length} places`);
  const pairs = plan.pages.filter((p) => p.kind === 'pair').length;
  if (pairs > 0) parts.push(pairs === 1 ? 'two light days share a page' : `${pairs * 2} light days share pages`);
  for (const page of plan.pages) {
    if (page.kind === 'day' && page.part === 1 && page.parts > 1) {
      const weekday = trip.days[page.day]?.weekday;
      parts.push(`${weekday || `day ${page.day + 1}`} runs to ${page.parts} pages`);
    }
  }
  return parts.join(' · ');
}
