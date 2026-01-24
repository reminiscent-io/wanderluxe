-- URGENT FIX: Restore basic trip access
-- The previous migration may have broken access due to CASCADE drops

-- =============================================================================
-- STEP 1: Ensure trips table has basic access policies
-- =============================================================================

-- Drop any existing policies first
DROP POLICY IF EXISTS "trips_select_policy" ON trips;
DROP POLICY IF EXISTS "trips_insert_policy" ON trips;
DROP POLICY IF EXISTS "trips_update_policy" ON trips;
DROP POLICY IF EXISTS "trips_delete_policy" ON trips;
DROP POLICY IF EXISTS "Users can view own trips" ON trips;
DROP POLICY IF EXISTS "Users can view their own trips" ON trips;
DROP POLICY IF EXISTS "Users can insert own trips" ON trips;
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON trips;

-- Basic SELECT: owners can see their trips, public trips visible to all
CREATE POLICY "trips_select_policy" ON trips
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_public = true
  );

-- Allow insert for authenticated users
CREATE POLICY "trips_insert_policy" ON trips
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow update for owners
CREATE POLICY "trips_update_policy" ON trips
  FOR UPDATE
  USING (user_id = auth.uid());

-- Allow delete for owners
CREATE POLICY "trips_delete_policy" ON trips
  FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- STEP 2: Ensure trip_shares has basic access
-- =============================================================================

DROP POLICY IF EXISTS "trip_shares_select_policy" ON trip_shares;
DROP POLICY IF EXISTS "trip_shares_insert_policy" ON trip_shares;
DROP POLICY IF EXISTS "trip_shares_update_policy" ON trip_shares;
DROP POLICY IF EXISTS "trip_shares_delete_policy" ON trip_shares;

-- SELECT: see shares you created OR shares addressed to your email
CREATE POLICY "trip_shares_select_policy" ON trip_shares
  FOR SELECT
  USING (
    shared_by_user_id = auth.uid()
    OR LOWER(shared_with_email) = LOWER(auth.jwt() ->> 'email')
  );

-- INSERT: can create shares for trips you own
CREATE POLICY "trip_shares_insert_policy" ON trip_shares
  FOR INSERT
  WITH CHECK (shared_by_user_id = auth.uid());

-- UPDATE: can update shares you created
CREATE POLICY "trip_shares_update_policy" ON trip_shares
  FOR UPDATE
  USING (shared_by_user_id = auth.uid());

-- DELETE: can delete shares you created
CREATE POLICY "trip_shares_delete_policy" ON trip_shares
  FOR DELETE
  USING (shared_by_user_id = auth.uid());

-- =============================================================================
-- STEP 3: Create simple helper function (no CASCADE)
-- =============================================================================

