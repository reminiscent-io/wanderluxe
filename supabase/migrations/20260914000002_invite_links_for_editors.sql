-- Let collaborators with edit access manage invite links, not just the owner.
--
-- The original policies checked trips.user_id = auth.uid() so an editor could
-- not see or create links. In practice the organizer often hands planning to
-- a co-traveler who then cannot invite the rest of the group, and the header
-- "Invite" button would be a dead end for them. can_edit_trip() (security
-- definer, owner OR accepted edit share) is the same gate every other
-- collaborative write uses.

DROP POLICY IF EXISTS "trip_invite_links_select_policy" ON trip_invite_links;
DROP POLICY IF EXISTS "trip_invite_links_insert_policy" ON trip_invite_links;
DROP POLICY IF EXISTS "trip_invite_links_update_policy" ON trip_invite_links;
DROP POLICY IF EXISTS "trip_invite_links_delete_policy" ON trip_invite_links;

CREATE POLICY "trip_invite_links_select_policy" ON trip_invite_links
  FOR SELECT
  USING (can_edit_trip(trip_id));

CREATE POLICY "trip_invite_links_insert_policy" ON trip_invite_links
  FOR INSERT
  WITH CHECK (can_edit_trip(trip_id) AND created_by_user_id = auth.uid());

CREATE POLICY "trip_invite_links_update_policy" ON trip_invite_links
  FOR UPDATE
  USING (can_edit_trip(trip_id))
  WITH CHECK (can_edit_trip(trip_id));

CREATE POLICY "trip_invite_links_delete_policy" ON trip_invite_links
  FOR DELETE
  USING (can_edit_trip(trip_id));
