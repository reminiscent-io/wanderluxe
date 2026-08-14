-- Global, trip-agnostic cache of Google place -> lat/lng, backing the trip Map view.
--
-- Nothing in the schema stores coordinates today: activities, stays and dining
-- carry a Google place_id, and transportation carries only free-text endpoints.
-- Resolving those per viewer would cost one Places call per pin per session, so
-- they resolve once here and every later viewer of any trip reads for free.
--
-- Rows are immutable reference data (a place_id's coordinates do not move), so
-- there is no TTL on successful lookups.
CREATE TABLE IF NOT EXISTS place_coordinates (
  -- 'place:<place_id>' or 'text:<sha256(normalized query)>'. Derived server-side
  -- only: if clients supplied the key, any caller could map a well-known place
  -- to arbitrary coordinates in a table every trip reads.
  cache_key text PRIMARY KEY,
  source text NOT NULL CHECK (source IN ('place_id', 'text')),
  -- Raw place_id, or the normalized text query. Kept for cache invalidation and
  -- debugging; the table is service-role only, so it is never client-readable.
  lookup_input text NOT NULL,
  -- 'not_found' is a negative cache: it stops a permanently unresolvable string
  -- from re-hitting Google on every page view. Re-attempted after 30 days.
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'not_found')),
  lat double precision,
  lng double precision,
  -- Canonical place_id; a text lookup learns one, which later lookups can reuse.
  place_id text,
  name text,
  formatted_address text,
  -- Places returns photos on the same Basic Data SKU as geometry, so caching the
  -- reference here makes marker popup photos free.
  photo_reference text,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT place_coordinates_coords_present CHECK (
    (status = 'ok' AND lat IS NOT NULL AND lng IS NOT NULL)
    OR (status = 'not_found' AND lat IS NULL AND lng IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS place_coordinates_place_id_idx
  ON place_coordinates (place_id)
  WHERE place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS place_coordinates_negative_idx
  ON place_coordinates (fetched_at)
  WHERE status = 'not_found';

ALTER TABLE place_coordinates ENABLE ROW LEVEL SECURITY;

-- Service-role only, deliberately unlike timezone_cache's authenticated-read
-- policy. Public trips on /explore/:slug render the map for logged-out visitors,
-- so an `authenticated` grant would exclude exactly the readers who need it —
-- and the batch proxy returns cached and uncached places in one round trip
-- regardless, so a direct client read would buy nothing.
CREATE POLICY "Service role can manage place coordinates"
  ON place_coordinates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE place_coordinates IS
  'Global cache of Google place -> lat/lng for the trip Map view. Immutable reference data, service-role access only, written by the place-coordinates-proxy Edge Function.';