CREATE OR REPLACE FUNCTION can_access_trip(check_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Owner always has access
  IF EXISTS (SELECT 1 FROM trips WHERE trip_id = check_trip_id AND user_id = auth.uid()) THEN
    RETURN true;
  END IF;

  -- Public trips accessible to all
  IF EXISTS (SELECT 1 FROM trips WHERE trip_id = check_trip_id AND is_public = true) THEN
    RETURN true;
  END IF;

  -- Check email-based sharing
  user_email := LOWER(auth.jwt() ->> 'email');
  IF user_email IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM trip_shares
      WHERE trip_id = check_trip_id
      AND LOWER(shared_with_email) = user_email
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION can_edit_trip(check_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Owner always has edit access
  IF EXISTS (SELECT 1 FROM trips WHERE trip_id = check_trip_id AND user_id = auth.uid()) THEN
    RETURN true;
  END IF;

  -- Check email-based edit permission
  user_email := LOWER(auth.jwt() ->> 'email');
  IF user_email IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM trip_shares
      WHERE trip_id = check_trip_id
      AND LOWER(shared_with_email) = user_email
      AND permission_level = 'edit'
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION can_access_trip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_trip(uuid) TO anon;
GRANT EXECUTE ON FUNCTION can_edit_trip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_edit_trip(uuid) TO anon;

-- =============================================================================
-- STEP 4: Fix related tables with simple policies
-- =============================================================================

-- TRIP_DAYS
DROP POLICY IF EXISTS "trip_days_select_policy" ON trip_days;
DROP POLICY IF EXISTS "trip_days_insert_policy" ON trip_days;
DROP POLICY IF EXISTS "trip_days_update_policy" ON trip_days;
DROP POLICY IF EXISTS "trip_days_delete_policy" ON trip_days;

CREATE POLICY "trip_days_select_policy" ON trip_days
  FOR SELECT USING (can_access_trip(trip_id));
CREATE POLICY "trip_days_insert_policy" ON trip_days
  FOR INSERT WITH CHECK (can_edit_trip(trip_id));
CREATE POLICY "trip_days_update_policy" ON trip_days
  FOR UPDATE USING (can_edit_trip(trip_id));
CREATE POLICY "trip_days_delete_policy" ON trip_days
  FOR DELETE USING (can_edit_trip(trip_id));

-- DAY_ACTIVITIES
DROP POLICY IF EXISTS "day_activities_select_policy" ON day_activities;
DROP POLICY IF EXISTS "day_activities_insert_policy" ON day_activities;
DROP POLICY IF EXISTS "day_activities_update_policy" ON day_activities;
DROP POLICY IF EXISTS "day_activities_delete_policy" ON day_activities;

CREATE POLICY "day_activities_select_policy" ON day_activities
  FOR SELECT USING (can_access_trip(trip_id));
CREATE POLICY "day_activities_insert_policy" ON day_activities
  FOR INSERT WITH CHECK (can_edit_trip(trip_id));
CREATE POLICY "day_activities_update_policy" ON day_activities
  FOR UPDATE USING (can_edit_trip(trip_id));
CREATE POLICY "day_activities_delete_policy" ON day_activities
  FOR DELETE USING (can_edit_trip(trip_id));

-- ACCOMMODATIONS
DROP POLICY IF EXISTS "accommodations_select_policy" ON accommodations;
DROP POLICY IF EXISTS "accommodations_insert_policy" ON accommodations;
DROP POLICY IF EXISTS "accommodations_update_policy" ON accommodations;
DROP POLICY IF EXISTS "accommodations_delete_policy" ON accommodations;

CREATE POLICY "accommodations_select_policy" ON accommodations
  FOR SELECT USING (can_access_trip(trip_id));
CREATE POLICY "accommodations_insert_policy" ON accommodations
  FOR INSERT WITH CHECK (can_edit_trip(trip_id));
CREATE POLICY "accommodations_update_policy" ON accommodations
  FOR UPDATE USING (can_edit_trip(trip_id));
CREATE POLICY "accommodations_delete_policy" ON accommodations
  FOR DELETE USING (can_edit_trip(trip_id));

-- TRANSPORTATION
DROP POLICY IF EXISTS "transportation_select_policy" ON transportation;
DROP POLICY IF EXISTS "transportation_insert_policy" ON transportation;
DROP POLICY IF EXISTS "transportation_update_policy" ON transportation;
DROP POLICY IF EXISTS "transportation_delete_policy" ON transportation;

CREATE POLICY "transportation_select_policy" ON transportation
  FOR SELECT USING (can_access_trip(trip_id));
CREATE POLICY "transportation_insert_policy" ON transportation
  FOR INSERT WITH CHECK (can_edit_trip(trip_id));
CREATE POLICY "transportation_update_policy" ON transportation
  FOR UPDATE USING (can_edit_trip(trip_id));
CREATE POLICY "transportation_delete_policy" ON transportation
  FOR DELETE USING (can_edit_trip(trip_id));

-- RESERVATIONS
DROP POLICY IF EXISTS "reservations_select_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_insert_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_update_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_delete_policy" ON reservations;

CREATE POLICY "reservations_select_policy" ON reservations
  FOR SELECT USING (can_access_trip(trip_id));
CREATE POLICY "reservations_insert_policy" ON reservations
  FOR INSERT WITH CHECK (can_edit_trip(trip_id));
CREATE POLICY "reservations_update_policy" ON reservations
  FOR UPDATE USING (can_edit_trip(trip_id));
CREATE POLICY "reservations_delete_policy" ON reservations
  FOR DELETE USING (can_edit_trip(trip_id));

-- VISION_BOARD_ITEMS
DROP POLICY IF EXISTS "vision_board_items_select_policy" ON vision_board_items;
DROP POLICY IF EXISTS "vision_board_items_insert_policy" ON vision_board_items;
DROP POLICY IF EXISTS "vision_board_items_update_policy" ON vision_board_items;
DROP POLICY IF EXISTS "vision_board_items_delete_policy" ON vision_board_items;

CREATE POLICY "vision_board_items_select_policy" ON vision_board_items
  FOR SELECT USING (can_access_trip(trip_id));
CREATE POLICY "vision_board_items_insert_policy" ON vision_board_items
  FOR INSERT WITH CHECK (can_edit_trip(trip_id));
CREATE POLICY "vision_board_items_update_policy" ON vision_board_items
  FOR UPDATE USING (can_edit_trip(trip_id));
CREATE POLICY "vision_board_items_delete_policy" ON vision_board_items
  FOR DELETE USING (can_edit_trip(trip_id));

-- OTHER_EXPENSES
DROP POLICY IF EXISTS "other_expenses_select_policy" ON other_expenses;
DROP POLICY IF EXISTS "other_expenses_insert_policy" ON other_expenses;
DROP POLICY IF EXISTS "other_expenses_update_policy" ON other_expenses;
DROP POLICY IF EXISTS "other_expenses_delete_policy" ON other_expenses;

CREATE POLICY "other_expenses_select_policy" ON other_expenses
  FOR SELECT USING (can_access_trip(trip_id));
CREATE POLICY "other_expenses_insert_policy" ON other_expenses
  FOR INSERT WITH CHECK (can_edit_trip(trip_id));
CREATE POLICY "other_expenses_update_policy" ON other_expenses
  FOR UPDATE USING (can_edit_trip(trip_id));
CREATE POLICY "other_expenses_delete_policy" ON other_expenses
  FOR DELETE USING (can_edit_trip(trip_id));

-- TRAVELER JUNCTION TABLES
DROP POLICY IF EXISTS "accommodation_travelers_select_policy" ON accommodation_travelers;
DROP POLICY IF EXISTS "accommodation_travelers_insert_policy" ON accommodation_travelers;
DROP POLICY IF EXISTS "accommodation_travelers_delete_policy" ON accommodation_travelers;

CREATE POLICY "accommodation_travelers_select_policy" ON accommodation_travelers
  FOR SELECT USING (can_access_trip(trip_id));
CREATE POLICY "accommodation_travelers_insert_policy" ON accommodation_travelers
  FOR INSERT WITH CHECK (can_edit_trip(trip_id));
CREATE POLICY "accommodation_travelers_delete_policy" ON accommodation_travelers
  FOR DELETE USING (can_edit_trip(trip_id));

DROP POLICY IF EXISTS "day_activity_travelers_select_policy" ON day_activity_travelers;
DROP POLICY IF EXISTS "day_activity_travelers_insert_policy" ON day_activity_travelers;
DROP POLICY IF EXISTS "day_activity_travelers_delete_policy" ON day_activity_travelers;

CREATE POLICY "day_activity_travelers_select_policy" ON day_activity_travelers
  FOR SELECT USING (can_access_trip(trip_id));
CREATE POLICY "day_activity_travelers_insert_policy" ON day_activity_travelers
  FOR INSERT WITH CHECK (can_edit_trip(trip_id));
CREATE POLICY "day_activity_travelers_delete_policy" ON day_activity_travelers
  FOR DELETE USING (can_edit_trip(trip_id));

DROP POLICY IF EXISTS "reservation_travelers_select_policy" ON reservation_travelers;
DROP POLICY IF EXISTS "reservation_travelers_insert_policy" ON reservation_travelers;
DROP POLICY IF EXISTS "reservation_travelers_delete_policy" ON reservation_travelers;

CREATE POLICY "reservation_travelers_select_policy" ON reservation_travelers
  FOR SELECT USING (can_access_trip(trip_id));
CREATE POLICY "reservation_travelers_insert_policy" ON reservation_travelers
  FOR INSERT WITH CHECK (can_edit_trip(trip_id));
CREATE POLICY "reservation_travelers_delete_policy" ON reservation_travelers
  FOR DELETE USING (can_edit_trip(trip_id));

DROP POLICY IF EXISTS "transportation_travelers_select_policy" ON transportation_travelers;
DROP POLICY IF EXISTS "transportation_travelers_insert_policy" ON transportation_travelers;
DROP POLICY IF EXISTS "transportation_travelers_delete_policy" ON transportation_travelers;

CREATE POLICY "transportation_travelers_select_policy" ON transportation_travelers
  FOR SELECT USING (can_access_trip(trip_id));
CREATE POLICY "transportation_travelers_insert_policy" ON transportation_travelers
  FOR INSERT WITH CHECK (can_edit_trip(trip_id));
CREATE POLICY "transportation_travelers_delete_policy" ON transportation_travelers
  FOR DELETE USING (can_edit_trip(trip_id));
