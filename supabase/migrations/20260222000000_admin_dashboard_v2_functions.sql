-- =============================================
-- Admin Dashboard V2 Functions
-- New RPC functions for the redesigned admin dashboard
-- =============================================

-- Get daily unique active users (based on engagement events)
CREATE OR REPLACE FUNCTION admin_get_daily_unique_users(days_back INTEGER DEFAULT 30)
RETURNS TABLE(event_date DATE, unique_users BIGINT)
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
    DATE(e.created_at) AS event_date,
    COUNT(DISTINCT e.user_id)::BIGINT AS unique_users
  FROM user_engagement_events e
  WHERE e.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY DATE(e.created_at)
  ORDER BY event_date;
END;
$$;

-- Get sharing statistics
CREATE OR REPLACE FUNCTION admin_get_sharing_stats()
RETURNS TABLE(
  total_shares BIGINT,
  shared_trips BIGINT,
  shares_this_month BIGINT
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
    (SELECT COUNT(*)::BIGINT FROM trip_shares WHERE NOT is_owner) AS total_shares,
    (SELECT COUNT(DISTINCT trip_id)::BIGINT FROM trip_shares WHERE NOT is_owner) AS shared_trips,
    (SELECT COUNT(*)::BIGINT FROM trip_shares WHERE NOT is_owner AND created_at >= NOW() - INTERVAL '30 days') AS shares_this_month;
END;
$$;

-- Get shares over time (weekly)
CREATE OR REPLACE FUNCTION admin_get_shares_over_time(weeks_back INTEGER DEFAULT 12)
RETURNS TABLE(week_start DATE, share_count BIGINT)
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
    COUNT(*)::BIGINT AS share_count
  FROM trip_shares
  WHERE NOT is_owner
    AND created_at >= NOW() - (weeks_back || ' weeks')::INTERVAL
  GROUP BY DATE_TRUNC('week', created_at)
  ORDER BY week_start;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_get_daily_unique_users(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_sharing_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_shares_over_time(INTEGER) TO authenticated;
