-- Shareable invite links for trip sharing via text message / URL.
-- Allows trip owners to generate a short code URL that anyone can use to join the trip.

-- =============================================================================
-- 1) Create trip_invite_links table
-- =============================================================================

CREATE TABLE IF NOT EXISTS trip_invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  invite_code text NOT NULL UNIQUE,
  permission_level text NOT NULL CHECK (permission_level IN ('read', 'edit')),
  expires_at timestamptz, -- NULL means never expires
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trip_invite_links_trip_id ON trip_invite_links(trip_id);
CREATE INDEX idx_trip_invite_links_invite_code ON trip_invite_links(invite_code);

-- =============================================================================
-- 2) Enable RLS
-- =============================================================================

ALTER TABLE trip_invite_links ENABLE ROW LEVEL SECURITY;

-- Owner-only access: only the trip owner can manage invite links.
-- Deliberately uses direct ownership check (NOT can_edit_trip) so that
-- collaborators with edit access cannot see or create invite links.

CREATE POLICY "trip_invite_links_select_policy" ON trip_invite_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.trip_id = trip_invite_links.trip_id
        AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_invite_links_insert_policy" ON trip_invite_links
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.trip_id = trip_invite_links.trip_id
        AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_invite_links_update_policy" ON trip_invite_links
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.trip_id = trip_invite_links.trip_id
        AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_invite_links_delete_policy" ON trip_invite_links
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.trip_id = trip_invite_links.trip_id
        AND trips.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 3) Enable real-time
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE trip_invite_links;

-- =============================================================================
-- 4) RPC: get_invite_link_preview — callable by anon + authenticated
--    Returns basic trip info so unauthenticated users can see what they're joining.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_invite_link_preview(p_invite_code text)
RETURNS TABLE (
  trip_id uuid,
  destination text,
  cover_image_url text,
  arrival_date date,
  departure_date date,
  inviter_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_trip_id uuid;
  v_created_by uuid;
  v_expires_at timestamptz;
  v_is_active boolean;
BEGIN
  -- Look up the invite link
  SELECT il.trip_id, il.created_by_user_id, il.expires_at, il.is_active
  INTO v_trip_id, v_created_by, v_expires_at, v_is_active
  FROM trip_invite_links il
  WHERE il.invite_code = p_invite_code;

  -- Not found
  IF v_trip_id IS NULL THEN
    RETURN;
  END IF;

  -- Disabled
  IF NOT v_is_active THEN
    RETURN;
  END IF;

  -- Expired
  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RETURN;
  END IF;

  -- Return trip preview with inviter name
  RETURN QUERY
  SELECT
    t.trip_id,
    t.destination,
    t.cover_image_url,
    t.arrival_date,
    t.departure_date,
    COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Someone') AS inviter_name
  FROM trips t
  LEFT JOIN profiles p ON p.id = v_created_by
  WHERE t.trip_id = v_trip_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_invite_link_preview(text) TO anon;
GRANT EXECUTE ON FUNCTION get_invite_link_preview(text) TO authenticated;

-- =============================================================================
-- 5) RPC: redeem_invite_link — authenticated only
--    Validates code, checks for existing share, creates trip_shares row if needed.
-- =============================================================================

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

  -- Check for existing share
  SELECT ts.id, ts.share_status
  INTO v_existing_share_id, v_existing_status
  FROM trip_shares ts
  WHERE ts.trip_id = v_trip_id
    AND LOWER(ts.shared_with_email) = v_user_email;

  IF v_existing_share_id IS NOT NULL THEN
    -- If pending, auto-accept it
    IF v_existing_status = 'pending' THEN
      UPDATE trip_shares
      SET share_status = 'accepted'
      WHERE id = v_existing_share_id;
    END IF;
    -- Already shared (accepted or just auto-accepted) — return trip_id
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
