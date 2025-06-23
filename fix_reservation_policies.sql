-- Fix reservation RLS policy conflicts
-- Run this in your Supabase SQL Editor

-- The problem: You have conflicting policies with different role targets and permission systems
-- Current issues:
-- 1. Some policies target {authenticated} role, others target {public} role
-- 2. Mixed permission checking systems (direct SQL vs function-based)
-- 3. Multiple policies for same operation causing conflicts

-- Drop all existing conflicting reservation policies
DROP POLICY IF EXISTS "Trip members can select reservations" ON reservations;
DROP POLICY IF EXISTS "reservations_delete_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_insert_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_update_policy" ON reservations;

-- Create consistent policies using the same pattern as other tables
-- All policies target {public} role and use function-based permission checking

CREATE POLICY "reservations_select_policy" ON reservations
  FOR SELECT 
  TO public
  USING (user_has_read_permission(trip_id));

CREATE POLICY "reservations_insert_policy" ON reservations
  FOR INSERT 
  TO public
  WITH CHECK (user_has_edit_permission(trip_id));

CREATE POLICY "reservations_update_policy" ON reservations
  FOR UPDATE 
  TO public
  USING (user_has_edit_permission(trip_id));

CREATE POLICY "reservations_delete_policy" ON reservations
  FOR DELETE 
  TO public
  USING (user_has_edit_permission(trip_id));

-- Verify the functions exist (they should based on other tables working)
-- If these fail, you'll need to create the permission functions first
SELECT 'Functions exist' WHERE 
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'user_has_edit_permission') AND
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'user_has_read_permission');