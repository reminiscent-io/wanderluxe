-- Trip View Status Migration
-- Tracks which users have viewed or are actively viewing a trip
-- Enables real-time presence indicators for shared trips

BEGIN;

-- ============================================
-- Create the trip_view_status table
-- ============================================

CREATE TABLE IF NOT EXISTS trip_view_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- When the user last viewed the trip
  last_viewed_at TIMESTAMPTZ DEFAULT now(),
  -- Whether the user is currently viewing (for real-time presence)
  currently_viewing BOOLEAN DEFAULT false,
  -- Timestamp for when presence was last updated (for stale detection)
  presence_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Each user can only have one status per trip
  UNIQUE(trip_id, user_id)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_trip_view_status_trip_id ON trip_view_status(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_view_status_user_id ON trip_view_status(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_view_status_currently_viewing ON trip_view_status(trip_id, currently_viewing) WHERE currently_viewing = true;

-- ============================================
-- Enable RLS
-- ============================================

ALTER TABLE trip_view_status ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- Key requirement: Anyone on the shared list can see everyone else's status
-- ============================================

-- SELECT: Users can see view status for trips they have access to
-- This includes the trip owner and anyone in trip_shares
CREATE POLICY "trip_view_status_select_policy" ON trip_view_status
  FOR SELECT TO authenticated
  USING (
    -- User has access to the trip (owner or shared with)
    can_access_trip(trip_id)
  );

-- INSERT: Users can insert their own view status for trips they have access to
CREATE POLICY "trip_view_status_insert_policy" ON trip_view_status
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND can_access_trip(trip_id)
  );

-- UPDATE: Users can only update their own view status
CREATE POLICY "trip_view_status_update_policy" ON trip_view_status
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own view status
CREATE POLICY "trip_view_status_delete_policy" ON trip_view_status
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- Enable real-time for this table
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE trip_view_status;

COMMIT;
