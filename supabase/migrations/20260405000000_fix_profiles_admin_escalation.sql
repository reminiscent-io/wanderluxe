-- Fix privilege escalation: prevent users from setting is_admin on their own profile
-- The previous policy allowed any authenticated user to UPDATE any column on their
-- own profile row, including is_admin. This adds a WITH CHECK constraint ensuring
-- is_admin cannot be changed through normal user updates.

DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND is_admin IS NOT DISTINCT FROM (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid())
  );
