/* src/services/pdfmake-export.ts
 * Client-side pdfMake itinerary generator
 * -------------------------------------- */
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Initialize pdfMake with fonts
(pdfMake as any).vfs = pdfFonts;

import { supabase } from '@/integrations/supabase/client';
import { parseISO, format as fnsFormat } from 'date-fns';
import type { PdfExportOptions } from '@/components/trip/PdfExportDialog';

/* -------------------------------------------------------------------------- */
/* Utility helpers                                                            */
/* -------------------------------------------------------------------------- */

const formatDate = (d: string, pattern = 'EEEE, MMMM d, yyyy') =>
  fnsFormat(parseISO(d), pattern);

const formatTime = (time?: string | null) => {
  if (!time) return 'All-day';
  try {
    if (time.includes('T')) return fnsFormat(parseISO(time), 'h:mm a');
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m);
    return fnsFormat(d, 'h:mm a');
  } catch { return 'All-day'; }
};

const minutesFromTime = (t: string) => {
  if (t === 'All-day') return -1;
  const m = t.match(/(\d+):(\d+)\s*([ap])m/i);
  if (!m) return 9999;
  const [, hh, mm, mer] = m;
  let mins = (parseInt(hh, 10) % 12) * 60 + parseInt(mm, 10);
  if (mer.toLowerCase() === 'p') mins += 12 * 60;
  return mins;
};

const urlToDataURL = async (url: string) => {
  const blob = await fetch(url).then(r => r.blob());
  return await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(blob);
  });
};

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type TimelineItem = {
  type: 'accommodation' | 'transportation' | 'activity' | 'dining';
  title: string;
  time: string;
  details?: string;
  location?: string;
  cost?: string;
  thumb?: string;
  sortKey: number;
};

type TimelineDay = {
  date: string;
  title?: string;
  timelineItems: TimelineItem[];
};

/* -------------------------------------------------------------------------- */
/* Data assembly: buildDays                                                   */
/* -------------------------------------------------------------------------- */

