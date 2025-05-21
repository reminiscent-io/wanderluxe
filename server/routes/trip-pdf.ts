import { Router, Request, Response } from 'express';
import { supabase } from '../../src/integrations/supabase/client';
import { generateItineraryPDF, getPDFFilename } from '../../src/services/pdfService';
import { ItineraryData } from '../../src/types/itinerary';
import { DayActivity, HotelStay, RestaurantReservation, Transportation, TripDay } from '../../src/types/trip';

const router = Router();

// Health check endpoint
router.get('/api/trip-pdf/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Trip PDF service is running' });
});

// PDF generation endpoint
router.post('/api/trip-pdf/:tripId', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { plain = false } = req.query;
    const isPlain = plain === 'true';
    
    // Get trip data
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .select('destination, start_date, end_date, cover_image_url')
      .eq('trip_id', tripId)
      .single();
      
    if (tripError || !tripData) {
      console.error('Error fetching trip:', tripError);
      return res.status(404).json({ error: 'Trip not found' });
    }
    
    // Get trip days with activities
    const { data: daysData, error: daysError } = await supabase
      .from('trip_days')
      .select(`
        day_id,
        trip_id,
        date,
        title,
        description,
        image_url,
        created_at
      `)
      .eq('trip_id', tripId)
      .order('date', { ascending: true });
      
    if (daysError) {
      console.error('Error fetching trip days:', daysError);
      return res.status(500).json({ error: 'Failed to fetch trip days' });
    }
    
    // Get activities for each day
    const dayActivities: Record<string, DayActivity[]> = {};
    
    for (const day of daysData || []) {
      const { data: activities, error: activitiesError } = await supabase
        .from('day_activities')
        .select('*')
        .eq('day_id', day.day_id);
        
      if (!activitiesError) {
        dayActivities[day.day_id] = activities as DayActivity[];
      }
    }
    
    // Attach activities to days
    const tripDays: TripDay[] = (daysData || []).map(day => ({
      ...day,
      activities: dayActivities[day.day_id] || []
    }));
    
    // Get hotel stays
    const { data: hotelStaysData, error: hotelStaysError } = await supabase
      .from('accommodations')
      .select(`
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
      `)
      .eq('trip_id', tripId);
      
    if (hotelStaysError) {
      console.error('Error fetching hotel stays:', hotelStaysError);
      return res.status(500).json({ error: 'Failed to fetch hotel stays' });
    }
    
    // Get transportations
    const { data: transportationsData, error: transportationsError } = await supabase
      .from('transportations')
      .select(`
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
      `)
      .eq('trip_id', tripId);
      
    if (transportationsError) {
      console.error('Error fetching transportations:', transportationsError);
      return res.status(500).json({ error: 'Failed to fetch transportations' });
    }
    
    // Get restaurant reservations
    const { data: reservationsData, error: reservationsError } = await supabase
      .from('restaurant_reservations')
      .select(`
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
      `)
      .eq('trip_id', tripId);
      
    if (reservationsError) {
      console.error('Error fetching reservations:', reservationsError);
      return res.status(500).json({ error: 'Failed to fetch reservations' });
    }
    
    // Organize reservations by day_id
    const reservationsByDay: Record<string, RestaurantReservation[]> = {};
    
    (reservationsData || []).forEach(reservation => {
      if (!reservationsByDay[reservation.day_id]) {
        reservationsByDay[reservation.day_id] = [];
      }
      reservationsByDay[reservation.day_id].push(reservation as RestaurantReservation);
    });
    
    // Create itinerary data
    const itineraryData: ItineraryData = {
      trip: {
        destination: tripData.destination,
        start_date: tripData.start_date,
        end_date: tripData.end_date,
        cover_image_url: tripData.cover_image_url,
      },
      days: tripDays,
      hotelStays: (hotelStaysData || []) as HotelStay[],
      transportations: (transportationsData || []) as Transportation[],
      reservations: reservationsByDay
    };
    
    // Generate PDF
    const pdfBuffer = await generateItineraryPDF(itineraryData, { plain: isPlain });
    
    // Set response headers
    const filename = getPDFFilename(tripData.destination, isPlain);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send the PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

export default router;