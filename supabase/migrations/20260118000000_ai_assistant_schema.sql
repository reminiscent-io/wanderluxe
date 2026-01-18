-- AI Assistant Schema Migration
-- Creates tables for AI chat threads, messages, usage tracking, and extends profiles

-- =============================================================================
-- STEP 1: Extend profiles table with subscription fields
-- =============================================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
ADD COLUMN IF NOT EXISTS ai_messages_limit INTEGER DEFAULT 15;

-- =============================================================================
-- STEP 2: Create ai_chat_threads table (per-user, per-trip private conversations)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one thread per user per trip
  UNIQUE (trip_id, user_id)
);

-- Enable RLS
ALTER TABLE ai_chat_threads ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 3: Create ai_chat_messages table (individual messages)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES ai_chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create index for faster message retrieval
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_thread_id ON ai_chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_at ON ai_chat_messages(created_at);

-- =============================================================================
-- STEP 4: Create user_ai_usage table (daily usage tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  message_count INTEGER DEFAULT 0,

  -- Ensure one record per user per day
  UNIQUE (user_id, date)
);

-- Enable RLS
ALTER TABLE user_ai_usage ENABLE ROW LEVEL SECURITY;

-- Create index for faster usage lookup
CREATE INDEX IF NOT EXISTS idx_user_ai_usage_user_date ON user_ai_usage(user_id, date);

-- =============================================================================
-- STEP 5: Create helper function for thread ownership check
-- =============================================================================

-- Function to check if user owns a thread
CREATE OR REPLACE FUNCTION user_owns_thread(check_thread_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ai_chat_threads
    WHERE id = check_thread_id AND user_id = auth.uid()
  );
$$;

-- =============================================================================
-- STEP 6: RLS Policies for ai_chat_threads
-- =============================================================================

-- Users can view their own threads for trips they have access to
CREATE POLICY "ai_chat_threads_select_policy" ON ai_chat_threads
  FOR SELECT
  USING (user_id = auth.uid() AND can_access_trip(trip_id));

-- Users can create threads for trips they have access to
CREATE POLICY "ai_chat_threads_insert_policy" ON ai_chat_threads
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND can_access_trip(trip_id));

-- Users can update their own threads
CREATE POLICY "ai_chat_threads_update_policy" ON ai_chat_threads
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own threads
CREATE POLICY "ai_chat_threads_delete_policy" ON ai_chat_threads
  FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- STEP 7: RLS Policies for ai_chat_messages
-- =============================================================================

-- Users can view messages in their own threads
CREATE POLICY "ai_chat_messages_select_policy" ON ai_chat_messages
  FOR SELECT
  USING (user_owns_thread(thread_id));

-- Users can insert messages in their own threads
CREATE POLICY "ai_chat_messages_insert_policy" ON ai_chat_messages
  FOR INSERT
  WITH CHECK (user_owns_thread(thread_id));

-- Users can delete messages in their own threads
CREATE POLICY "ai_chat_messages_delete_policy" ON ai_chat_messages
  FOR DELETE
  USING (user_owns_thread(thread_id));

-- =============================================================================
-- STEP 8: RLS Policies for user_ai_usage
-- =============================================================================

-- Users can view their own usage
CREATE POLICY "user_ai_usage_select_policy" ON user_ai_usage
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own usage records
CREATE POLICY "user_ai_usage_insert_policy" ON user_ai_usage
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own usage records
CREATE POLICY "user_ai_usage_update_policy" ON user_ai_usage
  FOR UPDATE
  USING (user_id = auth.uid());

-- =============================================================================
-- STEP 9: Function to increment daily usage atomically
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_ai_usage(check_user_id uuid, check_date date)
RETURNS TABLE (
  allowed boolean,
  current_count integer,
  daily_limit integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  -- Get user's daily limit from profile
  SELECT COALESCE(ai_messages_limit, 15) INTO v_limit
  FROM profiles
  WHERE id = check_user_id;

  -- If no profile, use default
  IF v_limit IS NULL THEN
    v_limit := 15;
  END IF;

  -- Upsert usage record and get current count
  INSERT INTO user_ai_usage (user_id, date, message_count)
  VALUES (check_user_id, check_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET message_count = user_ai_usage.message_count + 1
  RETURNING user_ai_usage.message_count INTO v_count;

  -- Check if limit exceeded (after increment, but we'll allow up to limit)
  -- Pro users (limit = -1 or very high) are effectively unlimited
  IF v_limit = -1 OR v_count <= v_limit THEN
    RETURN QUERY SELECT true, v_count, v_limit;
  ELSE
    -- Rollback the increment if over limit
    UPDATE user_ai_usage
    SET message_count = message_count - 1
    WHERE user_id = check_user_id AND date = check_date;

    RETURN QUERY SELECT false, v_count - 1, v_limit;
  END IF;
END;
$$;

-- =============================================================================
-- STEP 10: Function to get current usage
-- =============================================================================

CREATE OR REPLACE FUNCTION get_ai_usage(check_user_id uuid, check_date date)
RETURNS TABLE (
  current_count integer,
  daily_limit integer,
  subscription_tier text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_count integer;
  v_limit integer;
  v_tier text;
BEGIN
  -- Get user's limit and tier from profile
  SELECT
    COALESCE(p.ai_messages_limit, 15),
    COALESCE(p.subscription_tier, 'free')
  INTO v_limit, v_tier
  FROM profiles p
  WHERE p.id = check_user_id;

  -- Default values if no profile
  IF v_limit IS NULL THEN
    v_limit := 15;
  END IF;
  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  -- Get current count for today
  SELECT COALESCE(u.message_count, 0) INTO v_count
  FROM user_ai_usage u
  WHERE u.user_id = check_user_id AND u.date = check_date;

  IF v_count IS NULL THEN
    v_count := 0;
  END IF;

  RETURN QUERY SELECT v_count, v_limit, v_tier;
END;
$$;

-- =============================================================================
-- STEP 11: Trigger to update updated_at on thread modification
-- =============================================================================

CREATE OR REPLACE FUNCTION update_ai_chat_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_chat_threads_updated_at
  BEFORE UPDATE ON ai_chat_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_chat_thread_timestamp();

-- Also update thread timestamp when messages are added
CREATE OR REPLACE FUNCTION update_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_chat_threads
  SET updated_at = NOW()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_chat_messages_update_thread
  AFTER INSERT ON ai_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_on_message();
