-- Allow recipients (shared_with_email) to delete their own trip_shares rows
-- so they can "leave" a trip that was shared with them.
--
-- NOTE:
-- - Editors/owners can still remove other travelers via can_edit_trip(trip_id)
-- - We explicitly prevent deleting the owner's canonical trip_shares row
--   (identified by shared_by_user_id = shared_with_user_id)

DROP POLICY IF EXISTS "trip_shares_delete_policy" ON trip_shares;

CREATE POLICY "trip_shares_delete_policy" ON trip_shares
  FOR DELETE
  USING (
    (
      -- Owners/editors can remove non-owner traveler rows
      can_edit_trip(trip_id)
      AND shared_by_user_id <> shared_with_user_id
    )
    OR (
      -- A recipient can remove *their own* access row (leave trip)
      LOWER(shared_with_email) = LOWER(auth.jwt() ->> 'email')
      AND shared_by_user_id <> shared_with_user_id
    )
  );

