-- Fix RLS policies to use shared_with_email instead of non-existent shared_with_user_id
-- The trip_shares table uses shared_with_email (text) to store invitee email addresses
-- RLS policies were incorrectly referencing shared_with_user_id which doesn't exist

-- =============================================================================
-- STEP 1: Update helper functions to use email matching
-- =============================================================================

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS can_access_trip(uuid);
DROP FUNCTION IF EXISTS can_edit_trip(uuid);

-- Function to check if user can access a trip (view permission)
-- Uses SECURITY DEFINER to bypass RLS and check access directly
CREATE OR REPLACE FUNCTION can_access_trip(check_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_email text;
  is_public_trip boolean;
  is_owner boolean;
  is_shared boolean;
BEGIN
  -- Get current user's email from JWT
  user_email := auth.jwt() ->> 'email';

  -- Check if trip is public
  SELECT EXISTS (
    SELECT 1 FROM trips WHERE trip_id = check_trip_id AND is_public = true
  ) INTO is_public_trip;

  IF is_public_trip THEN
    RETURN true;
  END IF;

  -- Check if user owns the trip
  SELECT EXISTS (
    SELECT 1 FROM trips WHERE trip_id = check_trip_id AND user_id = auth.uid()
  ) INTO is_owner;

  IF is_owner THEN
    RETURN true;
  END IF;

  -- Check if trip is shared with user (by email)
  IF user_email IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM trip_shares
      WHERE trip_id = check_trip_id
      AND LOWER(shared_with_email) = LOWER(user_email)
    ) INTO is_shared;

    RETURN is_shared;
  END IF;

  RETURN false;
END;
$$;

-- Function to check if user can edit a trip (edit permission)
CREATE OR REPLACE FUNCTION can_edit_trip(check_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_email text;
  is_owner boolean;
  has_edit_permission boolean;
BEGIN
  -- Get current user's email from JWT
  user_email := auth.jwt() ->> 'email';

  -- Check if user owns the trip (owners always have edit access)
  SELECT EXISTS (
    SELECT 1 FROM trips WHERE trip_id = check_trip_id AND user_id = auth.uid()
  ) INTO is_owner;

  IF is_owner THEN
    RETURN true;
  END IF;

  -- Check if user has edit permission via sharing (by email)
  IF user_email IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM trip_shares
      WHERE trip_id = check_trip_id
      AND LOWER(shared_with_email) = LOWER(user_email)
      AND permission_level = 'edit'
    ) INTO has_edit_permission;

    RETURN has_edit_permission;
  END IF;

  RETURN false;
END;
$$;

-- =============================================================================
-- STEP 2: Fix trip_shares SELECT policy
-- =============================================================================

DROP POLICY IF EXISTS "trip_shares_select_policy" ON trip_shares;
DROP POLICY IF EXISTS "Users can view trip shares" ON trip_shares;
DROP POLICY IF EXISTS "Users can view their shared trips" ON trip_shares;

-- Users can see shares where:
-- 1. They created the share (are the owner)
-- 2. They are the recipient (matched by email)
CREATE POLICY "trip_shares_select_policy" ON trip_shares
  FOR SELECT
  USING (
    shared_by_user_id = auth.uid()
    OR LOWER(shared_with_email) = LOWER(auth.jwt() ->> 'email')
  );

-- =============================================================================
-- STEP 3: Fix trips SELECT policy
-- =============================================================================

DROP POLICY IF EXISTS "trips_select_policy" ON trips;
DROP POLICY IF EXISTS "Users can view own trips" ON trips;
DROP POLICY IF EXISTS "Users can view their own trips" ON trips;

-- Users can view trips if:
-- 1. Trip is public
-- 2. They own it
-- 3. It's shared with them (by email)
CREATE POLICY "trips_select_policy" ON trips
  FOR SELECT
  USING (
    is_public = true
    OR user_id = auth.uid()
    OR trip_id IN (
      SELECT trip_id FROM trip_shares
      WHERE LOWER(shared_with_email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- =============================================================================
-- STEP 4: Ensure trips UPDATE policy uses the fixed function
-- =============================================================================

DROP POLICY IF EXISTS "trips_update_policy" ON trips;

CREATE POLICY "trips_update_policy" ON trips
  FOR UPDATE
  USING (can_edit_trip(trip_id));

-- =============================================================================
-- STEP 5: Grant execute permissions on helper functions
-- =============================================================================

GRANT EXECUTE ON FUNCTION can_access_trip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_trip(uuid) TO anon;
GRANT EXECUTE ON FUNCTION can_edit_trip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_edit_trip(uuid) TO anon;
