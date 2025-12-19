/*  src/services/pdfmake-export.ts
    Mobile/desktop-aware, icon-enhanced itinerary PDF export
    - Preserves per-day build from Supabase
    - Transport shows start–end times
    - Safe, linear-time parsing (no ReDoS)
    - Enhanced with accommodation summary, travel day markers, activity density
    ---------------------------------------------------------------------- */

import pdfMake from 'pdfmake/build/pdfmake';
import 'pdfmake/build/vfs_fonts';

import { supabase } from '@/integrations/supabase/client';
import { parseISO, format as fnsFormat, isSameDay } from 'date-fns';
import type { PdfExportOptions } from '@/components/trip/PdfExportDialog';

/* =========================================================================
   Constants & Types
   ========================================================================= */

const TABLES = {
  trip:       'trips',
  days:       'trip_days',
  stays:      'accommodations',
  transport:  'transportation',
  activities: 'day_activities',
  dining:     'reservations',
} as const;

type ExportStrategy = 'auto' | 'open' | 'download' | 'blob';
type PagePreset     = 'auto' | 'mobile' | 'desktop';

const ICON: Record<string, string> = {
  transportation: '✈',
  flight:         '✈',
  accommodation:  '■',
  hotel:          '■',
  dining:         '●',
  restaurant:     '●',
  activity:       '◆',
  activities:     '◆',
};

// Fixed-width, anchored time matcher: "8:05 am" (linear; no catastrophic backtracking)
const TIME_RE = /^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])m\s*$/i;

type Item = {
  type: 'accommodation'|'transportation'|'activity'|'dining';
  title: string;
  time: string;       // may be "08:00 AM – 11:45 AM"
  details?:  string;
  location?: string;
  cost?:     string;
  thumb?:    string;
  sortKey:   number;  // minutes from midnight (start time) for sorting
};

type Day = { date: string; title?: string; items: Item[]; activityCount?: number; hasTransport?: boolean };

type AccommodationSummary = {
  hotel: string;
  checkIn: string;
  checkOut: string;
  address?: string;
  checkInDate: string;
  checkOutDate: string;
};

type TransportSegment = {
  from: string;
  to: string;
  date: string;
  type: string;
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
    pageSize: defaultPageSize(),                         // 'LETTER' or 'A4'
    pageMargins: isMobile ? ([20, 20, 20, 24] as [number, number, number, number])
                          : ([24, 24, 24, 30] as [number, number, number, number]),
    baseFontSize: isMobile ? 8 : 9,
    headerFont: isMobile ? 8 : 9,
    footerFont: isMobile ? 7.5 : 8,
    heroTitle:  isMobile ? 16 : 18,
    dayHeader:  isMobile ? 12 : 14,
    compactDayHeader: isMobile ? 11 : 12,
    timeWidth:  isMobile ? 52 : 60,
    imageWidth: isMobile ? 480 : 540,
    coverImageHeight: isMobile ? 200 : 250,
  };
}

function resolveStrategy(opts: PdfExportOptions): ExportStrategy {
  const strategy = (opts as any)?.strategy as ExportStrategy | undefined;
  if (strategy === 'open' || strategy === 'download' || strategy === 'blob') return strategy;
  return 'auto';
}

/* =========================================================================
   Safe formatting & parsing (ReDoS-free)
   ========================================================================= */

const fmtDate  = (d: string, pat = 'EEEE, MMMM d, yyyy') => fnsFormat(parseISO(d), pat);
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
    const d = new Date(); d.setHours(h, m, 0, 0);
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
  return (mer === 'p' ? (hh + 12) : hh) * 60 + mm;
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
      return dataUrl ?? await blobToDataURL(blob); // fallback: raw to data URL
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
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        // Use JPEG to keep size small; quality default is fine across browsers
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

