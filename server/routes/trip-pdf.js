import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';

// Create a supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const router = Router();

// HTML template for itinerary
const itineraryTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trip Itinerary</title>
  <style>
    :root {
      --bg-sand-50: #faf7f4;
      --bg-sand-100: #f2ede6;
      --border-sand-100: #e9e2d8;
      --border-sand-200: #d6ccbd;
      --bg-earth-100: #e6dfd0;
      --text-foreground: #333333;
      --text-muted: #6b6b6b;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
      color: var(--text-foreground);
      background-color: white;
      line-height: 1.5;
      padding: 0;
      margin: 0;
    }
    
    .h1 {
      font-size: 2.25rem;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 0.5rem;
    }
    
    .h2 {
      font-size: 1.75rem;
      font-weight: 600;
      line-height: 1.3;
      margin-bottom: 0.5rem;
    }
    
    .h3 {
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.4;
    }
    
    .small {
      font-size: 0.875rem;
    }
    
    .muted {
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    
    .break-inside-avoid-page {
      break-inside: avoid-page;
    }
    
    .hero {
      padding: 2rem 1.5rem;
      margin-bottom: 2rem;
      background-color: var(--bg-sand-50);
    }
    
    .banner {
      width: 100%;
      height: 10rem;
      object-fit: cover;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
    }
    
    .day {
      position: relative;
      margin-top: 2.5rem;
      padding: 0 1.5rem;
      break-inside: avoid-page;
    }
    
    .timeline-container {
      display: grid;
      grid-template-columns: 25% 1fr;
      gap: 0.5rem;
      position: relative;
    }
    
    .timeline-rail {
      position: absolute;
      left: 25%;
      transform: translateX(-50%);
      top: 0;
      bottom: 0;
      width: 2px;
      background-color: var(--border-sand-200);
    }
    
    .item {
      position: relative;
      grid-column: span 2;
      display: flex;
      gap: 1rem;
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: 0.75rem;
      background-color: var(--bg-sand-50);
      border: 1px solid var(--border-sand-100);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
      break-inside: avoid-page;
    }
    
    .time {
      position: absolute;
      left: 0;
      transform: translateX(-110%);
      width: 20%;
      text-align: right;
    }
    
    .content {
      flex: 1;
    }
    
    .meta-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
      list-style: none;
    }
    
    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    
    .thumb {
      width: 6rem;
      height: 6rem;
      object-fit: cover;
      border-radius: 0.5rem;
      margin-left: auto;
    }
    
    @media print {
      .print-hidden {
        display: none !important;
      }
      
      .page-break {
        break-after: page;
      }
    }
  </style>
