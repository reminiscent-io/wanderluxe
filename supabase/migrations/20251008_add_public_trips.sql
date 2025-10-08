-- Add is_public column to trips table
ALTER TABLE trips 
ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;

-- Create index on is_public for faster queries
CREATE INDEX idx_trips_is_public ON trips(is_public) WHERE is_public = true;

-- Drop existing SELECT policy for trips if it exists
DROP POLICY IF EXISTS "Users can view public trips" ON trips;

-- Create policy to allow ANYONE (including unauthenticated) to view public trips
CREATE POLICY "Anyone can view public trips" 
ON trips FOR SELECT 
TO anon, authenticated
USING (is_public = true);

-- Create policies to allow viewing related data for public trips (unauthenticated users)

-- Trip days for public trips
CREATE POLICY "Anyone can view trip_days for public trips" 
ON trip_days FOR SELECT 
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.trip_id = trip_days.trip_id 
    AND trips.is_public = true
  )
);

-- Day activities for public trips
CREATE POLICY "Anyone can view day_activities for public trips" 
ON day_activities FOR SELECT 
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips 
    JOIN trip_days ON trip_days.trip_id = trips.trip_id
    WHERE trip_days.day_id = day_activities.day_id 
    AND trips.is_public = true
  )
);

-- Accommodations for public trips
CREATE POLICY "Anyone can view accommodations for public trips" 
ON accommodations FOR SELECT 
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.trip_id = accommodations.trip_id 
    AND trips.is_public = true
  )
);

-- Accommodations days for public trips
CREATE POLICY "Anyone can view accommodations_days for public trips" 
ON accommodations_days FOR SELECT 
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips 
    JOIN trip_days ON trip_days.trip_id = accommodations_days.day_id
    WHERE trips.trip_id = trip_days.trip_id 
    AND trips.is_public = true
  )
);

-- Transportation for public trips
CREATE POLICY "Anyone can view transportation for public trips" 
ON transportation FOR SELECT 
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.trip_id = transportation.trip_id 
    AND trips.is_public = true
  )
);

-- Reservations for public trips
CREATE POLICY "Anyone can view reservations for public trips" 
ON reservations FOR SELECT 
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips 
    JOIN trip_days ON trip_days.trip_id = reservations.day_id
    WHERE trips.trip_id = trip_days.trip_id 
    AND trips.is_public = true
  )
);

-- Expenses for public trips
CREATE POLICY "Anyone can view expenses for public trips" 
ON expenses FOR SELECT 
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.trip_id = expenses.trip_id 
    AND trips.is_public = true
  )
);

-- Vision board items for public trips
CREATE POLICY "Anyone can view vision_board_items for public trips" 
ON vision_board_items FOR SELECT 
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.trip_id = vision_board_items.trip_id 
    AND trips.is_public = true
  )
);

-- Chat messages for public trips (read-only for unauthenticated)
CREATE POLICY "Anyone can view chat_messages for public trips" 
ON chat_messages FOR SELECT 
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.trip_id = chat_messages.trip_id 
    AND trips.is_public = true
  )
);
