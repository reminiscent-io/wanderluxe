-- Add an explicit invitation status to trip_shares so recipients must Accept/Decline.
-- Existing shares are backfilled as 'accepted' to avoid breaking current access.

DO $$
BEGIN
  CREATE TYPE trip_share_status AS ENUM ('pending', 'accepted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE trip_shares
  ADD COLUMN IF NOT EXISTS share_status trip_share_status NOT NULL DEFAULT 'accepted';

-- New invites should default to pending (existing rows stay accepted)
ALTER TABLE trip_shares
  ALTER COLUMN share_status SET DEFAULT 'pending';

