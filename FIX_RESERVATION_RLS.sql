-- Fix RLS policies for reservations table
-- Run this in Supabase SQL Editor to resolve reservation saving issues

-- Step 1: Drop all conflicting reservation policies
DROP POLICY IF EXISTS "Users can access reservations for shared trips" ON reservations;
DROP POLICY IF EXISTS "Users can access shared trip reservations" ON reservations;
DROP POLICY IF EXISTS "Users can modify reservations for shared trips (edit permission)" ON reservations;
DROP POLICY IF EXISTS "Users can update reservations for shared trips (edit permission)" ON reservations;
DROP POLICY IF EXISTS "Users can delete reservations for shared trips (edit permission)" ON reservations;
DROP POLICY IF EXISTS "reservations_select_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_insert_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_update_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_delete_policy" ON reservations;
DROP POLICY IF EXISTS "Authenticated users can manage their reservations" ON reservations;

-- Step 2: Create helper function if it doesn't exist
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

-- Step 3: Create clean, non-conflicting reservation policies
CREATE POLICY "reservations_select_policy" ON reservations
  FOR SELECT USING (user_has_read_permission(trip_id));

CREATE POLICY "reservations_insert_policy" ON reservations
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

CREATE POLICY "reservations_update_policy" ON reservations
  FOR UPDATE USING (user_has_edit_permission(trip_id));

CREATE POLICY "reservations_delete_policy" ON reservations
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- Step 4: Ensure RLS is enabled
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservations_trip_id ON reservations(trip_id);
CREATE INDEX IF NOT EXISTS idx_reservations_day_id ON reservations(day_id);