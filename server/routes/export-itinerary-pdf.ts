import { Router, Request, Response } from 'express';
import { generateItineraryPDF, getPDFFilename } from '../../src/services/html-pdf-export';
import { supabase } from '../supabase';

const router = Router();

router.post('/api/export-itinerary-pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tripId, options } = req.body;

    if (!tripId) {
      res.status(400).json({ error: 'Missing tripId' });
      return;
    }

    // Fetch the trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('destination, start_date, end_date, cover_image_url')
      .eq('trip_id', tripId)
      .single();

    if (tripError || !trip) {
      console.error('Trip not found:', tripError);
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    // Fetch trip days
    const { data: tripDays, error: daysError } = await supabase
      .from('trip_days')
      .select('day_id, trip_id, date, title, description, image_url, created_at')
      .eq('trip_id', tripId)
      .order('date', { ascending: true });

    if (daysError) {
      console.error('Failed to fetch trip days:', daysError);
      res.status(500).json({ error: 'Failed to fetch trip days' });
      return;
    }

    const dayIds = tripDays?.map(d => d.day_id) || [];

    // Fetch related data in parallel
    const [activitiesResult, hotelStaysResult, transportationsResult, reservationsResult] = 
      await Promise.all([
        supabase
          .from('day_activities')
          .select('*')
          .in('day_id', dayIds),
        supabase
          .from('accommodations')
          .select('*')
          .eq('trip_id', tripId),
        supabase
          .from('transportation')
          .select('*')
          .eq('trip_id', tripId),
        supabase
          .from('restaurant_reservations')
          .select('*')
          .eq('trip_id', tripId),
      ]);

    // Attach activities to days
    const activitiesByDay: Record<string, any[]> = {};
    (activitiesResult.data || []).forEach(activity => {
      if (!activitiesByDay[activity.day_id]) {
        activitiesByDay[activity.day_id] = [];
      }
      activitiesByDay[activity.day_id].push(activity);
    });

    const days = (tripDays || []).map(day => ({
      ...day,
      activities: activitiesByDay[day.day_id] || [],
    }));

    // Group reservations by day_id
    const reservationsByDay: Record<string, any[]> = {};
    (reservationsResult.data || []).forEach(reservation => {
      if (!reservationsByDay[reservation.day_id]) {
        reservationsByDay[reservation.day_id] = [];
      }
      reservationsByDay[reservation.day_id].push(reservation);
    });

    const itineraryData = {
      trip,
      days,
      hotelStays: hotelStaysResult.data || [],
      transportations: transportationsResult.data || [],
      reservations: reservationsByDay,
    };

    const pdf = await generateItineraryPDF(itineraryData, options);
    const filename = getPDFFilename(
      trip.destination || 'itinerary',
      { simple: options?.detailLevel !== 'full' }
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    });

    res.send(pdf);
  } catch (e: any) {
    console.error('Export itinerary PDF failed:', e?.message, e?.stack);
    res.status(500).json({
      error: 'PDF generation failed',
      detail: e?.message || 'unknown error',
    });
  }
});

export default router;
