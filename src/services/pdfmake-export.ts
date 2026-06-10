/*  src/services/pdfmake-export.ts
    Itinerary PDF export — one canonical, device-independent document.
    - Data from Supabase (buildDays), images pre-cropped via pdf/images
    - All sizes/colors/spacing come from pdf/theme tokens and named styles
    - Pagination by pdfmake with the pdf/pagination orphan-heading rule
    ---------------------------------------------------------------------- */

import pdfMake from 'pdfmake/build/pdfmake';
import { loadPdfFonts } from './pdf-fonts';
import { imageToCoverDataURI } from './pdf/images';
import {
  PAGE, TYPE, SPACE, COLORS, FONTS,
  innerPageWidth, defaultPageSize,
  type PdfPageSize,
} from './pdf/theme';
import { isOrphanedHeading } from './pdf/pagination';
import { fmtMoney } from './pdf/format';

import { supabase } from '@/integrations/supabase/client';
import { track } from '@/lib/analytics';
import { parseISO, format as fnsFormat, isSameDay } from 'date-fns';
import type { PdfExportOptions } from '@/components/trip/PdfExportDialog';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { Tables } from '@/integrations/supabase/types';

// Supabase row types for itinerary data
type TripRow = Tables<'trips'>;
type TripDayRow = Tables<'trip_days'>;
type AccommodationRow = Tables<'accommodations'>;
type TransportationRow = Tables<'transportation'>;
type DayActivityRow = Tables<'day_activities'>;
type ReservationRow = Tables<'reservations'>;
type OtherExpenseRow = Tables<'other_expenses'>;

/* =========================================================================
   Constants & Types
   ========================================================================= */

const TABLES = {
  trip: 'trips',
  days: 'trip_days',
  stays: 'accommodations',
  transport: 'transportation',
  activities: 'day_activities',
  dining: 'reservations',
  otherExpenses: 'other_expenses',
} as const;

/** Format a snake_case transport type into Title Case (e.g. "car_service" → "Car Service") */
function formatType(raw: string | null | undefined): string {
  if (!raw) return 'Transport';
  return raw.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// Fixed-width, anchored time matcher: "8:05 am" (linear; no catastrophic backtracking)
const TIME_RE = /^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])m\s*$/i;

type Item = {
  type: 'accommodation' | 'transportation' | 'activity' | 'dining';
  title: string;
  time: string; // may be "08:00 AM – 11:45 AM"
  details?: string;
  location?: string;
  cost?: string;
  thumb?: string; // dataURL after conversion (not remote URL)
  sortKey: number; // minutes from midnight (start time) for sorting
};

type Day = {
  date: string;
  title?: string;
  description?: string;
  items: Item[];
  activityCount?: number;
  hasTransport?: boolean;
};

type AccommodationSummary = {
  hotel: string;
  checkIn: string;
  checkOut: string;
  address?: string;
  phone?: string;
  website?: string;
  checkInDate: string;
  checkOutDate: string;
};

type TransportSegment = {
  from: string;
  to: string;
  date: string;
  type: string;
  confirmationNumber?: string;
};

/* =========================================================================
   Safe formatting & parsing (ReDoS-free)
   ========================================================================= */

const asDate = (d: string) => parseISO(d);
const sameDay = (a: string, b: string) => isSameDay(asDate(a), asDate(b));

const fmtDate = (d: string, pat = 'EEEE, MMMM d, yyyy') => fnsFormat(parseISO(d), pat);
const fmtShort = (d: string) => fnsFormat(parseISO(d), 'MMM d');

function fmtTime(t?: string | null) {
  if (!t) return '';
  try {
    // ISO string → format directly
    if (t.includes('T')) return fnsFormat(parseISO(t), 'h:mm a');

    // "HH:mm" → convert to 12-hour with am/pm
    const parts = t.split(':');
    const h = parseInt(parts[0] ?? '0', 10);
    const m = parseInt(parts[1] ?? '0', 10);
    if (isNaN(h) || isNaN(m)) return '';
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return fnsFormat(d, 'h:mm a');
  } catch {
    return '';
  }
}

function minsFromTime(s: string): number {
  // Accept "8:05 am" or "8 am" (minutes optional)
  const m = TIME_RE.exec(s);
  if (!m) return 9999;
  const hh = parseInt(m[1], 10) % 12;
  const mm = m[2] ? parseInt(m[2], 10) : 0;
  const mer = (m[3] || 'a').toLowerCase();
  return (mer === 'p' ? hh + 12 : hh) * 60 + mm;
}

