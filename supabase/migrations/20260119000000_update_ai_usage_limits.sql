-- Update AI Usage Limits Migration
-- Changes: AI messages 15 → 10/day, adds AI imports 5/day for free tier

-- =============================================================================
-- STEP 1: Update default message limit from 15 to 10
-- =============================================================================

-- Update the default for new profiles
ALTER TABLE profiles 
ALTER COLUMN ai_messages_limit SET DEFAULT 10;

-- Update existing free tier users to new limit (15 -> 10)
UPDATE profiles 
SET ai_messages_limit = 10 
WHERE subscription_tier = 'free' AND ai_messages_limit = 15;

-- Add column for AI imports limit
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ai_imports_limit INTEGER DEFAULT 5;

-- Ensure existing users have the import limit set
UPDATE profiles 
SET ai_imports_limit = 5 
WHERE ai_imports_limit IS NULL;

-- =============================================================================
-- STEP 2: Create/update user_ai_usage table to track imports
-- =============================================================================

-- Add import_count column to existing table
ALTER TABLE user_ai_usage
ADD COLUMN IF NOT EXISTS import_count INTEGER DEFAULT 0;

-- =============================================================================
-- STEP 3: Update increment_ai_usage function with new default
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
  v_tier text;
BEGIN
  -- Get user's daily limit and tier from profile
  SELECT 
    COALESCE(ai_messages_limit, 10),
    COALESCE(subscription_tier, 'free')
  INTO v_limit, v_tier
  FROM profiles
  WHERE id = check_user_id;

  -- If no profile, use default
  IF v_limit IS NULL THEN
    v_limit := 10;
  END IF;

  -- Pro users get unlimited (-1)
  IF v_tier = 'pro' THEN
    v_limit := -1;
  END IF;

  -- Upsert usage record and get current count
  INSERT INTO user_ai_usage (user_id, date, message_count)
  VALUES (check_user_id, check_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET message_count = user_ai_usage.message_count + 1
  RETURNING user_ai_usage.message_count INTO v_count;

  -- Check if limit exceeded (after increment)
  -- Pro users (limit = -1) are effectively unlimited
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
-- STEP 4: Update get_ai_usage function with new default
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
    COALESCE(p.ai_messages_limit, 10),
    COALESCE(p.subscription_tier, 'free')
  INTO v_limit, v_tier
  FROM profiles p
  WHERE p.id = check_user_id;

  -- Default values if no profile
  IF v_limit IS NULL THEN
    v_limit := 10;
  END IF;
  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  -- Pro users get unlimited
  IF v_tier = 'pro' THEN
    v_limit := -1;
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
-- STEP 5: Create function to check and increment AI imports
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_ai_import_usage(check_user_id uuid, check_date date)
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
  v_tier text;
BEGIN
  -- Get user's daily limit and tier from profile
  SELECT 
    COALESCE(ai_imports_limit, 5),
    COALESCE(subscription_tier, 'free')
  INTO v_limit, v_tier
  FROM profiles
  WHERE id = check_user_id;

  -- If no profile, use default
  IF v_limit IS NULL THEN
    v_limit := 5;
  END IF;

  -- Pro users get unlimited (-1)
  IF v_tier = 'pro' THEN
    v_limit := -1;
  END IF;

  -- Upsert usage record and get current import count
  INSERT INTO user_ai_usage (user_id, date, import_count)
  VALUES (check_user_id, check_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET import_count = COALESCE(user_ai_usage.import_count, 0) + 1
  RETURNING COALESCE(user_ai_usage.import_count, 1) INTO v_count;

  -- Check if limit exceeded
  IF v_limit = -1 OR v_count <= v_limit THEN
    RETURN QUERY SELECT true, v_count, v_limit;
  ELSE
    -- Rollback the increment if over limit
    UPDATE user_ai_usage
    SET import_count = COALESCE(import_count, 1) - 1
    WHERE user_id = check_user_id AND date = check_date;

    RETURN QUERY SELECT false, v_count - 1, v_limit;
  END IF;
END;
$$;

-- =============================================================================
-- STEP 6: Create function to get AI import usage
-- =============================================================================

CREATE OR REPLACE FUNCTION get_ai_import_usage(check_user_id uuid, check_date date)
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
    COALESCE(p.ai_imports_limit, 5),
    COALESCE(p.subscription_tier, 'free')
  INTO v_limit, v_tier
  FROM profiles p
  WHERE p.id = check_user_id;

  -- Default values if no profile
  IF v_limit IS NULL THEN
    v_limit := 5;
  END IF;
  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  -- Pro users get unlimited
  IF v_tier = 'pro' THEN
    v_limit := -1;
  END IF;

  -- Get current count for today
  SELECT COALESCE(u.import_count, 0) INTO v_count
  FROM user_ai_usage u
  WHERE u.user_id = check_user_id AND u.date = check_date;

  IF v_count IS NULL THEN
    v_count := 0;
  END IF;

  RETURN QUERY SELECT v_count, v_limit, v_tier;
END;
$$;
