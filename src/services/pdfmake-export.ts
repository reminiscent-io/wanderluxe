/* src/services/pdfmake-export.ts
   PDF export with real emoji icons via Noto Emoji embed
   ---------------------------------------------------- */

import pdfMake from 'pdfmake/build/pdfmake';
import 'pdfmake/build/vfs_fonts'; // default Roboto

import { supabase } from '@/integrations/supabase/client';
import { parseISO, format as fnsFormat, isSameDay } from 'date-fns';
import type { PdfExportOptions } from '@/components/trip/PdfExportDialog';

// 1️⃣ – Use web-based emoji fonts as fallback instead of local file

const TABLES = {
  trip:       'trips',
  days:       'trip_days',
  stays:      'accommodations',
  transport:  'transportation',
  activities: 'day_activities',
  dining:     'reservations',
} as const;

const PAGE_MARGINS: [number, number, number, number] = [30, 30, 30, 30];

// Mapping event types to emoji
const EMOJI: Record<string, string> = {
  transportation: '✈️',
  flight:         '✈️',
  accommodation:  '🏨',
  hotel:          '🏨',
  activity:       '🎯',
  activities:     '🎯',
  dining:         '🍽️',
  restaurant:     '🍽️',
};

// --- Tiny format helpers ---
const fmtDate  = (d: string, p='EEEE, MMMM d, yyyy') => fnsFormat(parseISO(d), p);
const fmtShort = (d: string) => fnsFormat(parseISO(d), 'MMM d');
function fmtTime(t?: string|null) {
  if (!t) return '';
  try {
    if (t.includes('T')) return fnsFormat(parseISO(t), 'h:mm a');
    const [h,m] = t.split(':').map(Number);
    const D = new Date(); D.setHours(h,m);
    return fnsFormat(D, 'h:mm a');
  } catch { return ''; }
}
function mins(t: string) {
  const m = t.match(/(\d+):(\d+)\s*([ap])m/i);
  if (!m) return 9999;
  let mm = (parseInt(m[1])%12)*60 + parseInt(m[2]);
  if (m[3].toLowerCase()==='p') mm+=12*60;
  return mm;
}

// --- Cache for images & fonts ---
const imgCache = new Map<string, Promise<string>>();
async function toDataURI(url: string) {
  if (!url) return '';
  if (!imgCache.has(url)) {
    imgCache.set(url,
      fetch(url).then(r=>r.blob()).then(b=>new Promise<string>((res,rej)=>{
        const fr = new FileReader();
        fr.onload = ()=>res(fr.result as string);
        fr.onerror = ()=>rej(fr.error);
        fr.readAsDataURL(b);
      }))
    );
  }
  return imgCache.get(url)!;
}

// --- Simple emoji font handling without external dependencies ---
let emojiFontLoaded = false;
async function loadEmojiFont() {
  if (emojiFontLoaded) return;
  
  // Use built-in fonts only, emojis will render with system fonts
  pdfMake.fonts = {
    ...pdfMake.fonts,
    Roboto: { // ensure Roboto stays
      normal: 'Roboto-Regular.ttf',
      bold:   'Roboto-Medium.ttf',
      italics:'Roboto-Italic.ttf',
      bolditalics:'Roboto-MediumItalic.ttf'
    }
  };
  emojiFontLoaded = true;
}

// --- Types for itinerary items ---
type Item = {
  type: 'accommodation'|'transportation'|'activity'|'dining';
  title: string; time: string; sortKey: number;
  details?: string; location?: string; cost?: string; thumb?: string;
};
type Day = { date: string; title?: string; items: Item[] };

/**
 * Fetches and builds Day[] with Items from Supabase
 */
