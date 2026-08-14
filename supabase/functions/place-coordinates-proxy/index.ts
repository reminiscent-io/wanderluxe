import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * Batch place -> coordinates resolution for the trip Map view.
 *
 * Request:  { items: [{ placeId }, { text, bias? }, ...] }   (max 100)
 * Response: { results: [ { lat, lng, placeId, name, address, photoRef } | null, ... ] }
 *
 * Results are returned positionally, so the client never sends cache keys: if it
 * did, a caller could map a well-known place to arbitrary coordinates in a table
 * every trip reads. Keys are derived here, and only here.
 *
 * Soft-fail contract, matching timezone-proxy: any per-item problem yields null
 * rather than a non-200, so one bad address never blanks the whole map.
 */

const MAX_ITEMS = 100;
const GOOGLE_CONCURRENCY = 6;
const GOOGLE_TIMEOUT_MS = 4000;
/** Retry a permanently-unresolvable string only occasionally. */
const NEGATIVE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
/** Batches per hour. Generous — a warm batch costs us nothing. */
const REQUEST_LIMIT = 120;
/** Uncached Google lookups per hour. This is the budget that actually costs money. */
const LOOKUP_LIMIT = 60;

const requestCounts = new Map<string, number[]>();
const lookupCounts = new Map<string, number[]>();

/**
 * Per-isolate and reset on cold start, so this is a courtesy throttle, not a
 * cost ceiling. The real ceilings are the shared cache, Google Cloud quotas and
 * the key's HTTP referrer restrictions.
 */
function takeBudget(store: Map<string, number[]>, key: string, limit: number, n = 1): boolean {
  const now = Date.now();
  const recent = (store.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (recent.length + n > limit) {
    store.set(key, recent);
    return false;
  }
  for (let i = 0; i < n; i += 1) recent.push(now);
  store.set(key, recent);
  return true;
}

/** Must stay byte-identical to normalizeQuery() in src/components/trip/map/placeLocator.ts. */
function normalizeQuery(raw: string): string {
  return raw.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface RequestItem {
  placeId?: unknown;
  text?: unknown;
  bias?: { lat?: unknown; lng?: unknown };
}

interface Lookup {
  cacheKey: string;
  source: 'place_id' | 'text';
  lookupInput: string;
  bias: { lat: number; lng: number } | null;
}

interface Resolved {
  lat: number;
  lng: number;
  placeId: string | null;
  name: string | null;
  address: string | null;
  photoRef: string | null;
}

async function toLookup(item: RequestItem): Promise<Lookup | null> {
  if (typeof item?.placeId === 'string' && item.placeId.trim()) {
    const placeId = item.placeId.trim();
    return { cacheKey: `place:${placeId}`, source: 'place_id', lookupInput: placeId, bias: null };
  }

  if (typeof item?.text === 'string' && item.text.trim()) {
    const normalized = normalizeQuery(item.text);
    if (!normalized) return null;
    const bias =
      typeof item.bias?.lat === 'number' && typeof item.bias?.lng === 'number'
        ? { lat: item.bias.lat, lng: item.bias.lng }
        : null;
    return {
      cacheKey: `text:${await sha256Hex(normalized)}`,
      source: 'text',
      lookupInput: normalized,
      bias,
    };
  }

  return null;
}

const PLACE_FIELDS = 'geometry,name,formatted_address,place_id,photos';

function readPlace(result: Record<string, any> | undefined | null): Resolved | null {
  const loc = result?.geometry?.location;
  if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return null;
  return {
    lat: loc.lat,
    lng: loc.lng,
    placeId: typeof result?.place_id === 'string' ? result.place_id : null,
    name: typeof result?.name === 'string' ? result.name : null,
    address: typeof result?.formatted_address === 'string' ? result.formatted_address : null,
    photoRef: result?.photos?.[0]?.photo_reference ?? null,
  };
}

/**
 * Places API (Legacy). Isolated here (with fetchPlaceByText) so a migration to
 * Places API (New) is a two-function change, not a rewrite of the cache layer.
 */
async function fetchPlaceById(placeId: string, key: string): Promise<Resolved | null> {
  const params = new URLSearchParams({ place_id: placeId, fields: PLACE_FIELDS, key });
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
    { signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS) },
  );
  const json = await res.json();
  if (json?.status && json.status !== 'OK') {
    console.warn(`place-coordinates-proxy: details ${json.status}: ${json.error_message ?? ''}`);
    return null;
  }
  return readPlace(json?.result);
}

