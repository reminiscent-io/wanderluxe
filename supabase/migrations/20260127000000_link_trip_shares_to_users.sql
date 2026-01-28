-- Migration: Link trip_shares to user profiles for avatar display
-- This fixes the issue where traveler avatars don't display in sidebar and timeline
-- because shared_with_user_id was not being set when sharing trips

-- Function to get user ID from email (SECURITY DEFINER to access auth.users)
CREATE OR REPLACE FUNCTION get_user_id_by_email(lookup_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT id FROM auth.users
    WHERE LOWER(email) = LOWER(lookup_email)
    LIMIT 1
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_id_by_email(text) TO authenticated;

-- Trigger function to auto-link trip_shares when user profile is created or updated
-- This handles the case where a trip is shared with an email before the user signs up
CREATE OR REPLACE FUNCTION link_trip_shares_on_profile_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get the user's email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;

  IF user_email IS NOT NULL THEN
    -- Update any trip_shares that match this email but don't have user ID linked
    UPDATE trip_shares
    SET shared_with_user_id = NEW.id
    WHERE LOWER(shared_with_email) = LOWER(user_email)
      AND shared_with_user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on profiles table (drop first if exists to avoid errors)
DROP TRIGGER IF EXISTS link_trip_shares_trigger ON profiles;
CREATE TRIGGER link_trip_shares_trigger
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION link_trip_shares_on_profile_change();

-- Backfill logic moved to 20260128000000_fix_trip_shares_owner_records.sql
-- to handle cleanup of duplicate records before setting owner emails
