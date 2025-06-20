-- Fix reservations RLS policies to properly handle the day_id -> trip_id relationship
-- The current policy is failing because it's looking for trip_id directly on reservations table
-- But reservations are linked through day_id -> trip_days -> trip_id

-- Drop the existing conflicting policies
DROP POLICY IF EXISTS "reservations_insert_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_update_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_delete_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_select_policy" ON reservations;

-- Create corrected policies that properly traverse the relationship
CREATE POLICY "reservations_select_policy" ON reservations
FOR SELECT 
TO public
USING (
  EXISTS (
    SELECT 1 FROM trip_days td
    WHERE td.day_id = reservations.day_id 
    AND user_has_read_permission(td.trip_id)
  )
);

CREATE POLICY "reservations_insert_policy" ON reservations
FOR INSERT 
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trip_days td
    WHERE td.day_id = reservations.day_id 
    AND user_has_edit_permission(td.trip_id)
  )
);

CREATE POLICY "reservations_update_policy" ON reservations
FOR UPDATE 
TO public
USING (
  EXISTS (
    SELECT 1 FROM trip_days td
    WHERE td.day_id = reservations.day_id 
    AND user_has_edit_permission(td.trip_id)
  )
);

CREATE POLICY "reservations_delete_policy" ON reservations
FOR DELETE 
TO public
USING (
  EXISTS (
    SELECT 1 FROM trip_days td
    WHERE td.day_id = reservations.day_id 
    AND user_has_edit_permission(td.trip_id)
  )
);