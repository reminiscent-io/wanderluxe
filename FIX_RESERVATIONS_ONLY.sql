-- Fix ONLY the reservations table RLS policies
-- This is a targeted fix to resolve reservation saving issues

-- Step 1: Drop ALL existing reservation policies (both old and new styles)
DROP POLICY IF EXISTS "Allow delete reservations with edit permission" ON reservations;
DROP POLICY IF EXISTS "Allow insert reservations with edit permission" ON reservations;
DROP POLICY IF EXISTS "Allow read access to reservations" ON reservations;
DROP POLICY IF EXISTS "Allow update reservations with edit permission" ON reservations;
DROP POLICY IF EXISTS "reservations_delete_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_insert_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_select_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_update_policy" ON reservations;
DROP POLICY IF EXISTS "Users can access reservations for shared trips" ON reservations;
DROP POLICY IF EXISTS "Users can modify reservations for shared trips (edit permission)" ON reservations;
DROP POLICY IF EXISTS "Users can update reservations for shared trips (edit permission)" ON reservations;
DROP POLICY IF EXISTS "Users can delete reservations for shared trips (edit permission)" ON reservations;

-- Step 2: Create ONE set of clean policies using the same pattern as other tables
CREATE POLICY "Allow read access to reservations" ON reservations
  FOR SELECT 
  TO public
  USING (user_has_read_permission(trip_id));

CREATE POLICY "Allow insert reservations with edit permission" ON reservations
  FOR INSERT 
  TO public
  WITH CHECK (user_has_edit_permission(trip_id));

CREATE POLICY "Allow update reservations with edit permission" ON reservations
  FOR UPDATE 
  TO public
  USING (user_has_edit_permission(trip_id));

CREATE POLICY "Allow delete reservations with edit permission" ON reservations
  FOR DELETE 
  TO public
  USING (user_has_edit_permission(trip_id));

-- Step 3: Ensure RLS is enabled
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;