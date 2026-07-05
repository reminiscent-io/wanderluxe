-- Trip timezone labels: display metadata only. All columns nullable, no backfill,
-- no existing time value changes. NULL = inherit the trip default zone.
ALTER TABLE trips ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE day_activities ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE transportation ADD COLUMN IF NOT EXISTS departure_timezone text;
ALTER TABLE transportation ADD COLUMN IF NOT EXISTS arrival_timezone text;

-- place_id -> IANA timezone cache for the timezone-proxy Edge Function.
-- place_ids are stable, so entries are effectively permanent (no TTL).
CREATE TABLE IF NOT EXISTS timezone_cache (
  place_id text PRIMARY KEY,
  timezone_id text NOT NULL,
  fetched_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE timezone_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read timezone cache"
  ON timezone_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage timezone cache"
  ON timezone_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
