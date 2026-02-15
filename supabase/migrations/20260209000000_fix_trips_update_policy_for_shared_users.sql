-- Fix trips UPDATE policy to allow shared users with edit permission to update trips.
-- Previously only the owner (user_id = auth.uid()) could update, which caused silent
-- failures for shared users who had edit permission in the UI but were blocked by RLS.
-- Uses the existing can_edit_trip() function which checks owner OR shared edit permission.

DROP POLICY IF EXISTS "trips_update_policy" ON trips;

CREATE POLICY "trips_update_policy" ON trips
  FOR UPDATE
  TO authenticated
  USING (can_edit_trip(trip_id))
  WITH CHECK (can_edit_trip(trip_id));
