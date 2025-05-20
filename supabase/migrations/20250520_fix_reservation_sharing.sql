-- Fix the policy for reservations in shared trips
-- This will allow users with shared access to create, update, and delete reservations

-- First, let's check if the existing policy already exists and drop it if needed
DROP POLICY IF EXISTS "Users can access reservations for shared trips" ON reservations;

-- Create an updated policy for reservations in shared trips that properly checks trip_id
CREATE POLICY "Users can access reservations for shared trips" 
ON reservations FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    JOIN trip_days ON trip_days.trip_id = trip_shares.trip_id
    WHERE trip_days.day_id = reservations.day_id
    AND trip_shares.shared_with_email = auth.email()
  )
  OR
  EXISTS (
    SELECT 1 FROM trip_shares
    WHERE trip_shares.trip_id = reservations.trip_id
    AND trip_shares.shared_with_email = auth.email()
  )
);

-- Let's add an index to speed up these lookups
CREATE INDEX IF NOT EXISTS idx_reservations_trip_id ON reservations(trip_id);