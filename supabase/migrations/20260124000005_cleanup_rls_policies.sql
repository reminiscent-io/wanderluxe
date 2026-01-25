-- RLS Policy Cleanup Migration
-- Removes duplicate policies, fixes missing ones, standardizes patterns
--
-- Issues addressed:
-- 1. Remove duplicate/broken SELECT policies that reference non-existent functions
-- 2. Fix accommodations_days table policies (missing)
-- 3. Fix expenses table policies (missing SELECT, UPDATE, DELETE)
-- 4. Standardize auth.uid() pattern (remove subselect wrapping)
-- 5. Add missing profiles INSERT policy

BEGIN;

-- ============================================
-- STEP 1: Remove duplicate/broken SELECT policies
-- These may use non-existent user_has_read_permission function
-- Using IF EXISTS to be safe if they don't exist
-- ============================================

-- These tables definitely exist, safe to drop directly
DROP POLICY IF EXISTS "accommodations_select_combined" ON accommodations;
DROP POLICY IF EXISTS "day_activities_select_combined" ON day_activities;
DROP POLICY IF EXISTS "reservations_select_combined" ON reservations;

-- ============================================
-- STEP 2: Fix accommodations_days policies
-- This table had no policies or used non-existent functions
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accommodations_days') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "accommodations_days_select_combined" ON accommodations_days;
    DROP POLICY IF EXISTS "accommodations_days_select_policy" ON accommodations_days;
    DROP POLICY IF EXISTS "accommodations_days_delete_policy" ON accommodations_days;
    DROP POLICY IF EXISTS "accommodations_days_insert_policy" ON accommodations_days;
    DROP POLICY IF EXISTS "accommodations_days_update_policy" ON accommodations_days;

    -- Recreate with working helper functions
    CREATE POLICY "accommodations_days_select_policy" ON accommodations_days
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM accommodations a
          WHERE a.stay_id = accommodations_days.stay_id
          AND can_access_trip(a.trip_id)
        )
      );

    CREATE POLICY "accommodations_days_insert_policy" ON accommodations_days
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM accommodations a
          WHERE a.stay_id = accommodations_days.stay_id
          AND can_edit_trip(a.trip_id)
        )
      );

    CREATE POLICY "accommodations_days_update_policy" ON accommodations_days
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM accommodations a
          WHERE a.stay_id = accommodations_days.stay_id
          AND can_edit_trip(a.trip_id)
        )
      );

    CREATE POLICY "accommodations_days_delete_policy" ON accommodations_days
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM accommodations a
          WHERE a.stay_id = accommodations_days.stay_id
          AND can_edit_trip(a.trip_id)
        )
      );
  END IF;
END $$;

-- ============================================
-- STEP 3: Fix expenses table policies (if table exists)
-- Currently only has INSERT, missing SELECT/UPDATE/DELETE
-- Note: Some codebases use 'expenses', others use 'other_expenses'
-- ============================================

-- Handle 'expenses' table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "expenses_select_combined" ON expenses;
    DROP POLICY IF EXISTS "expenses_select_policy" ON expenses;
    DROP POLICY IF EXISTS "expenses_insert_policy" ON expenses;
    DROP POLICY IF EXISTS "expenses_update_policy" ON expenses;
    DROP POLICY IF EXISTS "expenses_delete_policy" ON expenses;

    -- Recreate all expenses policies consistently
    CREATE POLICY "expenses_select_policy" ON expenses
      FOR SELECT TO authenticated
      USING (can_access_trip(trip_id));

    CREATE POLICY "expenses_insert_policy" ON expenses
      FOR INSERT TO authenticated
      WITH CHECK (can_edit_trip(trip_id));

    CREATE POLICY "expenses_update_policy" ON expenses
      FOR UPDATE TO authenticated
      USING (can_edit_trip(trip_id));

    CREATE POLICY "expenses_delete_policy" ON expenses
      FOR DELETE TO authenticated
      USING (can_edit_trip(trip_id));
  END IF;
END $$;

-- ============================================
-- STEP 4: Standardize auth.uid() pattern
-- Replace ( SELECT auth.uid() AS uid) with auth.uid()
-- ============================================

-- ai_chat_threads - recreate with direct auth.uid()
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_chat_threads') THEN
    DROP POLICY IF EXISTS "ai_chat_threads_select_policy" ON ai_chat_threads;
    DROP POLICY IF EXISTS "ai_chat_threads_insert_policy" ON ai_chat_threads;
    DROP POLICY IF EXISTS "ai_chat_threads_update_policy" ON ai_chat_threads;
    DROP POLICY IF EXISTS "ai_chat_threads_delete_policy" ON ai_chat_threads;

    CREATE POLICY "ai_chat_threads_select_policy" ON ai_chat_threads
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY "ai_chat_threads_insert_policy" ON ai_chat_threads
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid() AND can_access_trip(trip_id));

    CREATE POLICY "ai_chat_threads_update_policy" ON ai_chat_threads
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY "ai_chat_threads_delete_policy" ON ai_chat_threads
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- user_ai_usage - recreate with direct auth.uid()
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_ai_usage') THEN
    DROP POLICY IF EXISTS "user_ai_usage_select_policy" ON user_ai_usage;
    DROP POLICY IF EXISTS "user_ai_usage_insert_policy" ON user_ai_usage;
    DROP POLICY IF EXISTS "user_ai_usage_update_policy" ON user_ai_usage;

    CREATE POLICY "user_ai_usage_select_policy" ON user_ai_usage
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY "user_ai_usage_insert_policy" ON user_ai_usage
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY "user_ai_usage_update_policy" ON user_ai_usage
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================
-- STEP 5: Fix profiles policies
-- Add missing INSERT policy and standardize
-- ============================================

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

COMMIT;
