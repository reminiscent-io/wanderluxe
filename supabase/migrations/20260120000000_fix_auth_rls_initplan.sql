-- =============================================================================
-- Fix Auth RLS Initialization Plan Performance Issues
-- =============================================================================
-- This migration fixes performance warnings where auth.uid() is re-evaluated
-- for each row instead of being evaluated once as an InitPlan.
--
-- Affected tables:
-- - trip_shares (1 policy)
-- - ai_chat_threads (4 policies)
-- - user_ai_usage (3 policies)
--
-- Solution: Wrap auth.uid() calls with (select auth.uid())
-- =============================================================================

-- =============================================================================
-- STEP 1: Fix trip_shares_select_policy
-- =============================================================================

DROP POLICY IF EXISTS "trip_shares_select_policy" ON trip_shares;

CREATE POLICY "trip_shares_select_policy" ON trip_shares
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM trips WHERE trip_id = trip_shares.trip_id AND user_id = (select auth.uid()))
    OR shared_with_user_id = (select auth.uid())
  );

-- =============================================================================
-- STEP 2: Fix ai_chat_threads policies
-- =============================================================================

-- Fix SELECT policy
DROP POLICY IF EXISTS "ai_chat_threads_select_policy" ON ai_chat_threads;

CREATE POLICY "ai_chat_threads_select_policy" ON ai_chat_threads
  FOR SELECT
  USING (user_id = (select auth.uid()) AND can_access_trip(trip_id));

-- Fix INSERT policy
DROP POLICY IF EXISTS "ai_chat_threads_insert_policy" ON ai_chat_threads;

CREATE POLICY "ai_chat_threads_insert_policy" ON ai_chat_threads
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()) AND can_access_trip(trip_id));

-- Fix UPDATE policy
DROP POLICY IF EXISTS "ai_chat_threads_update_policy" ON ai_chat_threads;

CREATE POLICY "ai_chat_threads_update_policy" ON ai_chat_threads
  FOR UPDATE
  USING (user_id = (select auth.uid()));

-- Fix DELETE policy
DROP POLICY IF EXISTS "ai_chat_threads_delete_policy" ON ai_chat_threads;

CREATE POLICY "ai_chat_threads_delete_policy" ON ai_chat_threads
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- =============================================================================
-- STEP 3: Fix user_ai_usage policies
-- =============================================================================

-- Fix SELECT policy
DROP POLICY IF EXISTS "user_ai_usage_select_policy" ON user_ai_usage;

CREATE POLICY "user_ai_usage_select_policy" ON user_ai_usage
  FOR SELECT
  USING (user_id = (select auth.uid()));

-- Fix INSERT policy
DROP POLICY IF EXISTS "user_ai_usage_insert_policy" ON user_ai_usage;

CREATE POLICY "user_ai_usage_insert_policy" ON user_ai_usage
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- Fix UPDATE policy
DROP POLICY IF EXISTS "user_ai_usage_update_policy" ON user_ai_usage;

CREATE POLICY "user_ai_usage_update_policy" ON user_ai_usage
  FOR UPDATE
  USING (user_id = (select auth.uid()));