function sanitizeFilename(input?: string | null): string {
  // Linear-time sanitizer (no regex backtracking)
  const s = (input || 'itinerary').toLowerCase();
  let out = '';
  let prevUnderscore = false;

  for (let i = 0; i < s.length && out.length < 120; i++) {
    const ch = s[i];
    const code = ch.charCodeAt(0);
    const isAlnum = (code >= 48 && code <= 57) || (code >= 97 && code <= 122);
    if (isAlnum) {
      out += ch;
      prevUnderscore = false;
    } else if (!prevUnderscore) {
      out += '_';
      prevUnderscore = true;
    }
  }

  // Trim leading/trailing underscores (no regex)
  while (out.startsWith('_')) out = out.slice(1);
  while (out.endsWith('_')) out = out.slice(0, -1);

  return out || 'itinerary';
}

/* =========================================================================
   Data build (Supabase)
   ========================================================================= */

type DiningRef = { restaurant: string; confirmationNumber?: string };

type BudgetData = {
  budget: number | null;
  categories: { category: string; amount: number }[];
  total: number;
};

async function buildDays(
  tripId: string,
  o: PdfExportOptions
): Promise<{
  days: Day[];
  stays: AccommodationSummary[];
  transports: TransportSegment[];
  diningRefs: DiningRef[];
  budgetData: BudgetData;
}> {
  const [
    { data: days, error: daysErr },
    { data: stays },
    { data: trans },
    { data: acts },
    { data: dine },
    { data: otherExpenses },
    { data: tripRow },
  ] = await Promise.all([
    supabase.from(TABLES.days).select('day_id,date,title,description').eq('trip_id', tripId).order('date'),
    supabase.from(TABLES.stays).select('*').eq('trip_id', tripId),
    supabase.from(TABLES.transport).select('*').eq('trip_id', tripId),
    supabase.from(TABLES.activities).select('*').eq('trip_id', tripId),
    supabase.from(TABLES.dining).select('*').eq('trip_id', tripId),
    supabase.from(TABLES.otherExpenses).select('*').eq('trip_id', tripId),
    supabase.from(TABLES.trip).select('budget').eq('trip_id', tripId).single(),
  ]);

  if (daysErr) throw daysErr;

  // Build budget data by category
  const catMap: Record<string, number> = {};
  ((acts ?? []) as DayActivityRow[]).forEach((a) => { if (a.cost) catMap['Activities'] = (catMap['Activities'] || 0) + a.cost; });
  ((stays ?? []) as AccommodationRow[]).forEach((s) => { if (s.cost) catMap['Accommodations'] = (catMap['Accommodations'] || 0) + s.cost; });
  ((trans ?? []) as TransportationRow[]).forEach((t) => { if (t.cost) catMap['Transportation'] = (catMap['Transportation'] || 0) + t.cost; });
  ((dine ?? []) as ReservationRow[]).forEach((r) => { if (r.cost) catMap['Dining'] = (catMap['Dining'] || 0) + r.cost; });
  ((otherExpenses ?? []) as OtherExpenseRow[]).forEach((e) => { if (e.cost) catMap['Other'] = (catMap['Other'] || 0) + e.cost; });
  const categories = Object.entries(catMap).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  const total = categories.reduce((sum, c) => sum + c.amount, 0);
  const budgetData: BudgetData = { budget: tripRow?.budget ?? null, categories, total };

  // Build accommodation summary and sort by check-in date ascending
  const staysSummary: AccommodationSummary[] = ((stays ?? []) as AccommodationRow[])
    .map((s) => ({
      hotel: s.hotel || 'Hotel',
      checkIn: fmtShort(s.hotel_checkin_date),
      checkOut: fmtShort(s.hotel_checkout_date),
      address: s.hotel_address,
      phone: s.hotel_phone || undefined,
      website: s.hotel_website || undefined,
      checkInDate: s.hotel_checkin_date,
      checkOutDate: s.hotel_checkout_date,
    }))
    .sort((a, b) => {
      const checkInCompare = new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime();
      if (checkInCompare !== 0) return checkInCompare;
      return new Date(a.checkOutDate).getTime() - new Date(b.checkOutDate).getTime();
    });

  // Build transport segments
  const transportSegments: TransportSegment[] = ((trans ?? []) as TransportationRow[])
    .filter((t): t is TransportationRow & { departure_location: string; arrival_location: string } =>
      !!t.departure_location && !!t.arrival_location
    )
    .map((t) => ({
      from: t.departure_location,
      to: t.arrival_location,
      date: fmtShort(t.start_date),
      type: formatType(t.type),
      confirmationNumber: t.confirmation_number || undefined,
    }));

  // Build dining references (for confirmation numbers)
  const diningRefs: DiningRef[] = ((dine ?? []) as ReservationRow[])
    .filter((r): r is ReservationRow & { confirmation_number: string } => !!r.confirmation_number)
    .map((r) => ({
      restaurant: r.restaurant_name,
      confirmationNumber: r.confirmation_number,
    }));

  const processedDays: Day[] = ((days ?? []) as TripDayRow[]).map((day) => {
    const items: Item[] = [];

    /* accommodation ----------------------------------------------------- */
    {
      ((stays ?? []) as AccommodationRow[]).forEach((s) => {
        if (!s.hotel_checkin_date || !s.hotel_checkout_date) return;

        const dayISO = day.date;
        const inRange =
          sameDay(dayISO, s.hotel_checkin_date) ||
          sameDay(dayISO, s.hotel_checkout_date) ||
          (parseISO(dayISO) >= parseISO(s.hotel_checkin_date) && parseISO(dayISO) <= parseISO(s.hotel_checkout_date));

        if (!inRange) return;

        const isIn = sameDay(dayISO, s.hotel_checkin_date);
        const isOut = sameDay(dayISO, s.hotel_checkout_date);
        const when = isIn ? s.checkin_time : isOut ? s.checkout_time : null;

        // Only show check-in/check-out, skip repeated "Stay" entries
        if (!isIn && !isOut) return;

        const t = fmtTime(when);
        items.push({
          type: 'accommodation',
          title: `${isIn ? 'Check-in' : 'Check-out'}: ${s.hotel}`,
          time: t || 'All-day',
          details: s.hotel_details || undefined,
          location: s.hotel_address || undefined,
          cost: s.cost != null ? fmtMoney(s.cost, s.currency) : undefined,
          thumb: (o.showImages && s.image_url) ? String(s.image_url) : undefined, // will be converted to dataURL later
          sortKey: minsFromTime(t || '8:00 am'),
        });
      });
    }

    /* transportation ---------------------------------------------------- */
    let hasTransport = false;
    {
      ((trans ?? []) as TransportationRow[]).forEach((t) => {
        if (!t.start_date) return;
        if (!sameDay(String(t.start_date), String(day.date))) return;

        hasTransport = true;

        const formattedType = formatType(t.type);
        const title = t.type === 'flight' && t.provider
          ? `Flight: ${t.provider}`
          : formattedType;

        const startStr = fmtTime(t.start_time);
        const endStr = fmtTime(t.end_time);
        const timeStr = startStr && endStr ? `${startStr} – ${endStr}` : (startStr || endStr || 'All-day');

        items.push({
          type: 'transportation',
          title,
          time: timeStr,
          details: t.details || undefined,
          location:
            t.departure_location && t.arrival_location
              ? `From: ${t.departure_location} to ${t.arrival_location}`
              : t.departure_location || undefined,
          cost: t.cost != null ? fmtMoney(t.cost, t.currency) : undefined,
          sortKey: minsFromTime(startStr || '8:00 am'),
        });
      });
    }

    /* activities -------------------------------------------------------- */
    {
      ((acts ?? []) as DayActivityRow[])
        .filter((a) => a.day_id === day.day_id)
        .forEach((a) => {
          const t = fmtTime(a.start_time);
          items.push({
            type: 'activity',
            title: a.title || 'Activity',
            time: t || 'All-day',
            details: a.description || undefined,
            cost: a.cost != null ? fmtMoney(a.cost, a.currency) : undefined,
            sortKey: minsFromTime(t || '8:00 am'),
          });
        });
    }

    /* dining ------------------------------------------------------------ */
    {
      ((dine ?? []) as ReservationRow[]).forEach((r) => {
        // reservation_time may be ISO datetime; compare by date component
        const reservationDate = typeof r.reservation_time === 'string' && r.reservation_time.includes('T')
          ? r.reservation_time.split('T')[0]
          : (typeof r.reservation_time === 'string' ? r.reservation_time : '');

        const match =
          (r.day_id && r.day_id === day.day_id) ||
          (reservationDate && sameDay(reservationDate, String(day.date)));

        if (!match) return;

        const meta: string[] = [];
        if (r.number_of_people) meta.push(`${r.number_of_people} ${r.number_of_people === 1 ? 'person' : 'people'}`);
        if (r.address) meta.push(r.address);

        const t = fmtTime(r.reservation_time);
        items.push({
          type: 'dining',
          title: `Dining: ${r.restaurant_name}`,
          time: t || 'All-day',
          details: r.notes || undefined,
          location: meta.join(' • ') || undefined,
          cost: r.cost != null ? fmtMoney(r.cost, r.currency) : undefined,
          sortKey: minsFromTime(t || '8:00 am'),
        });
      });
    }

    // Count only activities and dining for density (not accommodation/transport)
    const activityCount = items.filter((i) => i.type === 'activity' || i.type === 'dining').length;

    return {
      ...day,
      items: items.sort((a, b) => a.sortKey - b.sortKey),
      activityCount,
      hasTransport,
    };
  });

  // Convert item thumbs to data URLs so pdfMake can render them reliably
  if (o.showImages) {
    const jobs: Promise<void>[] = [];
    for (const d of processedDays) {
      for (const it of d.items) {
        if (!it.thumb) continue;
        const url = it.thumb;
        jobs.push(
          imageToCoverDataURI(url, PAGE.thumbSize, PAGE.thumbSize, PAGE.thumbScale).then((dataUrl) => {
            it.thumb = dataUrl || '';
          })
        );
      }
    }
    await Promise.all(jobs);

    // remove empties
    for (const d of processedDays) {
      d.items.forEach((it) => {
        if (!it.thumb) delete it.thumb;
      });
    }
  }

  return { days: processedDays, stays: staysSummary, transports: transportSegments, diningRefs, budgetData };
}

