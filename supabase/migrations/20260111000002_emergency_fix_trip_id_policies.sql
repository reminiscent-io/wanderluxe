-- EMERGENCY FIX: Recreate all RLS policies with correct trip_id field references
-- This fixes the critical bug where policies were using "id" instead of "trip_id"
-- which prevented users from viewing their own trips.
--
-- The trips table uses trip_id as the primary key, NOT id.
-- All subqueries must use "SELECT trip_id FROM trips" not "SELECT id FROM trips"

-- =============================================================================
-- STEP 1: Fix TRIPS table policies - CRITICAL FIX
-- =============================================================================

DROP POLICY IF EXISTS "trips_select_policy" ON trips;
DROP POLICY IF EXISTS "trips_update_policy" ON trips;

CREATE POLICY "trips_select_policy" ON trips
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR trip_id IN (
      SELECT trip_id FROM trip_shares
      WHERE shared_with_user_id = (select auth.uid())
    )
  );

CREATE POLICY "trips_update_policy" ON trips
  FOR UPDATE
  USING (
    user_id = (select auth.uid())
    OR trip_id IN (
      SELECT trip_id FROM trip_shares
      WHERE shared_with_user_id = (select auth.uid())
      AND permission_level = 'edit'
    )
  );

-- =============================================================================
-- STEP 2: Fix TRANSPORTATION table policies
-- =============================================================================

DROP POLICY IF EXISTS "transportation_select_policy" ON transportation;
DROP POLICY IF EXISTS "transportation_insert_policy" ON transportation;
DROP POLICY IF EXISTS "transportation_update_policy" ON transportation;
DROP POLICY IF EXISTS "transportation_delete_policy" ON transportation;

CREATE POLICY "transportation_select_policy" ON transportation
  FOR SELECT
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
      )
    )
  );

CREATE POLICY "transportation_insert_policy" ON transportation
  FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

CREATE POLICY "transportation_update_policy" ON transportation
  FOR UPDATE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

CREATE POLICY "transportation_delete_policy" ON transportation
  FOR DELETE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

-- =============================================================================
-- STEP 3: Fix EXPENSES table policies
-- =============================================================================

DROP POLICY IF EXISTS "expenses_insert_policy" ON expenses;

CREATE POLICY "expenses_insert_policy" ON expenses
  FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

-- =============================================================================
-- STEP 4: Fix OTHER_EXPENSES table policies
-- =============================================================================

DROP POLICY IF EXISTS "other_expenses_select_policy" ON other_expenses;
DROP POLICY IF EXISTS "other_expenses_insert_policy" ON other_expenses;
DROP POLICY IF EXISTS "other_expenses_update_policy" ON other_expenses;
DROP POLICY IF EXISTS "other_expenses_delete_policy" ON other_expenses;

CREATE POLICY "other_expenses_select_policy" ON other_expenses
  FOR SELECT
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
      )
    )
  );

CREATE POLICY "other_expenses_insert_policy" ON other_expenses
  FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

CREATE POLICY "other_expenses_update_policy" ON other_expenses
  FOR UPDATE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

CREATE POLICY "other_expenses_delete_policy" ON other_expenses
  FOR DELETE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

-- =============================================================================
-- STEP 5: Fix ACCOMMODATION_TRAVELERS table policies
-- =============================================================================

DROP POLICY IF EXISTS "accommodation_travelers_select_policy" ON accommodation_travelers;
DROP POLICY IF EXISTS "accommodation_travelers_insert_policy" ON accommodation_travelers;
DROP POLICY IF EXISTS "accommodation_travelers_update_policy" ON accommodation_travelers;
DROP POLICY IF EXISTS "accommodation_travelers_delete_policy" ON accommodation_travelers;

CREATE POLICY "accommodation_travelers_select_policy" ON accommodation_travelers
  FOR SELECT
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
      )
    )
  );

CREATE POLICY "accommodation_travelers_insert_policy" ON accommodation_travelers
  FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

CREATE POLICY "accommodation_travelers_update_policy" ON accommodation_travelers
  FOR UPDATE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

CREATE POLICY "accommodation_travelers_delete_policy" ON accommodation_travelers
  FOR DELETE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

-- =============================================================================
-- STEP 6: Fix DAY_ACTIVITY_TRAVELERS table policies
-- =============================================================================

DROP POLICY IF EXISTS "day_activity_travelers_select_policy" ON day_activity_travelers;
DROP POLICY IF EXISTS "day_activity_travelers_insert_policy" ON day_activity_travelers;
DROP POLICY IF EXISTS "day_activity_travelers_update_policy" ON day_activity_travelers;
DROP POLICY IF EXISTS "day_activity_travelers_delete_policy" ON day_activity_travelers;

CREATE POLICY "day_activity_travelers_select_policy" ON day_activity_travelers
  FOR SELECT
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
      )
    )
  );

CREATE POLICY "day_activity_travelers_insert_policy" ON day_activity_travelers
  FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

CREATE POLICY "day_activity_travelers_update_policy" ON day_activity_travelers
  FOR UPDATE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

