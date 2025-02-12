import { Tables } from './tables';

// Export specific table types that are commonly used
export type TransportationEvent = Tables<"transportation_events">
export type Trip = Tables<"trips">
export type TripDay = Tables<"trip_days">
export type DayActivity = Tables<"day_activities">
export type Profile = Tables<"profiles">
export type ExchangeRate = Tables<"exchange_rates">
export type Accommodation = Tables<"accommodations">
export type AccommodationDay = Tables<"accommodations_days">
export type RestaurantReservation = Tables<"restaurant_reservations">
export type Currency = Tables<"currencies">;
export type Expense = {
  category: 'reservations' | 'activities' | 'transportation';
  id: string;
  title: string;
  cost: number;
  currency: string;
  date: string;
  day_id?: string;
  trip_id: string;
}
