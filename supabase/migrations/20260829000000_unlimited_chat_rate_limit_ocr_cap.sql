-- Pricing restructure: unlimited chat for everyone, per-minute human-pace
-- rate limit, and a universal daily OCR (document import) cap.
--
-- Changes:
--   1. profiles: ai_messages_limit default -1 (unlimited) for all users;
--      ai_imports_limit default 20/day for all users (Pro included — the OCR
--      cap is abuse protection, not a monetization lever).
--   2. user_ai_usage: minute-window columns for chat rate limiting.
--   3. increment_ai_usage: no daily message cap (the profile column remains a
--      per-user kill-switch: any value >= 0 re-enables a daily cap for that
--      user); adds a 15-messages-per-minute rate limit; new return columns
--      limit_type + retry_after_seconds.
--   4. increment_ai_import_usage / get_ai_import_usage: limit comes from the
--      profile column (default 20) with NO pro bypass.
--   5. All four usage functions now refuse to act on another user's row when
--      called with a user JWT (they are SECURITY DEFINER and exposed via
--      PostgREST; previously any authenticated user could pass an arbitrary
--      check_user_id). Service-role calls (auth.uid() IS NULL) are unaffected.
--
-- Rollback: restore function bodies from 20260119000000_update_ai_usage_limits.sql,
-- drop the two user_ai_usage columns, and reset profile defaults (10 / 5).

-- =============================================================================
-- STEP 1: Profile limits — unlimited messages, 20 imports/day, for everyone
-- =============================================================================

ALTER TABLE profiles
ALTER COLUMN ai_messages_limit SET DEFAULT -1;

ALTER TABLE profiles
ALTER COLUMN ai_imports_limit SET DEFAULT 20;

UPDATE profiles SET ai_messages_limit = -1 WHERE ai_messages_limit IS DISTINCT FROM -1;
UPDATE profiles SET ai_imports_limit = 20 WHERE ai_imports_limit IS DISTINCT FROM 20;

-- =============================================================================
-- STEP 2: Minute-window columns for chat rate limiting
-- =============================================================================

ALTER TABLE user_ai_usage
ADD COLUMN IF NOT EXISTS minute_window_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS minute_count INTEGER DEFAULT 0;

-- =============================================================================
-- STEP 3: increment_ai_usage — unlimited daily, 15/min rate limit
-- =============================================================================

-- Return shape changes (new columns), so CREATE OR REPLACE is not enough.
DROP FUNCTION IF EXISTS increment_ai_usage(uuid, date);

