-- Add primary destination field to trips table
-- This stores the actual travel destination from Google Places (e.g., "New York, NY, USA")
-- which is distinct from the trip name (destination field) that users can set to anything

ALTER TABLE trips
ADD COLUMN primary_destination TEXT,
ADD COLUMN primary_destination_place_id TEXT;

COMMENT ON COLUMN trips.primary_destination IS 'Primary destination from Google Places (e.g., "New York, NY, USA")';
COMMENT ON COLUMN trips.primary_destination_place_id IS 'Google Places ID for the primary destination';