async function buildDays(
  tripId: string,
  opts: PdfExportOptions,
): Promise<TimelineDay[]> {
  const { data: days, error: dayErr } = await supabase
    .from('trip_days')
    .select('day_id, date, title')
    .eq('trip_id', tripId)
    .order('date', { ascending: true });

  if (dayErr) throw dayErr;

  const { data: stays } = await supabase
    .from('accommodations')
    .select('*')
    .eq('trip_id', tripId);

  const { data: transports, error: transportError } = await supabase
    .from('transportation')
    .select('*')
    .eq('trip_id', tripId);

  const { data: acts, error: actsError } = await supabase
    .from('day_activities')
    .select('*')
    .eq('trip_id', tripId);

  const { data: dine, error: dineError } = await supabase
    .from('reservations')
    .select('*')
    .eq('trip_id', tripId);

  // Debug logging
  console.log('PDF Export Data:', {
    tripId,
    transportCount: transports?.length || 0,
    activitiesCount: acts?.length || 0,
    diningCount: dine?.length || 0,
    transportError,
    actsError,
    dineError
  });

  /* helper to compare two ISO-date strings by calendar day */
  const sameDay = (isoA: string, isoB: string) =>
    isoA.slice(0, 10) === isoB.slice(0, 10);

  return (days || []).map(day => {
    const timeline: TimelineItem[] = [];

    /* accommodations (unchanged) ---------------------------------------- */
    if (opts.sections.accommodation) {
      (stays || []).forEach(s => {
        if (!s.hotel_checkin_date || !s.hotel_checkout_date) return;

        const isCheckIn = sameDay(day.date, s.hotel_checkin_date);
        const isCheckOut = sameDay(day.date, s.hotel_checkout_date);

        if (
          isCheckIn || isCheckOut ||
          (parseISO(day.date) >= parseISO(s.hotel_checkin_date) &&
           parseISO(day.date) <= parseISO(s.hotel_checkout_date))
        ) {
          const when = isCheckIn ? s.checkin_time : isCheckOut ? s.checkout_time : null;
          timeline.push({
            type: 'accommodation',
            title: isCheckIn
              ? `Check-in: ${s.hotel}`
              : isCheckOut
              ? `Check-out: ${s.hotel}`
              : `Stay at ${s.hotel}`,
            time: formatTime(when),
            details: s.hotel_details || undefined,
            location: s.hotel_address || undefined,
            cost: s.cost != null ? `${s.currency} ${s.cost}` : undefined,
            thumb: opts.showImages && s.image_url ? s.image_url : undefined,
            sortKey: minutesFromTime(formatTime(when)),
          });
        }
      });
    }

    /* transportation – improved day match ------------------------------- */
    if (opts.sections.transportation) {
      (transports || []).forEach(t => {
        // match by calendar day regardless of TZ/time part
        if (!sameDay(t.start_date, day.date)) return;

        const title =
          t.type === 'flight'
            ? `Flight${t.provider ? ': ' + t.provider : ''}`
            : t.type.charAt(0).toUpperCase() + t.type.slice(1);

        const metaLoc =
          t.departure_location && t.arrival_location
            ? `From: ${t.departure_location} → ${t.arrival_location}`
            : t.departure_location
            ? `From: ${t.departure_location}`
            : undefined;

        timeline.push({
          type: 'transportation',
          title,
          time: formatTime(t.start_time),
          details: t.details || undefined,
          location: metaLoc,
          cost: t.cost != null ? `${t.currency} ${t.cost}` : undefined,
          sortKey: minutesFromTime(formatTime(t.start_time)),
        });
      });
    }

    /* activities (unchanged) -------------------------------------------- */
    if (opts.sections.activities) {
      (acts || [])
        .filter(a => a.day_id === day.day_id)
        .forEach(a => {
          timeline.push({
            type: 'activity',
            title: a.title || 'Activity',
            time: formatTime(a.start_time),
            details: a.description || undefined,
            cost: a.cost != null ? `${a.currency} ${a.cost}` : undefined,
            sortKey: minutesFromTime(formatTime(a.start_time)),
          });
        });
    }

    /* dining / reservations – now robust -------------------------------- */
    if (opts.sections.dining) {
      (dine || []).forEach(r => {
        const reservationOnThisDay =
          (r.day_id && r.day_id === day.day_id) ||
          (r.reservation_time && sameDay(r.reservation_time, day.date));

        if (!reservationOnThisDay) return;

        const metaParts: string[] = [];
        if (r.number_of_people)
          metaParts.push(
            `${r.number_of_people} ${r.number_of_people === 1 ? 'person' : 'people'}`,
          );
        if (r.address) metaParts.push(r.address);

        timeline.push({
          type: 'dining',
          title: `Dining: ${r.restaurant_name}`,
          time: formatTime(r.reservation_time),
          details: r.notes || undefined,
          location: metaParts.join(' · ') || undefined,
          cost: r.cost != null ? `${r.currency} ${r.cost}` : undefined,
          sortKey: minutesFromTime(formatTime(r.reservation_time)),
        });
      });
    }

    return {
      ...day,
      timelineItems: timeline.sort((a, b) => a.sortKey - b.sortKey),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* buildDayTable helper                                                       */
/* -------------------------------------------------------------------------- */

function buildDayTable(items: TimelineItem[], opts: PdfExportOptions) {
  if (!items.length)
    return { text: 'No activities scheduled', style: 'itemMeta', margin: [0, 0, 0, 6] };

  const body = items.map(it => {
    const stack: any[] = [{ text: it.title, style: 'itemTitle' }];

    if (opts.detailLevel !== 'minimal' && it.details)
      stack.push({ text: it.details });

    if (
      (opts.detailLevel !== 'minimal' && it.location) ||
      (opts.showCosts && it.cost)
    ) {
      const meta = [];
      if (opts.detailLevel !== 'minimal' && it.location) meta.push(it.location);
      if (opts.showCosts && it.cost) meta.push(`Cost: ${it.cost}`);
      stack.push({ text: meta.join('   •   '), style: 'itemMeta' });
    }

    if (it.thumb && opts.showImages)
      stack.push({ image: it.thumb, width: 64, margin: [0, 4, 0, 0] });

    return [
      { text: it.time, style: 'timeCell', alignment: 'right' },
      { stack },
    ];
  });

  return {
    table: { widths: [50, '*'], body },
    layout: 'noBorders' as const,
  };
}

/* -------------------------------------------------------------------------- */
/* Main exportItineraryPdf                                                    */
/* -------------------------------------------------------------------------- */

export async function exportItineraryPdf(
  tripId: string,
  options: PdfExportOptions,
) {
  try {
    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .select('destination, arrival_date, departure_date, cover_image_url')
      .eq('trip_id', tripId)
      .single();

    if (tripErr || !trip) throw tripErr ?? new Error('Trip not found');

  const dateRange =
    trip.arrival_date && trip.departure_date
      ? `${formatDate(trip.arrival_date, 'MMM d')} – ${formatDate(trip.departure_date, 'MMM d')}`
      : '';

  const processedDays = await buildDays(tripId, options);

  const docDefinition: any = {
    pageSize: 'LETTER',
    pageMargins: [30, 30, 30, 30],        // equal left/right margins ✅
    defaultStyle: { fontSize: 10, lineHeight: 1.25 },

    content: [
      ...(options.showImages && trip.cover_image_url
        ? [{
            image: await urlToDataURL(trip.cover_image_url),
            width: 540,
            margin: [0, 0, 0, 12],
          }]
        : []),
      { text: `${trip.destination} Itinerary`, style: 'heroTitle' },
      { text: dateRange, style: 'heroSub', margin: [0, 0, 0, 16] },

      /* No forced page break between days */
      ...processedDays.map(day => {
        const heading = day.title?.trim()
          ? `${day.title} – ${formatDate(day.date)}`
          : formatDate(day.date);

        return [
          { text: heading, style: 'dayHeader', margin: [0, 8, 0, 6] },
          buildDayTable(day.timelineItems, options),
        ];
      }).flat(),
    ],

    styles: {
      heroTitle: { fontSize: 18, bold: true },
      heroSub: { fontSize: 12, color: '#6b6b6b' },
      dayHeader: { fontSize: 14, bold: true, color: '#333' },
      timeCell: { fontSize: 9, color: '#6b6b6b' },
      itemTitle: { bold: true },
      itemMeta: { italics: true, color: '#6b6b6b' },
    },
  };

    const fileName = `${trip.destination.replace(/\s+/g, '_')}-itinerary.pdf`.toLowerCase();
    pdfMake.createPdf(docDefinition).download(fileName);
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}