CREATE FUNCTION increment_ai_usage(check_user_id uuid, check_date date)
RETURNS TABLE (
  allowed boolean,
  current_count integer,
  daily_limit integer,
  limit_type text,
  retry_after_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_limit integer;
  v_count integer;
  v_window_start timestamptz;
  v_minute_count integer;
  v_now timestamptz := now();
  RATE_LIMIT_PER_MINUTE constant integer := 15;
BEGIN
  -- User-JWT callers may only touch their own usage row.
  IF auth.uid() IS NOT NULL AND auth.uid() <> check_user_id THEN
    RETURN QUERY SELECT false, 0, -1, 'forbidden'::text, 0;
    RETURN;
  END IF;

  -- Daily cap is a per-user kill-switch only: -1 (the default for everyone)
  -- means unlimited.
  SELECT COALESCE(ai_messages_limit, -1) INTO v_daily_limit
  FROM profiles
  WHERE id = check_user_id;

  IF v_daily_limit IS NULL THEN
    v_daily_limit := -1;
  END IF;

  -- Ensure today's row exists, then lock it so concurrent sends serialize.
  INSERT INTO user_ai_usage (user_id, date, message_count, minute_count)
  VALUES (check_user_id, check_date, 0, 0)
  ON CONFLICT (user_id, date) DO NOTHING;

  SELECT u.message_count, u.minute_window_start, COALESCE(u.minute_count, 0)
  INTO v_count, v_window_start, v_minute_count
  FROM user_ai_usage u
  WHERE u.user_id = check_user_id AND u.date = check_date
  FOR UPDATE;

  -- Per-minute rate limit (fixed 60s window) — keeps usage human-paced.
  IF v_window_start IS NOT NULL
     AND v_now - v_window_start < interval '60 seconds'
     AND v_minute_count >= RATE_LIMIT_PER_MINUTE THEN
    RETURN QUERY SELECT
      false,
      v_count,
      v_daily_limit,
      'rate'::text,
      GREATEST(1, 60 - FLOOR(EXTRACT(EPOCH FROM (v_now - v_window_start)))::integer);
    RETURN;
  END IF;

  -- Daily kill-switch (inactive while the limit is -1).
  IF v_daily_limit >= 0 AND v_count >= v_daily_limit THEN
    RETURN QUERY SELECT false, v_count, v_daily_limit, 'daily'::text, 0;
    RETURN;
  END IF;

  UPDATE user_ai_usage
  SET message_count = user_ai_usage.message_count + 1,
      minute_window_start = CASE
        WHEN minute_window_start IS NULL OR v_now - minute_window_start >= interval '60 seconds'
        THEN v_now ELSE minute_window_start END,
      minute_count = CASE
        WHEN minute_window_start IS NULL OR v_now - minute_window_start >= interval '60 seconds'
        THEN 1 ELSE COALESCE(minute_count, 0) + 1 END
  WHERE user_id = check_user_id AND date = check_date
  RETURNING user_ai_usage.message_count INTO v_count;

  RETURN QUERY SELECT true, v_count, v_daily_limit, NULL::text, 0;
END;
$$;

-- =============================================================================
-- STEP 4: get_ai_usage — report the (now unlimited) message limit
-- =============================================================================

CREATE OR REPLACE FUNCTION get_ai_usage(check_user_id uuid, check_date date)
RETURNS TABLE (
  current_count integer,
  daily_limit integer,
  subscription_tier text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_count integer;
  v_limit integer;
  v_tier text;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> check_user_id THEN
    RETURN QUERY SELECT 0, -1, 'free'::text;
    RETURN;
  END IF;

  SELECT
    COALESCE(p.ai_messages_limit, -1),
    COALESCE(p.subscription_tier, 'free')
  INTO v_limit, v_tier
  FROM profiles p
  WHERE p.id = check_user_id;

  IF v_limit IS NULL THEN
    v_limit := -1;
  END IF;
  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

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
-- STEP 5: increment_ai_import_usage — 20/day for every tier (no pro bypass)
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_ai_import_usage(check_user_id uuid, check_date date)
RETURNS TABLE (
  allowed boolean,
  current_count integer,
  daily_limit integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> check_user_id THEN
    RETURN QUERY SELECT false, 0, 0;
    RETURN;
  END IF;

  -- The OCR cap applies to every tier; the profile column stays adjustable
  -- per user (and -1 still means unlimited) as an operator escape hatch.
  SELECT COALESCE(ai_imports_limit, 20) INTO v_limit
  FROM profiles
  WHERE id = check_user_id;

  IF v_limit IS NULL THEN
    v_limit := 20;
  END IF;

  INSERT INTO user_ai_usage (user_id, date, import_count)
  VALUES (check_user_id, check_date, 0)
  ON CONFLICT (user_id, date) DO NOTHING;

  SELECT COALESCE(u.import_count, 0) INTO v_count
  FROM user_ai_usage u
  WHERE u.user_id = check_user_id AND u.date = check_date
  FOR UPDATE;

  IF v_limit >= 0 AND v_count >= v_limit THEN
    RETURN QUERY SELECT false, v_count, v_limit;
    RETURN;
  END IF;

  UPDATE user_ai_usage
  SET import_count = COALESCE(user_ai_usage.import_count, 0) + 1
  WHERE user_id = check_user_id AND date = check_date
  RETURNING user_ai_usage.import_count INTO v_count;

  RETURN QUERY SELECT true, v_count, v_limit;
END;
$$;

-- =============================================================================
-- STEP 6: get_ai_import_usage — report the universal 20/day limit
-- =============================================================================

CREATE OR REPLACE FUNCTION get_ai_import_usage(check_user_id uuid, check_date date)
RETURNS TABLE (
  current_count integer,
  daily_limit integer,
  subscription_tier text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_count integer;
  v_limit integer;
  v_tier text;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> check_user_id THEN
    RETURN QUERY SELECT 0, 0, 'free'::text;
    RETURN;
  END IF;

  SELECT
    COALESCE(p.ai_imports_limit, 20),
    COALESCE(p.subscription_tier, 'free')
  INTO v_limit, v_tier
  FROM profiles p
  WHERE p.id = check_user_id;

  IF v_limit IS NULL THEN
    v_limit := 20;
  END IF;
  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  SELECT COALESCE(u.import_count, 0) INTO v_count
  FROM user_ai_usage u
  WHERE u.user_id = check_user_id AND u.date = check_date;

  IF v_count IS NULL THEN
    v_count := 0;
  END IF;

  RETURN QUERY SELECT v_count, v_limit, v_tier;
END;
$$;
