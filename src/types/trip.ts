import { Currency } from '@/utils/currencyConstants';

// Define the form types (string-based for form handling)
export interface ActivityFormData {
  title: string;
  description?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  cost?: string | null;
  currency: Currency;
  travelers?: string[];
  location_address?: string | null;
  location_place_id?: string | null;
  location_phone?: string | null;
  location_website?: string | null;
  location_rating?: number | null;
  timezone?: string | null;
}

// Define the database types (number-based for database storage)
export interface DayActivity {
  id: string;
  day_id: string;
  trip_id: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  cost: number | null;
  currency: Currency | null;
  order_index: number;
  created_at: string;
  is_paid: boolean;
  location_address?: string | null;
  location_place_id?: string | null;
  location_phone?: string | null;
  location_website?: string | null;
  location_rating?: number | null;
  timezone?: string | null;
}

export interface TripDay {
  day_id: string;
  trip_id: string;
  date: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
  activities?: DayActivity[];
}

export interface AccommodationDay {
  id: string;
  stay_id: string;
  day_id: string;
  date: string;
  created_at: string;
  trip_days?: TripDay;
}

export interface Accommodation {
  stay_id: string;
  trip_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  hotel: string | null;
  hotel_details: string | null;
  hotel_url: string | null;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  checkin_time: string;
  checkout_time: string;  
  cost: number | null;
  currency: Currency | null;
  expense_type: string | null;
  is_paid: boolean;
  expense_date: string | null;
  hotel_address: string | null;
  hotel_phone: string | null;
  hotel_place_id: string | null;
  hotel_website: string | null;
  order_index: number;
  created_at: string;
  final_accommodation_day: string | null;
  accommodations_days?: AccommodationDay[];
}

export interface HotelStay {
  stay_id: string;
  trip_id: string;
  hotel: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  checkin_time: string;
  checkout_time: string;
  hotel_details: string | null;
  hotel_url: string | null;
  cost: number | null;
  currency: Currency | null;
  hotel_address: string | null;
  hotel_phone: string | null;
  hotel_place_id: string | null;
  hotel_website: string | null;
  created_at: string;
  timezone?: string | null;
}

export interface Transportation {
  id: string;
  trip_id: string;
  type: string;
  provider: string | null;
  details: string | null;
  confirmation_number: string | null;
  start_date: string;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  departure_location: string | null;
  arrival_location: string | null;
  cost: number | null;
  currency: Currency | null;
  is_paid: boolean;
  created_at: string;
  departure_timezone?: string | null;
  arrival_timezone?: string | null;
}

export interface RestaurantReservation {
  id: string;
  day_id: string;
  trip_id: string; // Add trip_id field for proper RLS policy evaluation in shared trips
  restaurant_name: string;
  reservation_time: string | null;
  end_time: string | null;
  number_of_people: number | null;
  notes: string | null;
  confirmation_number: string | null;
  cost: number | null;
  currency: Currency | null;
  is_paid: boolean;
  address: string | null;
  phone_number: string | null;
  place_id: string | null;
  rating: number | null;
  created_at: string;
  order_index: number;
  timezone?: string | null;
}

export interface ExpenseItem {
  id: string;
  trip_id: string;
  category: string;
  description: string;
  cost: number | null;
  currency: Currency | null;
  is_paid: boolean;
  created_at: string;
  date: string | null;
  transportation_id: string | null;
  activity_id: string | null;
  accommodation_id: string | null;
  title: string | null;
}

export interface AccommodationFormData {
  stay_id?: string;
  hotel: string;
  hotel_details: string;
  hotel_url: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  checkin_time: string;
  checkout_time: string;
  cost?: string | null;
  currency?: Currency;
  expense_type?: string;
  is_paid: boolean;
  expense_date?: string;
  hotel_address?: string;
  hotel_phone?: string;
  hotel_place_id?: string;
  hotel_website?: string;
  order_index?: number;
}

export interface Trip {
  trip_id: string;
  user_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  cover_image_url: string | null;
  created_at: string;
  hidden: boolean;
  arrival_date: string;
  departure_date: string;
  budget: number | null;
  is_public?: boolean;
  slug?: string | null;
  summary?: string | null;
  primary_destination?: string | null;
  primary_destination_place_id?: string | null;
  cover_image_position?: string | null;
  cover_image_photographer?: string | null;
  cover_image_photographer_username?: string | null;
  accommodations?: Accommodation[];
  timezone?: string | null;
}
