// src/services/contactsService.ts
import { supabase } from "@/integrations/supabase/client";

export type ConnectedContact = {
  key: string;               // "user:<uuid>" or "email:<lowercase>"
  user_id?: string | null;
  email?: string | null;
  profile_full_name?: string | null; // from profiles
  share_first_name?: string | null;  // from trip_shares
  share_last_name?: string | null;   // from trip_shares
  directions: ("incoming" | "outgoing")[];
  first_shared_at?: string | null;
  last_shared_at?: string | null;
  trips_count: number;
};

const titleCase = (s: string) =>
  s.replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const nameFromEmail = (email?: string | null) => {
  if (!email) return null;
  const local = email.split("@")[0] ?? "";
  if (!local) return null;
  return titleCase(local.replace(/[._-]+/g, " "));
};

export const pickBestName = (c: ConnectedContact) => {
  if (c.profile_full_name && c.profile_full_name.trim()) return c.profile_full_name.trim();
  const fromShare = `${c.share_first_name ?? ""} ${c.share_last_name ?? ""}`.trim();
  if (fromShare) return titleCase(fromShare);
  return nameFromEmail(c.email) ?? "Traveler";
};

export const initialsFor = (c: ConnectedContact) => {
  const n = pickBestName(c);
  if (!n) return (c.email ?? "U").slice(0, 2).toUpperCase();
  const parts = n.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const contactsByEmail = (contacts: ConnectedContact[]) =>
  contacts.reduce<Record<string, ConnectedContact>>((acc, c) => {
    if (c.email) acc[c.email.toLowerCase()] = c;
    return acc;
  }, {});

export async function getConnectedContacts(): Promise<ConnectedContact[]> {
  const { data: me } = await supabase.auth.getUser();
  const user = me?.user;
  if (!user) return [];

  const myId = user.id;
  const myEmail = (user.email || "").toLowerCase();

  // 1) My trips (I’m the owner) → outgoing shares
  const { data: myTrips } = await supabase
    .from("trips")
    .select("trip_id")
    .eq("user_id", myId);

  const myTripIds = (myTrips ?? []).map((t) => t.trip_id);
  let outgoing: {
    trip_id: string;
    created_at: string;
    shared_with_user_id: string | null;
    shared_with_email: string | null;
    first_name: string | null;
    last_name: string | null;
  }[] = [];

  if (myTripIds.length) {
    const { data } = await supabase
      .from("trip_shares" as any)
      .select("trip_id, created_at, shared_with_user_id, shared_with_email, first_name, last_name")
      .in("trip_id", myTripIds);
    outgoing = data ?? [];
  }

  // 2) Incoming shares → shared with my email (owner is another user)
  const { data: incoming } = await supabase
    .from("trip_shares" as any)
    .select("trip_id, created_at, shared_by_user_id")
    .ilike("shared_with_email", myEmail);

  // 3) Gather all user_ids we saw and look up profiles (public readable)
  const userIds = new Set<string>();
  for (const r of outgoing) if (r.shared_with_user_id) userIds.add(r.shared_with_user_id);
  for (const r of incoming ?? []) if (r.shared_by_user_id) userIds.add(r.shared_by_user_id);

  let profilesById: Record<string, { id: string; full_name: string | null }> = {};
  if (userIds.size) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", Array.from(userIds));
    for (const p of profs ?? []) profilesById[p.id] = { id: p.id, full_name: p.full_name };
  }

  // 4) Merge into contacts map
  const map = new Map<string, ConnectedContact>();

  const touch = (
    key: string,
    patch: Partial<ConnectedContact>,
    tripId: string,
    createdAt?: string | null,
    dir: "incoming" | "outgoing" = "outgoing"
  ) => {
    const prev = map.get(key) || {
      key,
      directions: [],
      trips_count: 0,
      first_shared_at: createdAt ?? null,
      last_shared_at: createdAt ?? null,
    };
    const next: ConnectedContact = {
      ...prev,
      ...patch,
      directions: Array.from(new Set([...(prev.directions ?? []), dir])),
      first_shared_at:
        !prev.first_shared_at || (createdAt && createdAt < prev.first_shared_at)
          ? createdAt ?? prev.first_shared_at
          : prev.first_shared_at,
      last_shared_at:
        !prev.last_shared_at || (createdAt && createdAt > prev.last_shared_at)
          ? createdAt ?? prev.last_shared_at
          : prev.last_shared_at,
      trips_count: prev.trips_count, // recomputed later
    };
    map.set(key, next);
  };

  // Outgoing — I shared with them
  for (const r of outgoing) {
    const key = r.shared_with_user_id
      ? `user:${r.shared_with_user_id}`
      : `email:${(r.shared_with_email || "").toLowerCase()}`;

    touch(
      key,
      {
        user_id: r.shared_with_user_id ?? null,
        email: (r.shared_with_email || null)?.toLowerCase() ?? null,
        profile_full_name: r.shared_with_user_id ? profilesById[r.shared_with_user_id]?.full_name ?? null : null,
        share_first_name: r.first_name ?? null,
        share_last_name: r.last_name ?? null,
      },
      r.trip_id,
      r.created_at,
      "outgoing"
    );
  }

  // Incoming — they shared with me
  for (const r of incoming ?? []) {
    if (!r.shared_by_user_id) continue;
    const key = `user:${r.shared_by_user_id}`;
    touch(
      key,
      {
        user_id: r.shared_by_user_id,
        profile_full_name: profilesById[r.shared_by_user_id]?.full_name ?? null,
      },
      r.trip_id,
      r.created_at,
      "incoming"
    );
  }

  // Compute distinct trips per contact key for trips_count
  const tripsByKey = new Map<string, Set<string>>();
  const pushTrip = (key: string, tripId: string) => {
    const s = tripsByKey.get(key) ?? new Set<string>();
    s.add(tripId);
    tripsByKey.set(key, s);
  };
  for (const r of outgoing) {
    const key = r.shared_with_user_id
      ? `user:${r.shared_with_user_id}`
      : `email:${(r.shared_with_email || "").toLowerCase()}`;
    pushTrip(key, r.trip_id);
  }
  for (const r of incoming ?? []) {
    if (!r.shared_by_user_id) continue;
    const key = `user:${r.shared_by_user_id}`;
    pushTrip(key, r.trip_id);
  }
  for (const [key, contact] of map.entries()) {
    contact.trips_count = (tripsByKey.get(key)?.size ?? 0);
  }

  // Sort: both → outgoing → incoming, then most recent activity
  const asArr = Array.from(map.values());
  asArr.sort((a, b) => {
    const score = (x: ConnectedContact) =>
      (x.directions.includes("incoming") && x.directions.includes("outgoing")) ? 2 :
      (x.directions.includes("outgoing")) ? 1 : 0;
    const s = score(b) - score(a);
    if (s !== 0) return s;
    return (b.last_shared_at ?? "").localeCompare(a.last_shared_at ?? "");
  });

  return asArr;
}