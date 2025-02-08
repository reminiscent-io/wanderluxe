
// types.ts (Accommodation types)
export interface AccommodationFormData {
  expense_cost: string | null;
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
}

export interface HotelStay extends AccommodationFormData {
  stay_id: string;
  trip_id: string;
  created_at?: string;
}

export interface AccommodationDay {
  id: string;
  stay_id: string;
  day_id: string;
  date: string;
  created_at: string;
}
