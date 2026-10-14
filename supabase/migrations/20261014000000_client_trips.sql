-- Client trips: an admin (travel advisor) creates and owns a trip planned for
-- someone else. The advisor stays trips.user_id, so every existing owner path
-- (RLS, delete, hide, Print Studio) keeps working; the client joins later as an
-- ordinary edit share. A non-null client_name is the whole "client trip" flag.

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_email text;

COMMENT ON COLUMN public.trips.client_name IS
  'Set by an admin (travel advisor) when the trip is planned for a client. Non-null marks a client trip. Only is_admin() callers may set or change it (trips_guard_client_fields).';
COMMENT ON COLUMN public.trips.client_email IS
  'Client contact email for an advisor-made trip; prefills the client invite. Same admin-only rule as client_name.';

-- The UI hides the client fields from non-admins; this is what actually stops
-- them. Same shape as the profiles is_admin escalation fix: the client cannot
-- be trusted to police a privilege.
--
-- auth.role() is the JWT role. Browser and MCP-user requests carry
-- 'authenticated' (or 'anon') and are checked, including inside SECURITY
-- DEFINER functions they call. The service role and direct SQL (no JWT) are
-- operator paths and pass through.
CREATE OR REPLACE FUNCTION public.trips_guard_client_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), '') NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF (NEW.client_name IS NOT NULL OR NEW.client_email IS NOT NULL) AND NOT is_admin() THEN
      RAISE EXCEPTION 'Only admins can create client trips'
        USING ERRCODE = '42501';
    END IF;
  ELSIF (NEW.client_name IS DISTINCT FROM OLD.client_name
         OR NEW.client_email IS DISTINCT FROM OLD.client_email)
        AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can change a trip''s client'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trips_guard_client_fields ON public.trips;
CREATE TRIGGER trips_guard_client_fields
  BEFORE INSERT OR UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.trips_guard_client_fields();
