export interface TripDay {
  day_id: string;
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
  currency?: string | null;
  expense_cost?: number | null;
  expense_paid?: boolean | null;
  expense_type?: string | null;
  expense_date?: string | null;
  activities?: DayActivity[];
  accommodation_group_id?: string | null;
  hotel_address?: string | null;
  hotel_phone?: string | null;
  hotel_place_id?: string | null;
  hotel_website?: string | null;
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
  arrival_date?: string | null;
  departure_date?: string | null;
  timeline_events?: { date: string }[];
}

export interface AccommodationFormData {
  hotel: string;
  hotelDetails: string;
  hotelUrl: string;
  checkinDate: string;
  checkoutDate: string;
  expenseCost: string | number;
  expenseCurrency: string;
  hotelAddress?: string;
  hotelPhone?: string;
  hotelPlaceId?: string;
  hotelWebsite?: string;
}