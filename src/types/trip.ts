export interface DayActivity {
  id: string;
  day_id: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  cost?: number;
  currency?: string;
  order_index: number;
}

export interface TripDay {
  day_id: string;
  trip_id: string;
  date: string;
  title?: string;
  description?: string;
  image_url?: string;
  day_activities: DayActivity[];
}

export interface Accommodation {
  id: string;
  trip_id: string;
  title: string;
  description?: string;
  image_url?: string;
  hotel?: string;
  hotel_details?: string;
  hotel_url?: string;
  hotel_checkin_date?: string;
  hotel_checkout_date?: string;
  expense_cost?: number;
  expense_currency?: string;
  expense_type?: string;
  expense_paid?: boolean;
  expense_date?: string;
  hotel_address?: string;
  hotel_phone?: string;
  hotel_place_id?: string;
  hotel_website?: string;
  stay_id?: string;
  day_id: string;
  day: TripDay;
}

export interface Trip {
  trip_id: string;
  user_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  cover_image_url?: string;
  created_at: string;
  hidden: boolean;
  arrival_date: string;
  departure_date: string;
  accommodations: Accommodation[];
}

export interface AccommodationFormData {
  hotel: string;
  hotelDetails: string;
  hotelUrl: string;
  checkinDate: string;
  checkoutDate: string;
  expenseCost: string;
  expenseCurrency: string;
  hotelAddress?: string;
  hotelPhone?: string;
  hotelPlaceId?: string;
  hotelWebsite?: string;
}