/* =========================================================================
   Table render
   ========================================================================= */

function renderTable(items: Item[], o: PdfExportOptions, timeWidth: number) {
  if (!items.length) {
    return { text: 'No activities scheduled', style: 'itemMeta', margin: [0, 0, 0, SPACE.md] };
  }

  const body = items.map((it, idx) => {
    const zebra = idx % 2 === 0 ? COLORS.white : COLORS.sand;

    const titleLine =
      (o.showCosts && it.cost)
        ? {
            columns: [
              { text: it.title, style: 'itemTitle', width: '*' },
              { text: it.cost, style: 'itemCost', alignment: 'right', width: 'auto' },
            ],
            columnGap: SPACE.md,
          }
        : { text: it.title, style: 'itemTitle' };

    const combinedDetails: string[] = [];
    if (it.details) combinedDetails.push(it.details);
    if (it.location) combinedDetails.push(it.location);

    const stack: Content[] = [titleLine];

    if (combinedDetails.length) {
      stack.push({ text: combinedDetails.join(' • '), style: 'itemDetail', margin: [0, SPACE.xs, 0, 0] });
    }

    if (it.thumb && o.showImages) {
      stack.push({ image: it.thumb, width: PAGE.thumbSize, height: PAGE.thumbSize, margin: [0, SPACE.sm, 0, 0] });
    }

    return [
      { text: it.time, style: 'timeCell', alignment: 'right', margin: [0, SPACE.sm, SPACE.sm + 2, SPACE.sm], fillColor: zebra },
      { stack, fillColor: zebra, margin: [SPACE.sm + 2, SPACE.sm, SPACE.sm + 2, SPACE.sm] },
    ];
  });

  return {
    table: { widths: [timeWidth, '*'], body, dontBreakRows: true },
    layout: {
      hLineWidth: (i: number) => (i === 0 || i === body.length ? 0 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => COLORS.rule,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 3,
      paddingBottom: () => 3,
    },
  };
}

/* =========================================================================
   New Helper Functions for Compact Layout
   ========================================================================= */

/**
 * Render compact day header with inline travel marker + divider line
 */
function renderCompactDayHeader(d: Day, isFirstOnPage: boolean, contentWidth: number): Content {
  const dayText = d.title?.trim()
    ? `${fmtShort(d.date)} • ${d.title}`
    : fmtShort(d.date);

  const stack: Content[] = [
    {
      text: [
        { text: dayText },
        ...(d.hasTransport
          ? [{
              text: '   TRAVEL DAY',
              fontSize: TYPE.caption,
              font: FONTS.sans,
              color: COLORS.sunset,
              characterSpacing: 1,
            }]
          : []),
      ],
      style: 'sectionHeading',
      margin: [0, isFirstOnPage ? 0 : SPACE.lg, 0, SPACE.xs] as [number, number, number, number],
    },
    {
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: Math.max(100, Math.round(contentWidth)), y2: 0, lineWidth: 0.5, lineColor: COLORS.earthLight },
      ],
      margin: [0, 0, 0, SPACE.sm] as [number, number, number, number],
    },
  ];

  if (d.description?.trim()) {
    stack.push({
      text: d.description.trim(),
      style: 'dayDescription',
      margin: [0, 0, 0, SPACE.sm] as [number, number, number, number],
    });
  }

  return { stack, headlineLevel: 1, unbreakable: true };
}

