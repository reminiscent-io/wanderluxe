// src/services/pdf/data.ts — Supabase fetching + image resolution.
// Everything network/DOM-dependent lives here; the doc builder stays pure.
import { supabase } from '@/integrations/supabase/client';
import { parseISO, isSameDay } from 'date-fns';
import { fmtDate, fmtShort, fmtTime, minsFromTime, formatType, sameDay, fmtMoney } from './format';
import { imageToCoverDataURI } from './images';
import { PAGE } from './theme';
import type { Tables } from '@/integrations/supabase/types';
import type {
  PdfExportOptions, PdfTripData, Item, Day,
  AccommodationSummary, TransportSegment, DiningRef, BudgetData,
} from './types';

// Supabase row types for itinerary data
type TripRow = Tables<'trips'>;
type TripDayRow = Tables<'trip_days'>;
type AccommodationRow = Tables<'accommodations'>;
type TransportationRow = Tables<'transportation'>;
type DayActivityRow = Tables<'day_activities'>;
type ReservationRow = Tables<'reservations'>;
type OtherExpenseRow = Tables<'other_expenses'>;

/* =========================================================================
   Constants
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

/* =========================================================================
   Data build (Supabase)
   ========================================================================= */

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
   Public fetch wrapper
   ========================================================================= */

export async function fetchPdfTripData(
  tripId: string,
  o: PdfExportOptions,
  contentWidth: number
): Promise<PdfTripData> {
  const { data: trip, error } = await supabase
    .from(TABLES.trip)
    .select('destination,arrival_date,departure_date,cover_image_url,budget')
    .eq('trip_id', tripId)
    .single();

  if (error || !trip) {
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

  const coverImageRequested = Boolean(o.showImages && trip.cover_image_url);
  const coverImageDataUri = coverImageRequested
    ? await imageToCoverDataURI(
        trip.cover_image_url!,
        Math.round(contentWidth),
        PAGE.coverImageHeight,
        PAGE.coverScale
      )
    : '';

  return {
    destination: trip.destination ?? 'Trip',
    dateRange,
    coverImageDataUri,
    coverImageRequested,
    days,
    stays,
    transports,
    diningRefs,
    budgetData,
  };
}
