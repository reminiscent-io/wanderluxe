// /src/services/travelers.ts
import { supabase } from "@/integrations/supabase/client";

// Helper function to add owner to trip_shares when trip is created
export async function addOwnerToTripShares(tripId: string, userId: string) {
  // Temporarily disabled until database tables are created
  console.log('Traveler system temporarily disabled - tables need to be created');
}

export async function listTravelers(tripId: string) {
  // Return empty array until tables are created
  return { data: [], error: null };
}

export async function upsertTraveler(tripId: string, payload: {
  id?: string;
  first_name: string;
  last_name?: string;
  shared_with_email?: string;
  permission_level?: "edit" | "read";
}) {
  // Return empty result until tables are created
  return { data: null, error: null };
}

export async function deleteTraveler(id: string) {
  // Return empty result until tables are created
  return { data: null, error: null };
}

// Accommodation travelers
export async function getAccommodationTravelerIds(tripId: string, stayId: string) {
  return { data: [], error: null };
}

export async function setAccommodationTravelers(tripId: string, stayId: string, travelerIds: string[]) {
  return { data: [], error: null };
}

// Transportation travelers
export async function getTransportationTravelerIds(tripId: string, transportationId: string) {
  return { data: [], error: null };
}

export async function setTransportationTravelers(tripId: string, transportationId: string, travelerIds: string[]) {
  return { data: [], error: null };
}

// Day activity travelers
export async function getDayActivityTravelerIds(tripId: string, activityId: string) {
  return { data: [], error: null };
}

export async function setDayActivityTravelers(tripId: string, activityId: string, travelerIds: string[]) {
  return { data: [], error: null };
}

// Reservation travelers
export async function getReservationTravelerIds(tripId: string, reservationId: string) {
  return { data: [], error: null };
}

export async function setReservationTravelers(tripId: string, reservationId: string, travelerIds: string[]) {
  return { data: [], error: null };
}