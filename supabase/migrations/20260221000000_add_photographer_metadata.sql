ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS cover_image_photographer text,
  ADD COLUMN IF NOT EXISTS cover_image_photographer_username text;
