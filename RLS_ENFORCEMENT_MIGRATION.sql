-- Complete RLS Migration for Permission Enforcement
-- Run this in Supabase SQL Editor

-- Step 1: Create helper function to check if user has edit permission for a trip
CREATE OR REPLACE FUNCTION user_has_edit_permission(trip_id_param UUID)
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

  -- Check if user has edit permission via sharing
  IF EXISTS (
    SELECT 1 FROM trip_shares ts
    JOIN auth.users u ON u.email = ts.shared_with_email
    WHERE ts.trip_id = trip_id_param 
    AND u.id = auth.uid()
    AND ts.permission_level = 'edit'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Update trips table policies
DROP POLICY IF EXISTS "Users can update their own trips" ON trips;
CREATE POLICY "Users can update trips with edit permission" ON trips
  FOR UPDATE USING (user_has_edit_permission(trip_id));

-- Step 3: Update trip_days table policies
DROP POLICY IF EXISTS "Users can update trip days for their trips" ON trip_days;
CREATE POLICY "Users can update trip days with edit permission" ON trip_days
  FOR UPDATE USING (user_has_edit_permission(trip_id));

DROP POLICY IF EXISTS "Users can insert trip days for their trips" ON trip_days;
CREATE POLICY "Users can insert trip days with edit permission" ON trip_days
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

DROP POLICY IF EXISTS "Users can delete trip days for their trips" ON trip_days;
CREATE POLICY "Users can delete trip days with edit permission" ON trip_days
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- Step 4: Update accommodations table policies
DROP POLICY IF EXISTS "Users can update accommodations for their trips" ON accommodations;
CREATE POLICY "Users can update accommodations with edit permission" ON accommodations
  FOR UPDATE USING (user_has_edit_permission(trip_id));

DROP POLICY IF EXISTS "Users can insert accommodations for their trips" ON accommodations;
CREATE POLICY "Users can insert accommodations with edit permission" ON accommodations
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

DROP POLICY IF EXISTS "Users can delete accommodations for their trips" ON accommodations;
CREATE POLICY "Users can delete accommodations with edit permission" ON accommodations
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- Step 5: Update transportation table policies
DROP POLICY IF EXISTS "Users can update transportation for their trips" ON transportation;
CREATE POLICY "Users can update transportation with edit permission" ON transportation
  FOR UPDATE USING (user_has_edit_permission(trip_id));

DROP POLICY IF EXISTS "Users can insert transportation for their trips" ON transportation;
CREATE POLICY "Users can insert transportation with edit permission" ON transportation
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

DROP POLICY IF EXISTS "Users can delete transportation for their trips" ON transportation;
CREATE POLICY "Users can delete transportation with edit permission" ON transportation
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- Step 6: Update reservations table policies
DROP POLICY IF EXISTS "Users can update reservations for their trips" ON reservations;
CREATE POLICY "Users can update reservations with edit permission" ON reservations
  FOR UPDATE USING (user_has_edit_permission(trip_id));

DROP POLICY IF EXISTS "Users can insert reservations for their trips" ON reservations;
CREATE POLICY "Users can insert reservations with edit permission" ON reservations
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

DROP POLICY IF EXISTS "Users can delete reservations for their trips" ON reservations;
CREATE POLICY "Users can delete reservations with edit permission" ON reservations
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- Step 7: Update day_activities table policies
DROP POLICY IF EXISTS "Users can update activities for their trips" ON day_activities;
CREATE POLICY "Users can update activities with edit permission" ON day_activities
  FOR UPDATE USING (user_has_edit_permission(trip_id));

DROP POLICY IF EXISTS "Users can insert activities for their trips" ON day_activities;
CREATE POLICY "Users can insert activities with edit permission" ON day_activities
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

DROP POLICY IF EXISTS "Users can delete activities for their trips" ON day_activities;
CREATE POLICY "Users can delete activities with edit permission" ON day_activities
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- Step 8: Update expenses table policies
DROP POLICY IF EXISTS "Users can update expenses for their trips" ON expenses;
CREATE POLICY "Users can update expenses with edit permission" ON expenses
  FOR UPDATE USING (user_has_edit_permission(trip_id));

DROP POLICY IF EXISTS "Users can insert expenses for their trips" ON expenses;
CREATE POLICY "Users can insert expenses with edit permission" ON expenses
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

DROP POLICY IF EXISTS "Users can delete expenses for their trips" ON expenses;
CREATE POLICY "Users can delete expenses with edit permission" ON expenses
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- Step 9: Update other_expenses table policies
DROP POLICY IF EXISTS "Users can update other expenses for their trips" ON other_expenses;
CREATE POLICY "Users can update other expenses with edit permission" ON other_expenses
  FOR UPDATE USING (user_has_edit_permission(trip_id));

DROP POLICY IF EXISTS "Users can insert other expenses for their trips" ON other_expenses;
CREATE POLICY "Users can insert other expenses with edit permission" ON other_expenses
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

DROP POLICY IF EXISTS "Users can delete other expenses for their trips" ON other_expenses;
CREATE POLICY "Users can delete other expenses with edit permission" ON other_expenses
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- Step 10: Update vision_board_items table policies  
DROP POLICY IF EXISTS "Users can update vision board items for their trips" ON vision_board_items;
CREATE POLICY "Users can update vision board items with edit permission" ON vision_board_items
  FOR UPDATE USING (user_has_edit_permission(trip_id));

DROP POLICY IF EXISTS "Users can insert vision board items for their trips" ON vision_board_items;
CREATE POLICY "Users can insert vision board items with edit permission" ON vision_board_items
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

DROP POLICY IF EXISTS "Users can delete vision board items for their trips" ON vision_board_items;
CREATE POLICY "Users can delete vision board items with edit permission" ON vision_board_items
  FOR DELETE USING (user_has_edit_permission(trip_id));