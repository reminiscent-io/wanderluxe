export type { Json } from './database';
export type { Tables, TablesInsert, TablesUpdate } from './tables';
export type { Enums } from './enums';
export type { CompositeTypes } from './composite';
export type { 
  Trip,
  TripDay,
  DayActivity,
  Profile,
  ExchangeRate,
  Accommodation,
  AccommodationDay,
  RestaurantReservation,
  Currency,
  TransportationEvent
} from './models';

// Define the core types that match the database schema
export interface Trip {
  trip_id: string;
  user_id: string;
  destination: string;
  arrival_date: string;
  departure_date: string;
  cover_image_url?: string;
  created_at: string;
  hidden: boolean;
  accommodations?: Accommodation[];
}

export interface Accommodation {
  stay_id: string;
  trip_id: string;
  title: string;
  description?: string;
  image_url?: string;
  hotel?: string;
  hotel_details?: string;
  created_at: string;
  order_index: number;
  expense_type?: string;
  expense_cost?: number;
  currency?: string;
  expense_paid: boolean;
  hotel_checkin_date?: string;
  hotel_checkout_date?: string;
  hotel_url?: string;
  final_accommodation_day?: string;
  expense_date?: string;
  hotel_address?: string;
  hotel_phone?: string;
  hotel_place_id?: string;
  hotel_website?: string;
  accommodations_days?: AccommodationDay[];
}

export interface AccommodationDay {
  id: string;
  stay_id: string;
  day_id: string;
  date: string;
  created_at: string;
  trip_days?: TripDay;
}

export interface TripDay {
  day_id: string;
  trip_id: string;
  date: string;
  title?: string;
  description?: string;
  created_at: string;
  image_url?: string;
  day_activities?: DayActivity[];
}

export interface DayActivity {
  id: string;
  day_id: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  cost?: number;
  currency: string;
  created_at: string;
  order_index: number;
}

export interface RestaurantReservation {
  id: string;
  day_id: string;
  restaurant_name: string;
  reservation_time?: string;
  number_of_people?: number;
  confirmation_number?: string;
  notes?: string;
  cost?: number;
  currency: string;
  created_at: string;
  order_index: number;
  address?: string;
  phone_number?: string;
  website?: string;
  place_id?: string;
  rating?: number;
}

export interface TransportationEvent {
  id: string;
  trip_id: string;
  type: 'flight' | 'train' | 'car_service' | 'shuttle' | 'ferry' | 'rental_car';
  provider?: string;
  details?: string;
  confirmation_number?: string;
  start_date: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  departure_location?: string;
  arrival_location?: string;
  cost?: number;
  currency: string;
  created_at: string;
  is_arrival: boolean;
  is_departure: boolean;
}

export interface Currency {
  currency: string;
  currency_name?: string;
  symbol?: string;
}

export interface ExchangeRate {
  id: string;
  currency_from: string;
  currency_to: string;
  rate: number;
  last_updated?: string;
}

export interface Profile {
  id: string;
  username?: string;
  avatar_url?: string;
  created_at: string;
  full_name?: string;
  home_location?: string;
}