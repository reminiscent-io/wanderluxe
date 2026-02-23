-- =============================================
-- Admin AI Insights Table
-- Stores AI-generated platform insights with metric snapshots
-- =============================================

CREATE TABLE IF NOT EXISTS admin_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_text TEXT NOT NULL,
  metrics_snapshot JSONB NOT NULL DEFAULT '{}',
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for efficient ordering
CREATE INDEX idx_admin_insights_created_at ON admin_insights(created_at DESC);

-- Enable RLS
ALTER TABLE admin_insights ENABLE ROW LEVEL SECURITY;

-- Only admins can read insights
CREATE POLICY "Admins can view all insights"
  ON admin_insights
  FOR SELECT
  USING (is_admin());

-- Only admins can insert insights
CREATE POLICY "Admins can insert insights"
  ON admin_insights
  FOR INSERT
  WITH CHECK (is_admin());

-- Paginated history RPC
CREATE OR REPLACE FUNCTION admin_get_insights(
  page_limit INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  insight_text TEXT,
  metrics_snapshot JSONB,
  model TEXT,
  created_at TIMESTAMPTZ
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
    ai.id,
    ai.insight_text,
    ai.metrics_snapshot,
    ai.model,
    ai.created_at
  FROM admin_insights ai
  ORDER BY ai.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_insights(INTEGER, INTEGER) TO authenticated;
