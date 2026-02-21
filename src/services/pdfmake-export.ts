/*  src/services/pdfmake-export.ts
    Mobile/desktop-aware, icon-enhanced itinerary PDF export
    - Preserves per-day build from Supabase
    - Transport shows start–end times
    - Safe, linear-time parsing (no ReDoS)
    - Enhanced with accommodation summary, travel day markers, activity density
    - Improvements:
      * Correct date-fns isSameDay usage (string -> Date)
      * Reliable thumbnail rendering (remote URL -> dataURL)
      * Page-width-aware cover sizing (no hard-coded 480)
      * Zebra rows + subtle separators + dontBreakRows for better readability
      * Compact day header divider line
    ---------------------------------------------------------------------- */

import pdfMake from 'pdfmake/build/pdfmake';
import { loadPdfFonts } from './pdf-fonts';

import { supabase } from '@/integrations/supabase/client';
import { parseISO, format as fnsFormat, isSameDay } from 'date-fns';
import type { PdfExportOptions } from '@/components/trip/PdfExportDialog';

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

// Brand palette (sand/earth/sunset)
const BRAND = {
  earth: '#6B6354',
  earthLight: '#8A7F6C',
  earthMid: '#A89B8E',
  sand: '#FAF9F7',
  sandDark: '#7B715F',
  accent: '#5C544A',
  sunset: '#D97706',
} as const;

type ExportStrategy = 'auto' | 'open' | 'download' | 'blob';
type PagePreset = 'auto' | 'mobile' | 'desktop';

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
   Mobile/Desktop & Page helpers
   ========================================================================= */

function isProbablyMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isSmall = typeof window.innerWidth === 'number' && window.innerWidth <= 768;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua) || isSmall;
}

function defaultPageSize(): 'LETTER' | 'A4' {
  // Very lightweight heuristic: US locales → LETTER, others → A4
  const loc = (Intl.DateTimeFormat().resolvedOptions().locale || '').toLowerCase();
  return loc.startsWith('en-us') ? 'LETTER' : 'A4';
}

function pagePresetSettings(preset: PagePreset) {
  // Compact for mobile, comfortable for desktop
  const isMobile = preset === 'mobile' || (preset === 'auto' && isProbablyMobile());
  return {
    isMobile,
    pageSize: defaultPageSize(), // 'LETTER' or 'A4'
    pageMargins: isMobile
      ? ([20, 20, 20, 24] as [number, number, number, number])
      : ([24, 24, 24, 30] as [number, number, number, number]),
    baseFontSize: isMobile ? 8 : 9,
    headerFont: isMobile ? 8 : 9,
    footerFont: isMobile ? 7.5 : 8,
    heroTitle: isMobile ? 16 : 18,
    dayHeader: isMobile ? 12 : 14,
    compactDayHeader: isMobile ? 11 : 12,
    timeWidth: isMobile ? 52 : 60,
    imageWidth: isMobile ? 480 : 540, // used for downscale target; actual render uses page width
    coverImageHeight: isMobile ? 200 : 250,
  };
}

function resolveStrategy(opts: PdfExportOptions): ExportStrategy {
  const strategy = (opts as any)?.strategy as ExportStrategy | undefined;
  if (strategy === 'open' || strategy === 'download' || strategy === 'blob') return strategy;
  return 'auto';
}

function innerPageWidth(pageSize: 'A4' | 'LETTER', margins: [number, number, number, number]) {
  // pdfmake page sizes in points
  const widths: Record<string, number> = { A4: 595.28, LETTER: 612 };
  const total = widths[pageSize] ?? widths.LETTER;
  return total - margins[0] - margins[2];
}

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
  let s = (input || 'itinerary').toLowerCase();
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

function getDensityIndicator(count: number): any {
  if (count >= 5) {
    return { text: ' Busy ', fontSize: 10, bold: true, color: '#FFFFFF', background: '#DC2626', margin: [0, 0, 4, 0] };
  }
  if (count >= 3) {
    return { text: ' Moderate ', fontSize: 10, bold: true, color: '#000000', background: '#FBBF24', margin: [0, 0, 4, 0] };
  }
  return { text: ' Light ', fontSize: 10, bold: true, color: '#FFFFFF', background: '#10B981', margin: [0, 0, 4, 0] };
}

/* =========================================================================
   Image helpers with caching & optional downscale (better for mobile)
   ========================================================================= */

const imgCache = new Map<string, Promise<string>>();

async function toDataURI(url: string, targetWidth: number): Promise<string> {
  if (!url) return '';
  const key = `${url}@${targetWidth}`;
  if (imgCache.has(key)) return imgCache.get(key)!;

  const job = (async () => {
    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) throw new Error('Image fetch failed');
      const blob = await resp.blob();

      // Try to downscale to targetWidth if we can draw to canvas safely
      const dataUrl = await drawToCanvas(blob, targetWidth);
      return dataUrl ?? (await blobToDataURL(blob)); // fallback: raw to data URL
    } catch {
      // If anything fails (CORS/opaque responses), skip the image
      return '';
    }
  })();

  imgCache.set(key, job);
  return job;
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(blob);
  });
}

