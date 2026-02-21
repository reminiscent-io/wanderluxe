-- Add Google Places location fields to day_activities
ALTER TABLE day_activities
  ADD COLUMN location_address text,
  ADD COLUMN location_place_id text,
  ADD COLUMN location_phone text,
  ADD COLUMN location_website text,
  ADD COLUMN location_rating numeric(3,1);
