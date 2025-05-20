-- Recreate RLS policy for reservations with trip sharing access
-- Note: Run this SQL in your Supabase dashboard SQL Editor

-- First drop any existing policies that might conflict
DROP POLICY IF EXISTS "Authenticated users can manage their reservations" ON reservations;
DROP POLICY IF EXISTS "Users can access reservations for shared trips" ON reservations;

-- Create a more permissive policy for reservations in shared trips
CREATE POLICY "Users can access shared trip reservations" 
ON reservations
FOR ALL
TO authenticated
USING (
  -- Owner of the reservation
  auth.uid() IN (
    SELECT user_id FROM trips WHERE trip_id = reservations.trip_id
  )
  OR
  -- Shared via trip_shares
  auth.email() IN (
    SELECT shared_with_email FROM trip_shares 
    WHERE trip_id = reservations.trip_id
  )
)
WITH CHECK (
  -- Owner of the reservation
  auth.uid() IN (
    SELECT user_id FROM trips WHERE trip_id = reservations.trip_id
  )
  OR
  -- Shared via trip_shares
  auth.email() IN (
    SELECT shared_with_email FROM trip_shares 
    WHERE trip_id = reservations.trip_id
  )
);

-- Create an index to speed up lookups
CREATE INDEX IF NOT EXISTS idx_reservations_trip_id ON reservations(trip_id);