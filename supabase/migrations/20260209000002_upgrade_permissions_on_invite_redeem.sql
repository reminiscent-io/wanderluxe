-- Update redeem_invite_link to handle permission upgrades:
-- - If existing share has 'read' and invite link offers 'edit', upgrade to 'edit'
-- - If existing share has 'edit' and invite link offers 'read', keep 'edit' (no downgrade)
-- - If pending, auto-accept AND apply the higher permission level

CREATE OR REPLACE FUNCTION redeem_invite_link(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id uuid;
  v_permission_level text;
  v_expires_at timestamptz;
  v_is_active boolean;
  v_user_id uuid;
  v_user_email text;
  v_trip_owner_id uuid;
  v_existing_share_id uuid;
  v_existing_status text;
  v_existing_permission text;
BEGIN
  v_user_id := auth.uid();
  v_user_email := LOWER(auth.jwt() ->> 'email');

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Look up the invite link
  SELECT il.trip_id, il.permission_level, il.expires_at, il.is_active
  INTO v_trip_id, v_permission_level, v_expires_at, v_is_active
  FROM trip_invite_links il
  WHERE il.invite_code = p_invite_code;

  IF v_trip_id IS NULL THEN
    RAISE EXCEPTION 'Invite link not found';
  END IF;

  IF NOT v_is_active THEN
    RAISE EXCEPTION 'This invite link has been disabled';
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RAISE EXCEPTION 'This invite link has expired';
  END IF;

  -- Check if user is the trip owner (just return the trip_id)
  SELECT t.user_id INTO v_trip_owner_id
  FROM trips t
  WHERE t.trip_id = v_trip_id;

  IF v_trip_owner_id = v_user_id THEN
    RETURN v_trip_id;
  END IF;

  -- Check for existing share (include permission_level)
  SELECT ts.id, ts.share_status, ts.permission_level
  INTO v_existing_share_id, v_existing_status, v_existing_permission
  FROM trip_shares ts
  WHERE ts.trip_id = v_trip_id
    AND LOWER(ts.shared_with_email) = v_user_email;

  IF v_existing_share_id IS NOT NULL THEN
    -- Determine the best permission: upgrade only, never downgrade
    -- 'edit' > 'read', so if either existing or new is 'edit', result is 'edit'
    IF v_existing_status = 'pending' THEN
      -- Auto-accept and apply the higher permission level
      UPDATE trip_shares
      SET share_status = 'accepted',
          permission_level = CASE
            WHEN v_existing_permission = 'edit' OR v_permission_level = 'edit' THEN 'edit'
            ELSE COALESCE(v_permission_level, 'read')
          END
      WHERE id = v_existing_share_id;
    ELSIF v_permission_level = 'edit' AND COALESCE(v_existing_permission, 'read') <> 'edit' THEN
      -- Already accepted with read-only (or NULL): upgrade to edit
      UPDATE trip_shares
      SET permission_level = 'edit'
      WHERE id = v_existing_share_id;
    END IF;
    -- If existing is 'edit' and link is 'read', do nothing (no downgrade)

    RETURN v_trip_id;
  END IF;

  -- Create new share row with accepted status
  INSERT INTO trip_shares (
    trip_id,
    shared_with_email,
    shared_with_user_id,
    shared_by_user_id,
    permission_level,
    share_status
  ) VALUES (
    v_trip_id,
    v_user_email,
    v_user_id,
    v_trip_owner_id,
    v_permission_level,
    'accepted'
  );

  RETURN v_trip_id;
END;
$$;

GRANT EXECUTE ON FUNCTION redeem_invite_link(text) TO authenticated;
