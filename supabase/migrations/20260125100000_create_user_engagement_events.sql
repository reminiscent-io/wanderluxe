-- Create user_engagement_events table for tracking user activity and engagement
CREATE TABLE IF NOT EXISTS user_engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create index for efficient querying by user and time
CREATE INDEX idx_engagement_events_user_id ON user_engagement_events(user_id);
CREATE INDEX idx_engagement_events_event_type ON user_engagement_events(event_type);
CREATE INDEX idx_engagement_events_created_at ON user_engagement_events(created_at DESC);
CREATE INDEX idx_engagement_events_user_type ON user_engagement_events(user_id, event_type);

-- Enable Row Level Security
ALTER TABLE user_engagement_events ENABLE ROW LEVEL SECURITY;

-- Users can only view their own engagement events
CREATE POLICY "Users can view own engagement events"
  ON user_engagement_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own engagement events
CREATE POLICY "Users can insert own engagement events"
  ON user_engagement_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add comment describing the table
COMMENT ON TABLE user_engagement_events IS 'Tracks user engagement events for analytics and activity monitoring';
COMMENT ON COLUMN user_engagement_events.event_type IS 'Type of event: trip_created, trip_deleted, activity_added, accommodation_booked, pdf_exported, ai_message_sent, trip_shared, etc.';
COMMENT ON COLUMN user_engagement_events.event_data IS 'Additional context for the event (trip_id, activity_id, etc.)';
