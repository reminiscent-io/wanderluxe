-- Make user_ai_usage write-only through the SECURITY DEFINER usage RPCs.
--
-- user_ai_usage holds the counters behind the 15-messages/minute chat rate
-- limit (increment_ai_usage) and the 20/day OCR cap (increment_ai_import_usage,
-- called by parse-travel-doc). Both RPCs were locked to the caller's own row in
-- 20260829000000, but the table itself still carried an INSERT policy
-- (WITH CHECK user_id = auth.uid()), an UPDATE policy (USING user_id =
-- auth.uid()), and the Supabase default grants of ALL to anon and
-- authenticated. So any signed-in user could
--   PATCH /rest/v1/user_ai_usage?user_id=eq.<self>  {"import_count": 0}
-- and reset their own OCR cap or chat rate window as often as they liked, or
-- rewrite user_id on their row. TRUNCATE was granted too, and TRUNCATE skips
-- RLS entirely (PostgREST doesn't expose it, but nothing should hold it).
--
-- No browser code writes this table: chat counts through increment_ai_usage
-- (ai-chat Edge Function, service role), imports through
-- increment_ai_import_usage (parse-travel-doc, user JWT; Express, service
-- role), and the account-deletion route and eval seed delete with the service
-- role. The RPCs are SECURITY DEFINER owned by postgres, so they keep working
-- with no client grants. Same shape as print_design_usage
-- (20261117000000_print_design_daily_quota), minus the SELECT, which stays so
-- a user can still read their own row under user_ai_usage_select_policy.
--
-- Rollback:
--   GRANT INSERT, UPDATE, DELETE ON user_ai_usage TO authenticated;
--   CREATE POLICY user_ai_usage_insert_policy ON user_ai_usage FOR INSERT
--     TO authenticated WITH CHECK (user_id = auth.uid());
--   CREATE POLICY user_ai_usage_update_policy ON user_ai_usage FOR UPDATE
--     TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_ai_usage_insert_policy ON user_ai_usage;
DROP POLICY IF EXISTS user_ai_usage_update_policy ON user_ai_usage;

REVOKE ALL ON user_ai_usage FROM anon, authenticated;
GRANT SELECT ON user_ai_usage TO authenticated;
