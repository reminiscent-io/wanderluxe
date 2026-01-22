/**
 * Server-side PDF generation service
 * Provides generateItineraryPDF and getPDFFilename for the trip-pdf API route
 */

import pdfMake from 'pdfmake/build/pdfmake';
import 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import type { TripDay, DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';
import type { ItineraryData } from '@/types/itinerary';
import { format, parseISO } from 'date-fns';

interface PDFOptions {
  plain?: boolean;
}

/**
 * Generate a PDF buffer from itinerary data
 */
export async function generateItineraryPDF(
  data: ItineraryData,
  options: PDFOptions = {}
): Promise<Buffer> {
  const { trip, days, hotelStays, transportations, reservations } = data;
  const isPlain = options.plain ?? false;

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'LETTER',
    pageMargins: [40, 60, 40, 60],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
    },
    content: buildContent(trip, days, hotelStays, transportations, reservations, isPlain),
    styles: {
      header: { fontSize: 24, bold: true, margin: [0, 0, 0, 10] },
      subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      dayHeader: { fontSize: 16, bold: true, margin: [0, 15, 0, 8], color: '#333' },
      itemTitle: { fontSize: 11, bold: true },
      itemDetail: { fontSize: 9, color: '#666' },
      tableHeader: { bold: true, fillColor: '#f5f5f5' },
    },
  };

  return new Promise((resolve, reject) => {
    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.getBuffer((buffer: Buffer) => {
      resolve(buffer);
    });
  });
}

/**
 * Generate filename for PDF download
 */
export function getPDFFilename(destination: string, isPlain: boolean): string {
  const sanitized = destination
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 50);

  const suffix = isPlain ? '-plain' : '';
  const date = format(new Date(), 'yyyy-MM-dd');

  return `${sanitized}-itinerary${suffix}-${date}.pdf`;
}

function buildContent(
  trip: { destination: string; start_date: string; end_date: string; cover_image_url?: string },
  days: TripDay[],
  hotelStays: HotelStay[],
  transportations: Transportation[],
  reservations: Record<string, RestaurantReservation[]>,
  isPlain: boolean
): Content[] {
  const content: Content[] = [];

  // Title
  content.push({
    text: trip.destination,
    style: 'header',
  });

  // Date range
  const startDate = trip.start_date ? format(parseISO(trip.start_date), 'MMM d, yyyy') : '';
  const endDate = trip.end_date ? format(parseISO(trip.end_date), 'MMM d, yyyy') : '';
  if (startDate && endDate) {
    content.push({
      text: `${startDate} - ${endDate}`,
      margin: [0, 0, 0, 20],
      color: '#666',
    });
  }

  // Accommodations summary
  if (hotelStays.length > 0) {
    content.push({ text: 'Accommodations', style: 'subheader' });
    hotelStays.forEach((stay) => {
      const checkIn = stay.hotel_checkin_date ? format(parseISO(stay.hotel_checkin_date), 'MMM d') : '';
      const checkOut = stay.hotel_checkout_date ? format(parseISO(stay.hotel_checkout_date), 'MMM d') : '';
      content.push({
        text: `${stay.hotel || 'Accommodation'} (${checkIn} - ${checkOut})`,
        margin: [0, 2, 0, 2],
      });
      if (stay.hotel_address) {
        content.push({
          text: stay.hotel_address,
          style: 'itemDetail',
          margin: [10, 0, 0, 4],
        });
      }
    });
  }

  // Transportation summary
  if (transportations.length > 0) {
    content.push({ text: 'Transportation', style: 'subheader' });
    transportations.forEach((t) => {
      const date = t.start_date ? format(parseISO(t.start_date), 'MMM d') : '';
      const typeLabel = t.type ? t.type.charAt(0).toUpperCase() + t.type.slice(1) : 'Transport';
      content.push({
        text: `${typeLabel}: ${t.departure_location || ''} → ${t.arrival_location || ''} (${date})`,
        margin: [0, 2, 0, 2],
      });
      if (t.details) {
        content.push({
          text: t.details,
          style: 'itemDetail',
          margin: [10, 0, 0, 4],
        });
      }
    });
  }

  // Day-by-day itinerary
  content.push({ text: 'Daily Itinerary', style: 'subheader', margin: [0, 20, 0, 10] });

  days.forEach((day) => {
    const dayDate = day.date ? format(parseISO(day.date), 'EEEE, MMMM d, yyyy') : '';
    const dayTitle = day.title ? ` - ${day.title}` : '';

    content.push({
      text: `${dayDate}${dayTitle}`,
      style: 'dayHeader',
    });

    // Activities for this day
    const activities = day.activities || [];
    if (activities.length > 0) {
      activities.forEach((activity) => {
        const time = activity.start_time || '';
        const timeStr = time ? `${time} - ` : '';
        content.push({
          text: `${timeStr}${activity.title || 'Activity'}`,
          style: 'itemTitle',
          margin: [10, 4, 0, 0],
        });
        if (activity.description && !isPlain) {
          content.push({
            text: activity.description,
            style: 'itemDetail',
            margin: [10, 2, 0, 4],
          });
        }
      });
    }

    // Reservations for this day
    const dayReservations = reservations[day.day_id] || [];
    if (dayReservations.length > 0) {
      dayReservations.forEach((res) => {
        const time = res.reservation_time || '';
        content.push({
          text: `${time} - ${res.restaurant_name || 'Restaurant'}`,
          style: 'itemTitle',
          margin: [10, 4, 0, 0],
        });
        if (res.notes && !isPlain) {
          content.push({
            text: res.notes,
            style: 'itemDetail',
            margin: [10, 2, 0, 4],
          });
        }
      });
    }

    if (activities.length === 0 && dayReservations.length === 0) {
      content.push({
        text: 'No activities scheduled',
        style: 'itemDetail',
        margin: [10, 4, 0, 4],
        italics: true,
      });
    }
  });

  return content;
}
