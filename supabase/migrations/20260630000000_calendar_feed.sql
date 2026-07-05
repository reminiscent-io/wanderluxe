-- Calendar sync: token-gated iCal feed per trip
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS calendar_feed_token text,
  ADD COLUMN IF NOT EXISTS calendar_feed_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN trips.calendar_feed_token IS 'Unguessable token gating the public iCal feed; null until enabled. Reset to revoke subscriptions.';
COMMENT ON COLUMN trips.calendar_feed_enabled IS 'When true, GET /api/trips/:id/calendar.ics?token= serves the feed.';

-- Optional: index for token lookups (feed route queries by trip_id, so this is a safety net for token-based debugging).
CREATE INDEX IF NOT EXISTS idx_trips_calendar_feed_token ON trips (calendar_feed_token) WHERE calendar_feed_token IS NOT NULL;
