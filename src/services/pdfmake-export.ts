/*  src/services/pdfmake-export.ts
    Client-side pdfMake itinerary generator
    -------------------------------------- */

import pdfMake from 'pdfmake/build/pdfmake';
import 'pdfmake/build/vfs_fonts';

// --- init default Roboto font -------------------------------------------

import { supabase } from '@/integrations/supabase/client';
import {
  parseISO,
  format as fnsFormat,
  isSameDay,
} from 'date-fns';
import type { PdfExportOptions } from '@/components/trip/PdfExportDialog';

/* ---------------------------------------------------------------------- */
/*   CONSTANTS / CONFIG                                                   */
/* ---------------------------------------------------------------------- */

const TABLES = {
  days:            'trip_days',
  stays:           'accommodations',
  transport:       'transportation',
  activities:      'day_activities',
  dining:          'reservations',      // restaurant_reservations in your schema?
  trip:            'trips',
} as const;

/* You can tweak global page style here */
const PAGE_MARGINS: [number, number, number, number] = [30, 30, 30, 30];

/* ---------------------------------------------------------------------- */
/*   SMALL HELPERS                                                        */
/* ---------------------------------------------------------------------- */

const fmtDate  = (d: string, pat = 'EEEE, MMMM d, yyyy') => fnsFormat(parseISO(d), pat);
const fmtShort = (d: string) => fnsFormat(parseISO(d), 'MMM d');

function fmtTime(t?: string | null) {
  if (!t) return 'All-day';
  try {
    if (t.includes('T')) return fnsFormat(parseISO(t), 'h:mm a');
    const [h, m] = t.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m);
    return fnsFormat(d, 'h:mm a');
  } catch { return 'All-day'; }
}

function minsFromTime(t: string) {
  if (t === 'All-day') return -1;
  const m = t.match(/(\d+):(\d+)\s*([ap])m/i);
  if (!m) return 9999;
  const [ , hh, mm, mer ] = m;
  let mins = (parseInt(hh, 10) % 12) * 60 + parseInt(mm, 10);
  if (mer.toLowerCase() === 'p') mins += 12 * 60;
  return mins;
}

/* cache cover-image conversion per session */
const imgCache = new Map<string, Promise<string>>();
async function urlToDataURI(url: string) {
  if (!url) return '';
  if (!imgCache.has(url)) {
    imgCache.set(url, fetch(url)
      .then(r => r.blob())
      .then(blob => new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result as string);
        fr.onerror = () => rej(fr.error);
        fr.readAsDataURL(blob);
      })));
  }
  return imgCache.get(url)!;
}

/* ---------------------------------------------------------------------- */
/*   TYPES                                                                */
/* ---------------------------------------------------------------------- */

type TimelineItem = {
  type: 'accommodation' | 'transportation' | 'activity' | 'dining';
  title: string;
  time: string;
  details?:  string;
  location?: string;
  cost?:     string;
  thumb?:    string;
  sortKey:   number;
};
type TimelineDay = { date: string; title?: string; timelineItems: TimelineItem[] };

/* ---------------------------------------------------------------------- */
/*   DATA ASSEMBLY                                                        */
/* ---------------------------------------------------------------------- */

