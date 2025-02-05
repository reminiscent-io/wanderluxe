export interface TripDay {
  day_id: string;  // Changed from id to day_id
  trip_id: string;
  date: string;
  title?: string;
  description?: string;
  activities?: DayActivity[];
}

export interface DayActivity {
  id: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  cost?: number;
  currency?: string;
  order_index: number;
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
  currency?: string | null;  // Added to match database
  expense_cost?: number | null;
  expense_paid?: boolean | null;
  expense_type?: string | null;
  expense_date?: string | null;
  activities?: DayActivity[];
}

export interface Trip {
  trip_id: string;  // Changed from id to trip_id
  user_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  cover_image_url?: string | null;
  created_at: string;
  hidden?: boolean | null;
  arrival_date?: string | null;
  departure_date?: string | null;
}