-- Incremental fix to complete the SECURITY DEFINER migration
-- Run this ONLY if you already ran the original can_access_trip() function and trips policies

-- =============================================================================
-- STEP 1: Add the missing can_edit_trip() function
-- =============================================================================

CREATE OR REPLACE FUNCTION can_edit_trip(check_trip_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trips WHERE trip_id = check_trip_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM trip_shares
    WHERE trip_id = check_trip_id
    AND shared_with_user_id = auth.uid()
    AND permission_level = 'edit'
  );
$$;

-- =============================================================================
-- STEP 2: Fix trips UPDATE policy (if not already done)
-- =============================================================================

DROP POLICY IF EXISTS "trips_update_policy" ON trips;

CREATE POLICY "trips_update_policy" ON trips
  FOR UPDATE
  USING (can_edit_trip(trip_id));

-- =============================================================================
-- STEP 3: Fix TRANSPORTATION table policies
-- =============================================================================

DROP POLICY IF EXISTS "transportation_select_policy" ON transportation;
DROP POLICY IF EXISTS "transportation_insert_policy" ON transportation;
DROP POLICY IF EXISTS "transportation_update_policy" ON transportation;
DROP POLICY IF EXISTS "transportation_delete_policy" ON transportation;

CREATE POLICY "transportation_select_policy" ON transportation
  FOR SELECT
  USING (can_access_trip(trip_id));

CREATE POLICY "transportation_insert_policy" ON transportation
  FOR INSERT
  WITH CHECK (can_edit_trip(trip_id));

CREATE POLICY "transportation_update_policy" ON transportation
  FOR UPDATE
  USING (can_edit_trip(trip_id));

CREATE POLICY "transportation_delete_policy" ON transportation
  FOR DELETE
  USING (can_edit_trip(trip_id));

-- =============================================================================
-- STEP 4: Fix EXPENSES table policies
-- =============================================================================

DROP POLICY IF EXISTS "expenses_insert_policy" ON expenses;

CREATE POLICY "expenses_insert_policy" ON expenses
  FOR INSERT
  WITH CHECK (can_edit_trip(trip_id));

-- =============================================================================
-- STEP 5: Fix OTHER_EXPENSES table policies
-- =============================================================================

DROP POLICY IF EXISTS "other_expenses_select_policy" ON other_expenses;
DROP POLICY IF EXISTS "other_expenses_insert_policy" ON other_expenses;
DROP POLICY IF EXISTS "other_expenses_update_policy" ON other_expenses;
DROP POLICY IF EXISTS "other_expenses_delete_policy" ON other_expenses;

CREATE POLICY "other_expenses_select_policy" ON other_expenses
  FOR SELECT
  USING (can_access_trip(trip_id));

CREATE POLICY "other_expenses_insert_policy" ON other_expenses
  FOR INSERT
  WITH CHECK (can_edit_trip(trip_id));

CREATE POLICY "other_expenses_update_policy" ON other_expenses
  FOR UPDATE
  USING (can_edit_trip(trip_id));

CREATE POLICY "other_expenses_delete_policy" ON other_expenses
  FOR DELETE
  USING (can_edit_trip(trip_id));

-- =============================================================================
-- STEP 6: Fix ACCOMMODATION_TRAVELERS table policies
-- =============================================================================

DROP POLICY IF EXISTS "accommodation_travelers_select_policy" ON accommodation_travelers;
DROP POLICY IF EXISTS "accommodation_travelers_insert_policy" ON accommodation_travelers;
DROP POLICY IF EXISTS "accommodation_travelers_update_policy" ON accommodation_travelers;
DROP POLICY IF EXISTS "accommodation_travelers_delete_policy" ON accommodation_travelers;

CREATE POLICY "accommodation_travelers_select_policy" ON accommodation_travelers
  FOR SELECT
  USING (can_access_trip(trip_id));

CREATE POLICY "accommodation_travelers_insert_policy" ON accommodation_travelers
  FOR INSERT
  WITH CHECK (can_edit_trip(trip_id));

CREATE POLICY "accommodation_travelers_update_policy" ON accommodation_travelers
  FOR UPDATE
  USING (can_edit_trip(trip_id));

CREATE POLICY "accommodation_travelers_delete_policy" ON accommodation_travelers
  FOR DELETE
  USING (can_edit_trip(trip_id));

-- =============================================================================
-- STEP 7: Fix DAY_ACTIVITY_TRAVELERS table policies
-- =============================================================================

DROP POLICY IF EXISTS "day_activity_travelers_select_policy" ON day_activity_travelers;
DROP POLICY IF EXISTS "day_activity_travelers_insert_policy" ON day_activity_travelers;
DROP POLICY IF EXISTS "day_activity_travelers_update_policy" ON day_activity_travelers;
DROP POLICY IF EXISTS "day_activity_travelers_delete_policy" ON day_activity_travelers;

