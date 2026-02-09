-- Allow anonymous users to view public trips on the Explore page
-- The trips_select_policy from 20260124000003 restricts SELECT to "TO authenticated",
-- which blocks anonymous users from seeing public trips even though GRANT SELECT TO anon exists.

CREATE POLICY "trips_select_public_anon" ON trips
  FOR SELECT
  TO anon
  USING (is_public = true);