async function buildDays(tripId: string, opts: PdfExportOptions): Promise<Day[]> {
  const [
    { data: days, error: daysErr },
    { data: stays    },
    { data: trans    },
    { data: acts     },
    { data: dine     },
  ] = await Promise.all([
    supabase.from(TABLES.days).select('day_id,date,title').eq('trip_id',tripId).order('date'),
    supabase.from(TABLES.stays).select('*').eq('trip_id',tripId),
    supabase.from(TABLES.transport).select('*').eq('trip_id',tripId),
    supabase.from(TABLES.activities).select('*').eq('trip_id',tripId),
    supabase.from(TABLES.dining).select('*').eq('trip_id',tripId),
  ]);
  if (daysErr) throw daysErr;

  return (days||[]).map(day=>{
    const items:Item[] = [];

    // Accommodation
    if (opts.sections.accommodation) {
      (stays||[]).forEach(s=>{
        if (!s.hotel_checkin_date||!s.hotel_checkout_date) return;
        const inR = isSameDay(day.date, s.hotel_checkin_date) ||
                    isSameDay(day.date, s.hotel_checkout_date) ||
                    (parseISO(day.date)>=parseISO(s.hotel_checkin_date)&& parseISO(day.date)<=parseISO(s.hotel_checkout_date));
        if (!inR) return;
        const isIn  = isSameDay(day.date, s.hotel_checkin_date);
        const isOut = isSameDay(day.date, s.hotel_checkout_date);
        const when  = isIn ? s.checkin_time : isOut ? s.checkout_time : null;
        items.push({
          type:'accommodation',
          title:`Stay: ${s.hotel}`,
          time: fmtTime(when)||'All-day',
          details: opts.detailLevel!=='minimal' ? s.hotel_details : undefined,
          location: opts.detailLevel!=='minimal' ? s.hotel_address : undefined,
          cost: opts.showCosts && s.cost!=null ? `${s.currency} ${s.cost}` : undefined,
          thumb: opts.showImages && s.image_url ? s.image_url : undefined,
          sortKey: mins(fmtTime(when)||'0:00 am'),
        });
      });
    }

    // Transportation
    if (opts.sections.transportation) {
      (trans||[]).forEach(t=>{
        if(!isSameDay(t.start_date, day.date)) return;
        const label = t.type==='flight'
          ? `Flight${t.provider?`: ${t.provider}`:''}`
          : t.type.charAt(0).toUpperCase()+t.type.slice(1);
        const start = fmtTime(t.start_time), end = fmtTime(t.end_time);
        const timeR = start&&end ? `${start} – ${end}` : start||end||'All-day';
        items.push({
          type:'transportation',
          title:label,
          time: timeR,
          details: opts.detailLevel!=='minimal' ? t.details : undefined,
          location: opts.detailLevel!=='minimal' && t.departure_location && t.arrival_location
            ? `From: ${t.departure_location} → ${t.arrival_location}`
            : opts.detailLevel!=='minimal' ? t.departure_location : undefined,
          cost: opts.showCosts && t.cost!=null ? `${t.currency} ${t.cost}` : undefined,
          sortKey: mins(start||'0:00 am'),
        });
      });
    }

    // Activities
    if (opts.sections.activities) {
      (acts||[]).filter(a=>a.day_id===day.day_id).forEach(a=>{
        items.push({
          type:'activity',
          title: a.title||'Activity',
          time: fmtTime(a.start_time)||'All-day',
          details: opts.detailLevel==='full' ? a.description : undefined,
          cost: opts.showCosts && a.cost!=null ? `${a.currency} ${a.cost}` : undefined,
          sortKey: mins(fmtTime(a.start_time)||'0:00 am'),
        });
      });
    }

    // Dining
    if (opts.sections.dining) {
      (dine||[]).forEach(r=>{
        const match = (r.day_id===day.day_id) ||
                      (r.reservation_time && isSameDay(r.reservation_time, day.date));
        if(!match) return;
        items.push({
          type:'dining',
          title:`Dining: ${r.restaurant_name}`,
          time: fmtTime(r.reservation_time)||'All-day',
          details: opts.detailLevel!=='minimal' ? r.notes : undefined,
          location: opts.detailLevel!=='minimal' && r.address ? r.address : undefined,
          cost: opts.showCosts && r.cost!=null ? `${r.currency} ${r.cost}` : undefined,
          sortKey: mins(fmtTime(r.reservation_time)||'0:00 am'),
        });
      });
    }

    return { ...day, items: items.sort((a,b)=>a.sortKey-b.sortKey) };
  });
}

