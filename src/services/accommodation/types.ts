
// types.ts (Accommodation types)
export interface AccommodationFormData {
  stay_id?: string;
  trip_id?: string;
  expense_cost: number | null;  // Changed from string | null to match database
  hotel: string;
  hotel_details: string;
  hotel_url?: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  currency: string;
  hotel_address?: string;
  hotel_phone?: string;
  hotel_place_id?: string;
  hotel_website?: string;
  expense_type?: string;
  expense_paid?: boolean;
  expense_date?: string;
  order_index?: number;
}

// HotelStay represents the data as stored in the database
export interface HotelStay {
  stay_id: string;
  trip_id: string;
  hotel: string;
  hotel_details: string;
  hotel_url?: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  expense_cost: number | null;  // Made non-optional but nullable to match DB
  currency: string;
  hotel_address?: string;
  hotel_phone?: string;
  hotel_place_id?: string;
  hotel_website?: string;
  created_at?: string;
}

export interface AccommodationDay {
  id: string;
  stay_id: string;
  day_id: string;
  date: string;
  created_at: string;
}

// Activity interfaces
export interface ActivityFormData {
  title: string;
  description: string;  // Made required to match usage
  start_time: string;
  end_time: string;
  cost: string;
  currency: string;
}

// RestaurantData interface to fix type mismatches
export interface RestaurantData {
  id: string;
  day_id: string;
  restaurant_name: string;
  reservation_time?: string;
  number_of_people?: number;
  confirmation_number?: string;
  notes?: string;
  cost?: number;
  currency?: string;
  address?: string;
  phone_number?: string;
  website?: string;
  rating?: number;
  created_at: string;
  order_index: number;
}
