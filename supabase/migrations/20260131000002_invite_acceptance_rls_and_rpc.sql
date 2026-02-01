-- Make access checks require accepted invites, while still allowing recipients
-- to *see* their pending share row (so it can appear on MyTrips with Accept/Decline).
--
-- Also adds a safe SECURITY DEFINER RPC for recipients to accept an invite without
-- granting broader UPDATE permissions on trip_shares.

-- =============================================================================
-- 1) Update helper functions to require accepted share_status
-- =============================================================================

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
  user_email := LOWER(auth.jwt() ->> 'email');

  -- Public trips are viewable
  SELECT EXISTS (
    SELECT 1 FROM trips WHERE trip_id = check_trip_id AND is_public = true
  ) INTO is_public_trip;

  IF is_public_trip THEN
    RETURN true;
  END IF;

  -- Owners always have access
  SELECT EXISTS (
    SELECT 1 FROM trips WHERE trip_id = check_trip_id AND user_id = auth.uid()
  ) INTO is_owner;

  IF is_owner THEN
    RETURN true;
  END IF;

  -- Shared access only counts once recipient has accepted
  IF user_email IS NOT NULL AND user_email != '' THEN
    SELECT EXISTS (
      SELECT 1 FROM trip_shares
      WHERE trip_id = check_trip_id
        AND LOWER(shared_with_email) = user_email
        AND share_status = 'accepted'
    ) INTO is_shared;

    RETURN COALESCE(is_shared, false);
  END IF;

  RETURN false;
END;
$$;

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
  user_email := LOWER(auth.jwt() ->> 'email');

  -- Owners always have edit access
  SELECT EXISTS (
    SELECT 1 FROM trips WHERE trip_id = check_trip_id AND user_id = auth.uid()
  ) INTO is_owner;

  IF is_owner THEN
    RETURN true;
  END IF;

  -- Edit permission only counts once accepted
  IF user_email IS NOT NULL AND user_email != '' THEN
    SELECT EXISTS (
      SELECT 1 FROM trip_shares
      WHERE trip_id = check_trip_id
        AND LOWER(shared_with_email) = user_email
        AND share_status = 'accepted'
        AND permission_level = 'edit'
    ) INTO has_edit_permission;

    RETURN COALESCE(has_edit_permission, false);
  END IF;

  RETURN false;
END;
$$;

-- =============================================================================
-- 2) trip_shares SELECT policy: allow recipients to see their own pending row
-- =============================================================================

DROP POLICY IF EXISTS "trip_shares_select_policy" ON trip_shares;

CREATE POLICY "trip_shares_select_policy" ON trip_shares
  FOR SELECT
  USING (
    -- Full team list if you have access (owner or accepted share)
    can_access_trip(trip_id)
    -- Or you can always see your own row (even if still pending)
    OR LOWER(shared_with_email) = LOWER(auth.jwt() ->> 'email')
  );

-- =============================================================================
-- 3) RPC: recipient accepts their invite (pending -> accepted)
-- =============================================================================

CREATE OR REPLACE FUNCTION accept_trip_share(share_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  updated_count int;
BEGIN
  user_email := LOWER(auth.jwt() ->> 'email');
  IF user_email IS NULL OR user_email = '' THEN
    RETURN false;
  END IF;

  UPDATE trip_shares
  SET share_status = 'accepted'
  WHERE id = share_id
    AND LOWER(shared_with_email) = user_email
    -- Never allow "accept" to mutate the owner's canonical row
    AND shared_by_user_id <> shared_with_user_id
    AND share_status = 'pending';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION accept_trip_share(uuid) TO authenticated;

