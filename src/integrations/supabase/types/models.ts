import { Database } from './database';

export type TransportationEvent = Database['public']['Tables']['transportation_events']['Row'];
export type Trip = Database['public']['Tables']['trips']['Row'];
export type TripDay = Database['public']['Tables']['trip_days']['Row'];
export type TimelineEvent = Database['public']['Tables']['timeline_events']['Row'];
export type Activity = Database['public']['Tables']['activities']['Row'];
export type DayActivity = Database['public']['Tables']['day_activities']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ExchangeRate = Database['public']['Tables']['exchange_rates']['Row'];