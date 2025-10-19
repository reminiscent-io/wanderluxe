// src/services/travelers.ts
import { supabase } from "@/integrations/supabase/client";

export type TravelerUpsertPayload = {
  id?: string;
  first_name: string;
  last_name?: string;
  shared_with_email?: string;
  permission_level: "read" | "edit";
};

export async function upsertTraveler(
  tripId: string,
  payload: TravelerUpsertPayload
) {
  const { id, first_name, last_name, shared_with_email, permission_level } = payload;

  if (id) {
    const { data, error } = await supabase
      .from("trip_shares" as any)
      .update({
        first_name,
        last_name: last_name ?? null,
        shared_with_email: shared_with_email?.trim() ?? null,
        permission_level,
      })
      .eq("id", id)
      .select()
      .single();
    return { data, error };
  }

  // Idempotent insert based on (trip_id, shared_with_email)
  const { data, error } = await supabase
    .from("trip_shares" as any)
    .upsert(
      {
        trip_id: tripId,
        shared_with_email: shared_with_email?.trim() ?? null,
        first_name,
        last_name: last_name ?? null,
        permission_level,
      },
      { onConflict: "trip_id,shared_with_email" }
    )
    .select()
    .single();

  return { data, error };
}
