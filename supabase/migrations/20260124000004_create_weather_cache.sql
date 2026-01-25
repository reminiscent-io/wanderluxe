-- Create weather_cache table to reduce API calls
-- Caches 5-day forecast data per location with 6-hour refresh

CREATE TABLE IF NOT EXISTS weather_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location text NOT NULL,
  location_normalized text NOT NULL, -- lowercase, trimmed for matching
  forecast_data jsonb NOT NULL,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '6 hours'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups by normalized location
CREATE INDEX idx_weather_cache_location ON weather_cache(location_normalized);

-- Index for cleanup of expired entries
CREATE INDEX idx_weather_cache_expires ON weather_cache(expires_at);

-- Unique constraint to prevent duplicate entries for same location
CREATE UNIQUE INDEX idx_weather_cache_location_unique ON weather_cache(location_normalized);

-- RLS: Allow all authenticated users to read cached weather (it's public data)
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weather_cache_select_policy" ON weather_cache
  FOR SELECT TO authenticated
  USING (true);

-- Only service role can insert/update (edge function uses service role)
CREATE POLICY "weather_cache_insert_policy" ON weather_cache
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "weather_cache_update_policy" ON weather_cache
  FOR UPDATE TO service_role
  USING (true);

CREATE POLICY "weather_cache_delete_policy" ON weather_cache
  FOR DELETE TO service_role
  USING (true);

-- Comment for documentation
COMMENT ON TABLE weather_cache IS 'Caches weather forecast data to reduce API calls. Data expires after 6 hours.';