</head>
<body>
  <header class="hero">
    {{#if hero.bannerUrl}}
    <img src="{{hero.bannerUrl}}" alt="" class="banner print-hidden">
    {{/if}}
    <h1 class="h1">{{hero.title}}</h1>
    <p class="muted">{{hero.dateRange}}</p>
  </header>

  {{#each days}}
  <section class="day break-inside-avoid-page">
    <h2 class="h2">{{date}}</h2>
    
    <div class="timeline-container">
      <div class="timeline-rail"></div>
      
      {{#each items}}
      <article class="item">
        {{#if time}}
        <span class="time small muted">{{time}}</span>
        {{/if}}
        
        <div class="content">
          <h3 class="h3">{{title}}</h3>
          {{#if subtitle}}
          <p class="muted">{{subtitle}}</p>
          {{/if}}
          
          {{#if meta.length}}
          <ul class="meta-list small">
            {{#each meta}}
            <li class="meta-item">
              {{#if icon}}
              <span class="icon">{{icon}}</span>
              {{/if}}
              <span>{{label}}</span>
            </li>
            {{/each}}
          </ul>
          {{/if}}
        </div>
        
        {{#if thumb}}
        <img src="{{thumb}}" alt="" class="thumb print-hidden">
        {{/if}}
      </article>
      {{/each}}
    </div>
  </section>
  {{/each}}
</body>
</html>
`;

// Compile the template
const template = Handlebars.compile(itineraryTemplate);

// Helper functions for data formatting
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch (error) {
    return dateString;
  }
};

const formatTime = (timeString) => {
  if (!timeString) return '';
  
  try {
    // Handle different time formats
    if (timeString.includes('T')) {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    
    // Handle HH:MM format
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch (error) {
    return timeString;
  }
};

// Health check endpoint
router.get('/api/trip-pdf/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Trip PDF service is running' });
});

// PDF generation endpoint
router.post('/api/trip-pdf/:tripId', async (req, res) => {
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
    
    // Get trip days
    const { data: daysData, error: daysError } = await supabase
      .from('trip_days')
      .select('day_id, trip_id, date, title, description, image_url, created_at')
      .eq('trip_id', tripId)
      .order('date', { ascending: true });
      
    if (daysError) {
      console.error('Error fetching trip days:', daysError);
      return res.status(500).json({ error: 'Failed to fetch trip days' });
    }
    
    // Get activities for each day
    const dayActivities = {};
    
    for (const day of daysData || []) {
      const { data: activities, error: activitiesError } = await supabase
        .from('day_activities')
        .select('*')
        .eq('day_id', day.day_id);
        
      if (!activitiesError) {
        dayActivities[day.day_id] = activities || [];
      }
    }
    
    // Attach activities to days
    const tripDays = (daysData || []).map(day => ({
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
    const reservationsByDay = {};
    
    (reservationsData || []).forEach(reservation => {
      if (!reservationsByDay[reservation.day_id]) {
        reservationsByDay[reservation.day_id] = [];
      }
      reservationsByDay[reservation.day_id].push(reservation);
    });
    
    // Process data for the itinerary template
    const processedDays = tripDays.map(day => {
      const dayDate = day.date;
      const items = [];
      
      // Add hotel stays for this day
      (hotelStaysData || []).forEach(stay => {
        if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return;
        
        const stayDate = dayDate.split('T')[0];
        const checkinDate = stay.hotel_checkin_date.split('T')[0];
        const checkoutDate = stay.hotel_checkout_date.split('T')[0];
        
        if (stayDate === checkinDate || stayDate === checkoutDate) {
          let title = stay.hotel;
          let time = '';
          
          if (stayDate === checkinDate) {
            title = `Check-in: ${stay.hotel}`;
            time = stay.checkin_time;
          } else if (stayDate === checkoutDate) {
            title = `Check-out: ${stay.hotel}`;
            time = stay.checkout_time;
          }
          
          const meta = [];
          
          if (stay.hotel_address) {
            meta.push({ label: stay.hotel_address });
          }
          
          if (stay.cost !== null && stay.currency) {
            meta.push({ label: `${stay.currency} ${stay.cost}` });
          }
          
          items.push({
            id: stay.stay_id,
            type: 'accommodation',
            title,
            subtitle: stay.hotel_details || undefined,
            time: formatTime(time),
            meta,
            thumb: null
          });
        }
      });
      
      // Add transportation for this day
      (transportationsData || []).forEach(transport => {
        if (transport.start_date !== dayDate && transport.start_date !== dayDate.split('T')[0]) return;
        
        const meta = [];
        
        if (transport.departure_location) {
          meta.push({ label: `From: ${transport.departure_location}` });
        }
        
        if (transport.arrival_location) {
          meta.push({ label: `To: ${transport.arrival_location}` });
        }
        
        if (transport.provider) {
          meta.push({ label: `Provider: ${transport.provider}` });
        }
        
        if (transport.confirmation_number) {
          meta.push({ label: `Confirmation: ${transport.confirmation_number}` });
        }
        
        if (transport.cost !== null && transport.currency) {
          meta.push({ label: `${transport.currency} ${transport.cost}` });
        }
        
        const title = transport.type === 'flight' 
          ? `Flight${transport.provider ? ': ' + transport.provider : ''}`
          : transport.type.charAt(0).toUpperCase() + transport.type.slice(1);
        
        items.push({
          id: transport.id,
          type: 'transportation',
          title,
          subtitle: transport.details || undefined,
          time: formatTime(transport.start_time),
          meta,
          thumb: null
        });
      });
      
      // Add activities for this day
      (day.activities || []).forEach(activity => {
        const meta = [];
        
        if (activity.cost !== null && activity.currency) {
          meta.push({ label: `${activity.currency} ${activity.cost}` });
        }
        
        items.push({
          id: activity.id,
          type: 'activity',
          title: activity.title,
          subtitle: activity.description,
          time: activity.start_time ? formatTime(activity.start_time) : undefined,
          meta,
          thumb: null
        });
      });
      
      // Add reservations for this day
      (reservationsByDay[day.day_id] || []).forEach(reservation => {
        const meta = [];
        
        if (reservation.number_of_people) {
          meta.push({ label: `${reservation.number_of_people} ${reservation.number_of_people === 1 ? 'person' : 'people'}` });
        }
        
        if (reservation.address) {
          meta.push({ label: reservation.address });
        }
        
        if (reservation.phone_number) {
          meta.push({ label: reservation.phone_number });
        }
        
        if (reservation.confirmation_number) {
          meta.push({ label: `Confirmation: ${reservation.confirmation_number}` });
        }
        
        if (reservation.cost !== null && reservation.currency) {
          meta.push({ label: `${reservation.currency} ${reservation.cost}` });
        }
        
        items.push({
          id: reservation.id,
          type: 'dining',
          title: `Dining: ${reservation.restaurant_name}`,
          subtitle: reservation.notes || undefined,
          time: reservation.reservation_time ? formatTime(reservation.reservation_time) : undefined,
          meta,
          thumb: null
        });
      });
      
      // Sort items by time
      const sortedItems = items.sort((a, b) => {
        // Items without time go to the end
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        
        // Sort by time
        return a.time.localeCompare(b.time);
      });
      
      return {
        date: formatDate(day.date),
        title: day.title || `Day ${day.day_id}`,
        items: sortedItems
      };
    });
    
    // Create the itinerary object
    const startDate = tripData.start_date ? formatDate(tripData.start_date) : '';
    const endDate = tripData.end_date ? formatDate(tripData.end_date) : '';
    const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : '';
    
    const itinerary = {
      hero: {
        title: `${tripData.destination} Trip Itinerary`,
        bannerUrl: tripData.cover_image_url,
        dateRange
      },
      days: processedDays
    };
    
    // Render HTML with the data
    const renderedHtml = template(itinerary);
    
    // Launch a headless browser
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set viewport to A4 size at 96 DPI
    await page.setViewport({ width: 794, height: 1123 });
    
    // Set content
    await page.setContent(renderedHtml, { waitUntil: 'networkidle0' });
    
    // Add style to hide images for plain PDF
    if (isPlain) {
      await page.addStyleTag({ content: '.print-hidden{display:none!important}' });
    }
    
    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
      printBackground: true
    });
    
    // Close the browser
    await browser.close();
    
    // Get a unique filename for the PDF
    const prefix = isPlain ? 'plain' : 'visual';
    const safeName = tripData.destination.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14);
    const filename = `${prefix}-${safeName}-itinerary-${timestamp}.pdf`;
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length);
    
    // Send the PDF
    res.send(pdf);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

export default router;