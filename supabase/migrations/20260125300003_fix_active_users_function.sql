-- Fix admin_get_active_users to use auth.users.last_sign_in_at
-- which is automatically tracked by Supabase, falling back to profiles.last_login_at

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

  -- Use auth.users.last_sign_in_at which Supabase tracks automatically
  -- Fall back to profiles.last_login_at if available
  RETURN (
    SELECT COUNT(DISTINCT p.id)
    FROM profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE
      COALESCE(u.last_sign_in_at, p.last_login_at, p.created_at) >= NOW() - (days_back || ' days')::INTERVAL
  );
END;
$$;

-- Also add a function to get new user signups in last N days
CREATE OR REPLACE FUNCTION admin_get_new_users(days_back INTEGER DEFAULT 30)
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
    WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_new_users(INTEGER) TO authenticated;
