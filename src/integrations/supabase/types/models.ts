
import { Tables } from './tables';

// Export specific table types that are commonly used
export type Transportation = Tables<"transportation">
export type Trip = Tables<"trips">
export type TripDay = Tables<"trip_days">
export type DayActivity = Tables<"day_activities">
export type Profile = Tables<"profiles">
export type ExchangeRate = Tables<"exchange_rates">
export type Accommodation = Tables<"accommodations">
export type AccommodationDay = Tables<"accommodations_days">
export type RestaurantReservation = Tables<"restaurant_reservations">
export type Currency = Tables<"currencies">

// Define the Expense type based on the database schema
export interface Expense {
  id: string;
  trip_id: string;
  category: string;
  description: string;
  cost?: number | null;
  currency?: string | null;
  is_paid?: boolean;
  created_at?: string;
  transportation_id?: string | null;
  activity_id?: string | null;
  accommodation_id?: string | null;
  title?: string;  // Optional computed field
  date?: string;   // Optional computed field
}
