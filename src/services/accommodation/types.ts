export interface AccommodationFormData {
  stay_id?: string;  // changed from id to stay_id
  hotel: string;
  hotel_details: string;  // changed from hotelDetails
  hotel_url: string;  // changed from hotelUrl
  hotel_checkin_date: string;  // changed from checkinDate
  hotel_checkout_date: string;  // changed from checkoutDate
  expense_cost: string;  // changed from expenseCost
  currency: string;  // changed from expenseCurrency
  hotel_address?: string;  // changed from hotelAddress
  hotel_phone?: string;  // changed from hotelPhone
  hotel_place_id?: string;  // changed from hotelPlaceId
  hotel_website?: string;  // changed from hotelWebsite
}

export interface HotelStay {
  stay_id: string;  // changed from id
  hotel: string;
  hotel_checkin_date: string;  // changed from hotel_checkin_date
  hotel_checkout_date: string;  // changed from hotel_checkout_date
}

export interface AccommodationDay {
  stay_id: string;  // changed from id
  accommodation_id: string;
  day_id: string;
  date: string;
  created_at: string;
}
