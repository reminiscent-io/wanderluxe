-- FINAL FIX: Remove ALL old reservation policies that are still causing conflicts
-- These old policies from lines 106-114 in your policy list are still blocking insertions

-- Drop ALL reservation policies (including the old ones that weren't removed)
DROP POLICY IF EXISTS "Users can view their own restaurant reservations" ON reservations;
DROP POLICY IF EXISTS "Users can view their restaurant reservations" ON reservations;
DROP POLICY IF EXISTS "Users can insert their own restaurant reservations" ON reservations;
DROP POLICY IF EXISTS "Users can insert their restaurant reservations" ON reservations;
DROP POLICY IF EXISTS "Users can update their own restaurant reservations" ON reservations;
DROP POLICY IF EXISTS "Users can update their restaurant reservations" ON reservations;
DROP POLICY IF EXISTS "Users can delete their own restaurant reservations" ON reservations;
DROP POLICY IF EXISTS "Users can delete their restaurant reservations" ON reservations;

-- Also drop the current policies to recreate them clean
DROP POLICY IF EXISTS "reservations_select_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_insert_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_update_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_delete_policy" ON reservations;

-- Create brand new clean policies
CREATE POLICY "reservations_select_policy" ON reservations
  FOR SELECT USING (user_has_read_permission(trip_id));

CREATE POLICY "reservations_insert_policy" ON reservations
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

CREATE POLICY "reservations_update_policy" ON reservations
  FOR UPDATE USING (user_has_edit_permission(trip_id));

CREATE POLICY "reservations_delete_policy" ON reservations
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- Ensure RLS is enabled
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;