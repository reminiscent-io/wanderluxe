// /src/services/travelers.ts
import { supabase } from "@/integrations/supabase/client";

export async function listTravelers(tripId: string) {
  return supabase
    .from("trip_shares")
    .select("id, first_name, last_name, shared_with_email, permission_level, created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });
}

export async function upsertTraveler(tripId: string, payload: {
  id?: string;
  first_name: string;
  last_name?: string;
  shared_with_email?: string;
  permission_level?: "edit" | "read";
}) {
  const row = { trip_id: tripId, ...payload };
  return supabase.from("trip_shares").upsert(row).select().single();
}

export async function deleteTraveler(id: string) {
  return supabase.from("trip_shares").delete().eq("id", id);
}

// Accommodation travelers
export async function getAccommodationTravelerIds(tripId: string, stayId: string) {
  const { data, error } = await supabase
    .from("accommodation_travelers")
    .select("traveler_id")
    .match({ trip_id: tripId, stay_id: stayId });
  
  if (error) return { data: [], error };
  return { data: data?.map(row => row.traveler_id) || [], error: null };
}

export async function setAccommodationTravelers(tripId: string, stayId: string, travelerIds: string[]) {
  // replace strategy: delete then bulk insert
  await supabase.from("accommodation_travelers").delete().match({ trip_id: tripId, stay_id: stayId });
  if (travelerIds.length === 0) return { data: [], error: null };
  const rows = travelerIds.map((traveler_id) => ({ trip_id: tripId, stay_id: stayId, traveler_id }));
  return supabase.from("accommodation_travelers").insert(rows).select();
}

// Transportation travelers
export async function getTransportationTravelerIds(tripId: string, transportationId: string) {
  const { data, error } = await supabase
    .from("transportation_travelers")
    .select("traveler_id")
    .match({ trip_id: tripId, transportation_id: transportationId });
  
  if (error) return { data: [], error };
  return { data: data?.map(row => row.traveler_id) || [], error: null };
}

export async function setTransportationTravelers(tripId: string, transportationId: string, travelerIds: string[]) {
  await supabase.from("transportation_travelers").delete().match({ trip_id: tripId, transportation_id: transportationId });
  if (travelerIds.length === 0) return { data: [], error: null };
  const rows = travelerIds.map((traveler_id) => ({ trip_id: tripId, transportation_id: transportationId, traveler_id }));
  return supabase.from("transportation_travelers").insert(rows).select();
}

// Day activity travelers
export async function getDayActivityTravelerIds(tripId: string, activityId: string) {
  const { data, error } = await supabase
    .from("day_activity_travelers")
    .select("traveler_id")
    .match({ trip_id: tripId, activity_id: activityId });
  
  if (error) return { data: [], error };
  return { data: data?.map(row => row.traveler_id) || [], error: null };
}

export async function setDayActivityTravelers(tripId: string, activityId: string, travelerIds: string[]) {
  await supabase.from("day_activity_travelers").delete().match({ trip_id: tripId, activity_id: activityId });
  if (travelerIds.length === 0) return { data: [], error: null };
  const rows = travelerIds.map((traveler_id) => ({ trip_id: tripId, activity_id: activityId, traveler_id }));
  return supabase.from("day_activity_travelers").insert(rows).select();
}

// Reservation travelers
export async function getReservationTravelerIds(tripId: string, reservationId: string) {
  const { data, error } = await supabase
    .from("reservation_travelers")
    .select("traveler_id")
    .match({ trip_id: tripId, reservation_id: reservationId });
  
  if (error) return { data: [], error };
  return { data: data?.map(row => row.traveler_id) || [], error: null };
}

export async function setReservationTravelers(tripId: string, reservationId: string, travelerIds: string[]) {
  await supabase.from("reservation_travelers").delete().match({ trip_id: tripId, reservation_id: reservationId });
  if (travelerIds.length === 0) return { data: [], error: null };
  const rows = travelerIds.map((traveler_id) => ({ trip_id: tripId, reservation_id: reservationId, traveler_id }));
  return supabase.from("reservation_travelers").insert(rows).select();
}
