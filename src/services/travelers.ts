// /src/services/travelers.ts
import { supabase } from "@/services/supabaseClient";

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

// Tagging helpers (example for accommodation)
export async function setAccommodationTravelers(tripId: string, stayId: string, travelerIds: string[]) {
  // replace strategy: delete then bulk insert
  await supabase.from("accommodation_travelers").delete().match({ trip_id: tripId, stay_id: stayId });
  if (travelerIds.length === 0) return { data: [], error: null };
  const rows = travelerIds.map((traveler_id) => ({ trip_id: tripId, stay_id: stayId, traveler_id }));
  return supabase.from("accommodation_travelers").insert(rows).select();
}
