export type { Json } from './database';
export type { Tables, TablesInsert, TablesUpdate } from './tables';
export type { Enums } from './enums';
export type { CompositeTypes } from './composite';
export type {
  Trip,
  TripDay,
  DayActivity,
  Profile,
  ExchangeRate,
  Accommodation,
  AccommodationDay,
  RestaurantReservation,
  Currency,
  Transportation
} from './models';

// Extracts the row type from a Supabase query: `QueryRow<typeof someQueryPromise>`
// useful for typing joined `select(..., relation(...))` results.
export type QueryRow<T> =
  T extends Promise<{ data: infer D }>
    ? D extends Array<infer U>
      ? U
      : NonNullable<D>
    : never;
