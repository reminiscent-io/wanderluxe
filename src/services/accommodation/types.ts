export interface AccommodationFormData {
  id?: string;
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

export interface HotelStay {
  id: string;
  hotel: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
}

export interface AccommodationDay {
  id: string;
  accommodation_id: string;
  day_id: string;
  date: string;
  created_at: string;
}