function buildActivityLevelEntries(busyDays: number, moderateDays: number, lightDays: number): Content[] {
  const entries: Content[] = [];
  const levels: Array<{ count: number; label: string; color: string }> = [
    { count: busyDays, label: 'Busy (4+ activities)', color: COLORS.earth },
    { count: moderateDays, label: 'Moderate (2-3 activities)', color: COLORS.earthLight },
    { count: lightDays, label: 'Light (0-1 activities)', color: COLORS.earthMid },
  ];
  for (const { count, label, color } of levels) {
    if (count > 0) {
      entries.push({
        text: `\u2022 ${label}: ${count} day${count !== 1 ? 's' : ''}`,
        style: 'tableCell',
        color,
        margin: [0, 0, 0, SPACE.xs] as [number, number, number, number],
      });
    }
  }
  return entries;
}

function computeDayStats(days: Day[]): { totalActivities: number; busyDays: number; moderateDays: number; lightDays: number } {
  let totalActivities = 0;
  let busyDays = 0;
  let moderateDays = 0;
  let lightDays = 0;
  for (const d of days) {
    const count = d.activityCount || 0;
    totalActivities += count;
    if (count >= 4) busyDays++;
    else if (count >= 2) moderateDays++;
    else lightDays++;
  }
  return { totalActivities, busyDays, moderateDays, lightDays };
}

