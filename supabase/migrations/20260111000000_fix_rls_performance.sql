-- Migration to fix RLS performance issues
-- Fixes:
-- 1. Auth RLS Initialization Plan: Replace auth.uid() with (select auth.uid())
-- 2. Multiple Permissive Policies: Consolidate duplicate policies
-- 3. Duplicate Indexes: Drop redundant indexes
--
-- IMPORTANT FIX:
-- Your trips table primary key is trip_id (NOT id), so this migration uses trips.trip_id everywhere.

-- =============================================================================
-- STEP 1: Drop duplicate indexes
-- =============================================================================

-- accommodation_travelers
DROP INDEX IF EXISTS idx_accommodation_travelers_traveler_id;
DROP INDEX IF EXISTS idx_accommodation_travelers_trip_id;

-- accommodations
DROP INDEX IF EXISTS idx_accommodations_trip_id;

-- day_activity_travelers
DROP INDEX IF EXISTS idx_day_activity_travelers_traveler_id;
DROP INDEX IF EXISTS idx_day_activity_travelers_trip_id;

-- expenses
DROP INDEX IF EXISTS idx_expenses_trip_id;

-- reservation_travelers
DROP INDEX IF EXISTS idx_reservation_travelers_traveler_id;
DROP INDEX IF EXISTS idx_reservation_travelers_trip_id;

-- transportation_travelers
DROP INDEX IF EXISTS idx_transportation_travelers_traveler_id;
DROP INDEX IF EXISTS idx_transportation_travelers_trip_id;

-- trip_shares
DROP INDEX IF EXISTS idx_trip_shares_trip_id;

-- trips
DROP INDEX IF EXISTS idx_trips_user_id;

-- =============================================================================
-- STEP 2: Fix TRIPS table policies
-- =============================================================================

-- Drop all existing trips policies
DROP POLICY IF EXISTS "Allow authenticated users to insert trips" ON trips;
DROP POLICY IF EXISTS "Allow delete for owners only" ON trips;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON trips;
DROP POLICY IF EXISTS "Allow users to delete their own trips" ON trips;
DROP POLICY IF EXISTS "Allow users to update their own trips" ON trips;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON trips;
DROP POLICY IF EXISTS "Users can create their own trips" ON trips;
DROP POLICY IF EXISTS "trip_insert_policy" ON trips;
DROP POLICY IF EXISTS "trip_delete_policy" ON trips;
DROP POLICY IF EXISTS "trips_select_combined" ON trips;
DROP POLICY IF EXISTS "Allow update with edit permission" ON trips;
DROP POLICY IF EXISTS "trip_update_policy" ON trips;
DROP POLICY IF EXISTS "Public can read public trips" ON trips;

-- Create consolidated optimized policies for trips
CREATE POLICY "trips_select_policy" ON trips
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR trip_id IN (
      SELECT trip_id FROM trip_shares
      WHERE shared_with_user_id = (select auth.uid())
    )
  );

CREATE POLICY "trips_insert_policy" ON trips
  FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);

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

CREATE POLICY "trips_delete_policy" ON trips
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- =============================================================================
-- STEP 3: Fix TRANSPORTATION table policies
-- =============================================================================

-- Drop all existing transportation policies
DROP POLICY IF EXISTS "Users can delete their own transportation events" ON transportation;
DROP POLICY IF EXISTS "Users can delete their transportation events" ON transportation;
DROP POLICY IF EXISTS "Users can insert their own transportation events" ON transportation;
DROP POLICY IF EXISTS "Users can insert their transportation events" ON transportation;
DROP POLICY IF EXISTS "Users can update their own transportation events" ON transportation;
DROP POLICY IF EXISTS "Users can update their transportation events" ON transportation;
DROP POLICY IF EXISTS "Users can view their own transportation events" ON transportation;
DROP POLICY IF EXISTS "Users can view their transportation events" ON transportation;
DROP POLICY IF EXISTS "transportation_select_combined" ON transportation;
DROP POLICY IF EXISTS "Allow delete transportation with edit permission" ON transportation;
DROP POLICY IF EXISTS "Allow insert transportation with edit permission" ON transportation;
DROP POLICY IF EXISTS "Allow update transportation with edit permission" ON transportation;
DROP POLICY IF EXISTS "transportation_delete_policy" ON transportation;
DROP POLICY IF EXISTS "transportation_insert_policy" ON transportation;
DROP POLICY IF EXISTS "transportation_update_policy" ON transportation;

-- Create consolidated optimized policies for transportation
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
-- STEP 4: Fix EXPENSES table policies
-- =============================================================================

-- Drop existing expenses policies
DROP POLICY IF EXISTS "Users can insert expenses for their own trips" ON expenses;
DROP POLICY IF EXISTS "expenses_insert_policy" ON expenses;

-- Create consolidated optimized policy for expenses
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
-- STEP 5: Fix OTHER_EXPENSES table policies
-- =============================================================================

