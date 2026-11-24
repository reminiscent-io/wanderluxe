-- Print Studio daily quota: one free edition a day for every signed-in member,
-- up to 10 a day for Pro.
--
-- Why a table of its own rather than counting trip_print_designs:
--   * trip_print_designs has a DELETE policy (created_by = auth.uid()), and a
--     deleted trip cascades its designs, so a count of those rows resets the
--     moment a member deletes one. For Pro's 10/day that was tolerable; for a
--     free tier it is the whole gate.
--   * user_ai_usage is no better: authenticated holds UPDATE on every column
--     of its own row, so any counter there can be zeroed from the browser.
--
-- print_design_usage has RLS on, no policies and no grants to anon or
-- authenticated: only the service role (the Express print-design route)
-- reads or writes it, through the two functions below.
--
-- The tier and its limit are decided by the route (profiles.subscription_tier),
-- and passed in; the function only makes check-and-increment atomic so two
-- concurrent requests cannot both spend the last edition.
--
-- Rollback: DROP FUNCTION refund_print_design(uuid, date);
--           DROP FUNCTION consume_print_design(uuid, date, integer);
--           DROP TABLE print_design_usage;

CREATE TABLE IF NOT EXISTS print_design_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  design_count INTEGER NOT NULL DEFAULT 0 CHECK (design_count >= 0),
  PRIMARY KEY (user_id, date)
);

ALTER TABLE print_design_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON print_design_usage FROM anon, authenticated;

-- Spends one edition if the member is under p_limit today.
CREATE OR REPLACE FUNCTION consume_print_design(
  p_user_id uuid,
  p_date date,
  p_limit integer
)
RETURNS TABLE (allowed boolean, used integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO print_design_usage (user_id, date, design_count)
  VALUES (p_user_id, p_date, 0)
  ON CONFLICT (user_id, date) DO NOTHING;

  SELECT u.design_count INTO v_count
  FROM print_design_usage u
  WHERE u.user_id = p_user_id AND u.date = p_date
  FOR UPDATE;

  IF v_count >= p_limit THEN
    RETURN QUERY SELECT false, v_count;
    RETURN;
  END IF;

  UPDATE print_design_usage u
  SET design_count = u.design_count + 1
  WHERE u.user_id = p_user_id AND u.date = p_date
  RETURNING u.design_count INTO v_count;

  RETURN QUERY SELECT true, v_count;
END;
$$;

-- Gives an edition back when generation failed on our side (OpenAI error,
-- failed insert), so a free member does not lose their day to an outage.
CREATE OR REPLACE FUNCTION refund_print_design(p_user_id uuid, p_date date)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE print_design_usage
  SET design_count = GREATEST(design_count - 1, 0)
  WHERE user_id = p_user_id AND date = p_date;
$$;

REVOKE EXECUTE ON FUNCTION consume_print_design(uuid, date, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION refund_print_design(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_print_design(uuid, date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION refund_print_design(uuid, date) TO service_role;

-- Carry today's editions over, so switching counters mid-day hands out
-- nothing extra. Days are UTC, as the route counts them.
INSERT INTO print_design_usage (user_id, date, design_count)
SELECT created_by, (created_at AT TIME ZONE 'UTC')::date, count(*)
FROM trip_print_designs
WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
GROUP BY 1, 2
ON CONFLICT (user_id, date) DO UPDATE
  SET design_count = GREATEST(print_design_usage.design_count, EXCLUDED.design_count);
