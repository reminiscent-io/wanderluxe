-- Flight number lookup in transportation dialog
-- Adds flight_number + original-vs-revised scheduled times to transportation,
-- and a flight_status_cache table to minimize upstream API calls.

-- 1. Transportation columns
ALTER TABLE transportation
  ADD COLUMN IF NOT EXISTS flight_number text,
  ADD COLUMN IF NOT EXISTS scheduled_start_time time,
  ADD COLUMN IF NOT EXISTS scheduled_end_time time,
  ADD COLUMN IF NOT EXISTS flight_status_fetched_at timestamp with time zone;

COMMENT ON COLUMN transportation.flight_number IS 'IATA flight code entered by the user (e.g. DL2733), uppercased on save.';
COMMENT ON COLUMN transportation.scheduled_start_time IS 'Originally scheduled departure wall-clock time, captured at lookup time.';
COMMENT ON COLUMN transportation.scheduled_end_time IS 'Originally scheduled arrival wall-clock time, captured at lookup time.';
COMMENT ON COLUMN transportation.flight_status_fetched_at IS 'When we last refreshed flight status from the upstream API.';

-- 2. Cache table keyed on (flight_iata, flight_date)
CREATE TABLE IF NOT EXISTS flight_status_cache (
  flight_iata text NOT NULL,
  flight_date date NOT NULL,
  payload jsonb NOT NULL,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 minutes'),
  PRIMARY KEY (flight_iata, flight_date)
);

CREATE INDEX IF NOT EXISTS idx_flight_status_cache_expires ON flight_status_cache(expires_at);

ALTER TABLE flight_status_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flight_status_cache_select_policy" ON flight_status_cache
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "flight_status_cache_insert_policy" ON flight_status_cache
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "flight_status_cache_update_policy" ON flight_status_cache
  FOR UPDATE TO service_role
  USING (true);

CREATE POLICY "flight_status_cache_delete_policy" ON flight_status_cache
  FOR DELETE TO service_role
  USING (true);

COMMENT ON TABLE flight_status_cache IS 'Caches AeroDataBox flight lookups to stay under free-tier quota. Rows expire after 30 minutes.';