async function drawToCanvas(blob: Blob, targetWidth: number): Promise<string | null> {
  // Best-effort downscale; if canvas taints due to CORS, we catch and return null
  return new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const scale = Math.min(1, targetWidth / (img.width || targetWidth));
        const w = Math.max(1, Math.round((img.width || targetWidth) * scale));
        const h = Math.max(1, Math.round((img.height || targetWidth) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        // Use JPEG to keep size small
        const data = canvas.toDataURL('image/jpeg', 0.85);
        resolve(data);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(blob);
  });
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
  (acts ?? []).forEach((a: any) => { if (a.cost) catMap['Activities'] = (catMap['Activities'] || 0) + a.cost; });
  (stays ?? []).forEach((s: any) => { if (s.cost) catMap['Accommodations'] = (catMap['Accommodations'] || 0) + s.cost; });
  (trans ?? []).forEach((t: any) => { if (t.cost) catMap['Transportation'] = (catMap['Transportation'] || 0) + t.cost; });
  (dine ?? []).forEach((r: any) => { if (r.cost) catMap['Dining'] = (catMap['Dining'] || 0) + r.cost; });
  (otherExpenses ?? []).forEach((e: any) => { if (e.cost) catMap['Other'] = (catMap['Other'] || 0) + e.cost; });
  const categories = Object.entries(catMap).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  const total = categories.reduce((sum, c) => sum + c.amount, 0);
  const budgetData: BudgetData = { budget: tripRow?.budget ?? null, categories, total };

  // Build accommodation summary and sort by check-in date ascending
  const staysSummary: AccommodationSummary[] = (stays ?? [])
    .map((s: any) => ({
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
  const transportSegments: TransportSegment[] = (trans ?? [])
    .filter((t: any) => t.departure_location && t.arrival_location)
    .map((t: any) => ({
      from: t.departure_location,
      to: t.arrival_location,
      date: fmtShort(t.start_date),
      type: formatType(t.type),
      confirmationNumber: t.confirmation_number || undefined,
    }));

  // Build dining references (for confirmation numbers)
  const diningRefs: DiningRef[] = (dine ?? [])
    .filter((r: any) => r.confirmation_number)
    .map((r: any) => ({
      restaurant: r.restaurant_name,
      confirmationNumber: r.confirmation_number,
    }));

  const processedDays: Day[] = (days ?? []).map((day: any) => {
    const items: Item[] = [];

    /* accommodation ----------------------------------------------------- */
    {
      (stays ?? []).forEach((s: any) => {
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
          cost: s.cost != null ? `${s.currency} ${s.cost}` : undefined,
          thumb: (o.showImages && s.image_url) ? String(s.image_url) : undefined, // will be converted to dataURL later
          sortKey: minsFromTime(t || '8:00 am'),
        });
      });
    }

    /* transportation ---------------------------------------------------- */
    let hasTransport = false;
    {
      (trans ?? []).forEach((t: any) => {
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
              ? `From: ${t.departure_location} → ${t.arrival_location}`
              : t.departure_location || undefined,
          cost: t.cost != null ? `${t.currency} ${t.cost}` : undefined,
          sortKey: minsFromTime(startStr || '8:00 am'),
        });
      });
    }

    /* activities -------------------------------------------------------- */
    {
      (acts ?? [])
        .filter((a: any) => a.day_id === day.day_id)
        .forEach((a: any) => {
          const t = fmtTime(a.start_time);
          items.push({
            type: 'activity',
            title: a.title || 'Activity',
            time: t || 'All-day',
            details: a.description || undefined,
            cost: a.cost != null ? `${a.currency} ${a.cost}` : undefined,
            sortKey: minsFromTime(t || '8:00 am'),
          });
        });
    }

    /* dining ------------------------------------------------------------ */
    {
      (dine ?? []).forEach((r: any) => {
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
          cost: r.cost != null ? `${r.currency} ${r.cost}` : undefined,
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
  if ((o as any).showImages) {
    const jobs: Promise<void>[] = [];
    for (const d of processedDays) {
      for (const it of d.items) {
        if (!it.thumb) continue;
        const url = it.thumb;
        jobs.push(
          toDataURI(url, 96).then((dataUrl) => {
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
    return { text: 'No activities scheduled', style: 'itemMeta', margin: [0, 0, 0, 6] };
  }

  // Color coding by activity type
  const typeColors: Record<string, string> = {
    transportation: BRAND.sunset,
    flight: BRAND.sunset,
    dining: '#F97316', // orange
    restaurant: '#F97316',
    activity: '#10B981', // green
    activities: '#10B981',
    accommodation: BRAND.earthLight,
    hotel: BRAND.earthLight,
  };

  const body = items.map((it, idx) => {
    const typeColor = typeColors[it.type] || '#333';
    const zebra = idx % 2 === 0 ? '#FFFFFF' : BRAND.sand;

    const titleLine =
      (o.showCosts && it.cost)
        ? {
            columns: [
              { text: it.title, style: 'itemTitle', color: typeColor, width: '*' },
              { text: it.cost, style: 'itemCost', alignment: 'right', width: 'auto' },
            ],
            columnGap: 8,
          }
        : { text: it.title, style: 'itemTitle', color: typeColor };

    const combinedDetails: string[] = [];
    if (it.details) combinedDetails.push(it.details);
    if (it.location) combinedDetails.push(it.location);

    const stack: any[] = [titleLine];

    if (combinedDetails.length) {
      stack.push({ text: combinedDetails.join(' • '), style: 'itemDetail', margin: [0, 3, 0, 0] });
    }

    if (it.thumb && o.showImages) {
      stack.push({ image: it.thumb, width: 28, height: 28, margin: [0, 6, 0, 0] });
    }

    return [
      { text: it.time, style: 'timeCell', alignment: 'right', margin: [0, 5, 6, 5], fillColor: zebra },
      { stack, fillColor: zebra, margin: [6, 5, 6, 5] },
    ];
  });

  return {
    table: { widths: [timeWidth, '*'], body, dontBreakRows: true },
    layout: {
      hLineWidth: (i: number) => (i === 0 || i === body.length ? 0 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => '#E6E2DE',
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
  };
}

/* =========================================================================
   Summary sections
   ========================================================================= */

function renderAccommodationSummary(stays: AccommodationSummary[], baseFontSize: number): any[] {
  if (!stays.length) return [];

  const content: any[] = [{ text: "WHERE YOU'RE STAYING", style: 'summaryTitle', margin: [0, 0, 0, 8] }];

  const table = {
    table: {
      widths: ['*', '*', '*'],
      body: [
        [
          { text: 'Hotel', style: 'summaryHeader' },
          { text: 'Check In', style: 'summaryHeader' },
          { text: 'Check Out', style: 'summaryHeader' },
        ],
        ...stays.map((s) => [
          { text: s.hotel, style: 'summaryCell' },
          { text: s.checkIn, style: 'summaryCell' },
          { text: s.checkOut, style: 'summaryCell' },
        ]),
      ],
    },
    layout: 'lightHorizontalLines' as const,
  };

  content.push(table);
  return content;
}

function renderTransportSummary(transports: TransportSegment[]): any[] {
  if (!transports.length) return [];

  const content: any[] = [{ text: '✈  TRAVEL SEGMENTS', style: 'summaryTitle', margin: [0, 12, 0, 8] }];

  transports.forEach((t, idx) => {
    content.push({
      text: `${t.type}: ${t.from} → ${t.to} (${t.date})`,
      style: 'summaryItem',
      margin: [0, idx === 0 ? 0 : 4, 0, 4],
    });
  });

  return content;
}

function renderDailySummary(days: Day[]): any[] {
  const content: any[] = [{ text: 'DAILY ACTIVITY OVERVIEW', style: 'summaryTitle', margin: [0, 12, 0, 8] }];

  days.forEach((d, idx) => {
    const density = getDensityIndicator(d.activityCount || 0);
    const travelTag = d.hasTransport ? ' ✈ Travel Day' : '';
    content.push({
      columns: [
        { text: `${fmtShort(d.date)}:`, style: 'summaryItem', width: 'auto' },
        { ...density, width: 'auto' },
        { text: travelTag, style: 'summaryItem', width: '*' },
      ],
      margin: [0, idx === 0 ? 0 : 4, 0, 4],
    });
  });

  return content;
}

/* =========================================================================
   New Helper Functions for Compact Layout
   ========================================================================= */

/**
 * Calculate how many days should fit on current page based on activity density
 * Returns number of days that can fit (2-4 days per page)
 */
function calculatePageFit(days: Day[], startIdx: number): number {
  if (startIdx >= days.length) return 0;

  const MAX_ITEMS_PER_PAGE = 20; // Approximate threshold
  const MIN_DAYS_PER_PAGE = 2;
  const MAX_DAYS_PER_PAGE = 4;

  let totalItems = 0;
  let daysCount = 0;

  for (let i = startIdx; i < days.length && daysCount < MAX_DAYS_PER_PAGE; i++) {
    const dayItems = days[i].items.length;

    // If adding this day would exceed threshold and we already have min days, stop
    if (totalItems + dayItems > MAX_ITEMS_PER_PAGE && daysCount >= MIN_DAYS_PER_PAGE) {
      break;
    }

    totalItems += dayItems;
    daysCount++;
  }

  return Math.max(MIN_DAYS_PER_PAGE, daysCount);
}

/**
 * Render compact day header with inline travel marker + divider line
 */
function renderCompactDayHeader(d: Day, isFirstOnPage: boolean, fontSize: number, contentWidth: number): any {
  const travelMarker = d.hasTransport ? ' ✈ TRAVEL DAY' : '';
  const dayText = d.title?.trim()
    ? `${fmtShort(d.date)} • ${d.title}${travelMarker}`
    : `${fmtShort(d.date)}${travelMarker}`;

  const stack: any[] = [
    {
      text: dayText,
      fontSize,
      bold: false,
      font: 'DMSerifDisplay',
      color: BRAND.earth,
      margin: [0, isFirstOnPage ? 0 : 10, 0, 2] as [number, number, number, number],
    },
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: Math.max(100, Math.round(contentWidth)),
          y2: 0,
          lineWidth: 0.5,
          lineColor: BRAND.earthLight,
        },
      ],
      margin: [0, 0, 0, 4] as [number, number, number, number],
    },
  ];

  // Show day description if present (2d)
  if (d.description?.trim()) {
    stack.push({
      text: d.description.trim(),
      fontSize: fontSize - 2,
      italics: true,
      color: BRAND.earthLight,
      margin: [0, 0, 0, 4] as [number, number, number, number],
    });
  }

  return { stack };
}

/**
 * Render combined cover page with 2-column layout
 */
function renderCombinedCoverPage(
  trip: any,
  dateRange: string,
  stays: AccommodationSummary[],
  transports: TransportSegment[],
  days: Day[],
  coverDataUrl: string,
  contentWidth: number,
  imageHeight: number,
  baseFontSize: number
): any[] {
  const content: any[] = [];

  // Earth-toned accent bar at the top of cover
  content.push({
    canvas: [
      {
        type: 'rect',
        x: 0,
        y: 0,
        w: Math.max(200, Math.round(contentWidth)),
        h: 6,
        color: BRAND.earthLight,
      },
    ],
    margin: [0, 0, 0, 12] as [number, number, number, number],
  });

  // Cover image
  if (coverDataUrl) {
    content.push({
      image: coverDataUrl,
      width: Math.max(200, Math.round(contentWidth)),
      height: imageHeight,
      margin: [0, 0, 0, 16] as [number, number, number, number],
    });
  }

  // Hero title and dates in earth palette
  content.push({
    text: `${trip.destination || 'Trip'} Itinerary`,
    fontSize: 26,
    bold: false,
    font: 'DMSerifDisplay',
    color: BRAND.earth,
    margin: [0, 0, 0, 4] as [number, number, number, number],
  });

  if (dateRange) {
    content.push({
      text: dateRange,
      fontSize: baseFontSize + 3,
      color: BRAND.earthLight,
      margin: [0, 0, 0, 8] as [number, number, number, number],
    });
  }

  // Subtle divider between header and details
  content.push({
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: Math.max(200, Math.round(contentWidth)),
        y2: 0,
        lineWidth: 0.75,
        lineColor: BRAND.earthLight,
      },
    ],
    margin: [0, 0, 0, 12] as [number, number, number, number],
  });

  // Calculate stats
  const totalFlights = transports.filter((t) => t.type.toLowerCase().includes('flight')).length;
  const totalActivities = days.reduce((sum, d) => sum + (d.activityCount || 0), 0);
  const busyDays = days.filter((d) => (d.activityCount || 0) >= 4).length;
  const moderateDays = days.filter((d) => (d.activityCount || 0) >= 2 && (d.activityCount || 0) < 4).length;
  const lightDays = days.filter((d) => (d.activityCount || 0) < 2).length;

  // 2-column layout
  const leftColumn: any[] = [];
  const rightColumn: any[] = [];

  // LEFT COLUMN: Trip details + Accommodation summary
  leftColumn.push({
    text: 'Trip Details',
    fontSize: baseFontSize + 2,
    bold: false,
    font: 'DMSerifDisplay',
    color: BRAND.earth,
    margin: [0, 0, 0, 6] as [number, number, number, number],
  });

  leftColumn.push({
    text: `Duration: ${days.length} days`,
    fontSize: baseFontSize - 0.5,
    margin: [0, 0, 0, 2] as [number, number, number, number],
  });

  // Accommodation summary table
  if (stays.length > 0) {
    leftColumn.push({
      text: 'Accommodations',
      fontSize: baseFontSize + 2,
      bold: false,
      font: 'DMSerifDisplay',
      color: BRAND.earth,
      margin: [0, 8, 0, 4] as [number, number, number, number],
    });

    const staysTableBody = [
      [
        { text: 'Hotel', bold: true, fontSize: baseFontSize - 1 },
        { text: 'Check In', bold: true, fontSize: baseFontSize - 1 },
        { text: 'Check Out', bold: true, fontSize: baseFontSize - 1 },
      ],
      ...stays.map((s) => [
        { text: s.hotel, fontSize: baseFontSize - 1 },
        { text: s.checkIn, fontSize: baseFontSize - 1 },
        { text: s.checkOut, fontSize: baseFontSize - 1 },
      ]),
    ];

    leftColumn.push({
      table: {
        widths: ['*', 'auto', 'auto'],
        body: staysTableBody,
        dontBreakRows: true,
      },
      layout: 'lightHorizontalLines',
      fontSize: baseFontSize - 1,
      margin: [0, 0, 0, 0] as [number, number, number, number],
    });
  }

  // RIGHT COLUMN: Stats
  rightColumn.push({
    text: 'Quick Stats',
    fontSize: baseFontSize + 2,
    bold: false,
    font: 'DMSerifDisplay',
    color: BRAND.earth,
    margin: [0, 0, 0, 6] as [number, number, number, number],
  });

  rightColumn.push({
    text: `${totalFlights} flight${totalFlights !== 1 ? 's' : ''}`,
    fontSize: baseFontSize - 0.5,
    margin: [0, 0, 0, 2] as [number, number, number, number],
  });

  rightColumn.push({
    text: `${totalActivities} activit${totalActivities !== 1 ? 'ies' : 'y'}`,
    fontSize: baseFontSize - 0.5,
    margin: [0, 0, 0, 6] as [number, number, number, number],
  });

  rightColumn.push({
    text: 'Activity Level',
    fontSize: baseFontSize + 1,
    bold: false,
    font: 'DMSerifDisplay',
    color: BRAND.earth,
    margin: [0, 4, 0, 4] as [number, number, number, number],
  });

  if (busyDays > 0) {
    rightColumn.push({
      text: `• Busy (4+ activities): ${busyDays} day${busyDays !== 1 ? 's' : ''}`,
      fontSize: baseFontSize - 1,
      color: '#DC2626',
      margin: [0, 0, 0, 2] as [number, number, number, number],
    });
  }

  if (moderateDays > 0) {
    rightColumn.push({
      text: `• Moderate (2-3 activities): ${moderateDays} day${moderateDays !== 1 ? 's' : ''}`,
      fontSize: baseFontSize - 1,
      color: '#F59E0B',
      margin: [0, 0, 0, 2] as [number, number, number, number],
    });
  }

  if (lightDays > 0) {
    rightColumn.push({
      text: `• Light (0-1 activities): ${lightDays} day${lightDays !== 1 ? 's' : ''}`,
      fontSize: baseFontSize - 1,
      color: '#10B981',
      margin: [0, 0, 0, 2] as [number, number, number, number],
    });
  }

  // Add columns to content
  content.push({
    columns: [{ stack: leftColumn, width: '*' }, { stack: rightColumn, width: '*' }],
    columnGap: 20,
    margin: [0, 0, 0, 0] as [number, number, number, number],
  });

  // Page break after cover
  content.push({ text: '', pageBreak: 'after' });

  return content;
}

/**
 * Render reference section with full accommodation, transportation, and dining details
 */
function renderReferenceSection(
  stays: AccommodationSummary[],
  transports: TransportSegment[],
  diningRefs: DiningRef[],
  baseFontSize: number
): any[] {
  const content: any[] = [];

  // Page break before reference section
  content.push({ text: '', pageBreak: 'before' });

  content.push({
    text: 'Reference Information',
    fontSize: baseFontSize + 4,
    bold: false,
    font: 'DMSerifDisplay',
    color: BRAND.earth,
    margin: [0, 0, 0, 12] as [number, number, number, number],
  });

  // Accommodation details with phone + website (2b, 2e)
  if (stays.length > 0) {
    content.push({
      text: 'Accommodation Details',
      fontSize: baseFontSize + 2,
      bold: false,
      font: 'DMSerifDisplay',
      color: BRAND.earth,
      margin: [0, 8, 0, 8] as [number, number, number, number],
    });

    stays.forEach((stay, idx) => {
      const details: any[] = [
        { text: stay.hotel, fontSize: baseFontSize + 1, bold: true, margin: [0, 0, 0, 2] as [number, number, number, number] },
        { text: `Check-in: ${stay.checkIn}`, fontSize: baseFontSize - 0.5, margin: [0, 0, 0, 2] as [number, number, number, number] },
        { text: `Check-out: ${stay.checkOut}`, fontSize: baseFontSize - 0.5, margin: [0, 0, 0, 2] as [number, number, number, number] },
      ];
      if (stay.address) details.push({ text: stay.address, fontSize: baseFontSize - 0.5, color: BRAND.earthMid, margin: [0, 0, 0, 2] as [number, number, number, number] });
      if (stay.phone) details.push({ text: `Phone: ${stay.phone}`, fontSize: baseFontSize - 0.5, color: BRAND.earthMid, margin: [0, 0, 0, 2] as [number, number, number, number] });
      if (stay.website) details.push({ text: `Website: ${stay.website}`, fontSize: baseFontSize - 0.5, color: BRAND.earthMid, margin: [0, 0, 0, 2] as [number, number, number, number] });

      content.push({
        stack: details,
        margin: [0, 0, 0, idx < stays.length - 1 ? 12 : 0] as [number, number, number, number],
      });
    });
  }

  // Transportation confirmation numbers (2b)
  const transWithConf = transports.filter((t) => t.confirmationNumber);
  if (transWithConf.length > 0) {
    content.push({
      text: 'Transportation Confirmations',
      fontSize: baseFontSize + 2,
      bold: false,
      font: 'DMSerifDisplay',
      color: BRAND.earth,
      margin: [0, 16, 0, 8] as [number, number, number, number],
    });

    const transTableBody = [
      [
        { text: 'Transport', bold: true, fontSize: baseFontSize - 0.5, fillColor: BRAND.earthLight, color: '#FFFFFF' },
        { text: 'Route', bold: true, fontSize: baseFontSize - 0.5, fillColor: BRAND.earthLight, color: '#FFFFFF' },
        { text: 'Confirmation #', bold: true, fontSize: baseFontSize - 0.5, fillColor: BRAND.earthLight, color: '#FFFFFF' },
      ],
      ...transWithConf.map((t) => [
        { text: `${t.type} (${t.date})`, fontSize: baseFontSize - 0.5 },
        { text: `${t.from} → ${t.to}`, fontSize: baseFontSize - 0.5 },
        { text: t.confirmationNumber!, fontSize: baseFontSize - 0.5, bold: true },
      ]),
    ];

    content.push({
      table: { widths: ['auto', '*', 'auto'], body: transTableBody, dontBreakRows: true },
      layout: 'lightHorizontalLines',
    });
  }

  // Dining confirmation numbers (2b)
  if (diningRefs.length > 0) {
    content.push({
      text: 'Dining Confirmations',
      fontSize: baseFontSize + 2,
      bold: false,
      font: 'DMSerifDisplay',
      color: BRAND.earth,
      margin: [0, 16, 0, 8] as [number, number, number, number],
    });

    const dineTableBody = [
      [
        { text: 'Restaurant', bold: true, fontSize: baseFontSize - 0.5, fillColor: BRAND.earthLight, color: '#FFFFFF' },
        { text: 'Confirmation #', bold: true, fontSize: baseFontSize - 0.5, fillColor: BRAND.earthLight, color: '#FFFFFF' },
      ],
      ...diningRefs.map((r) => [
        { text: r.restaurant, fontSize: baseFontSize - 0.5 },
        { text: r.confirmationNumber!, fontSize: baseFontSize - 0.5, bold: true },
      ]),
    ];

    content.push({
      table: { widths: ['*', 'auto'], body: dineTableBody, dontBreakRows: true },
      layout: 'lightHorizontalLines',
    });
  }

  // Hotel contact information (2e — replaces empty Emergency Contacts placeholder)
  const staysWithContact = stays.filter((s) => s.phone || s.website);
  if (staysWithContact.length > 0) {
    content.push({
      text: 'Hotel Contact Information',
      fontSize: baseFontSize + 2,
      bold: false,
      font: 'DMSerifDisplay',
      color: BRAND.earth,
      margin: [0, 16, 0, 8] as [number, number, number, number],
    });

    staysWithContact.forEach((stay, idx) => {
      const lines: any[] = [{ text: stay.hotel, fontSize: baseFontSize, bold: true, margin: [0, 0, 0, 2] as [number, number, number, number] }];
      if (stay.phone) lines.push({ text: `Phone: ${stay.phone}`, fontSize: baseFontSize - 0.5, margin: [0, 0, 0, 2] as [number, number, number, number] });
      if (stay.website) lines.push({ text: `Website: ${stay.website}`, fontSize: baseFontSize - 0.5, color: BRAND.earthLight, margin: [0, 0, 0, 2] as [number, number, number, number] });
      content.push({
        stack: lines,
        margin: [0, 0, 0, idx < staysWithContact.length - 1 ? 8 : 0] as [number, number, number, number],
      });
    });
  }

  return content;
}

/**
 * Render budget summary section (2c)
 */
function renderBudgetSummary(budgetData: BudgetData, baseFontSize: number): any[] {
  if (budgetData.categories.length === 0) return [];

  const content: any[] = [];

  content.push({
    text: 'Budget Summary',
    fontSize: baseFontSize + 2,
    bold: false,
    font: 'DMSerifDisplay',
    color: BRAND.earth,
    margin: [0, 16, 0, 8] as [number, number, number, number],
  });

  const tableBody: any[][] = [
    [
      { text: 'Category', bold: true, fontSize: baseFontSize - 0.5, fillColor: BRAND.earthLight, color: '#FFFFFF' },
      { text: 'Amount', bold: true, fontSize: baseFontSize - 0.5, fillColor: BRAND.earthLight, color: '#FFFFFF', alignment: 'right' },
    ],
    ...budgetData.categories.map((c) => [
      { text: c.category, fontSize: baseFontSize - 0.5 },
      { text: `$${c.amount.toFixed(2)}`, fontSize: baseFontSize - 0.5, alignment: 'right' },
    ]),
    [
      { text: 'Total', bold: true, fontSize: baseFontSize, fillColor: '#F5F3F2' },
      { text: `$${budgetData.total.toFixed(2)}`, bold: true, fontSize: baseFontSize, alignment: 'right', fillColor: '#F5F3F2' },
    ],
  ];

  content.push({
    table: { widths: ['*', 'auto'], body: tableBody, dontBreakRows: true },
    layout: 'lightHorizontalLines',
  });

  // Budget vs actual
  if (budgetData.budget != null && budgetData.budget > 0) {
    const remaining = budgetData.budget - budgetData.total;
    const overBudget = remaining < 0;
    content.push({
      columns: [
        { text: `Budget: $${budgetData.budget.toFixed(2)}`, fontSize: baseFontSize - 0.5, width: 'auto' },
        { text: '  |  ', fontSize: baseFontSize - 0.5, color: BRAND.earthMid, width: 'auto' },
        {
          text: overBudget ? `Over budget by $${Math.abs(remaining).toFixed(2)}` : `Remaining: $${remaining.toFixed(2)}`,
          fontSize: baseFontSize - 0.5,
          color: overBudget ? '#DC2626' : '#059669',
          bold: true,
          width: 'auto',
        },
      ],
      margin: [0, 6, 0, 0] as [number, number, number, number],
    });
  }

  return content;
}

/* =========================================================================
   Export (mobile/desktop aware)
   ========================================================================= */

export async function exportItineraryPdf(tripId: string, o: PdfExportOptions): Promise<void> {
  try {
    await loadPdfFonts();
    console.log('[PDF Export] Starting export for trip:', tripId);
    console.log('[PDF Export] Options:', o);

    const preset: PagePreset = ((o as any)?.pagePreset as PagePreset) || 'auto';
    const {
      isMobile,
      pageSize,
      pageMargins,
      baseFontSize,
      headerFont,
      footerFont,
      heroTitle,
      dayHeader,
      compactDayHeader,
      timeWidth,
      imageWidth,
      coverImageHeight,
    } = pagePresetSettings(preset);

    const contentWidth = innerPageWidth(pageSize, pageMargins);

    console.log('[PDF Export] Fetching trip data...');
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
    console.log('[PDF Export] Trip data fetched:', trip.destination);

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

    console.log('[PDF Export] Building days data...');
    const { days, stays, transports, diningRefs, budgetData } = await buildDays(tripId, o);
    console.log('[PDF Export] Days built:', days.length, 'days');

    // Cover image (data URL, possibly downscaled)
    let coverDataUrl = '';
    if (o.showImages && trip.cover_image_url) {
      console.log('[PDF Export] Loading cover image...');
      coverDataUrl = await toDataURI(trip.cover_image_url, Math.round(contentWidth));
      console.log('[PDF Export] Cover image loaded');
    }

    console.log('[PDF Export] Building document definition...');
    // Build document definition
    const content: any[] = [];

    // Combined cover page with 2-column layout
    content.push(
      ...renderCombinedCoverPage(
        trip,
        dateRange,
        stays,
        transports,
        days,
        coverDataUrl,
        contentWidth,
        coverImageHeight,
        baseFontSize
      )
    );

    // Daily itineraries with dynamic multi-day layout
    let currentDayIdx = 0;
    let pageStartIdx = 0;

    while (currentDayIdx < days.length) {
      const daysOnPage = calculatePageFit(days, currentDayIdx);
      const isFirstPage = pageStartIdx === 0;

      // Add page break before each page (except first)
      if (!isFirstPage) {
        content.push({ text: '', pageBreak: 'before' });
      }

      // Render days for this page
      for (let i = 0; i < daysOnPage && currentDayIdx < days.length; i++) {
        const d = days[currentDayIdx];
        const isFirstOnPage = i === 0;

        // Compact day header with divider
        content.push(renderCompactDayHeader(d, isFirstOnPage, compactDayHeader, contentWidth));

        // Day items table
        content.push(renderTable(d.items, o, timeWidth));

        currentDayIdx++;
      }

      pageStartIdx++;
    }

    // Add budget summary if costs are enabled (2c)
    if (o.showCosts) {
      content.push(...renderBudgetSummary(budgetData, baseFontSize));
    }

    // Add reference section with full details
    content.push(...renderReferenceSection(stays, transports, diningRefs, baseFontSize));

    const doc: any = {
      pageSize,
      pageMargins,
      defaultStyle: { fontSize: baseFontSize, lineHeight: 1.25, font: 'DMSans' },
      header: () => ({
        text: [trip.destination, dateRange ? ` • ${dateRange}` : ''].join(''),
        alignment: 'center',
        font: 'DMSans',
        fontSize: headerFont,
        margin: [0, 10, 0, 0],
        color: BRAND.earthLight,
      }),
      footer: (p: number, c: number) => ({
        text: `Page ${p} of ${c} • exported ${fnsFormat(new Date(), 'PP p')}`,
        alignment: 'center',
        font: 'DMSans',
        fontSize: footerFont,
        margin: [0, 0, 0, 10],
        color: BRAND.earthLight,
      }),
      content,
      styles: {
        heroTitle: { fontSize: heroTitle, bold: false, font: 'DMSerifDisplay', color: BRAND.earth },
        heroSub: { fontSize: baseFontSize + 1.5, color: BRAND.earthLight },
        summaryPageTitle: { fontSize: dayHeader, bold: false, font: 'DMSerifDisplay', color: BRAND.earth, margin: [0, 0, 0, 12] },
        summaryTitle: { fontSize: baseFontSize + 1, bold: true, color: BRAND.earth },
        summaryHeader: { fontSize: baseFontSize - 0.5, bold: true, color: '#fff', fillColor: BRAND.earthLight, alignment: 'center' },
        summaryCell: { fontSize: baseFontSize - 0.5, alignment: 'center' },
        summaryItem: { fontSize: baseFontSize - 0.5, color: BRAND.accent },
        dayHeader: { fontSize: isMobile ? 18 : 24, bold: false, font: 'DMSerifDisplay', color: BRAND.earth },

        // Typography tweaks (warm palette)
        timeCell: { fontSize: isMobile ? 8.5 : 9, bold: true, color: BRAND.earthLight },
        itemTitle: { fontSize: isMobile ? 10 : 10.5, bold: true },
        itemDetail: { fontSize: isMobile ? 9 : 9.5, color: BRAND.earth },
        itemMeta: { fontSize: isMobile ? 8 : 9, italics: true, color: BRAND.earthMid },
        itemCost: { fontSize: isMobile ? 10 : 11, bold: true, color: '#059669' },
      },
    };

    // Delivery strategy
    const strategy = resolveStrategy(o);
    const fileName = `${sanitizeFilename(trip.destination)}-itinerary.pdf`;
    console.log('[PDF Export] Creating PDF with strategy:', strategy);
    console.log('[PDF Export] Document content items:', content.length);
    const pdf = pdfMake.createPdf(doc);
    console.log('[PDF Export] PDF object created, generating blob...');

    // Wrap all download strategies in Promises for proper error handling
    return new Promise<void>((resolve, reject) => {
      try {
        // On mobile, always download (window.open is blocked)
        // On desktop, download by default
        if (strategy === 'download' || strategy === 'auto') {
          console.log('[PDF Export] Using download/auto strategy');
          pdf.getBlob((blob: Blob) => {
            console.log('[PDF Export] Blob received, size:', blob?.size);
            try {
              if (!blob) {
                console.error('[PDF Export] Blob is null or undefined');
                reject(new Error('Failed to generate PDF blob'));
                return;
              }

              const url = URL.createObjectURL(blob);
              console.log('[PDF Export] Blob URL created:', url);
              const link = document.createElement('a');
              link.href = url;
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              console.log('[PDF Export] Download triggered for:', fileName);
              document.body.removeChild(link);

              setTimeout(() => {
                URL.revokeObjectURL(url);
                console.log('[PDF Export] Success! PDF downloaded');
                resolve();
              }, 100);
            } catch (err) {
              console.error('[PDF Export] Error in blob callback:', err);
              reject(err);
            }
          });
          return;
        }

        if (strategy === 'open') {
          if (!isProbablyMobile()) {
            pdf.getBlob((blob: Blob) => {
              try {
                if (!blob) {
                  reject(new Error('Failed to generate PDF blob'));
                  return;
                }

                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                setTimeout(() => {
                  URL.revokeObjectURL(url);
                  resolve();
                }, 1000);
              } catch (err) {
                reject(err);
              }
            });
          } else {
            // Fallback to download on mobile if open was explicitly requested
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
          }
          return;
        }

        if (strategy === 'blob') {
          pdf.getBlob((blob: Blob) => {
            try {
              if (!blob) {
                reject(new Error('Failed to generate PDF blob'));
                return;
              }

              const url = URL.createObjectURL(blob);
              if (!isProbablyMobile()) {
                window.open(url, '_blank');
              } else {
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
              setTimeout(() => {
                URL.revokeObjectURL(url);
                resolve();
              }, 100);
            } catch (err) {
              reject(err);
            }
          });
          return;
        }

        console.error('[PDF Export] No valid strategy matched:', strategy);
        reject(new Error('Invalid PDF export strategy'));
      } catch (err) {
        console.error('[PDF Export] Error in Promise wrapper:', err);
        reject(err);
      }
    });
  } catch (error) {
    console.error('[PDF Export] Top-level error:', error);
    throw error;
  }
}
