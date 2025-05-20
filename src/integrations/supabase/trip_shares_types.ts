/**
 * Type definitions for trip sharing functionality
 */

export interface TripShare {
  id: string;
  trip_id: string;
  shared_by_user_id: string;
  shared_with_email: string;
  created_at: string;
}

export interface SharedTripWithDetails extends TripShare {
  trips?: {
    trip_id: string;
    user_id: string;
    destination: string;
    start_date: string;
    end_date: string;
    cover_image_url: string | null;
    created_at: string;
    hidden: boolean;
    arrival_date: string | null;
    departure_date: string | null;
  };
  owner_name?: string;
  owner_email?: string;
}