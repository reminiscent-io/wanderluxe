-- Allow recipients to see basic trip info for pending invites
-- so they can display in MyTrips with Accept/Decline buttons.

CREATE OR REPLACE FUNCTION get_pending_trip_preview(p_share_id uuid)
RETURNS TABLE (
  trip_id uuid,
  destination text,
  primary_destination text,
  arrival_date date,
  departure_date date,
  cover_image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_email text;
  v_trip_id uuid;
BEGIN
  user_email := LOWER(auth.jwt() ->> 'email');

  IF user_email IS NULL OR user_email = '' THEN
    RETURN;
  END IF;

  -- Get trip_id from share, verifying the caller is the recipient and status is pending
  SELECT ts.trip_id INTO v_trip_id
  FROM trip_shares ts
  WHERE ts.id = p_share_id
    AND LOWER(ts.shared_with_email) = user_email
    AND ts.share_status = 'pending'
    AND ts.shared_by_user_id <> COALESCE(ts.shared_with_user_id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_trip_id IS NULL THEN
    RETURN;
  END IF;

  -- Return basic trip info for display purposes
  RETURN QUERY
  SELECT
    t.trip_id,
    t.destination,
    t.primary_destination,
    t.arrival_date,
    t.departure_date,
    t.cover_image_url
  FROM trips t
  WHERE t.trip_id = v_trip_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pending_trip_preview(uuid) TO authenticated;
