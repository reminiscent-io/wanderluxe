-- Migration to fix RLS policies for public trips
-- Fixes infinite recursion by ensuring trip_shares policy doesn't reference trips

-- =============================================================================
-- STEP 1: Fix trip_shares SELECT policy (MUST NOT reference trips table)
-- =============================================================================

DROP POLICY IF EXISTS "trip_shares_select_policy" ON trip_shares;
DROP POLICY IF EXISTS "Users can view trip shares" ON trip_shares;
DROP POLICY IF EXISTS "Users can view their shared trips" ON trip_shares;

-- Simple policy: users can see shares where they are the recipient
-- This does NOT reference trips table, breaking the circular dependency
CREATE POLICY "trip_shares_select_policy" ON trip_shares
  FOR SELECT
  USING (shared_with_user_id = auth.uid());

-- =============================================================================
-- STEP 2: Fix trips SELECT policy
-- =============================================================================

DROP POLICY IF EXISTS "trips_select_policy" ON trips;
DROP POLICY IF EXISTS "Users can view own trips" ON trips;
DROP POLICY IF EXISTS "Users can view their own trips" ON trips;

-- Allow viewing: public trips, own trips, OR shared trips
-- Safe to reference trip_shares since its policy doesn't reference trips
CREATE POLICY "trips_select_policy" ON trips
  FOR SELECT
  USING (
    is_public = true
    OR user_id = auth.uid()
    OR trip_id IN (
      SELECT trip_id FROM trip_shares
      WHERE shared_with_user_id = auth.uid()
    )
  );

-- =============================================================================
-- STEP 3: Drop all policies that depend on can_access_trip function
-- =============================================================================

DROP POLICY IF EXISTS "trip_days_select_policy" ON trip_days;
DROP POLICY IF EXISTS "day_activities_select_policy" ON day_activities;
DROP POLICY IF EXISTS "accommodations_select_policy" ON accommodations;
DROP POLICY IF EXISTS "transportation_select_policy" ON transportation;
DROP POLICY IF EXISTS "reservations_select_policy" ON reservations;
DROP POLICY IF EXISTS "vision_board_items_select_policy" ON vision_board_items;
DROP POLICY IF EXISTS "other_expenses_select_policy" ON other_expenses;
DROP POLICY IF EXISTS "accommodation_travelers_select_policy" ON accommodation_travelers;
DROP POLICY IF EXISTS "day_activity_travelers_select_policy" ON day_activity_travelers;
DROP POLICY IF EXISTS "reservation_travelers_select_policy" ON reservation_travelers;
DROP POLICY IF EXISTS "transportation_travelers_select_policy" ON transportation_travelers;
DROP POLICY IF EXISTS "ai_chat_threads_select_policy" ON ai_chat_threads;
DROP POLICY IF EXISTS "ai_chat_threads_insert_policy" ON ai_chat_threads;

-- =============================================================================
-- STEP 4: Drop and recreate the SECURITY DEFINER helper function
-- =============================================================================

DROP FUNCTION IF EXISTS can_access_trip(uuid);

-- This function runs with owner privileges (bypasses RLS)
-- Used by related tables to check access without causing recursion
CREATE OR REPLACE FUNCTION can_access_trip(check_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  is_public_trip boolean;
  is_owner boolean;
  is_shared boolean;
BEGIN
  -- Check if trip is public
  SELECT EXISTS (
    SELECT 1 FROM trips WHERE trip_id = check_trip_id AND is_public = true
  ) INTO is_public_trip;

  IF is_public_trip THEN
    RETURN true;
  END IF;

  -- Check if user owns the trip
  SELECT EXISTS (
    SELECT 1 FROM trips WHERE trip_id = check_trip_id AND user_id = auth.uid()
  ) INTO is_owner;

  IF is_owner THEN
    RETURN true;
  END IF;

  -- Check if trip is shared with user
  SELECT EXISTS (
    SELECT 1 FROM trip_shares
    WHERE trip_id = check_trip_id AND shared_with_user_id = auth.uid()
  ) INTO is_shared;

  RETURN is_shared;
END;
$$;

-- =============================================================================
-- STEP 5: Recreate all SELECT policies using the helper function
-- =============================================================================

-- TRIP_DAYS
CREATE POLICY "trip_days_select_policy" ON trip_days
  FOR SELECT USING (can_access_trip(trip_id));

-- DAY_ACTIVITIES
CREATE POLICY "day_activities_select_policy" ON day_activities
  FOR SELECT USING (can_access_trip(trip_id));

-- ACCOMMODATIONS
CREATE POLICY "accommodations_select_policy" ON accommodations
  FOR SELECT USING (can_access_trip(trip_id));

-- TRANSPORTATION
CREATE POLICY "transportation_select_policy" ON transportation
  FOR SELECT USING (can_access_trip(trip_id));

-- RESERVATIONS
CREATE POLICY "reservations_select_policy" ON reservations
  FOR SELECT USING (can_access_trip(trip_id));

-- VISION_BOARD_ITEMS
CREATE POLICY "vision_board_items_select_policy" ON vision_board_items
  FOR SELECT USING (can_access_trip(trip_id));

-- OTHER_EXPENSES
CREATE POLICY "other_expenses_select_policy" ON other_expenses
  FOR SELECT USING (can_access_trip(trip_id));

-- ACCOMMODATION_TRAVELERS
CREATE POLICY "accommodation_travelers_select_policy" ON accommodation_travelers
  FOR SELECT USING (can_access_trip(trip_id));

-- DAY_ACTIVITY_TRAVELERS
CREATE POLICY "day_activity_travelers_select_policy" ON day_activity_travelers
  FOR SELECT USING (can_access_trip(trip_id));

-- RESERVATION_TRAVELERS
CREATE POLICY "reservation_travelers_select_policy" ON reservation_travelers
  FOR SELECT USING (can_access_trip(trip_id));

-- TRANSPORTATION_TRAVELERS
CREATE POLICY "transportation_travelers_select_policy" ON transportation_travelers
  FOR SELECT USING (can_access_trip(trip_id));

-- AI_CHAT_THREADS
-- Users can only see their OWN chat threads (not other users' threads on shared/public trips)
CREATE POLICY "ai_chat_threads_select_policy" ON ai_chat_threads
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert threads if they have trip access
CREATE POLICY "ai_chat_threads_insert_policy" ON ai_chat_threads
  FOR INSERT WITH CHECK (user_id = auth.uid() AND can_access_trip(trip_id));

-- =============================================================================
-- STEP 6: Grant anonymous access for public trips
-- =============================================================================

GRANT SELECT ON trips TO anon;
GRANT SELECT ON trip_days TO anon;
GRANT SELECT ON day_activities TO anon;
GRANT SELECT ON accommodations TO anon;
GRANT SELECT ON transportation TO anon;
GRANT SELECT ON reservations TO anon;
GRANT SELECT ON vision_board_items TO anon;
GRANT SELECT ON other_expenses TO anon;
GRANT SELECT ON accommodation_travelers TO anon;
GRANT SELECT ON day_activity_travelers TO anon;
GRANT SELECT ON reservation_travelers TO anon;
GRANT SELECT ON transportation_travelers TO anon;
-- NOTE: ai_chat_threads is intentionally NOT granted to anon
-- Chat history is private to each authenticated user
GRANT EXECUTE ON FUNCTION can_access_trip(uuid) TO anon;