async function buildDays(tripId: string, o: PdfExportOptions): Promise<{ days: Day[]; stays: AccommodationSummary[]; transports: TransportSegment[] }> {
  const [
    { data: days, error: daysErr },
    { data: stays },
    { data: trans },
    { data: acts },
    { data: dine },
  ] = await Promise.all([
    supabase.from(TABLES.days)      .select('day_id,date,title').eq('trip_id', tripId).order('date'),
    supabase.from(TABLES.stays)     .select('*').eq('trip_id', tripId),
    supabase.from(TABLES.transport) .select('*').eq('trip_id', tripId),
    supabase.from(TABLES.activities).select('*').eq('trip_id', tripId),
    supabase.from(TABLES.dining)    .select('*').eq('trip_id', tripId),
  ]);

  if (daysErr) throw daysErr;

  // Build accommodation summary and sort by check-in date descending, then check-out descending
  const staysSummary: AccommodationSummary[] = (stays ?? [])
    .map(s => ({
      hotel: s.hotel || 'Hotel',
      checkIn: fmtShort(s.hotel_checkin_date),
      checkOut: fmtShort(s.hotel_checkout_date),
      address: s.hotel_address,
      checkInDate: s.hotel_checkin_date,
      checkOutDate: s.hotel_checkout_date,
    }))
    .sort((a, b) => {
      // Sort by check-in date ascending (oldest first)
      const checkInCompare = new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime();
      if (checkInCompare !== 0) return checkInCompare;

      // If check-in dates are equal, sort by check-out date ascending
      return new Date(a.checkOutDate).getTime() - new Date(b.checkOutDate).getTime();
    });

  // Build transport segments
  const transportSegments: TransportSegment[] = (trans ?? [])
    .filter((t: any) => t.departure_location && t.arrival_location)
    .map(t => ({
      from: t.departure_location,
      to: t.arrival_location,
      date: fmtShort(t.start_date),
      type: t.type === 'flight' ? 'Flight' : t.type ? (t.type.charAt(0).toUpperCase() + t.type.slice(1)) : 'Transport',
    }));

  const processedDays = (days ?? []).map(day => {
    const items: Item[] = [];

    /* accommodation ----------------------------------------------------- */
    {
      (stays ?? []).forEach(s => {
        if (!s.hotel_checkin_date || !s.hotel_checkout_date) return;

        const inRange =
          isSameDay(day.date, s.hotel_checkin_date) ||
          isSameDay(day.date, s.hotel_checkout_date) ||
          (parseISO(day.date) >= parseISO(s.hotel_checkin_date) && parseISO(day.date) <= parseISO(s.hotel_checkout_date));
        if (!inRange) return;

        const isIn  = isSameDay(day.date, s.hotel_checkin_date);
        const isOut = isSameDay(day.date, s.hotel_checkout_date);
        const when  = isIn ? s.checkin_time : isOut ? s.checkout_time : null;

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
          thumb: ((o as any).showImages && s.image_url) ? s.image_url : undefined,
          sortKey: minsFromTime(t || '8:00 am'),
        });
      });
    }

    /* transportation ---------------------------------------------------- */
    let hasTransport = false;
    {
      (trans ?? []).forEach(t => {
        if (!isSameDay(t.start_date, day.date)) return;
        hasTransport = true;

        const title = t.type === 'flight'
          ? `Flight${t.provider ? `: ${t.provider}` : ''}`
          : t.type ? (t.type.charAt(0).toUpperCase() + t.type.slice(1)) : 'Transport';

        const startStr = fmtTime(t.start_time);
        const endStr   = fmtTime(t.end_time);
        const timeStr  = startStr && endStr ? `${startStr} – ${endStr}` : (startStr || endStr || 'All-day');

        items.push({
          type: 'transportation',
          title,
          time: timeStr,
          details: t.details || undefined,
          location: t.departure_location && t.arrival_location
            ? `From: ${t.departure_location} → ${t.arrival_location}`
            : t.departure_location || undefined,
          cost: t.cost != null ? `${t.currency} ${t.cost}` : undefined,
          sortKey: minsFromTime(startStr || '8:00 am'),
        });
      });
    }

    /* activities -------------------------------------------------------- */
    {
      (acts ?? []).filter((a: any) => a.day_id === day.day_id).forEach(a => {
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
      (dine ?? []).forEach(r => {
        const match = (r.day_id && r.day_id === day.day_id) ||
                      (r.reservation_time && isSameDay(r.reservation_time, day.date));
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
    const activityCount = items.filter(i => i.type === 'activity' || i.type === 'dining').length;

    return { 
      ...day, 
      items: items.sort((a, b) => a.sortKey - b.sortKey),
      activityCount,
      hasTransport,
    };
  });

  return { days: processedDays, stays: staysSummary, transports: transportSegments };
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
    transportation: '#3B82F6', // blue
    flight: '#3B82F6',
    dining: '#F97316', // orange
    restaurant: '#F97316',
    activity: '#10B981', // green
    activities: '#10B981',
    accommodation: '#6B7280', // gray
    hotel: '#6B7280',
  };

  const body = items.map(it => {
    const icon = ICON[it.type] || '';
    const typeColor = typeColors[it.type] || '#333';

    // Build title with color coding
    const titleSection: any[] = [];

    // Cost in top-right if present
    if (o.showCosts && it.cost) {
      titleSection.push({
        columns: [
          { text: `${icon} ${it.title}`, style: 'itemTitle', color: typeColor, width: '*' },
          { text: it.cost, style: 'itemCost', alignment: 'right', width: 'auto' }
        ]
      });
    } else {
      titleSection.push({ text: `${icon} ${it.title}`, style: 'itemTitle', color: typeColor });
    }

    const stack: any[] = titleSection;

    // Combine details and location into single compact line
    const combinedDetails: string[] = [];
    if (it.details) combinedDetails.push(it.details);
    if (it.location) combinedDetails.push(it.location);

    if (combinedDetails.length > 0) {
      stack.push({ text: combinedDetails.join(' • '), style: 'itemDetail', margin: [0, 3, 0, 0] });
    }

    if (it.thumb && o.showImages) {
      stack.push({ image: it.thumb, width: 32, margin: [0, 4, 0, 0] });
    }

    return [
      { text: it.time, style: 'timeCell', alignment: 'right', margin: [0, 4, 4, 4] },
      { stack, fillColor: '#F9FAFB', margin: [4, 4, 4, 4] },
    ];
  });

  return {
    table: { widths: [timeWidth, '*'], body },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
  };
}

/* =========================================================================
   Summary sections
   ========================================================================= */

function renderAccommodationSummary(stays: AccommodationSummary[], baseFontSize: number): any[] {
  if (!stays.length) return [];

  const content: any[] = [
    { text: '🏨 WHERE YOU\'RE STAYING', style: 'summaryTitle', margin: [0, 0, 0, 8] },
  ];

  const table = {
    table: {
      widths: ['*', '*', '*'],
      body: [
        [
          { text: 'Hotel', style: 'summaryHeader' },
          { text: 'Check In', style: 'summaryHeader' },
          { text: 'Check Out', style: 'summaryHeader' },
        ],
        ...stays.map(s => [
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

  const content: any[] = [
    { text: '✈️ TRAVEL SEGMENTS', style: 'summaryTitle', margin: [0, 12, 0, 8] },
  ];

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
  const content: any[] = [
    { text: '📅 DAILY ACTIVITY OVERVIEW', style: 'summaryTitle', margin: [0, 12, 0, 8] },
  ];

  days.forEach((d, idx) => {
    const density = getDensityIndicator(d.activityCount || 0);
    const travelTag = d.hasTransport ? ' ✈️ Travel Day' : '';
    content.push({
      columns: [
        { text: `${fmtShort(d.date)}:`, style: 'summaryItem', width: 'auto' },
        { ...density, width: 'auto' },
        { text: travelTag, style: 'summaryItem', width: '*' }
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
 * Render compact day header with inline travel marker
 */
function renderCompactDayHeader(d: Day, isFirstOnPage: boolean, fontSize: number): any {
  const travelMarker = d.hasTransport ? ' ✈️ TRAVEL DAY' : '';
  const dayText = d.title?.trim()
    ? `${fmtShort(d.date)} • ${d.title}${travelMarker}`
    : `${fmtShort(d.date)}${travelMarker}`;

  return {
    text: dayText,
    fontSize,
    bold: true,
    color: '#000000',
    margin: [0, isFirstOnPage ? 0 : 8, 0, 4] as [number, number, number, number],
  };
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
  imageHeight: number,
  baseFontSize: number
): any[] {
  const content: any[] = [];

  // Cover image at 40% page height
  if (coverDataUrl) {
    content.push({
      image: coverDataUrl,
      width: 480,
      height: imageHeight,
      margin: [0, 0, 0, 16] as [number, number, number, number]
    });
  }

  // Hero title and dates
  content.push({
    text: `${trip.destination || 'Trip'} Itinerary`,
    fontSize: 18,
    bold: true,
    margin: [0, 0, 0, 4] as [number, number, number, number]
  });

  if (dateRange) {
    content.push({
      text: dateRange,
      fontSize: baseFontSize + 1.5,
      color: '#6b6b6b',
      margin: [0, 0, 0, 12] as [number, number, number, number]
    });
  }

  // Calculate stats
  const totalFlights = transports.filter(t => t.type.toLowerCase().includes('flight')).length;
  const totalActivities = days.reduce((sum, d) => sum + (d.activityCount || 0), 0);
  const busyDays = days.filter(d => (d.activityCount || 0) >= 4).length;
  const moderateDays = days.filter(d => (d.activityCount || 0) >= 2 && (d.activityCount || 0) < 4).length;
  const lightDays = days.filter(d => (d.activityCount || 0) < 2).length;

  // 2-column layout
  const leftColumn: any[] = [];
  const rightColumn: any[] = [];

  // LEFT COLUMN: Trip details + Accommodation summary
  leftColumn.push({
    text: 'Trip Details',
    fontSize: baseFontSize + 1,
    bold: true,
    margin: [0, 0, 0, 6] as [number, number, number, number]
  });

  leftColumn.push({
    text: `Duration: ${days.length} days`,
    fontSize: baseFontSize - 0.5,
    margin: [0, 0, 0, 2] as [number, number, number, number]
  });

  // Accommodation summary table
  if (stays.length > 0) {
    leftColumn.push({
      text: 'Accommodations',
      fontSize: baseFontSize + 1,
      bold: true,
      margin: [0, 8, 0, 4] as [number, number, number, number]
    });

    const staysTableBody = [
      [
        { text: 'Hotel', bold: true, fontSize: baseFontSize - 1 },
        { text: 'Check In', bold: true, fontSize: baseFontSize - 1 },
        { text: 'Check Out', bold: true, fontSize: baseFontSize - 1 }
      ],
      ...stays.map(s => [
        { text: s.hotel, fontSize: baseFontSize - 1 },
        { text: s.checkIn, fontSize: baseFontSize - 1 },
        { text: s.checkOut, fontSize: baseFontSize - 1 }
      ])
    ];

    leftColumn.push({
      table: {
        widths: ['*', 'auto', 'auto'],
        body: staysTableBody
      },
      layout: 'lightHorizontalLines',
      fontSize: baseFontSize - 1,
      margin: [0, 0, 0, 0] as [number, number, number, number]
    });
  }

  // RIGHT COLUMN: Stats
  rightColumn.push({
    text: 'Quick Stats',
    fontSize: baseFontSize + 1,
    bold: true,
    margin: [0, 0, 0, 6] as [number, number, number, number]
  });

  rightColumn.push({
    text: `✈️ ${totalFlights} flight${totalFlights !== 1 ? 's' : ''}`,
    fontSize: baseFontSize - 0.5,
    margin: [0, 0, 0, 2] as [number, number, number, number]
  });

  rightColumn.push({
    text: `🎯 ${totalActivities} activit${totalActivities !== 1 ? 'ies' : 'y'}`,
    fontSize: baseFontSize - 0.5,
    margin: [0, 0, 0, 6] as [number, number, number, number]
  });

  rightColumn.push({
    text: 'Activity Level',
    fontSize: baseFontSize,
    bold: true,
    margin: [0, 4, 0, 4] as [number, number, number, number]
  });

  if (busyDays > 0) {
    rightColumn.push({
      text: `• Busy (4+ activities): ${busyDays} day${busyDays !== 1 ? 's' : ''}`,
      fontSize: baseFontSize - 1,
      color: '#DC2626',
      margin: [0, 0, 0, 2] as [number, number, number, number]
    });
  }

  if (moderateDays > 0) {
    rightColumn.push({
      text: `• Moderate (2-3 activities): ${moderateDays} day${moderateDays !== 1 ? 's' : ''}`,
      fontSize: baseFontSize - 1,
      color: '#F59E0B',
      margin: [0, 0, 0, 2] as [number, number, number, number]
    });
  }

  if (lightDays > 0) {
    rightColumn.push({
      text: `• Light (0-1 activities): ${lightDays} day${lightDays !== 1 ? 's' : ''}`,
      fontSize: baseFontSize - 1,
      color: '#10B981',
      margin: [0, 0, 0, 2] as [number, number, number, number]
    });
  }

  // Add columns to content
  content.push({
    columns: [
      { stack: leftColumn, width: '*' },
      { stack: rightColumn, width: '*' }
    ],
    columnGap: 20,
    margin: [0, 0, 0, 0] as [number, number, number, number]
  });

  // Page break after cover
  content.push({ text: '', pageBreak: 'after' });

  return content;
}

/**
 * Render reference section with full accommodation and restaurant details
 */
function renderReferenceSection(
  stays: AccommodationSummary[],
  baseFontSize: number
): any[] {
  const content: any[] = [];

  // Page break before reference section
  content.push({ text: '', pageBreak: 'before' });

  content.push({
    text: 'Reference Information',
    fontSize: baseFontSize + 4,
    bold: true,
    margin: [0, 0, 0, 12] as [number, number, number, number]
  });

  // Accommodation details
  if (stays.length > 0) {
    content.push({
      text: 'Accommodation Details',
      fontSize: baseFontSize + 2,
      bold: true,
      margin: [0, 8, 0, 8] as [number, number, number, number]
    });

    stays.forEach((stay, idx) => {
      content.push({
        stack: [
          { text: stay.hotel, fontSize: baseFontSize + 1, bold: true, margin: [0, 0, 0, 2] as [number, number, number, number] },
          { text: `Check-in: ${stay.checkIn}`, fontSize: baseFontSize - 0.5, margin: [0, 0, 0, 2] as [number, number, number, number] },
          { text: `Check-out: ${stay.checkOut}`, fontSize: baseFontSize - 0.5, margin: [0, 0, 0, 2] as [number, number, number, number] },
          ...(stay.address ? [{ text: stay.address, fontSize: baseFontSize - 0.5, color: '#6B7280', margin: [0, 0, 0, 2] as [number, number, number, number] }] : [])
        ],
        margin: [0, 0, 0, idx < stays.length - 1 ? 12 : 0] as [number, number, number, number]
      });
    });
  }

  // Emergency contacts placeholder
  content.push({
    text: 'Emergency Contacts',
    fontSize: baseFontSize + 2,
    bold: true,
    margin: [0, 16, 0, 8] as [number, number, number, number]
  });

  content.push({
    text: 'Keep this section handy for important contacts and local emergency numbers.',
    fontSize: baseFontSize - 0.5,
    color: '#6B7280',
    italics: true
  });

  return content;
}

/* =========================================================================
   Export (mobile/desktop aware)
   ========================================================================= */

export async function exportItineraryPdf(tripId: string, o: PdfExportOptions): Promise<void> {
  try {
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

    console.log('[PDF Export] Fetching trip data...');
    // Fetch minimal trip info
    const { data: trip, error } = await supabase
      .from(TABLES.trip)
      .select('destination,arrival_date,departure_date,cover_image_url')
      .eq('trip_id', tripId).single();
    if (error || !trip) {
      console.error('[PDF Export] Trip fetch failed:', error);
      throw (error ?? new Error('Trip not found'));
    }
    console.log('[PDF Export] Trip data fetched:', trip.destination);

    const sameDay   = trip.arrival_date && trip.departure_date
      ? isSameDay(parseISO(trip.arrival_date), parseISO(trip.departure_date)) : false;

    const dateRange = (trip.arrival_date && trip.departure_date)
      ? (sameDay ? fmtDate(trip.arrival_date) : `${fmtShort(trip.arrival_date)} – ${fmtShort(trip.departure_date)}`)
      : '';

    console.log('[PDF Export] Building days data...');
    const { days, stays, transports } = await buildDays(tripId, o);
    console.log('[PDF Export] Days built:', days.length, 'days');

    // Cover image (data URL, possibly downscaled)
    let coverDataUrl = '';
    if (o.showImages && trip.cover_image_url) {
      console.log('[PDF Export] Loading cover image...');
      coverDataUrl = await toDataURI(trip.cover_image_url, imageWidth);
      console.log('[PDF Export] Cover image loaded');
    }

    console.log('[PDF Export] Building document definition...');
    // Build document definition
    const content: any[] = [];

    // Combined cover page with 2-column layout
    content.push(...renderCombinedCoverPage(
      trip,
      dateRange,
      stays,
      transports,
      days,
      coverDataUrl,
      coverImageHeight,
      baseFontSize
    ));

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

        // Compact day header
        content.push(renderCompactDayHeader(d, isFirstOnPage, compactDayHeader));

        // Day items table
        content.push(renderTable(d.items, o, timeWidth));

        currentDayIdx++;
      }

      pageStartIdx++;
    }

    // Add reference section with full details
    content.push(...renderReferenceSection(stays, baseFontSize));

    const doc: any = {
      pageSize,
      pageMargins,
      defaultStyle: { fontSize: baseFontSize, lineHeight: 1.25 },
      header: () => ({
        text: [trip.destination, dateRange ? ` • ${dateRange}` : ''].join(''),
        alignment: 'center',
        fontSize: headerFont,
        margin: [0, 10, 0, 0],
        color: '#666',
      }),
      footer: (p, c) => ({
        text: `Page ${p} of ${c} • exported ${fnsFormat(new Date(), 'PP p')}`,
        alignment: 'center',
        fontSize: footerFont,
        margin: [0, 0, 0, 10],
        color: '#999',
      }),
      content,
      styles: {
        heroTitle: { fontSize: heroTitle, bold: true },
        heroSub:   { fontSize: baseFontSize + 1.5, color: '#6b6b6b' },
        summaryPageTitle: { fontSize: dayHeader, bold: true, color: '#333', margin: [0, 0, 0, 12] },
        summaryTitle: { fontSize: baseFontSize + 1, bold: true, color: '#333' },
        summaryHeader: { fontSize: baseFontSize - 0.5, bold: true, color: '#fff', fillColor: '#8b7355', alignment: 'center' },
        summaryCell: { fontSize: baseFontSize - 0.5, alignment: 'center' },
        summaryItem: { fontSize: baseFontSize - 0.5, color: '#333' },
        dayHeader: { fontSize: isMobile ? 18 : 24, bold: true, color: '#000000' },
        timeCell:  { fontSize: isMobile ? 9 : 10, bold: true, color: '#4B5563' },
        itemTitle: { fontSize: isMobile ? 10 : 11, bold: true },
        itemDetail:{ fontSize: isMobile ? 9 : 10, color: '#374151' },
        itemMeta:  { fontSize: isMobile ? 8 : 9, italics: true, color: '#6B7280' },
        itemCost:  { fontSize: isMobile ? 10 : 11, bold: true, color: '#059669' },
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
          // Use getBlob for better error handling
          pdf.getBlob((blob: Blob) => {
            console.log('[PDF Export] Blob received, size:', blob?.size);
            try {
              if (!blob) {
                console.error('[PDF Export] Blob is null or undefined');
                reject(new Error('Failed to generate PDF blob'));
                return;
              }

              // Create a download link
              const url = URL.createObjectURL(blob);
              console.log('[PDF Export] Blob URL created:', url);
              const link = document.createElement('a');
              link.href = url;
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              console.log('[PDF Export] Download triggered for:', fileName);
              document.body.removeChild(link);

              // Clean up after a short delay
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
          // Only use open for explicit open strategy on desktop
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
          // If caller wants to handle sharing UI themselves
          pdf.getBlob((blob: Blob) => {
            try {
              if (!blob) {
                reject(new Error('Failed to generate PDF blob'));
                return;
              }

              const url = URL.createObjectURL(blob);
              // The caller can read the blob URL via a custom event or you could expose another API to return it.
              // We just download it here for convenience.
              if (!isProbablyMobile()) {
                window.open(url, '_blank');
              } else {
                // Mobile: create a temporary link and click it to download
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

        // If no strategy matched, reject
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
