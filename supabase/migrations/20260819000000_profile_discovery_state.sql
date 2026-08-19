-- First-run discovery hints.
--
-- Records which one-time "did you know" hints a user has already seen, so a
-- hint fires once per person rather than once per device. The client keeps a
-- localStorage mirror for instant reads (a hint that renders a beat late reads
-- as a glitch), and treats the two sources as a union: seen anywhere is seen
-- everywhere.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discovery_state jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.discovery_state IS
  'Map of first-run hint key -> true once the user has seen or acted on that hint.';

-- Merge a single key server-side. Read-modify-write from the client would race
-- between tabs and clobber keys set elsewhere; `||` on jsonb does not.
-- SECURITY INVOKER so the existing profiles_update_policy still applies —
-- the caller can only ever touch their own row, and is_admin stays pinned.
CREATE OR REPLACE FUNCTION public.mark_discovery_seen(discovery_key text)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET discovery_state = COALESCE(discovery_state, '{}'::jsonb)
                        || jsonb_build_object(discovery_key, true),
      updated_at = now()
  WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.mark_discovery_seen(text) FROM public;
GRANT EXECUTE ON FUNCTION public.mark_discovery_seen(text) TO authenticated;
