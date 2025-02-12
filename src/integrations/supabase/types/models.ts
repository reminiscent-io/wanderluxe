
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
export type Currency = Tables<"currencies">

// Define the Expense type based on the database schema
export type Expense = Tables<"expenses"> & {
  title?: string;  // Optional computed field
  date?: string;   // Optional computed field
};
