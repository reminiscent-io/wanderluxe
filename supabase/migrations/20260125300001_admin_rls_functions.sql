-- =============================================
-- Admin RLS Functions (SECURITY DEFINER)
-- These functions allow admins to query aggregate
-- data across all users while maintaining security
-- =============================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Get total user count
CREATE OR REPLACE FUNCTION admin_get_user_count()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN (SELECT COUNT(*) FROM profiles);
END;
$$;

-- Get active users within N days
CREATE OR REPLACE FUNCTION admin_get_active_users(days_back INTEGER DEFAULT 30)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN (
    SELECT COUNT(*)
    FROM profiles
    WHERE last_login_at >= NOW() - (days_back || ' days')::INTERVAL
  );
END;
$$;

-- Get trip statistics
CREATE OR REPLACE FUNCTION admin_get_trip_stats()
RETURNS TABLE(
  total_trips BIGINT,
  upcoming_trips BIGINT,
  active_trips BIGINT,
  past_trips BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  today DATE := CURRENT_DATE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_trips,
    COUNT(*) FILTER (WHERE arrival_date > today)::BIGINT AS upcoming_trips,
    COUNT(*) FILTER (WHERE arrival_date <= today AND departure_date >= today)::BIGINT AS active_trips,
    COUNT(*) FILTER (WHERE departure_date < today)::BIGINT AS past_trips
  FROM trips;
END;
$$;

-- Get subscription tier statistics
CREATE OR REPLACE FUNCTION admin_get_subscription_stats()
RETURNS TABLE(
  tier TEXT,
  user_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(subscription_tier, 'free') AS tier,
    COUNT(*)::BIGINT AS user_count
  FROM profiles
  GROUP BY subscription_tier
  ORDER BY user_count DESC;
END;
$$;

-- Get engagement event summary
CREATE OR REPLACE FUNCTION admin_get_engagement_summary(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  event_type TEXT,
  event_count BIGINT,
  unique_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    e.event_type,
    COUNT(*)::BIGINT AS event_count,
    COUNT(DISTINCT e.user_id)::BIGINT AS unique_users
  FROM user_engagement_events e
  WHERE e.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY e.event_type
  ORDER BY event_count DESC;
END;
$$;

-- Generic table count function for admin
CREATE OR REPLACE FUNCTION admin_get_table_count(table_name TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  count_result BIGINT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Only allow counting specific tables
  IF table_name NOT IN ('trips', 'accommodations', 'transportation', 'reservations', 'day_activities', 'trip_shares', 'chat_logs', 'vision_board_items') THEN
    RAISE EXCEPTION 'Table not allowed for counting';
  END IF;

  EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO count_result;
  RETURN count_result;
END;
$$;

-- Get new signups by week (last N weeks)
CREATE OR REPLACE FUNCTION admin_get_signups_by_week(weeks_back INTEGER DEFAULT 12)
RETURNS TABLE(
  week_start DATE,
  signup_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    DATE_TRUNC('week', created_at)::DATE AS week_start,
    COUNT(*)::BIGINT AS signup_count
  FROM profiles
  WHERE created_at >= NOW() - (weeks_back || ' weeks')::INTERVAL
  GROUP BY DATE_TRUNC('week', created_at)
  ORDER BY week_start;
END;
$$;

-- Get engagement events over time (daily for last N days)
CREATE OR REPLACE FUNCTION admin_get_engagement_over_time(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  event_date DATE,
  event_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    DATE(created_at) AS event_date,
    COUNT(*)::BIGINT AS event_count
  FROM user_engagement_events
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY event_date;
END;
$$;

-- Grant execute permissions to authenticated users (functions check admin status internally)
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_count() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_active_users(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_trip_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_subscription_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_engagement_summary(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_table_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_signups_by_week(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_engagement_over_time(INTEGER) TO authenticated;

-- Add RLS policy for admins to read engagement events
CREATE POLICY "Admins can view all engagement events"
  ON user_engagement_events
  FOR SELECT
  USING (is_admin());
