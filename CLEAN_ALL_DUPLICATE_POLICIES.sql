-- Clean up ALL duplicate RLS policies across the database
-- This will fix reservations and prevent future issues with other tables

-- RESERVATIONS TABLE - Remove duplicates
DROP POLICY IF EXISTS "Allow delete reservations with edit permission" ON reservations;
DROP POLICY IF EXISTS "Allow insert reservations with edit permission" ON reservations;
DROP POLICY IF EXISTS "Allow read access to reservations" ON reservations;
DROP POLICY IF EXISTS "Allow update reservations with edit permission" ON reservations;
DROP POLICY IF EXISTS "reservations_delete_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_insert_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_select_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_update_policy" ON reservations;

-- Create single set of reservation policies
CREATE POLICY "reservations_select_policy" ON reservations
  FOR SELECT USING (user_has_read_permission(trip_id));

CREATE POLICY "reservations_insert_policy" ON reservations
  FOR INSERT WITH CHECK (user_has_edit_permission(trip_id));

CREATE POLICY "reservations_update_policy" ON reservations
  FOR UPDATE USING (user_has_edit_permission(trip_id));

CREATE POLICY "reservations_delete_policy" ON reservations
  FOR DELETE USING (user_has_edit_permission(trip_id));

-- ACCOMMODATIONS TABLE - Remove duplicate policies (keep newer style)
DROP POLICY IF EXISTS "Allow delete accommodations with edit permission" ON accommodations;
DROP POLICY IF EXISTS "Allow insert accommodations with edit permission" ON accommodations;
DROP POLICY IF EXISTS "Allow read access to accommodations" ON accommodations;
DROP POLICY IF EXISTS "Allow update accommodations with edit permission" ON accommodations;

-- ACCOMMODATIONS_DAYS TABLE - Remove duplicate policies  
DROP POLICY IF EXISTS "Allow delete accommodation days with edit permission" ON accommodations_days;
DROP POLICY IF EXISTS "Allow insert accommodation days with edit permission" ON accommodations_days;
DROP POLICY IF EXISTS "Allow read access to accommodation days" ON accommodations_days;
DROP POLICY IF EXISTS "Allow update accommodation days with edit permission" ON accommodations_days;

-- DAY_ACTIVITIES TABLE - Remove duplicate policies
DROP POLICY IF EXISTS "Allow delete day activities with edit permission" ON day_activities;
DROP POLICY IF EXISTS "Allow insert day activities with edit permission" ON day_activities;
DROP POLICY IF EXISTS "Allow read access to day activities" ON day_activities;
DROP POLICY IF EXISTS "Allow update day activities with edit permission" ON day_activities;

-- EXPENSES TABLE - Remove duplicate policies
DROP POLICY IF EXISTS "Allow delete expenses with edit permission" ON expenses;
DROP POLICY IF EXISTS "Allow insert expenses with edit permission" ON expenses;
DROP POLICY IF EXISTS "Allow read access to expenses" ON expenses;
DROP POLICY IF EXISTS "Allow update expenses with edit permission" ON expenses;

-- Ensure RLS is enabled on all tables
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodations_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;