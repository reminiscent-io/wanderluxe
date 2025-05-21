import { DayActivity, HotelStay, RestaurantReservation, Transportation, TripDay } from './trip';

export interface Hero {
  title: string;
  bannerUrl: string | null;
  dateRange: string;
}

export interface ItineraryItem {
  id: string;
  type: 'accommodation' | 'transportation' | 'activity' | 'dining';
  title: string;
  subtitle?: string;
  time?: string;
  meta?: Array<{
    icon?: string;
    label: string;
  }>;
  thumb?: string | null;
}

export interface ItineraryDay {
  date: string;
  title: string;
  items: ItineraryItem[];
}

export interface Itinerary {
  hero: Hero;
  days: ItineraryDay[];
}

export interface ItineraryData {
  trip: {
    destination: string;
    start_date: string;
    end_date: string;
    cover_image_url: string | null;
  };
  days: TripDay[];
  hotelStays: HotelStay[];
  transportations: Transportation[];
  reservations: Record<string, RestaurantReservation[]>;
}