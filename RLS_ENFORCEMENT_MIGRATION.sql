-- CRITICAL: Run this entire script in Supabase SQL Editor to fix permission system
-- This will clean up conflicting policies and implement proper granular permissions

-- Step 1: Drop all conflicting RLS policies
DROP POLICY IF EXISTS "Users can delete accommodations with edit permission" ON accommodations;
DROP POLICY IF EXISTS "Users can delete their accommodations" ON accommodations;
DROP POLICY IF EXISTS "Users can delete their own accommodations" ON accommodations;
DROP POLICY IF EXISTS "Users can insert accommodations with edit permission" ON accommodations;
DROP POLICY IF EXISTS "Users can insert their accommodations" ON accommodations;
DROP POLICY IF EXISTS "Users can insert their own accommodations" ON accommodations;
DROP POLICY IF EXISTS "Users can update accommodations with edit permission" ON accommodations;
DROP POLICY IF EXISTS "Users can update their accommodations" ON accommodations;
DROP POLICY IF EXISTS "Users can update their own accommodations" ON accommodations;
DROP POLICY IF EXISTS "Users can view and edit accommodations for trips shared with th" ON accommodations;
DROP POLICY IF EXISTS "Users can view their accommodations" ON accommodations;
DROP POLICY IF EXISTS "Users can view their own accommodations" ON accommodations;

DROP POLICY IF EXISTS "Users can delete their accommodation days" ON accommodations_days;
DROP POLICY IF EXISTS "Users can delete their own accommodation days" ON accommodations_days;
DROP POLICY IF EXISTS "Users can insert their accommodation days" ON accommodations_days;
DROP POLICY IF EXISTS "Users can insert their own accommodation days" ON accommodations_days;
DROP POLICY IF EXISTS "Users can update their accommodation days" ON accommodations_days;
DROP POLICY IF EXISTS "Users can view their accommodation days" ON accommodations_days;
DROP POLICY IF EXISTS "Users can view their own accommodation days" ON accommodations_days;

DROP POLICY IF EXISTS "Users can delete activities with edit permission" ON day_activities;
DROP POLICY IF EXISTS "Users can delete their own day activities" ON day_activities;
DROP POLICY IF EXISTS "Users can insert activities with edit permission" ON day_activities;
DROP POLICY IF EXISTS "Users can insert their own day activities" ON day_activities;
DROP POLICY IF EXISTS "Users can update activities with edit permission" ON day_activities;
DROP POLICY IF EXISTS "Users can update their own day activities" ON day_activities;
DROP POLICY IF EXISTS "Users can view activities for their trips" ON day_activities;
DROP POLICY IF EXISTS "Users can view and edit day activities for trips shared with th" ON day_activities;
DROP POLICY IF EXISTS "Users can view their own day activities" ON day_activities;

DROP POLICY IF EXISTS "Users can update trips with edit permission" ON trips;
DROP POLICY IF EXISTS "Users can update their own trips" ON trips;
DROP POLICY IF EXISTS "Users can delete their own trips" ON trips;
DROP POLICY IF EXISTS "Users can insert their own trips" ON trips;
DROP POLICY IF EXISTS "Users can view and edit trips shared with them" ON trips;
DROP POLICY IF EXISTS "Users can view their own trips" ON trips;

DROP POLICY IF EXISTS "Users can update trip days with edit permission" ON trip_days;
DROP POLICY IF EXISTS "Users can insert trip days with edit permission" ON trip_days;
DROP POLICY IF EXISTS "Users can delete trip days with edit permission" ON trip_days;
DROP POLICY IF EXISTS "Users can delete their own trip days" ON trip_days;
DROP POLICY IF EXISTS "Users can insert their own trip days" ON trip_days;
DROP POLICY IF EXISTS "Users can update their own trip days" ON trip_days;
DROP POLICY IF EXISTS "Users can view their own trip days" ON trip_days;
DROP POLICY IF EXISTS "Users can view and edit trip days for trips shared with them" ON trip_days;

