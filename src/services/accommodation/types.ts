
// types.ts (Accommodation types)
export interface AccommodationFormData {
  stay_id?: string;
  trip_id?: string;
  expense_cost: string;  // Keep as string for form input
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
  expense_cost: number | null;  // Database stores as number
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
  description: string;
  start_time: string;
  end_time: string;
  cost: string;
  currency: string;
}

// DayActivity represents the database model
export interface DayActivity {
  id: string;
  day_id: string;
  title: string;
  description: string;
  start_time?: string;
  end_time?: string;
  cost?: number;
  currency: string;
  order_index: number;
  created_at: string;
}

// RestaurantData interface
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

// Simple restaurant data for display
export interface SimpleRestaurantData {
  id: string;
  restaurant: string;
  time: string;
}

// Timeline event interface
export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  activities: DayActivity[];
  image_url?: string;
}
