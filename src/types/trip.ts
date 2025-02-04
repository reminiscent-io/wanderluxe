export interface TripDay {
  id: string;
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
  activities?: any[];
}