CREATE POLICY "day_activity_travelers_select_policy" ON day_activity_travelers
  FOR SELECT
  USING (can_access_trip(trip_id));

CREATE POLICY "day_activity_travelers_insert_policy" ON day_activity_travelers
  FOR INSERT
  WITH CHECK (can_edit_trip(trip_id));

CREATE POLICY "day_activity_travelers_update_policy" ON day_activity_travelers
  FOR UPDATE
  USING (can_edit_trip(trip_id));

CREATE POLICY "day_activity_travelers_delete_policy" ON day_activity_travelers
  FOR DELETE
  USING (can_edit_trip(trip_id));

-- =============================================================================
-- STEP 8: Fix RESERVATION_TRAVELERS table policies
-- =============================================================================

DROP POLICY IF EXISTS "reservation_travelers_select_policy" ON reservation_travelers;
DROP POLICY IF EXISTS "reservation_travelers_insert_policy" ON reservation_travelers;
DROP POLICY IF EXISTS "reservation_travelers_update_policy" ON reservation_travelers;
DROP POLICY IF EXISTS "reservation_travelers_delete_policy" ON reservation_travelers;

CREATE POLICY "reservation_travelers_select_policy" ON reservation_travelers
  FOR SELECT
  USING (can_access_trip(trip_id));

CREATE POLICY "reservation_travelers_insert_policy" ON reservation_travelers
  FOR INSERT
  WITH CHECK (can_edit_trip(trip_id));

CREATE POLICY "reservation_travelers_update_policy" ON reservation_travelers
  FOR UPDATE
  USING (can_edit_trip(trip_id));

CREATE POLICY "reservation_travelers_delete_policy" ON reservation_travelers
  FOR DELETE
  USING (can_edit_trip(trip_id));

-- =============================================================================
-- STEP 9: Fix TRANSPORTATION_TRAVELERS table policies
-- =============================================================================

DROP POLICY IF EXISTS "transportation_travelers_select_policy" ON transportation_travelers;
DROP POLICY IF EXISTS "transportation_travelers_insert_policy" ON transportation_travelers;
DROP POLICY IF EXISTS "transportation_travelers_update_policy" ON transportation_travelers;
DROP POLICY IF EXISTS "transportation_travelers_delete_policy" ON transportation_travelers;

CREATE POLICY "transportation_travelers_select_policy" ON transportation_travelers
  FOR SELECT
  USING (can_access_trip(trip_id));

CREATE POLICY "transportation_travelers_insert_policy" ON transportation_travelers
  FOR INSERT
  WITH CHECK (can_edit_trip(trip_id));

CREATE POLICY "transportation_travelers_update_policy" ON transportation_travelers
  FOR UPDATE
  USING (can_edit_trip(trip_id));

CREATE POLICY "transportation_travelers_delete_policy" ON transportation_travelers
  FOR DELETE
  USING (can_edit_trip(trip_id));

-- =============================================================================
-- STEP 10: Fix TRIP_DAYS table policies
-- =============================================================================

DROP POLICY IF EXISTS "trip_days_select_policy" ON trip_days;
DROP POLICY IF EXISTS "trip_days_insert_policy" ON trip_days;
DROP POLICY IF EXISTS "trip_days_update_policy" ON trip_days;
DROP POLICY IF EXISTS "trip_days_delete_policy" ON trip_days;

CREATE POLICY "trip_days_select_policy" ON trip_days
  FOR SELECT
  USING (can_access_trip(trip_id));

CREATE POLICY "trip_days_insert_policy" ON trip_days
  FOR INSERT
  WITH CHECK (can_edit_trip(trip_id));

CREATE POLICY "trip_days_update_policy" ON trip_days
  FOR UPDATE
  USING (can_edit_trip(trip_id));

CREATE POLICY "trip_days_delete_policy" ON trip_days
  FOR DELETE
  USING (can_edit_trip(trip_id));

-- =============================================================================
-- STEP 11: Fix VISION_BOARD_ITEMS table policies
-- =============================================================================

DROP POLICY IF EXISTS "vision_board_items_select_policy" ON vision_board_items;
DROP POLICY IF EXISTS "vision_board_items_insert_policy" ON vision_board_items;
DROP POLICY IF EXISTS "vision_board_items_update_policy" ON vision_board_items;
DROP POLICY IF EXISTS "vision_board_items_delete_policy" ON vision_board_items;

CREATE POLICY "vision_board_items_select_policy" ON vision_board_items
  FOR SELECT
  USING (can_access_trip(trip_id));

CREATE POLICY "vision_board_items_insert_policy" ON vision_board_items
  FOR INSERT
  WITH CHECK (can_edit_trip(trip_id));

CREATE POLICY "vision_board_items_update_policy" ON vision_board_items
  FOR UPDATE
  USING (can_edit_trip(trip_id));

CREATE POLICY "vision_board_items_delete_policy" ON vision_board_items
  FOR DELETE
  USING (can_edit_trip(trip_id));