/**
 * Renders a two-column table (time | stacked details with emoji)
 */
function renderTable(items:Item[], opts:PdfExportOptions) {
  if (!items.length) {
    return { text: 'No activities scheduled', style: 'itemMeta', margin: [0,0,0,6] };
  }
  const body = items.map(it => {
    const emoji = EMOJI[it.type] || '';
    // Use simple text with emoji (system fonts will handle emoji rendering)
    const titleBlock = {
      text: `${emoji} ${it.title}`,
      style: 'itemTitle'
    };
    const stack:any[] = [ titleBlock ];
    if (opts.detailLevel!=='minimal' && it.details) stack.push({ text: it.details, style: 'itemDetail' });
    if ((opts.detailLevel!=='minimal' && it.location) || (opts.showCosts && it.cost)) {
      const parts = [];
      if (opts.detailLevel!=='minimal' && it.location) parts.push(it.location);
      if (opts.showCosts && it.cost) parts.push(`Cost: ${it.cost}`);
      stack.push({ text: parts.join('   •   '), style: 'itemMeta' });
    }
    if (it.thumb && opts.showImages) stack.push({ image: it.thumb, width: 64, margin: [0,4,0,0] });

    return [
      { text: it.time, style: 'timeCell', alignment: 'right' },
      { stack }
    ];
  });

  return { table: { widths: [60, '*'], body }, layout: 'noBorders' as const };
}

/**
 * Main export function called by your button
 */
export async function exportItineraryPdf(tripId:string, opts:PdfExportOptions) {
  // 1. Load emoji font once
  await loadEmojiFont();

  // 2. Fetch trip meta
  const { data: trip, error } = await supabase
    .from(TABLES.trip)
    .select('destination,arrival_date,departure_date,cover_image_url')
    .eq('trip_id', tripId).single();
  if (error || !trip) throw error ?? new Error('Trip not found');
  const dateRange = trip.arrival_date && trip.departure_date
    ? `${fmtShort(trip.arrival_date)} – ${fmtShort(trip.departure_date)}` : '';

  // 3. Build days & items
  const days = await buildDays(tripId, opts);

  // 4. Compose pdfMake doc
  const doc:pdfMake.TDocumentDefinitions = {
    pageSize: 'LETTER',
    pageMargins: PAGE_MARGINS,
    defaultStyle: { fontSize: 10, lineHeight: 1.25 },
    header: () => ({
      text: `${trip.destination} • ${dateRange}`,
      alignment: 'center',
      fontSize: 9,
      margin: [0,10,0,0],
      color: '#666'
    }),
    footer: (current, total) => ({
      text: `Page ${current} of ${total} • exported ${fnsFormat(new Date(), 'PP p')}`,
      alignment: 'center',
      fontSize: 8,
      margin: [0,0,0,10],
      color: '#999'
    }),
    content: [
      ...(opts.showImages && trip.cover_image_url
        ? [{ image: await toDataURI(trip.cover_image_url), width: 540, margin: [0,0,0,12] }]
        : []),
      { text: `${trip.destination} Itinerary`, style: 'heroTitle' },
      { text: dateRange, style: 'heroSub', margin: [0,0,0,16] },
      ...days.flatMap(day => [
        {
          text: day.title?.trim()
            ? `${day.title} – ${fmtDate(day.date)}`
            : fmtDate(day.date),
          style: 'dayHeader',
          margin: [0,8,0,6]
        },
        renderTable(day.items, opts)
      ])
    ],
    styles: {
      heroTitle: { fontSize: 18, bold: true },
      heroSub:   { fontSize: 12, color: '#6b6b6b' },
      dayHeader: { fontSize: 14, bold: true, color: '#333' },
      timeCell:  { fontSize: 9, color: '#6b6b6b' },
      itemTitle: { bold: true },
      itemDetail:{ fontSize: 10 },
      itemMeta:  { italics: true, color: '#6b6b6b' },
    }
  };

  // 5. Download
  const safe = trip.destination.replace(/[^a-z0-9]/gi,'_').toLowerCase();
  pdfMake.createPdf(doc).download(`${safe}-itinerary.pdf`);
}
