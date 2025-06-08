import { Router, Request, Response } from 'express';
import { supabase } from '../../src/integrations/supabase/client';
import { generateItineraryPDF, getPDFFilename } from '../../src/services/pdfService';

import {
  ItineraryData,
  TripDay,
  DayActivity,
  HotelStay,
  Transportation,
  RestaurantReservation,
} from '../../src/types/trip';

const router = Router();

/* ---------- shared helpers ---------- */

type SupabaseQuery<T> =
  | ReturnType<typeof supabase['from']>['select'] extends (
      ...args: any[]
    ) => Promise<{ data: T; error: any }>
    ? ReturnType<ReturnType<typeof supabase['from']>['select']>
    : never;

/** Runs a Supabase query and either returns data or throws an Http-style error. */
async function fetchOrThrow<T>(
  query: SupabaseQuery<T>,
  errorStatus: number,
  errorMsg: string,
): Promise<T> {
  const { data, error } = await query;
  if (error || data == null) {
    throw { status: errorStatus, message: errorMsg, details: error };
  }
  return data;
}

/* ---------- routes ---------- */

// Health check
router.get('/api/trip-pdf/health', (_req: Request, res: Response) =>
  res.status(200).json({ status: 'ok', message: 'Trip PDF service is running' }),
);

// Generate a full / plain PDF
router.post('/api/trip-pdf/:tripId', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const isPlain = req.query.plain === 'true';

    /* --- 1. fetch base trip + ordered trip days --- */

    const trip = await fetchOrThrow(
      supabase
        .from('trips')
        .select(
          'destination, start_date, end_date, cover_image_url',
        )
        .eq('trip_id', tripId)
        .single(),
      404,
      'Trip not found',
    );

    const days = await fetchOrThrow<TripDay[]>(
      supabase
        .from('trip_days')
        .select(
          `
            day_id,
            trip_id,
            date,
            title,
            description,
            image_url,
            created_at
          `,
        )
        .eq('trip_id', tripId)
        .order('date', { ascending: true }),
      500,
      'Failed to fetch trip days',
    );

    /* --- 2. fetch the rest in parallel --- */

    const [activities, hotelStays, transportations, reservations] =
      await Promise.all([
        fetchOrThrow<DayActivity[]>(
          supabase
            .from('day_activities')
            .select('*')
            .in(
              'day_id',
              days.map((d) => d.day_id),
            ),
          500,
          'Failed to fetch day activities',
        ),
        fetchOrThrow<HotelStay[]>(
          supabase
            .from('accommodations')
            .select(
              `
                stay_id,
                trip_id,
                hotel,
                hotel_details,
                hotel_url,
                hotel_checkin_date,
                hotel_checkout_date,
                checkin_time,
                checkout_time,
                cost,
                currency,
                hotel_address,
                hotel_phone,
                hotel_place_id,
                hotel_website,
                created_at
              `,
            )
            .eq('trip_id', tripId),
          500,
          'Failed to fetch hotel stays',
        ),
        fetchOrThrow<Transportation[]>(
          supabase
            .from('transportations')
            .select(
              `
                id,
                trip_id,
                type,
                provider,
                details,
                confirmation_number,
                start_date,
                start_time,
                end_date,
                end_time,
                departure_location,
                arrival_location,
                cost,
                currency,
                is_paid,
                created_at
              `,
            )
            .eq('trip_id', tripId),
          500,
          'Failed to fetch transportations',
        ),
        fetchOrThrow<RestaurantReservation[]>(
          supabase
            .from('restaurant_reservations')
            .select(
              `
                id,
                day_id,
                trip_id,
                restaurant_name,
                reservation_time,
                number_of_people,
                notes,
                confirmation_number,
                cost,
                currency,
                is_paid,
                address,
                phone_number,
                place_id,
                rating,
                created_at,
                order_index
              `,
            )
            .eq('trip_id', tripId),
          500,
          'Failed to fetch restaurant reservations',
        ),
      ]);

    /* --- 3. shape the per-day maps --- */

    const activitiesByDay = activities.reduce<Record<string, DayActivity[]>>(
      (acc, a) => {
        (acc[a.day_id] ??= []).push(a);
        return acc;
      },
      {},
    );

    const reservationsByDay =
      reservations.reduce<Record<string, RestaurantReservation[]>>((acc, r) => {
        (acc[r.day_id] ??= []).push(r);
        return acc;
      }, {});

    const tripDays: TripDay[] = days.map((day) => ({
      ...day,
      activities: activitiesByDay[day.day_id] ?? [],
    }));

    /* --- 4. compose itinerary and generate PDF --- */

    const itineraryData: ItineraryData = {
      trip,
      days: tripDays,
      hotelStays,
      transportations,
      reservations: reservationsByDay,
    };

    const pdfBuffer = await generateItineraryPDF(itineraryData, { plain: isPlain });

    /* --- 5. return the PDF stream --- */

    const filename = getPDFFilename(trip.destination, isPlain);
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
      })
      .send(pdfBuffer);
  } catch (err: any) {
    // Centralised error handler
    const status = err?.status ?? 500;
    const message = err?.message ?? 'Failed to generate PDF';
    if (process.env.NODE_ENV !== 'production') console.error(err);
    res.status(status).json({ error: message });
  }
});

export default router;
