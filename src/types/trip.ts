
export interface DayActivity {
  id: string;
  day_id: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  cost?: number | null;  // Database type - keep as number
  currency?: string;
  order_index: number;
  created_at: string;
}

export interface TripDay {
  day_id: string;
  trip_id: string;
  date: string;
  title?: string;
  description?: string;
  image_url?: string;
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
  description?: string;
  image_url?: string;
  hotel?: string;
  hotel_details?: string;
  hotel_url?: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  cost?: number | null;  // Database type - keep as number
  currency?: string;
  expense_type?: string;
  expense_paid?: boolean;
  expense_date?: string;
  hotel_address?: string;
  hotel_phone?: string;
  hotel_place_id?: string;
  hotel_website?: string;
  order_index: number;
  created_at: string;
  final_accommodation_day?: string;
  accommodations_days?: AccommodationDay[];
}

export interface Trip {
  trip_id: string;
  user_id: string;
  destination: string;
  cover_image_url?: string;
  created_at: string;
  hidden: boolean;
  arrival_date: string;
  departure_date: string;
  accommodations?: Accommodation[];
  transportation_events?: TransportationEvent[];
}

export interface AccommodationFormData {
  stay_id?: string;
  hotel: string;
  hotel_details: string;
  hotel_url: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  cost: string | null;  // Form type - keep as string
  currency: string;
  expense_type?: string;
  expense_paid?: boolean;
  expense_date?: string;
  hotel_address?: string;
  hotel_phone?: string;
  hotel_place_id?: string;
  hotel_website?: string;
}

export interface HotelStay {
  stay_id: string;
  trip_id: string;
  hotel: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  hotel_details?: string;
  hotel_url?: string;
  cost?: number | null;  // Database type - keep as number
  currency: string;
  hotel_address?: string;
  hotel_phone?: string;
  hotel_place_id?: string;
  hotel_website?: string;
  created_at?: string;
}

export interface TransportationEvent {
  id: string;
  trip_id: string;
  type: string;
  provider?: string;
  details?: string;
  confirmation_number?: string;
  start_date: string;
  start_time?: string;
  end_time?: string;
  departure_location?: string;
  arrival_location?: string;
  cost?: number | null;  // Database type - keep as number
  currency?: string;
  is_arrival?: boolean;
  is_departure?: boolean;
  created_at: string;
}

export interface RestaurantReservation {
  id: string;
  day_id: string;
  restaurant_name: string;
  reservation_time: string;
  number_of_people: number;
  notes?: string;
  confirmation_number?: string;
  cost?: number | null;  // Database type - keep as number
  currency?: string;
  address?: string;
  phone_number?: string;
  place_id?: string;
  rating?: number;
  created_at: string;
}

export interface Currency {
  currency: string;
  currency_name: string;
  symbol: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  category: string;
  description: string;
  cost?: number | null;  // Database type - keep as number
  currency?: string | null;
  is_paid?: boolean;
  created_at?: string;
  transportation_id?: string | null;
  activity_id?: string | null;
  accommodation_id?: string | null;
  title?: string;
  date?: string;
}

export interface ActivityFormData {
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  cost: string | null;  // Form type - keep as string
  currency: string;
}

export interface ActivityData {
  title: string;  // Changed from 'text' to match other interfaces
  cost: string;  // Form type - keep as string
  currency: string;
}