async function fetchPlaceByText(
  query: string,
  bias: { lat: number; lng: number } | null,
  key: string,
): Promise<Resolved | null> {
  const params = new URLSearchParams({
    input: query,
    inputtype: 'textquery',
    // findplacefromtext uses a distinct field vocabulary from details.
    fields: 'geometry,name,formatted_address,place_id,photos',
    key,
  });
  if (bias) params.set('locationbias', `circle:50000@${bias.lat},${bias.lng}`);

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params}`,
    { signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS) },
  );
  const json = await res.json();
  if (json?.status && json.status !== 'OK') {
    if (json.status !== 'ZERO_RESULTS') {
      console.warn(`place-coordinates-proxy: findplace ${json.status}: ${json.error_message ?? ''}`);
    }
    return null;
  }
  return readPlace(json?.candidates?.[0]);
}

/** Bounded-concurrency map, so a 100-item batch doesn't open 100 sockets. */
async function pooled<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor;
      cursor += 1;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Optional auth, mirroring google-places-proxy's details branch: public trips
  // on /explore/:slug render the map for logged-out visitors, who would
  // otherwise get an empty canvas.
  let budgetKey: string;
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const { data } = await supabase.auth.getUser(authHeader.slice(7));
    if (!data?.user) return respond({ error: 'Unauthorized' }, 401);
    budgetKey = `user:${data.user.id}`;
  } else {
    budgetKey = `ip:${req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'}`;
  }

  if (!takeBudget(requestCounts, budgetKey, REQUEST_LIMIT)) {
    return respond({ error: 'Rate limit exceeded. Try again later.' }, 429);
  }

  let items: unknown;
  try {
    ({ items } = await req.json());
  } catch {
    return respond({ error: 'Invalid JSON body' }, 400);
  }
  if (!Array.isArray(items)) return respond({ error: 'items must be an array' }, 400);
  if (items.length === 0) return respond({ results: [] });
  if (items.length > MAX_ITEMS) {
    return respond({ error: `items exceeds the ${MAX_ITEMS} maximum` }, 400);
  }

  const lookups = await Promise.all((items as RequestItem[]).map(toLookup));

  // Collapse duplicates within the batch — a hotel appearing as an anchor on
  // five days is one lookup, not five.
  const unique = new Map<string, Lookup>();
  lookups.forEach((l) => {
    if (l && !unique.has(l.cacheKey)) unique.set(l.cacheKey, l);
  });

  const resolved = new Map<string, Resolved | null>();

  const { data: cached, error: cacheError } = await supabase
    .from('place_coordinates')
    .select('cache_key, status, lat, lng, place_id, name, formatted_address, photo_reference, fetched_at')
    .in('cache_key', Array.from(unique.keys()));

  if (cacheError) {
    console.error('place-coordinates-proxy: cache read failed:', cacheError.message);
  }

  const now = Date.now();
  const misses: Lookup[] = [];

  (cached ?? []).forEach((row) => {
    if (row.status === 'ok' && row.lat != null && row.lng != null) {
      resolved.set(row.cache_key, {
        lat: row.lat,
        lng: row.lng,
        placeId: row.place_id,
        name: row.name,
        address: row.formatted_address,
        photoRef: row.photo_reference,
      });
      unique.delete(row.cache_key);
    } else if (now - new Date(row.fetched_at).getTime() < NEGATIVE_TTL_MS) {
      resolved.set(row.cache_key, null);
      unique.delete(row.cache_key);
    }
  });

  misses.push(...unique.values());

  if (misses.length > 0) {
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

    if (!googleApiKey) {
      console.error('place-coordinates-proxy: GOOGLE_PLACES_API_KEY not configured');
      misses.forEach((m) => resolved.set(m.cacheKey, null));
    } else if (!takeBudget(lookupCounts, budgetKey, LOOKUP_LIMIT, misses.length)) {
      // Serve what was cached rather than failing the batch; the rest resolve
      // on a later view once the window rolls over.
      console.warn(`place-coordinates-proxy: lookup budget exhausted for ${budgetKey}`);
      misses.forEach((m) => resolved.set(m.cacheKey, null));
    } else {
      const fetched = await pooled(misses, GOOGLE_CONCURRENCY, async (m) => {
        try {
          return m.source === 'place_id'
            ? await fetchPlaceById(m.lookupInput, googleApiKey)
            : await fetchPlaceByText(m.lookupInput, m.bias, googleApiKey);
        } catch (e) {
          console.warn(
            `place-coordinates-proxy: lookup failed for ${m.cacheKey}:`,
            e instanceof Error ? e.message : e,
          );
          return null;
        }
      });

      const rows = misses.map((m, i) => {
        const hit = fetched[i];
        resolved.set(m.cacheKey, hit);
        return {
          cache_key: m.cacheKey,
          source: m.source,
          lookup_input: m.lookupInput,
          status: hit ? 'ok' : 'not_found',
          lat: hit?.lat ?? null,
          lng: hit?.lng ?? null,
          place_id: hit?.placeId ?? null,
          name: hit?.name ?? null,
          formatted_address: hit?.address ?? null,
          photo_reference: hit?.photoRef ?? null,
          fetched_at: new Date().toISOString(),
        };
      });

      const { error: upsertError } = await supabase
        .from('place_coordinates')
        .upsert(rows, { onConflict: 'cache_key' });
      if (upsertError) {
        // The response is still correct; only the cache write was lost.
        console.error('place-coordinates-proxy: cache write failed:', upsertError.message);
      }
    }
  }

  const results = lookups.map((l) => (l ? (resolved.get(l.cacheKey) ?? null) : null));
  return respond({ results });
});
