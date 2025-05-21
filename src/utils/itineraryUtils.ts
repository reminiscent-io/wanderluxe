import { format, parseISO } from 'date-fns';
import { DayActivity, HotelStay, RestaurantReservation, Transportation, TripDay } from '@/types/trip';
import { Hero, Itinerary, ItineraryData, ItineraryDay, ItineraryItem } from '@/types/itinerary';

// Format a date for display
export const formatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'EEEE, MMMM d, yyyy');
  } catch (error) {
    return dateString;
  }
};

// Format a time for display
export const formatTime = (timeString?: string | null): string => {
  if (!timeString) return '';
  
  try {
    // Handle different time formats
    if (timeString.includes('T')) {
      const date = parseISO(timeString);
      return format(date, 'h:mm a');
    }
    
    // Handle HH:MM format
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return format(date, 'h:mm a');
  } catch (error) {
    return timeString;
  }
};

// Create a hero section with trip title and date range
export const createHero = (data: ItineraryData): Hero => {
  const { trip } = data;
  const startDate = trip.start_date ? formatDate(trip.start_date) : '';
  const endDate = trip.end_date ? formatDate(trip.end_date) : '';
  const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : '';

  return {
    title: `${trip.destination} Trip Itinerary`,
    bannerUrl: trip.cover_image_url,
    dateRange
  };
};

// Convert hotel stay data to itinerary items
export const convertHotelStayToItems = (hotelStay: HotelStay, date: string): ItineraryItem => {
  const isCheckin = date === hotelStay.hotel_checkin_date;
  const isCheckout = date === hotelStay.hotel_checkout_date;
  
  let title = hotelStay.hotel;
  let subtitle = '';
  let time = '';
  
  if (isCheckin) {
    title = `Check-in: ${hotelStay.hotel}`;
    time = hotelStay.checkin_time;
  } else if (isCheckout) {
    title = `Check-out: ${hotelStay.hotel}`;
    time = hotelStay.checkout_time;
  } else {
    title = `Stay at ${hotelStay.hotel}`;
  }
  
  const meta = [];
  
  if (hotelStay.hotel_address) {
    meta.push({ label: hotelStay.hotel_address });
  }
  
  if (hotelStay.cost !== null && hotelStay.currency) {
    meta.push({ label: `${hotelStay.currency} ${hotelStay.cost}` });
  }
  
  return {
    id: hotelStay.stay_id,
    type: 'accommodation',
    title,
    subtitle: hotelStay.hotel_details || undefined,
    time: formatTime(time),
    meta,
    thumb: null // No specific thumbnail for hotel stays in current data model
  };
};

// Convert transportation data to itinerary items
export const convertTransportationToItems = (transportation: Transportation, date: string): ItineraryItem | null => {
  // Only include transportation for its start date
  if (transportation.start_date !== date) {
    return null;
  }
  
  const meta = [];
  
  if (transportation.departure_location) {
    meta.push({ label: `From: ${transportation.departure_location}` });
  }
  
  if (transportation.arrival_location) {
    meta.push({ label: `To: ${transportation.arrival_location}` });
  }
  
  if (transportation.provider) {
    meta.push({ label: `Provider: ${transportation.provider}` });
  }
  
  if (transportation.confirmation_number) {
    meta.push({ label: `Confirmation: ${transportation.confirmation_number}` });
  }
  
  if (transportation.cost !== null && transportation.currency) {
    meta.push({ label: `${transportation.currency} ${transportation.cost}` });
  }
  
  const title = transportation.type === 'flight' 
    ? `Flight${transportation.provider ? ': ' + transportation.provider : ''}`
    : transportation.type.charAt(0).toUpperCase() + transportation.type.slice(1);
  
  return {
    id: transportation.id,
    type: 'transportation',
    title,
    subtitle: transportation.details || undefined,
    time: formatTime(transportation.start_time),
    meta,
    thumb: null
  };
};

// Convert activity data to itinerary items
export const convertActivityToItems = (activity: DayActivity): ItineraryItem => {
  const meta = [];
  
  if (activity.cost !== null && activity.currency) {
    meta.push({ label: `${activity.currency} ${activity.cost}` });
  }
  
  return {
    id: activity.id,
    type: 'activity',
    title: activity.title,
    subtitle: activity.description,
    time: activity.start_time ? formatTime(activity.start_time) : undefined,
    meta,
    thumb: null
  };
};

// Convert reservation data to itinerary items
export const convertReservationToItems = (reservation: RestaurantReservation): ItineraryItem => {
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
  
  return {
    id: reservation.id,
    type: 'dining',
    title: `Dining: ${reservation.restaurant_name}`,
    subtitle: reservation.notes || undefined,
    time: reservation.reservation_time ? formatTime(reservation.reservation_time) : undefined,
    meta,
    thumb: null
  };
};

// Create an itinerary day from various data sources
export const createItineraryDay = (
  day: TripDay,
  hotelStays: HotelStay[],
  transportations: Transportation[],
  reservations: RestaurantReservation[]
): ItineraryDay => {
  const items: ItineraryItem[] = [];
  const date = day.date.split('T')[0];
  
  // Add hotel stays
  hotelStays.forEach(stay => {
    const stayDate = date;
    const checkinDate = stay.hotel_checkin_date.split('T')[0];
    const checkoutDate = stay.hotel_checkout_date.split('T')[0];
    
    if (stayDate === checkinDate || stayDate === checkoutDate) {
      items.push(convertHotelStayToItems(stay, date));
    }
  });
  
  // Add transportations for this day
  transportations.forEach(transport => {
    const transportItem = convertTransportationToItems(transport, date);
    if (transportItem) {
      items.push(transportItem);
    }
  });
  
  // Add activities
  if (day.activities && day.activities.length > 0) {
    day.activities.forEach(activity => {
      items.push(convertActivityToItems(activity));
    });
  }
  
  // Add reservations
  reservations.forEach(reservation => {
    items.push(convertReservationToItems(reservation));
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
};

// Convert trip data to itinerary format
export const tripDataToItinerary = (data: ItineraryData): Itinerary => {
  const { days, hotelStays, transportations, reservations } = data;
  
  // Sort days by date
  const sortedDays = [...days].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Create itinerary days
  const itineraryDays = sortedDays.map(day => {
    // Get reservations for this day
    const dayReservations = reservations[day.day_id] || [];
    
    return createItineraryDay(
      day,
      hotelStays,
      transportations,
      dayReservations
    );
  });
  
  return {
    hero: createHero(data),
    days: itineraryDays
  };
};