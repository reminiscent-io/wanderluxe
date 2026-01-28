-- Fix anonymous user access to public trips
-- Issue: The trips_select_policy was created with "TO authenticated" which blocks
-- anonymous users from viewing public trips on the Explore page.
--
-- Solution: Create separate SELECT policies for authenticated and anonymous users.

-- =============================================================================
-- STEP 1: Drop the existing select policy that blocks anonymous users
-- =============================================================================
DROP POLICY IF EXISTS "trips_select_policy" ON trips;

-- =============================================================================
-- STEP 2: Create policy for authenticated users
-- Can see: own trips, public trips, and shared trips
-- =============================================================================
CREATE POLICY "trips_select_authenticated" ON trips
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_public = true
    OR can_access_trip(trip_id)
  );

-- =============================================================================
-- STEP 3: Create policy for anonymous users
-- Can see: only public trips
-- =============================================================================
CREATE POLICY "trips_select_anon" ON trips
  FOR SELECT
  TO anon
  USING (is_public = true);

-- =============================================================================
-- STEP 4: Ensure anon role has SELECT grant on trips table
-- (This was granted in 20260121000001 but ensuring it's still there)
-- =============================================================================
GRANT SELECT ON trips TO anon;
