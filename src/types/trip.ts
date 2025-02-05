export interface TripDay {
  day_id: string;
  trip_id: string;
  date: string;
  title?: string | null;
  description?: string | null;
  activities?: DayActivity[];
  created_at: string;
  image_url?: string | null;
}

export interface DayActivity {
  id: string;
  title: string;  // Changed from text to title to match DB schema
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  cost?: number | null;
  currency?: string | null;
  order_index: number;
  day_id: string;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  trip_id: string;
  date: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  hotel?: string | null;
  hotel_details?: string | null;
  order_index: number;
  hotel_checkin_date?: string | null;
  hotel_checkout_date?: string | null;
  hotel_url?: string | null;
  currency?: string | null;  // Changed from expense_currency
  expense_cost?: number | null;
  expense_paid?: boolean | null;
  expense_type?: string | null;
  expense_date?: string | null;
  day_activities: DayActivity[];
  accommodation_group_id?: string | null;
  hotel_address?: string | null;
  hotel_phone?: string | null;
  hotel_place_id?: string | null;
  hotel_website?: string | null;
  created_at: string;
}

export interface Trip {
  trip_id: string;
  user_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  cover_image_url?: string | null;
  created_at: string;
  hidden?: boolean | null;
  arrival_date?: string | null;  // Made optional to match DB schema
  departure_date?: string | null;  // Made optional to match DB schema
  timeline_events?: TimelineEvent[];
}

export interface AccommodationFormData {
  hotel: string;
  hotelDetails: string;
  hotelUrl: string;
  checkinDate: string;
  checkoutDate: string;
  expenseCost: string;
  currency: string;  // Changed from expenseCurrency to currency
  hotelAddress?: string;
  hotelPhone?: string;
  hotelPlaceId?: string;
  hotelWebsite?: string;
}