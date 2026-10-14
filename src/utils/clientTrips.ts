// Client trips: trips an admin (travel advisor) owns but plans for someone
// else. A non-null trips.client_name is the whole flag; the database only lets
// is_admin() callers set it (trips_guard_client_fields).

interface ClientFields {
  client_name?: string | null;
  client_email?: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isClientTrip(trip: ClientFields | null | undefined): boolean {
  return !!trip?.client_name?.trim();
}

/** Owned trips → the advisor's own travel, and the trips planned for clients. */
export function splitClientTrips<T extends ClientFields>(trips: T[]): { personal: T[]; clients: T[] } {
  const personal: T[] = [];
  const clients: T[] = [];
  for (const trip of trips) (isClientTrip(trip) ? clients : personal).push(trip);
  return { personal, clients };
}

export function isValidClientEmail(email: string): boolean {
  const v = email.trim();
  return v === '' || EMAIL_RE.test(v);
}

/**
 * Create-form input → trip columns. Blank means "not a client trip". An email
 * with no name still marks the trip, named by the email, so nothing typed is
 * dropped on the floor.
 */
export function clientFieldsForInsert(name: string, email: string): { client_name: string | null; client_email: string | null } {
  const n = name.trim();
  const e = email.trim().toLowerCase();
  if (!n && !e) return { client_name: null, client_email: null };
  return { client_name: n || e, client_email: e || null };
}

/** Prefill for the Add Traveler dialog, so inviting the client is one click. */
export function clientInviteDefaults(trip: ClientFields): { first_name: string; last_name: string; shared_with_email: string } {
  const name = trip.client_name?.trim() ?? '';
  const [first = '', ...rest] = name.includes('@') ? [] : name.split(/\s+/);
  return {
    first_name: first,
    last_name: rest.join(' '),
    shared_with_email: trip.client_email?.trim() ?? '',
  };
}

/** True when the client is already among the trip's travelers, so the prefill would only make a duplicate. */
export function clientAlreadyOnTrip(
  defaults: { first_name: string; last_name: string; shared_with_email: string },
  travelers: { first_name?: string | null; last_name?: string | null; shared_with_email?: string | null }[],
): boolean {
  const email = defaults.shared_with_email.toLowerCase();
  const name = `${defaults.first_name} ${defaults.last_name}`.trim().toLowerCase();
  return travelers.some(t =>
    email
      ? (t.shared_with_email ?? '').trim().toLowerCase() === email
      : !!name && `${t.first_name ?? ''} ${t.last_name ?? ''}`.trim().toLowerCase() === name
  );
}
