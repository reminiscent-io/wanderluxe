-- Fix trip_shares INSERT/UPDATE/DELETE policies
-- The existing policies use a subquery to trips table, which triggers trips_select_policy
-- trips_select_policy has a subquery back to trip_shares, creating circular RLS
-- This migration uses SECURITY DEFINER functions to bypass RLS for ownership checks

-- =============================================================================
-- STEP 1: Create a simple is_trip_owner function (SECURITY DEFINER)
-- =============================================================================

CREATE OR REPLACE FUNCTION is_trip_owner(check_trip_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trips
    WHERE trip_id = check_trip_id
    AND user_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION is_trip_owner(uuid) TO authenticated;

-- =============================================================================
-- STEP 2: Fix trip_shares INSERT policy
-- =============================================================================

DROP POLICY IF EXISTS "trip_shares_insert_policy" ON trip_shares;

-- Users can insert a share if:
-- 1. They own the trip being shared (checked via SECURITY DEFINER function)
-- 2. They are setting themselves as the sharer
CREATE POLICY "trip_shares_insert_policy" ON trip_shares
  FOR INSERT
  WITH CHECK (
    is_trip_owner(trip_id)
    AND shared_by_user_id = auth.uid()
  );

-- =============================================================================
-- STEP 3: Fix trip_shares UPDATE policy
-- =============================================================================

DROP POLICY IF EXISTS "trip_shares_update_policy" ON trip_shares;

-- Users can update a share if they own the trip
CREATE POLICY "trip_shares_update_policy" ON trip_shares
  FOR UPDATE
  USING (is_trip_owner(trip_id))
  WITH CHECK (is_trip_owner(trip_id));

-- =============================================================================
-- STEP 4: Fix trip_shares DELETE policy
-- =============================================================================

DROP POLICY IF EXISTS "trip_shares_delete_policy" ON trip_shares;

-- Users can delete a share if they own the trip
CREATE POLICY "trip_shares_delete_policy" ON trip_shares
  FOR DELETE
  USING (is_trip_owner(trip_id));
