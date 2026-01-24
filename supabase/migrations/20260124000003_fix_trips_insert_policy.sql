-- Fix trips RLS policies - complete reset
-- Error 42501 indicates RLS WITH CHECK is failing on INSERT

-- =============================================================================
-- STEP 1: Drop ALL existing policies on trips to start fresh
-- =============================================================================
DROP POLICY IF EXISTS "trips_select_policy" ON trips;
DROP POLICY IF EXISTS "trips_insert_policy" ON trips;
DROP POLICY IF EXISTS "trips_update_policy" ON trips;
DROP POLICY IF EXISTS "trips_delete_policy" ON trips;
DROP POLICY IF EXISTS "Users can view own trips" ON trips;
DROP POLICY IF EXISTS "Users can view their own trips" ON trips;
DROP POLICY IF EXISTS "Users can insert own trips" ON trips;
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON trips;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON trips;
DROP POLICY IF EXISTS "Enable read access for all users" ON trips;

-- =============================================================================
-- STEP 2: Ensure RLS is enabled
-- =============================================================================
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 3: Create clean policies
-- =============================================================================

-- SELECT: Users can see their own trips, public trips, and shared trips
CREATE POLICY "trips_select_policy" ON trips
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_public = true
    OR can_access_trip(trip_id)
  );

-- INSERT: Authenticated users can create trips for themselves
CREATE POLICY "trips_insert_policy" ON trips
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- UPDATE: Only owners can update their trips
CREATE POLICY "trips_update_policy" ON trips
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Only owners can delete their trips
CREATE POLICY "trips_delete_policy" ON trips
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