DROP POLICY IF EXISTS "Users can update transportation with edit permission" ON transportation;
DROP POLICY IF EXISTS "Users can insert transportation with edit permission" ON transportation;
DROP POLICY IF EXISTS "Users can delete transportation with edit permission" ON transportation;
DROP POLICY IF EXISTS "Users can delete their own transportation" ON transportation;
DROP POLICY IF EXISTS "Users can insert their own transportation" ON transportation;
DROP POLICY IF EXISTS "Users can update their own transportation" ON transportation;
DROP POLICY IF EXISTS "Users can view their own transportation" ON transportation;
DROP POLICY IF EXISTS "Users can view and edit transportation for trips shared with th" ON transportation;

DROP POLICY IF EXISTS "Users can update reservations with edit permission" ON reservations;
DROP POLICY IF EXISTS "Users can insert reservations with edit permission" ON reservations;
DROP POLICY IF EXISTS "Users can delete reservations with edit permission" ON reservations;
DROP POLICY IF EXISTS "Users can delete their own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can insert their own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can update their own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can view their own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can view and edit reservations for trips shared with the" ON reservations;

DROP POLICY IF EXISTS "Users can update expenses with edit permission" ON expenses;
DROP POLICY IF EXISTS "Users can insert expenses with edit permission" ON expenses;
DROP POLICY IF EXISTS "Users can delete expenses with edit permission" ON expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;

DROP POLICY IF EXISTS "Users can update other expenses with edit permission" ON other_expenses;
DROP POLICY IF EXISTS "Users can insert other expenses with edit permission" ON other_expenses;
DROP POLICY IF EXISTS "Users can delete other expenses with edit permission" ON other_expenses;
DROP POLICY IF EXISTS "Users can delete their own other expenses" ON other_expenses;
DROP POLICY IF EXISTS "Users can insert their own other expenses" ON other_expenses;
DROP POLICY IF EXISTS "Users can update their own other expenses" ON other_expenses;
DROP POLICY IF EXISTS "Users can view their own other expenses" ON other_expenses;

DROP POLICY IF EXISTS "Users can update vision board items with edit permission" ON vision_board_items;
DROP POLICY IF EXISTS "Users can insert vision board items with edit permission" ON vision_board_items;
DROP POLICY IF EXISTS "Users can delete vision board items with edit permission" ON vision_board_items;
DROP POLICY IF EXISTS "Users can delete their own vision board items" ON vision_board_items;
DROP POLICY IF EXISTS "Users can insert their own vision board items" ON vision_board_items;
DROP POLICY IF EXISTS "Users can update their own vision board items" ON vision_board_items;
DROP POLICY IF EXISTS "Users can view their own vision board items" ON vision_board_items;

-- Step 2: Create helper functions for permission checking
CREATE OR REPLACE FUNCTION user_has_read_permission(trip_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user owns the trip
  IF EXISTS (
    SELECT 1 FROM trips 
    WHERE trip_id = trip_id_param 
    AND user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user has any permission via sharing (read or edit)
  IF EXISTS (
    SELECT 1 FROM trip_shares ts
    JOIN auth.users u ON u.email = ts.shared_with_email
    WHERE ts.trip_id = trip_id_param 
    AND u.id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create clean, non-conflicting policies

-- TRIPS TABLE
CREATE POLICY "trip_select_policy" ON trips
  FOR SELECT USING (user_has_read_permission(trip_id));

CREATE POLICY "trip_insert_policy" ON trips
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "trip_update_policy" ON trips
  FOR UPDATE USING (user_has_edit_permission(trip_id));

CREATE POLICY "trip_delete_policy" ON trips
  FOR DELETE USING (user_id = auth.uid());

-- TRIP_DAYS TABLE
CREATE POLICY "trip_days_select_policy" ON trip_days
  FOR SELECT USING (user_has_read_permission(trip_id));

CREATE POLICY "trip_days_insert_policy" ON trip_days
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

CREATE POLICY "trip_days_update_policy" ON trip_days
  FOR UPDATE USING (user_has_edit_permission(trip_id));

CREATE POLICY "trip_days_delete_policy" ON trip_days
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- DAY_ACTIVITIES TABLE (Fixed to reference trip_id correctly)
CREATE POLICY "day_activities_select_policy" ON day_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_days td 
      WHERE td.day_id = day_activities.day_id 
      AND user_has_read_permission(td.trip_id)
    )
  );

CREATE POLICY "day_activities_insert_policy" ON day_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_days td 
      WHERE td.day_id = day_activities.day_id 
      AND user_has_edit_permission(td.trip_id)
    )
  );

