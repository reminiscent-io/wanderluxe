-- Fix trips and trip_shares SELECT policies to allow shared users full access
-- The can_access_trip() function already correctly checks email-based sharing

-- =============================================================================
-- STEP 1: Fix trips SELECT policy
-- =============================================================================

DROP POLICY IF EXISTS "trips_select_policy" ON trips;

-- Use the SECURITY DEFINER function which checks:
-- 1. Owners (user_id = auth.uid())
-- 2. Public trips (is_public = true)
-- 3. Shared users (via email matching)
CREATE POLICY "trips_select_policy" ON trips
  FOR SELECT
  USING (can_access_trip(trip_id));

-- =============================================================================
-- STEP 2: Fix trip_shares SELECT policy
-- =============================================================================

DROP POLICY IF EXISTS "trip_shares_select_policy" ON trip_shares;

-- Users can see trip_shares if they have access to the trip
-- This lets shared users see ALL travelers on trips shared with them
CREATE POLICY "trip_shares_select_policy" ON trip_shares
  FOR SELECT
  USING (can_access_trip(trip_id));

-- =============================================================================
-- STEP 3: Fix trip_shares INSERT policy for editors
-- =============================================================================

DROP POLICY IF EXISTS "trip_shares_insert_policy" ON trip_shares;

-- Allow insert if user can edit the trip (owner or editor)
CREATE POLICY "trip_shares_insert_policy" ON trip_shares
  FOR INSERT
  WITH CHECK (
    can_edit_trip(trip_id)
    AND shared_by_user_id = auth.uid()
  );

-- =============================================================================
-- STEP 4: Fix trip_shares UPDATE policy for editors
-- =============================================================================

DROP POLICY IF EXISTS "trip_shares_update_policy" ON trip_shares;

-- Allow update if user can edit the trip
CREATE POLICY "trip_shares_update_policy" ON trip_shares
  FOR UPDATE
  USING (can_edit_trip(trip_id));

-- =============================================================================
-- STEP 5: Fix trip_shares DELETE policy for editors
-- =============================================================================

DROP POLICY IF EXISTS "trip_shares_delete_policy" ON trip_shares;

-- Allow delete if user can edit the trip
CREATE POLICY "trip_shares_delete_policy" ON trip_shares
  FOR DELETE
  USING (can_edit_trip(trip_id));