/**
 * Render combined cover page with 2-column layout
 */
function renderCombinedCoverPage(
  destination: string,
  dateRange: string,
  stays: AccommodationSummary[],
  transports: TransportSegment[],
  days: Day[],
  coverDataUrl: string,
  coverRequested: boolean,
  contentWidth: number
): Content[] {
  const content: Content[] = [];
  const bandWidth = Math.max(200, Math.round(contentWidth));

  content.push({
    canvas: [{ type: 'rect', x: 0, y: 0, w: bandWidth, h: 6, color: COLORS.earthLight }],
    margin: [0, 0, 0, SPACE.lg] as [number, number, number, number],
  });

  if (coverDataUrl) {
    content.push({
      image: coverDataUrl,
      width: bandWidth,
      height: PAGE.coverImageHeight,
      margin: [0, 0, 0, SPACE.xl] as [number, number, number, number],
    });
  } else if (coverRequested) {
    // Image fetch failed (CORS/network): keep the layout identical with a sand band
    // instead of silently collapsing the cover.
    content.push({
      canvas: [{ type: 'rect', x: 0, y: 0, w: bandWidth, h: PAGE.coverImageHeight, color: COLORS.sand }],
      margin: [0, 0, 0, SPACE.xl] as [number, number, number, number],
    });
  }

  content.push({ text: `${destination} Itinerary`, style: 'coverTitle', margin: [0, 0, 0, SPACE.sm] as [number, number, number, number] });

  if (dateRange) {
    content.push({ text: dateRange, style: 'coverSubtitle', margin: [0, 0, 0, SPACE.md] as [number, number, number, number] });
  }

  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: bandWidth, y2: 0, lineWidth: 0.75, lineColor: COLORS.earthLight }],
    margin: [0, 0, 0, SPACE.lg] as [number, number, number, number],
  });

  const totalFlights = transports.filter((t) => t.type.toLowerCase().includes('flight')).length;
  const { totalActivities, busyDays, moderateDays, lightDays } = computeDayStats(days);

  const leftColumn: Content[] = [
    { text: 'Trip Details', style: 'sectionHeading', margin: [0, 0, 0, SPACE.sm] as [number, number, number, number] },
    { text: `Duration: ${days.length} days`, style: 'body', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] },
  ];

  if (stays.length > 0) {
    leftColumn.push({ text: 'Accommodations', style: 'sectionHeading', margin: [0, SPACE.md, 0, SPACE.sm] as [number, number, number, number] });
    leftColumn.push({
      table: {
        widths: ['*', 'auto', 'auto'],
        dontBreakRows: true,
        body: [
          [
            { text: 'Hotel', style: 'tableCellStrong' },
            { text: 'Check In', style: 'tableCellStrong' },
            { text: 'Check Out', style: 'tableCellStrong' },
          ],
          ...stays.map((s) => [
            { text: s.hotel, style: 'tableCell' },
            { text: s.checkIn, style: 'tableCell' },
            { text: s.checkOut, style: 'tableCell' },
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
    });
  }

  const rightColumn: Content[] = [
    { text: 'Quick Stats', style: 'sectionHeading', margin: [0, 0, 0, SPACE.sm] as [number, number, number, number] },
    { text: `${totalFlights} flight${totalFlights !== 1 ? 's' : ''}`, style: 'body', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] },
    { text: `${totalActivities} activit${totalActivities !== 1 ? 'ies' : 'y'}`, style: 'body', margin: [0, 0, 0, SPACE.sm] as [number, number, number, number] },
    { text: 'Activity Level', style: 'sectionHeading', margin: [0, SPACE.sm, 0, SPACE.sm] as [number, number, number, number] },
    ...buildActivityLevelEntries(busyDays, moderateDays, lightDays),
  ];

  content.push({
    columns: [{ stack: leftColumn, width: '*' }, { stack: rightColumn, width: '*' }],
    columnGap: SPACE.xl + SPACE.sm,
  });

  content.push({ text: '', pageBreak: 'after' });
  return content;
}

/**
 * Render reference section with full accommodation, transportation, and dining details
 */
function renderReferenceSection(
  stays: AccommodationSummary[],
  transports: TransportSegment[],
  diningRefs: DiningRef[]
): Content[] {
  const content: Content[] = [];

  content.push({ text: '', pageBreak: 'before' });
  content.push({ text: 'Reference Information', style: 'pageHeading', headlineLevel: 1, margin: [0, 0, 0, SPACE.lg] as [number, number, number, number] });

  if (stays.length > 0) {
    content.push({ text: 'Accommodation Details', style: 'sectionHeading', headlineLevel: 1, margin: [0, SPACE.md, 0, SPACE.md] as [number, number, number, number] });

    stays.forEach((stay, idx) => {
      const details: Content[] = [
        { text: stay.hotel, style: 'itemTitle', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] },
        { text: `Check-in: ${stay.checkIn}`, style: 'body', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] },
        { text: `Check-out: ${stay.checkOut}`, style: 'body', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] },
      ];
      if (stay.address) details.push({ text: stay.address, style: 'metaText', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] });
      if (stay.phone) details.push({ text: `Phone: ${stay.phone}`, style: 'metaText', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] });
      if (stay.website) details.push({ text: `Website: ${stay.website}`, style: 'metaText', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] });

      content.push({
        stack: details,
        unbreakable: true,
        margin: [0, 0, 0, idx < stays.length - 1 ? SPACE.lg : 0] as [number, number, number, number],
      });
    });
  }

  const transWithConf = transports.filter((t) => t.confirmationNumber);
  if (transWithConf.length > 0) {
    content.push({ text: 'Transportation Confirmations', style: 'sectionHeading', headlineLevel: 1, margin: [0, SPACE.xl, 0, SPACE.md] as [number, number, number, number] });
    content.push({
      table: {
        widths: ['auto', '*', 'auto'],
        dontBreakRows: true,
        body: [
          [
            { text: 'Transport', style: 'tableHeader' },
            { text: 'Route', style: 'tableHeader' },
            { text: 'Confirmation #', style: 'tableHeader' },
          ],
          ...transWithConf.map((t) => [
            { text: `${t.type} (${t.date})`, style: 'tableCell' },
            { text: `${t.from} to ${t.to}`, style: 'tableCell' },
            { text: t.confirmationNumber!, style: 'tableCell', bold: true },
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
    });
  }

  if (diningRefs.length > 0) {
    content.push({ text: 'Dining Confirmations', style: 'sectionHeading', headlineLevel: 1, margin: [0, SPACE.xl, 0, SPACE.md] as [number, number, number, number] });
    content.push({
      table: {
        widths: ['*', 'auto'],
        dontBreakRows: true,
        body: [
          [
            { text: 'Restaurant', style: 'tableHeader' },
            { text: 'Confirmation #', style: 'tableHeader' },
          ],
          ...diningRefs.map((r) => [
            { text: r.restaurant, style: 'tableCell' },
            { text: r.confirmationNumber!, style: 'tableCell', bold: true },
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
    });
  }

  const staysWithContact = stays.filter((s) => s.phone || s.website);
  if (staysWithContact.length > 0) {
    content.push({ text: 'Hotel Contact Information', style: 'sectionHeading', headlineLevel: 1, margin: [0, SPACE.xl, 0, SPACE.md] as [number, number, number, number] });
    staysWithContact.forEach((stay, idx) => {
      const lines: Content[] = [{ text: stay.hotel, style: 'itemTitle', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] }];
      if (stay.phone) lines.push({ text: `Phone: ${stay.phone}`, style: 'body', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] });
      if (stay.website) lines.push({ text: `Website: ${stay.website}`, style: 'metaText', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] });
      content.push({
        stack: lines,
        unbreakable: true,
        margin: [0, 0, 0, idx < staysWithContact.length - 1 ? SPACE.md : 0] as [number, number, number, number],
      });
    });
  }

  return content;
}

/**
 * Render budget summary section (2c)
 */
function renderBudgetSummary(budgetData: BudgetData): Content[] {
  if (budgetData.categories.length === 0) return [];

  const content: Content[] = [];

  content.push({ text: 'Budget Summary', style: 'sectionHeading', headlineLevel: 1, margin: [0, SPACE.xl, 0, SPACE.md] as [number, number, number, number] });

  // Budget categories sum raw amounts across currencies and have always been
  // labeled USD. Honest multi-currency totals need exchange-rate conversion —
  // out of scope here (see plan: Out of scope).
  const tableBody: TableCell[][] = [
    [
      { text: 'Category', style: 'tableHeader' },
      { text: 'Amount', style: 'tableHeader', alignment: 'right' },
    ],
    ...budgetData.categories.map((c) => [
      { text: c.category, style: 'tableCell' },
      { text: fmtMoney(c.amount, 'USD'), style: 'tableCell', alignment: 'right' },
    ]),
    [
      { text: 'Total', style: 'tableCellStrong', fillColor: COLORS.totalFill },
      { text: fmtMoney(budgetData.total, 'USD'), style: 'tableCellStrong', alignment: 'right', fillColor: COLORS.totalFill },
    ],
  ];

  content.push({
    table: { widths: ['*', 'auto'], body: tableBody, dontBreakRows: true },
    layout: 'lightHorizontalLines',
  });

  if (budgetData.budget != null && budgetData.budget > 0) {
    const remaining = budgetData.budget - budgetData.total;
    const overBudget = remaining < 0;
    content.push({
      columns: [
        { text: `Budget: ${fmtMoney(budgetData.budget, 'USD')}`, style: 'body', width: 'auto' },
        { text: '  |  ', style: 'metaText', width: 'auto' },
        {
          text: overBudget
            ? `Over budget by ${fmtMoney(Math.abs(remaining), 'USD')}`
            : `Remaining: ${fmtMoney(remaining, 'USD')}`,
          style: 'body',
          color: overBudget ? COLORS.sunset : COLORS.earth,
          bold: true,
          width: 'auto',
        },
      ],
      margin: [0, SPACE.sm + 2, 0, 0] as [number, number, number, number],
    });
  }

  return content;
}

/* =========================================================================
   Export
   ========================================================================= */

export async function exportItineraryPdf(tripId: string, o: PdfExportOptions): Promise<void> {
  try {
    await loadPdfFonts();
    track('pdf_exported', {
      trip_id: tripId,
    });

    const pageSize: PdfPageSize = o.pageSize ?? defaultPageSize();
    const contentWidth = innerPageWidth(pageSize, PAGE.margins);
    const exportedAt = new Date();

    // Fetch trip info
    const { data: trip, error } = await supabase
      .from(TABLES.trip)
      .select('destination,arrival_date,departure_date,cover_image_url,budget')
      .eq('trip_id', tripId)
      .single();

    if (error || !trip) {
      console.error('[PDF Export] Trip fetch failed:', error);
      throw error ?? new Error('Trip not found');
    }

    const sameTripDay =
      trip.arrival_date && trip.departure_date
        ? isSameDay(parseISO(trip.arrival_date), parseISO(trip.departure_date))
        : false;

    const dateRange =
      trip.arrival_date && trip.departure_date
        ? sameTripDay
          ? fmtDate(trip.arrival_date)
          : `${fmtShort(trip.arrival_date)} – ${fmtShort(trip.departure_date)}`
        : '';

    const { days, stays, transports, diningRefs, budgetData } = await buildDays(tripId, o);

    // Cover image (data URL, possibly downscaled)
    let coverDataUrl = '';
    if (o.showImages && trip.cover_image_url) {
      coverDataUrl = await imageToCoverDataURI(
        trip.cover_image_url,
        Math.round(contentWidth),
        PAGE.coverImageHeight,
        PAGE.coverScale
      );
    }

    // Build document definition
    const content: Content[] = [];

    // Combined cover page with 2-column layout
    content.push(
      ...renderCombinedCoverPage(
        trip.destination ?? 'Trip',
        dateRange,
        stays,
        transports,
        days,
        coverDataUrl,
        Boolean(o.showImages && trip.cover_image_url),
        contentWidth
      )
    );

    // Daily itineraries — pdfmake paginates by real height; the pageBreakBefore
    // rule (isOrphanedHeading) keeps day headers attached to their tables.
    days.forEach((d, idx) => {
      content.push(renderCompactDayHeader(d, idx === 0, contentWidth));
      content.push(renderTable(d.items, o, PAGE.timeColWidth));
    });

    // Add budget summary if costs are enabled (2c)
    if (o.showCosts) {
      content.push(...renderBudgetSummary(budgetData));
    }

    // Add reference section with full details
    content.push(...renderReferenceSection(stays, transports, diningRefs));

    const doc: TDocumentDefinitions = {
      pageSize,
      pageMargins: PAGE.margins,
      defaultStyle: { fontSize: TYPE.body, lineHeight: 1.3, font: FONTS.sans, color: COLORS.accent }, // 1.3 leading: 10pt body needs looser lines than the old 8-9pt/1.25
      header: () => ({
        text: dateRange ? `${trip.destination} • ${dateRange}` : (trip.destination ?? ''),
        alignment: 'center' as const,
        style: 'pageChrome',
        margin: [0, PAGE.headerOffsetY, 0, 0] as [number, number, number, number],
      }),
      footer: (p: number, c: number) => ({
        text: `Page ${p} of ${c} • exported ${fnsFormat(exportedAt, 'PP p')}`,
        alignment: 'center' as const,
        style: 'pageChrome',
        margin: [0, PAGE.footerOffsetY, 0, 0] as [number, number, number, number],
      }),
      content,
      styles: {
        coverTitle: { fontSize: TYPE.display, font: FONTS.serif, color: COLORS.earth },
        coverSubtitle: { fontSize: TYPE.section, color: COLORS.earthLight },
        pageHeading: { fontSize: TYPE.title, font: FONTS.serif, color: COLORS.earth },
        sectionHeading: { fontSize: TYPE.section, font: FONTS.serif, color: COLORS.earth },
        dayDescription: { fontSize: TYPE.detail, italics: true, color: COLORS.earthLight },
        body: { fontSize: TYPE.body },
        timeCell: { fontSize: TYPE.detail, bold: true, color: COLORS.earthLight },
        itemTitle: { fontSize: TYPE.body, bold: true, color: COLORS.earth },
        itemDetail: { fontSize: TYPE.detail, color: COLORS.earthLight },
        itemMeta: { fontSize: TYPE.detail, italics: true, color: COLORS.earthMid },
        itemCost: { fontSize: TYPE.caption, color: COLORS.earthMid },
        tableHeader: { fontSize: TYPE.caption, bold: true, color: COLORS.white, fillColor: COLORS.earthLight },
        tableCell: { fontSize: TYPE.caption },
        tableCellStrong: { fontSize: TYPE.body, bold: true }, // emphasized cell: lightweight table headers (cover) + budget total — distinct from filled `tableHeader`
        metaText: { fontSize: TYPE.caption, color: COLORS.earthMid },
        pageChrome: { fontSize: TYPE.caption, color: COLORS.earthLight },
      },
      pageBreakBefore: (currentNode, followingNodesOnPage) =>
        isOrphanedHeading(currentNode, followingNodesOnPage),
    };

    const fileName = `${sanitizeFilename(trip.destination)}-itinerary.pdf`;
    const pdf = pdfMake.createPdf(doc);

    return new Promise<void>((resolve, reject) => {
      pdf.getBlob((blob: Blob) => {
        try {
          if (!blob) {
            reject(new Error('Failed to generate PDF blob'));
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => {
            URL.revokeObjectURL(url);
            resolve();
          }, 100);
        } catch (err) {
          reject(err);
        }
      });
    });
  } catch (error) {
    console.error('[PDF Export] Top-level error:', error);
    throw error;
  }
}
