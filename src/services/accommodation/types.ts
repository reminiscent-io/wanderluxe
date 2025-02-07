
export interface AccommodationFormData {
  stay_id?: string;
  hotel: string;
  hotel_details: string;
  hotel_url: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  expense_cost: string;
  currency: string;
  hotel_address?: string;
  hotel_phone?: string;
  hotel_place_id?: string;
  hotel_website?: string;
  expense_type?: string;
  expense_paid?: boolean;
  expense_date?: string;
}

export interface HotelStay {
  stay_id: string;
  hotel: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
}

export interface AccommodationDay {
  id: string;
  stay_id: string;
  day_id: string;
  date: string;
  created_at: string;
}
