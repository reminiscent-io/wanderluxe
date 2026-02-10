-- Fix accept_trip_share to set shared_with_user_id when a user accepts an invite.
-- Previously, shared_with_user_id could remain NULL for users who were invited
-- before creating an account, causing the viewer-count matching logic to fail.
-- Also fix the WHERE clause that incorrectly excluded rows with NULL shared_with_user_id.

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
  SET share_status = 'accepted',
      shared_with_user_id = auth.uid()
  WHERE id = share_id
    AND LOWER(shared_with_email) = user_email
    -- Prevent accepting the owner's canonical row (owner has shared_by = shared_with)
    AND (shared_with_user_id IS NULL OR shared_by_user_id <> shared_with_user_id)
    AND share_status = 'pending';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count = 1;
END;
$$;
