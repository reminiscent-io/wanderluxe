import { Tables } from './tables';

// Export specific table types that are commonly used
export type TransportationEvent = Tables<"transportation_events">;
export type Trip = Tables<"trips">;
export type TripDay = Tables<"trip_days">;
export type TimelineEvent = Tables<"timeline_events">;
export type Activity = Tables<"activities">;
export type DayActivity = Tables<"day_activities">;
export type Profile = Tables<"profiles">;
export type ExchangeRate = Tables<"exchange_rates">;