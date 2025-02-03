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

export interface HotelStay {
  hotel: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
}