async function buildDays(
  tripId: string,
  opts: PdfExportOptions,
): Promise<TimelineDay[]> {

  /* 1️⃣ fetch everything in parallel */
  const [
    { data: days,      error: daysErr      },
    { data: stays      },
    { data: transport  },
    { data: activities },
    { data: dining     },
  ] = await Promise.all([
    supabase.from(TABLES.days).select('day_id, date, title').eq('trip_id', tripId).order('date'),
    supabase.from(TABLES.stays).select('*').eq('trip_id', tripId),
    supabase.from(TABLES.transport).select('*').eq('trip_id', tripId),
    supabase.from(TABLES.activities).select('*').eq('trip_id', tripId),
    supabase.from(TABLES.dining).select('*').eq('trip_id', tripId),
  ]);

  if (daysErr) throw daysErr;

  /* dev-only debug ------------------------------------------------------ */
  if (import.meta.env.DEV) {
    console.debug('[PDF] fetched', {
      days: days?.length,
      stays: stays?.length,
      transport: transport?.length,
      activities: activities?.length,
      dining: dining?.length,
    });
  }

  return (days ?? []).map(day => {
    const items: TimelineItem[] = [];

    /* — accommodations — */
    if (opts.sections.accommodation) {
      (stays ?? []).forEach(s => {
        if (!s.hotel_checkin_date || !s.hotel_checkout_date) return;

        const inRange =
          isSameDay(day.date, s.hotel_checkin_date) ||
          isSameDay(day.date, s.hotel_checkout_date) ||
          (parseISO(day.date) >= parseISO(s.hotel_checkin_date) &&
           parseISO(day.date) <= parseISO(s.hotel_checkout_date));

        if (!inRange) return;

        const isCheckIn  = isSameDay(day.date, s.hotel_checkin_date);
        const isCheckOut = isSameDay(day.date, s.hotel_checkout_date);
        const when = isCheckIn ? s.checkin_time : isCheckOut ? s.checkout_time : null;

        items.push({
          type: 'accommodation',
          title: isCheckIn
            ? `Check-in: ${s.hotel}`
            : isCheckOut
            ? `Check-out: ${s.hotel}`
            : `Stay at ${s.hotel}`,
          time: fmtTime(when),
          details:  s.hotel_details || undefined,
          location: s.hotel_address || undefined,
          cost:     s.cost != null ? `${s.currency} ${s.cost}` : undefined,
          thumb:    opts.showImages && s.image_url ? s.image_url : undefined,
          sortKey:  minsFromTime(fmtTime(when)),
        });
      });
    }

    /* — transportation — */
    if (opts.sections.transportation) {
      (transport ?? []).forEach(t => {
        if (!isSameDay(t.start_date, day.date)) return;

        const title = t.type === 'flight'
          ? `Flight${t.provider ? ': ' + t.provider : ''}`
          : t.type.charAt(0).toUpperCase() + t.type.slice(1);

        items.push({
          type: 'transportation',
          title,
          time: fmtTime(t.start_time),
          details:  t.details || undefined,
          location: t.departure_location && t.arrival_location
            ? `From: ${t.departure_location} → ${t.arrival_location}`
            : t.departure_location || undefined,
          cost:    t.cost != null ? `${t.currency} ${t.cost}` : undefined,
          sortKey: minsFromTime(fmtTime(t.start_time)),
        });
      });
    }

    /* — activities — */
    if (opts.sections.activities) {
      (activities ?? []).filter(a => a.day_id === day.day_id).forEach(a => {
        items.push({
          type: 'activity',
          title: a.title || 'Activity',
          time:  fmtTime(a.start_time),
          details: a.description || undefined,
          cost: a.cost != null ? `${a.currency} ${a.cost}` : undefined,
          sortKey: minsFromTime(fmtTime(a.start_time)),
        });
      });
    }

    /* — dining / reservations — */
    if (opts.sections.dining) {
      (dining ?? []).forEach(r => {
        const matches =
          (r.day_id && r.day_id === day.day_id) ||
          (r.reservation_time && isSameDay(r.reservation_time, day.date));
        if (!matches) return;

        const meta: string[] = [];
        if (r.number_of_people)
          meta.push(`${r.number_of_people} ${r.number_of_people === 1 ? 'person' : 'people'}`);
        if (r.address) meta.push(r.address);

        items.push({
          type: 'dining',
          title: `Dining: ${r.restaurant_name}`,
          time:  fmtTime(r.reservation_time),
          details: r.notes || undefined,
          location: meta.join(' · ') || undefined,
          cost: r.cost != null ? `${r.currency} ${r.cost}` : undefined,
          sortKey: minsFromTime(fmtTime(r.reservation_time)),
        });
      });
    }

    return {
      ...day,
      timelineItems: items.sort((a, b) => a.sortKey - b.sortKey),
    };
  });
}

/* ---------------------------------------------------------------------- */
/*   TABLE RENDERING                                                       */
/* ---------------------------------------------------------------------- */

