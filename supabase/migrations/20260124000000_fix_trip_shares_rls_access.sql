-- Fix RLS policies to use EMAIL matching instead of shared_with_user_id
-- The shared_with_user_id field is NULL when users are invited via email
-- All access checks must use shared_with_email for proper sharing to work

-- =============================================================================
-- STEP 1: Drop and recreate can_access_trip with EMAIL matching
-- =============================================================================

DROP FUNCTION IF EXISTS can_access_trip(uuid) CASCADE;

CREATE OR REPLACE FUNCTION can_access_trip(check_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_email text;
  is_public_trip boolean;
  is_owner boolean;
  is_shared boolean;
BEGIN
  -- Get current user's email (lowercase for comparison)
  user_email := LOWER(auth.jwt() ->> 'email');

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

  -- Check if trip is shared with user BY EMAIL (not user_id!)
  IF user_email IS NOT NULL AND user_email != '' THEN
    SELECT EXISTS (
      SELECT 1 FROM trip_shares
      WHERE trip_id = check_trip_id
      AND LOWER(shared_with_email) = user_email
    ) INTO is_shared;

    RETURN COALESCE(is_shared, false);
  END IF;

  RETURN false;
END;
$$;

-- =============================================================================
-- STEP 2: Drop and recreate can_edit_trip with EMAIL matching
-- =============================================================================

DROP FUNCTION IF EXISTS can_edit_trip(uuid) CASCADE;

CREATE OR REPLACE FUNCTION can_edit_trip(check_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_email text;
  is_owner boolean;
  has_edit_permission boolean;
BEGIN
  user_email := LOWER(auth.jwt() ->> 'email');

  -- Owners always have edit access
  SELECT EXISTS (
    SELECT 1 FROM trips WHERE trip_id = check_trip_id AND user_id = auth.uid()
  ) INTO is_owner;

  IF is_owner THEN
    RETURN true;
  END IF;

  -- Check if user has edit permission via sharing BY EMAIL
  IF user_email IS NOT NULL AND user_email != '' THEN
    SELECT EXISTS (
      SELECT 1 FROM trip_shares
      WHERE trip_id = check_trip_id
      AND LOWER(shared_with_email) = user_email
      AND permission_level = 'edit'
    ) INTO has_edit_permission;

    RETURN COALESCE(has_edit_permission, false);
  END IF;

  RETURN false;
END;
$$;

-- =============================================================================
-- STEP 3: Fix trip_shares SELECT policy
-- =============================================================================

DROP POLICY IF EXISTS "trip_shares_select_policy" ON trip_shares;

-- Users can see trip_shares if:
-- 1. They created the share (they're the trip owner sharing with others)
-- 2. They are the recipient (matched by EMAIL, not user_id)
-- 3. They have access to the trip (can see other travelers)
CREATE POLICY "trip_shares_select_policy" ON trip_shares
  FOR SELECT
  USING (
    -- You created the share
    shared_by_user_id = auth.uid()
    -- OR you're the recipient of this share (by EMAIL)
    OR LOWER(shared_with_email) = LOWER(auth.jwt() ->> 'email')
    -- OR you own the associated trip
    OR trip_id IN (SELECT trip_id FROM trips WHERE user_id = auth.uid())
    -- OR you have access to the trip via another share (can see teammates)
    OR trip_id IN (
      SELECT trip_id FROM trip_shares
      WHERE LOWER(shared_with_email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- =============================================================================
-- STEP 4: Fix trips SELECT policy
-- =============================================================================

DROP POLICY IF EXISTS "trips_select_policy" ON trips;

-- Users can view trips if:
-- 1. Trip is public
-- 2. They own it
-- 3. It's shared with them (by EMAIL, not user_id)
CREATE POLICY "trips_select_policy" ON trips
  FOR SELECT
  USING (
    is_public = true
    OR user_id = auth.uid()
    OR trip_id IN (
      SELECT trip_id FROM trip_shares
      WHERE LOWER(shared_with_email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- =============================================================================
-- STEP 5: Fix trips UPDATE policy
-- =============================================================================

DROP POLICY IF EXISTS "trips_update_policy" ON trips;

CREATE POLICY "trips_update_policy" ON trips
  FOR UPDATE
  USING (can_edit_trip(trip_id));

-- =============================================================================
-- STEP 6: Recreate all related table SELECT policies using the fixed function
-- =============================================================================

-- TRIP_DAYS
DROP POLICY IF EXISTS "trip_days_select_policy" ON trip_days;
CREATE POLICY "trip_days_select_policy" ON trip_days
  FOR SELECT USING (can_access_trip(trip_id));

-- DAY_ACTIVITIES
DROP POLICY IF EXISTS "day_activities_select_policy" ON day_activities;
CREATE POLICY "day_activities_select_policy" ON day_activities
  FOR SELECT USING (can_access_trip(trip_id));

-- ACCOMMODATIONS
DROP POLICY IF EXISTS "accommodations_select_policy" ON accommodations;
CREATE POLICY "accommodations_select_policy" ON accommodations
  FOR SELECT USING (can_access_trip(trip_id));

-- TRANSPORTATION
DROP POLICY IF EXISTS "transportation_select_policy" ON transportation;
CREATE POLICY "transportation_select_policy" ON transportation
  FOR SELECT USING (can_access_trip(trip_id));

-- RESERVATIONS
DROP POLICY IF EXISTS "reservations_select_policy" ON reservations;
CREATE POLICY "reservations_select_policy" ON reservations
  FOR SELECT USING (can_access_trip(trip_id));

-- VISION_BOARD_ITEMS
DROP POLICY IF EXISTS "vision_board_items_select_policy" ON vision_board_items;
CREATE POLICY "vision_board_items_select_policy" ON vision_board_items
  FOR SELECT USING (can_access_trip(trip_id));

-- OTHER_EXPENSES
DROP POLICY IF EXISTS "other_expenses_select_policy" ON other_expenses;
CREATE POLICY "other_expenses_select_policy" ON other_expenses
  FOR SELECT USING (can_access_trip(trip_id));

-- ACCOMMODATION_TRAVELERS
DROP POLICY IF EXISTS "accommodation_travelers_select_policy" ON accommodation_travelers;
CREATE POLICY "accommodation_travelers_select_policy" ON accommodation_travelers
  FOR SELECT USING (can_access_trip(trip_id));

-- DAY_ACTIVITY_TRAVELERS
DROP POLICY IF EXISTS "day_activity_travelers_select_policy" ON day_activity_travelers;
CREATE POLICY "day_activity_travelers_select_policy" ON day_activity_travelers
  FOR SELECT USING (can_access_trip(trip_id));

-- RESERVATION_TRAVELERS
DROP POLICY IF EXISTS "reservation_travelers_select_policy" ON reservation_travelers;
CREATE POLICY "reservation_travelers_select_policy" ON reservation_travelers
  FOR SELECT USING (can_access_trip(trip_id));

-- TRANSPORTATION_TRAVELERS
DROP POLICY IF EXISTS "transportation_travelers_select_policy" ON transportation_travelers;
CREATE POLICY "transportation_travelers_select_policy" ON transportation_travelers
  FOR SELECT USING (can_access_trip(trip_id));

-- =============================================================================
-- STEP 7: Grant execute permissions on functions
-- =============================================================================

GRANT EXECUTE ON FUNCTION can_access_trip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_trip(uuid) TO anon;
GRANT EXECUTE ON FUNCTION can_edit_trip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_edit_trip(uuid) TO anon;

-- =============================================================================
-- STEP 8: Grant SELECT on tables for public/anonymous access
-- =============================================================================

GRANT SELECT ON trips TO anon;
GRANT SELECT ON trip_shares TO anon;
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
