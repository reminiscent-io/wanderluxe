
export interface AccommodationFormData {
  stay_id?: string;
  hotel: string;
  hotel_details: string;
  hotel_url: string;  // Changed from optional to required to match types/trip
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  cost: string | null;  // Changed to string for form handling
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

export interface HotelStay {
  stay_id: string;
  hotel: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  cost: string | null;  // Changed to string for UI consistency
  currency: string;
  hotel_address?: string;
  hotel_phone?: string;
  hotel_place_id?: string;
  hotel_website?: string;
  hotel_details?: string;
  hotel_url?: string;
  created_at?: string;
}
