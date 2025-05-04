// This file defines the types for the trip_shares table
// You would need to generate an updated Database type when you have access to the Supabase schema

import { Tables as ExistingTables } from './types';

// Extend the existing tables type with our new trip_shares table
export interface TripShareTables extends ExistingTables {
  trip_shares: {
    id: string;
    trip_id: string;
    shared_by_user_id: string;
    shared_with_email: string;
    created_at: string;
  };
}

// Define the trip_shares table structure
export interface TripShare {
  id: string;
  trip_id: string;
  shared_by_user_id: string;
  shared_with_email: string;
  created_at: string;
}