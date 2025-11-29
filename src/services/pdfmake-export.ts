/*  src/services/pdfmake-export.ts
    Mobile/desktop-aware, icon-enhanced itinerary PDF export
    - Preserves per-day build from Supabase
    - Transport shows start–end times
    - Safe, linear-time parsing (no ReDoS)
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
  transportation: '✈️',
  flight:         '✈️',
  accommodation:  '🏨',
  hotel:          '🏨',
  dining:         '🍽️',
  restaurant:     '🍽️',
  activity:       '🎯',
  activities:     '🎯',
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

type Day = { date: string; title?: string; items: Item[] };

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
    pageSize: defaultPageSize(),                         // 'LETTER' or 'A4'
    pageMargins: isMobile ? ([24, 24, 24, 28] as [number, number, number, number]) 
                          : ([30, 30, 30, 36] as [number, number, number, number]),
    baseFontSize: isMobile ? 9 : 10,
    headerFont: isMobile ? 8 : 9,
    footerFont: isMobile ? 7.5 : 8,
    heroTitle:  isMobile ? 16 : 18,
    dayHeader:  isMobile ? 13 : 14,
    timeWidth:  isMobile ? 52 : 60,
    imageWidth: isMobile ? 480 : 540,
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

async function buildDays(tripId: string, o: PdfExportOptions): Promise<Day[]> {
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

  return (days ?? []).map(day => {
    const items: Item[] = [];

    /* accommodation ----------------------------------------------------- */
    if ((o as any).sections?.accommodation) {
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

        const t = fmtTime(when);
        items.push({
          type: 'accommodation',
          title: `${isIn ? 'Check-in' : isOut ? 'Check-out' : 'Stay'}: ${s.hotel}`,
          time: t || 'All-day',
          details: s.hotel_details || undefined,
          location: s.hotel_address || undefined,
          cost: s.cost != null ? `${s.currency} ${s.cost}` : undefined,
          thumb: ((o as any).showImages && s.image_url) ? s.image_url : undefined,
          sortKey: minsFromTime(t || '8:00 am'), // 8:00 am just to keep mid-early
        });
      });
    }

    /* transportation ---------------------------------------------------- */
    if ((o as any).sections?.transportation) {
      (trans ?? []).forEach(t => {
        if (!isSameDay(t.start_date, day.date)) return;

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
    if ((o as any).sections?.activities) {
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
    if ((o as any).sections?.dining) {
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

    return { ...day, items: items.sort((a, b) => a.sortKey - b.sortKey) };
  });
}

/* =========================================================================
   Table render
   ========================================================================= */

function renderTable(items: Item[], o: PdfExportOptions, timeWidth: number) {
  if (!items.length) {
    return { text: 'No activities scheduled', style: 'itemMeta', margin: [0, 0, 0, 6] };
  }

  const body = items.map(it => {
    const icon = ICON[it.type] || '';
    const stack: any[] = [{ text: `${icon} ${it.title}`, style: 'itemTitle' }];

    if ((o as any).detailLevel !== 'minimal' && it.details) {
      stack.push({ text: it.details, style: 'itemDetail' });
    }

    if (((o as any).detailLevel !== 'minimal' && it.location) || ((o as any).showCosts && it.cost)) {
      const meta: string[] = [];
      if ((o as any).detailLevel !== 'minimal' && it.location) meta.push(it.location);
      if ((o as any).showCosts && it.cost) meta.push(`Cost: ${it.cost}`);
      stack.push({ text: meta.join('   •   '), style: 'itemMeta' });
    }

    if (it.thumb && (o as any).showImages) {
      stack.push({ image: it.thumb, width: 64, margin: [0, 4, 0, 0] });
    }

    return [
      { text: it.time, style: 'timeCell', alignment: 'right' },
      { stack },
    ];
  });

  return {
    table: { widths: [timeWidth, '*'], body },
    layout: 'noBorders' as const,
  };
}

/* =========================================================================
   Export (mobile/desktop aware)
   ========================================================================= */

export async function exportItineraryPdf(tripId: string, o: PdfExportOptions): Promise<void> {
  const preset: PagePreset = ((o as any)?.pagePreset as PagePreset) || 'auto';
  const {
    pageSize,
    pageMargins,
    baseFontSize,
    headerFont,
    footerFont,
    heroTitle,
    dayHeader,
    timeWidth,
    imageWidth,
  } = pagePresetSettings(preset);

  // Fetch minimal trip info
  const { data: trip, error } = await supabase
    .from(TABLES.trip)
    .select('destination,arrival_date,departure_date,cover_image_url')
    .eq('trip_id', tripId).single();
  if (error || !trip) throw (error ?? new Error('Trip not found'));

  const sameDay   = trip.arrival_date && trip.departure_date
    ? isSameDay(parseISO(trip.arrival_date), parseISO(trip.departure_date)) : false;

  const dateRange = (trip.arrival_date && trip.departure_date)
    ? (sameDay ? fmtDate(trip.arrival_date) : `${fmtShort(trip.arrival_date)} – ${fmtShort(trip.departure_date)}`)
    : '';

  const days = await buildDays(tripId, o);

  // Cover image (data URL, possibly downscaled)
  let coverDataUrl = '';
  if ((o as any).showImages && trip.cover_image_url) {
    coverDataUrl = await toDataURI(trip.cover_image_url, imageWidth);
  }

  // Build document definition
  const content: any[] = [];
  if (coverDataUrl) content.push({ image: coverDataUrl, width: imageWidth, margin: [0, 0, 0, 12] });
  content.push({ text: `${trip.destination || 'Trip'} Itinerary`, style: 'heroTitle' });
  if (dateRange) content.push({ text: dateRange, style: 'heroSub', margin: [0, 0, 0, 16] });

  days.forEach((d, idx) => {
    content.push({
      text: d.title?.trim() ? `${d.title} – ${fmtDate(d.date)}` : fmtDate(d.date),
      style: 'dayHeader',
      margin: [0, idx === 0 ? 8 : 16, 0, 6],
      // Gently page-break before each new day (except the first) to keep things readable on mobile
      pageBreak: idx === 0 ? undefined : 'before',
    });
    content.push(renderTable(d.items, o, timeWidth));
  });

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
      dayHeader: { fontSize: dayHeader, bold: true, color: '#333' },
      timeCell:  { fontSize: baseFontSize - 1, color: '#6b6b6b' },
      itemTitle: { bold: true },
      itemDetail:{ fontSize: baseFontSize },
      itemMeta:  { italics: true, color: '#6b6b6b' },
    },
  };

  // Delivery strategy
  const strategy = resolveStrategy(o);
  const fileName = `${sanitizeFilename(trip.destination)}-itinerary.pdf`;
  const pdf = pdfMake.createPdf(doc);

  if (strategy === 'download' || (strategy === 'auto' && !isProbablyMobile())) {
    pdf.download(fileName);
    return;
  }

  if (strategy === 'open' || strategy === 'auto') {
    // Opening in a new tab is friendlier on mobile
    pdf.open();
    return;
  }

  if (strategy === 'blob') {
    // If caller wants to handle sharing UI themselves
    pdf.getBlob((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      // The caller can read the blob URL via a custom event or you could expose another API to return it.
      // We just open it here for convenience.
      window.open(url, '_blank');
    });
  }
}