function buildDayTable(items: TimelineItem[], o: PdfExportOptions) {
  if (!items.length)
    return { text: 'No activities scheduled', style: 'itemMeta', margin: [0,0,0,6] };

  const body = items.map(it => {
    const stack: any[] = [{ text: it.title, style: 'itemTitle' }];

    if (o.detailLevel !== 'minimal' && it.details)  stack.push({ text: it.details });

    if ((o.detailLevel !== 'minimal' && it.location) || (o.showCosts && it.cost)) {
      const meta = [];
      if (o.detailLevel !== 'minimal' && it.location) meta.push(it.location);
      if (o.showCosts && it.cost) meta.push(`Cost: ${it.cost}`);
      stack.push({ text: meta.join('   •   '), style: 'itemMeta' });
    }

    if (it.thumb && o.showImages) stack.push({ image: it.thumb, width: 64, margin: [0,4,0,0] });

    return [
      { text: it.time, style: 'timeCell', alignment: 'right' },
      { stack },
    ];
  });

  return {
    table: { widths: [52, '*'], body },
    layout: 'noBorders' as const,
  };
}

/* ---------------------------------------------------------------------- */
/*   MAIN EXPORT FUNCTION                                                  */
/* ---------------------------------------------------------------------- */

export async function exportItineraryPdf(
  tripId: string,
  options: PdfExportOptions,
) {
  /* 1️⃣ trip meta ------------------------------------------------------- */
  const { data: trip, error: tripErr } = await supabase
    .from(TABLES.trip)
    .select('destination, arrival_date, departure_date, cover_image_url')
    .eq('trip_id', tripId)
    .single();

  if (tripErr || !trip) throw tripErr ?? new Error('Trip not found');

  const dateRange =
    trip.arrival_date && trip.departure_date
      ? `${fmtShort(trip.arrival_date)} – ${fmtShort(trip.departure_date)}`
      : '';

  /* 2️⃣ fetch & transform day data ------------------------------------ */
  const processedDays = await buildDays(tripId, options);

  /* 3️⃣ compose pdfMake doc ------------------------------------------ */
  const doc: pdfMake.TDocumentDefinitions = {
    pageSize:   'LETTER',
    pageMargins: PAGE_MARGINS,
    defaultStyle: { fontSize: 10, lineHeight: 1.25 },

    header: (currentPage, pageCount) => ({
      text: `${trip.destination} • ${dateRange}`,
      alignment: 'center',
      margin: [0, 10, 0, 0],
      fontSize: 9,
      color: '#666',
    }),
    footer: (currentPage, pageCount) => ({
      text: `Page ${currentPage} of ${pageCount} • exported ${fnsFormat(new Date(), 'PP p')}`,
      alignment: 'center',
      margin: [0, 0, 0, 10],
      fontSize: 8,
      color: '#999',
    }),

    content: [
      ...(options.showImages && trip.cover_image_url
        ? [{
            image: await urlToDataURI(trip.cover_image_url),
            width: 540,
            margin: [0, 0, 0, 12],
          }]
        : []),

      { text: `${trip.destination} Itinerary`, style: 'heroTitle' },
      { text: dateRange, style: 'heroSub', margin: [0, 0, 0, 16] },

      ...processedDays.flatMap(day => {
        const heading = day.title?.trim()
          ? `${day.title} – ${fmtDate(day.date)}`
          : fmtDate(day.date);

        return [
          { text: heading, style: 'dayHeader', margin: [0, 8, 0, 6] },
          buildDayTable(day.timelineItems, options),
        ];
      }),
    ],

    styles: {
      heroTitle: { fontSize: 18, bold: true },
      heroSub:   { fontSize: 12, color: '#6b6b6b' },
      dayHeader: { fontSize: 14, bold: true, color: '#333' },
      timeCell:  { fontSize: 9,  color: '#6b6b6b' },
      itemTitle: { bold: true },
      itemMeta:  { italics: true, color: '#6b6b6b' },
    },
  };

  /* 4️⃣ download ------------------------------------------------------- */
  const safeName = trip.destination.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const fileName = `${safeName}-itinerary.pdf`;
  pdfMake.createPdf(doc).download(fileName);
}
