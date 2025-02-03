import { ActivityTables } from './activity';
import { TripTables } from './trip';
import { TransportationTables } from './transportation';
import { ProfileTables } from './profile';
import { TimelineTables } from './timeline';
import { ExchangeTables } from './exchange';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: ActivityTables & 
            TripTables & 
            TransportationTables & 
            ProfileTables & 
            TimelineTables & 
            ExchangeTables;
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      transportation_type:
        | "flight"
        | "train"
        | "car_service"
        | "shuttle"
        | "ferry"
        | "rental_car";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export * from './activity';
export * from './trip';
export * from './transportation';
export * from './profile';
export * from './timeline';
export * from './exchange';