CREATE POLICY "day_activity_travelers_delete_policy" ON day_activity_travelers
  FOR DELETE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

-- =============================================================================
-- STEP 7: Fix RESERVATION_TRAVELERS table policies
-- =============================================================================

DROP POLICY IF EXISTS "reservation_travelers_select_policy" ON reservation_travelers;
DROP POLICY IF EXISTS "reservation_travelers_insert_policy" ON reservation_travelers;
DROP POLICY IF EXISTS "reservation_travelers_update_policy" ON reservation_travelers;
DROP POLICY IF EXISTS "reservation_travelers_delete_policy" ON reservation_travelers;

CREATE POLICY "reservation_travelers_select_policy" ON reservation_travelers
  FOR SELECT
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
      )
    )
  );

CREATE POLICY "reservation_travelers_insert_policy" ON reservation_travelers
  FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

CREATE POLICY "reservation_travelers_update_policy" ON reservation_travelers
  FOR UPDATE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

CREATE POLICY "reservation_travelers_delete_policy" ON reservation_travelers
  FOR DELETE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

-- =============================================================================
-- STEP 8: Fix TRANSPORTATION_TRAVELERS table policies
-- =============================================================================

DROP POLICY IF EXISTS "transportation_travelers_select_policy" ON transportation_travelers;
DROP POLICY IF EXISTS "transportation_travelers_insert_policy" ON transportation_travelers;
DROP POLICY IF EXISTS "transportation_travelers_update_policy" ON transportation_travelers;
DROP POLICY IF EXISTS "transportation_travelers_delete_policy" ON transportation_travelers;

CREATE POLICY "transportation_travelers_select_policy" ON transportation_travelers
  FOR SELECT
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
      )
    )
  );

CREATE POLICY "transportation_travelers_insert_policy" ON transportation_travelers
  FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

CREATE POLICY "transportation_travelers_update_policy" ON transportation_travelers
  FOR UPDATE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

CREATE POLICY "transportation_travelers_delete_policy" ON transportation_travelers
  FOR DELETE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

-- =============================================================================
-- STEP 9: Fix TRIP_SHARES table policies
-- =============================================================================

DROP POLICY IF EXISTS "trip_shares_select_policy" ON trip_shares;
DROP POLICY IF EXISTS "trip_shares_insert_policy" ON trip_shares;
DROP POLICY IF EXISTS "trip_shares_update_policy" ON trip_shares;
DROP POLICY IF EXISTS "trip_shares_delete_policy" ON trip_shares;

CREATE POLICY "trip_shares_select_policy" ON trip_shares
  FOR SELECT
  USING (
    trip_id IN (
      SELECT trip_id FROM trips WHERE user_id = (select auth.uid())
    )
    OR shared_with_user_id = (select auth.uid())
  );

CREATE POLICY "trip_shares_insert_policy" ON trip_shares
  FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trips WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "trip_shares_update_policy" ON trip_shares
  FOR UPDATE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "trip_shares_delete_policy" ON trip_shares
  FOR DELETE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips WHERE user_id = (select auth.uid())
    )
  );

-- =============================================================================
-- STEP 10: Fix TRIP_DAYS table policies
-- =============================================================================

DROP POLICY IF EXISTS "trip_days_select_policy" ON trip_days;
DROP POLICY IF EXISTS "trip_days_insert_policy" ON trip_days;
DROP POLICY IF EXISTS "trip_days_update_policy" ON trip_days;
DROP POLICY IF EXISTS "trip_days_delete_policy" ON trip_days;

CREATE POLICY "trip_days_select_policy" ON trip_days
  FOR SELECT
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
      )
    )
  );

CREATE POLICY "trip_days_insert_policy" ON trip_days
  FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

CREATE POLICY "trip_days_update_policy" ON trip_days
  FOR UPDATE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

CREATE POLICY "trip_days_delete_policy" ON trip_days
  FOR DELETE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

-- =============================================================================
-- STEP 11: Fix VISION_BOARD_ITEMS table policies
-- =============================================================================

DROP POLICY IF EXISTS "vision_board_items_select_policy" ON vision_board_items;
DROP POLICY IF EXISTS "vision_board_items_insert_policy" ON vision_board_items;
DROP POLICY IF EXISTS "vision_board_items_update_policy" ON vision_board_items;
DROP POLICY IF EXISTS "vision_board_items_delete_policy" ON vision_board_items;

CREATE POLICY "vision_board_items_select_policy" ON vision_board_items
  FOR SELECT
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
      )
    )
  );

CREATE POLICY "vision_board_items_insert_policy" ON vision_board_items
  FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

CREATE POLICY "vision_board_items_update_policy" ON vision_board_items
  FOR UPDATE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );

CREATE POLICY "vision_board_items_delete_policy" ON vision_board_items
  FOR DELETE
  USING (
    trip_id IN (
      SELECT trip_id FROM trips
      WHERE user_id = (select auth.uid())
      OR trip_id IN (
        SELECT trip_id FROM trip_shares
        WHERE shared_with_user_id = (select auth.uid())
        AND permission_level = 'edit'
      )
    )
  );