-- Drop existing other_expenses policies
DROP POLICY IF EXISTS "Users can manage their own expenses" ON other_expenses;
DROP POLICY IF EXISTS "Allow delete other expenses with edit permission" ON other_expenses;
DROP POLICY IF EXISTS "Allow insert other expenses with edit permission" ON other_expenses;
DROP POLICY IF EXISTS "Allow read access to other expenses" ON other_expenses;
DROP POLICY IF EXISTS "Allow update other expenses with edit permission" ON other_expenses;
DROP POLICY IF EXISTS "other_expenses_delete_policy" ON other_expenses;
DROP POLICY IF EXISTS "other_expenses_insert_policy" ON other_expenses;
DROP POLICY IF EXISTS "other_expenses_select_policy" ON other_expenses;
DROP POLICY IF EXISTS "other_expenses_update_policy" ON other_expenses;

-- Create consolidated optimized policies for other_expenses
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
-- STEP 6: Fix ACCOMMODATION_TRAVELERS table policies
-- =============================================================================

-- Drop existing accommodation_travelers policies
DROP POLICY IF EXISTS "acctrav_d" ON accommodation_travelers;
DROP POLICY IF EXISTS "acctrav_i" ON accommodation_travelers;
DROP POLICY IF EXISTS "acctrav_u" ON accommodation_travelers;

-- Create consolidated optimized policies for accommodation_travelers
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
-- STEP 7: Fix DAY_ACTIVITY_TRAVELERS table policies
-- =============================================================================

-- Drop existing day_activity_travelers policies
DROP POLICY IF EXISTS "acttrav_d" ON day_activity_travelers;
DROP POLICY IF EXISTS "acttrav_i" ON day_activity_travelers;
DROP POLICY IF EXISTS "acttrav_u" ON day_activity_travelers;

-- Create consolidated optimized policies for day_activity_travelers
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
-- STEP 8: Fix RESERVATION_TRAVELERS table policies
-- =============================================================================

-- Drop existing reservation_travelers policies
DROP POLICY IF EXISTS "rsvtrav_d" ON reservation_travelers;
DROP POLICY IF EXISTS "rsvtrav_i" ON reservation_travelers;
DROP POLICY IF EXISTS "rsvtrav_u" ON reservation_travelers;

-- Create consolidated optimized policies for reservation_travelers
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
-- STEP 9: Fix TRANSPORTATION_TRAVELERS table policies
-- =============================================================================

-- Drop existing transportation_travelers policies
DROP POLICY IF EXISTS "tptrav_d" ON transportation_travelers;
DROP POLICY IF EXISTS "tptrav_i" ON transportation_travelers;
DROP POLICY IF EXISTS "tptrav_u" ON transportation_travelers;

-- Create consolidated optimized policies for transportation_travelers
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
-- STEP 10: Fix TRIP_SHARES table policies
-- =============================================================================

-- Drop existing trip_shares policies
DROP POLICY IF EXISTS "trip_owners_can_manage_shares" ON trip_shares;
DROP POLICY IF EXISTS "users_can_view_their_shares" ON trip_shares;

-- Create consolidated optimized policies for trip_shares
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
-- STEP 11: Fix TRIP_DAYS table policies
-- =============================================================================

-- Drop existing trip_days policies
DROP POLICY IF EXISTS "Allow delete trip days with edit permission" ON trip_days;
DROP POLICY IF EXISTS "Allow insert trip days with edit permission" ON trip_days;
DROP POLICY IF EXISTS "Allow update trip days with edit permission" ON trip_days;
DROP POLICY IF EXISTS "trip_days_delete_policy" ON trip_days;
DROP POLICY IF EXISTS "trip_days_insert_policy" ON trip_days;
DROP POLICY IF EXISTS "trip_days_update_policy" ON trip_days;

-- Create consolidated optimized policies for trip_days
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
-- STEP 12: Fix VISION_BOARD_ITEMS table policies
-- =============================================================================

-- Drop existing vision_board_items policies
DROP POLICY IF EXISTS "Allow delete vision board items with edit permission" ON vision_board_items;
DROP POLICY IF EXISTS "Allow insert vision board items with edit permission" ON vision_board_items;
DROP POLICY IF EXISTS "Allow read access to vision board items" ON vision_board_items;
DROP POLICY IF EXISTS "Allow update vision board items with edit permission" ON vision_board_items;
DROP POLICY IF EXISTS "vision_board_items_delete_policy" ON vision_board_items;
DROP POLICY IF EXISTS "vision_board_items_insert_policy" ON vision_board_items;
DROP POLICY IF EXISTS "vision_board_items_select_policy" ON vision_board_items;
DROP POLICY IF EXISTS "vision_board_items_update_policy" ON vision_board_items;

-- Create consolidated optimized policies for vision_board_items
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

-- =============================================================================
-- STEP 13: Fix PROFILES table policies
-- =============================================================================

-- Drop existing profiles policies
DROP POLICY IF EXISTS "Allow authenticated users to view their own profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update their own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create consolidated optimized policies for profiles
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT
  USING (true);  -- Profiles are viewable by everyone

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE
  USING (id = (select auth.uid()));
