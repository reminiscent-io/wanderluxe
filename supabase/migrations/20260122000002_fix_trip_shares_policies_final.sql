-- Fix trip_shares policies to allow Editors (not just Owners) to manage travelers
-- Replaces restrictive is_trip_owner() checks with can_edit_trip()
-- Updates visibility (SELECT) to ensure all trip members can see the full team list

-- =============================================================================
-- 1. Fix INSERT policy (Solves "Error saving traveler" / 42501)
-- =============================================================================
DROP POLICY IF EXISTS "trip_shares_insert_policy" ON trip_shares;

-- Allow insert if user has edit rights (Owner OR Editor)
-- They can only insert rows where they are listed as the 'sharer'
CREATE POLICY "trip_shares_insert_policy" ON trip_shares
  FOR INSERT
  WITH CHECK (
    can_edit_trip(trip_id)
    AND shared_by_user_id = auth.uid()
  );

-- =============================================================================
-- 2. Fix UPDATE policy (Allows Editors to change permissions)
-- =============================================================================
DROP POLICY IF EXISTS "trip_shares_update_policy" ON trip_shares;

-- Allow update if user has edit rights
CREATE POLICY "trip_shares_update_policy" ON trip_shares
  FOR UPDATE
  USING (can_edit_trip(trip_id))
  WITH CHECK (can_edit_trip(trip_id));

-- =============================================================================
-- 3. Fix DELETE policy (Allows Editors to remove travelers)
-- =============================================================================
DROP POLICY IF EXISTS "trip_shares_delete_policy" ON trip_shares;

-- Allow delete if user has edit rights
CREATE POLICY "trip_shares_delete_policy" ON trip_shares
  FOR DELETE
  USING (can_edit_trip(trip_id));

-- =============================================================================
-- 4. Fix SELECT policy (Solves visibility issues)
-- =============================================================================
DROP POLICY IF EXISTS "trip_shares_select_policy" ON trip_shares;

-- Allow users to see ALL travelers on a trip if they have access to that trip
-- (Previous policy only let you see yourself and rows you created, hiding the rest of the team)
CREATE POLICY "trip_shares_select_policy" ON trip_shares
  FOR SELECT
  USING (can_access_trip(trip_id));
