-- Fix: Anonymous users cannot view public trips
--
-- Migration 20260124000003 accidentally restricted the trips SELECT policy
-- to `TO authenticated` only. This broke anonymous access to public trips
-- on the Explore page and direct trip URLs.
--
-- The anon role still has GRANT SELECT (from 20260121000001), but RLS
-- blocks all rows because no policy matches the anon role.
--
-- Fix: Add a separate SELECT policy for the anon role that only exposes
-- public trips.

CREATE POLICY "trips_anon_select_public" ON trips
  FOR SELECT
  TO anon
  USING (is_public = true);