CREATE POLICY "day_activities_update_policy" ON day_activities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trip_days td 
      WHERE td.day_id = day_activities.day_id 
      AND user_has_edit_permission(td.trip_id)
    )
  );

CREATE POLICY "day_activities_delete_policy" ON day_activities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trip_days td 
      WHERE td.day_id = day_activities.day_id 
      AND user_has_edit_permission(td.trip_id)
    )
  );

-- ACCOMMODATIONS TABLE
CREATE POLICY "accommodations_select_policy" ON accommodations
  FOR SELECT USING (user_has_read_permission(trip_id));

CREATE POLICY "accommodations_insert_policy" ON accommodations
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

CREATE POLICY "accommodations_update_policy" ON accommodations
  FOR UPDATE USING (user_has_edit_permission(trip_id));

CREATE POLICY "accommodations_delete_policy" ON accommodations
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- ACCOMMODATIONS_DAYS TABLE
CREATE POLICY "accommodations_days_select_policy" ON accommodations_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM accommodations a 
      WHERE a.stay_id = accommodations_days.stay_id 
      AND user_has_read_permission(a.trip_id)
    )
  );

CREATE POLICY "accommodations_days_insert_policy" ON accommodations_days
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM accommodations a 
      WHERE a.stay_id = accommodations_days.stay_id 
      AND user_has_edit_permission(a.trip_id)
    )
  );

CREATE POLICY "accommodations_days_update_policy" ON accommodations_days
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM accommodations a 
      WHERE a.stay_id = accommodations_days.stay_id 
      AND user_has_edit_permission(a.trip_id)
    )
  );

CREATE POLICY "accommodations_days_delete_policy" ON accommodations_days
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM accommodations a 
      WHERE a.stay_id = accommodations_days.stay_id 
      AND user_has_edit_permission(a.trip_id)
    )
  );

-- TRANSPORTATION TABLE
CREATE POLICY "transportation_select_policy" ON transportation
  FOR SELECT USING (user_has_read_permission(trip_id));

CREATE POLICY "transportation_insert_policy" ON transportation
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

CREATE POLICY "transportation_update_policy" ON transportation
  FOR UPDATE USING (user_has_edit_permission(trip_id));

CREATE POLICY "transportation_delete_policy" ON transportation
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- RESERVATIONS TABLE
CREATE POLICY "reservations_select_policy" ON reservations
  FOR SELECT USING (user_has_read_permission(trip_id));

CREATE POLICY "reservations_insert_policy" ON reservations
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

CREATE POLICY "reservations_update_policy" ON reservations
  FOR UPDATE USING (user_has_edit_permission(trip_id));

CREATE POLICY "reservations_delete_policy" ON reservations
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- EXPENSES TABLE
CREATE POLICY "expenses_select_policy" ON expenses
  FOR SELECT USING (user_has_read_permission(trip_id));

CREATE POLICY "expenses_insert_policy" ON expenses
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

CREATE POLICY "expenses_update_policy" ON expenses
  FOR UPDATE USING (user_has_edit_permission(trip_id));

CREATE POLICY "expenses_delete_policy" ON expenses
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- OTHER_EXPENSES TABLE
CREATE POLICY "other_expenses_select_policy" ON other_expenses
  FOR SELECT USING (user_has_read_permission(trip_id));

CREATE POLICY "other_expenses_insert_policy" ON other_expenses
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

CREATE POLICY "other_expenses_update_policy" ON other_expenses
  FOR UPDATE USING (user_has_edit_permission(trip_id));

CREATE POLICY "other_expenses_delete_policy" ON other_expenses
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- VISION_BOARD_ITEMS TABLE
CREATE POLICY "vision_board_items_select_policy" ON vision_board_items
  FOR SELECT USING (user_has_read_permission(trip_id));

CREATE POLICY "vision_board_items_insert_policy" ON vision_board_items
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

CREATE POLICY "vision_board_items_update_policy" ON vision_board_items
  FOR UPDATE USING (user_has_edit_permission(trip_id));

CREATE POLICY "vision_board_items_delete_policy" ON vision_board_items
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- Step 4: Grant necessary permissions
GRANT EXECUTE ON FUNCTION user_has_edit_permission TO public;
GRANT EXECUTE ON FUNCTION user_has_read_permission TO public;

-- Step 5: Refresh schema cache
NOTIFY pgrst, 'reload schema';