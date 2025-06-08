-- Fix permission update issues and day_activities RLS policy
-- Run this in Supabase SQL Editor

-- Create RPC function to update trip share permissions
CREATE OR REPLACE FUNCTION update_trip_share_permission(share_id UUID, new_permission VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE trip_shares 
  SET permission_level = new_permission 
  WHERE id = share_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix day_activities RLS policy - the issue is likely with how trip_id is accessed
DROP POLICY IF EXISTS "Allow insert day activities with edit permission" ON day_activities;
DROP POLICY IF EXISTS "Allow update day activities with edit permission" ON day_activities;
DROP POLICY IF EXISTS "Allow delete day activities with edit permission" ON day_activities;
DROP POLICY IF EXISTS "Allow read access to day activities" ON day_activities;

-- Create corrected day_activities policies
CREATE POLICY "Allow read access to day activities" ON day_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_days td 
      WHERE td.day_id = day_activities.day_id 
      AND user_has_read_permission(td.trip_id)
    )
  );

CREATE POLICY "Allow insert day activities with edit permission" ON day_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_days td 
      WHERE td.day_id = day_activities.day_id 
      AND user_has_edit_permission(td.trip_id)
    )
  );

CREATE POLICY "Allow update day activities with edit permission" ON day_activities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM trip_days td 
      WHERE td.day_id = day_activities.day_id 
      AND user_has_edit_permission(td.trip_id)
    )
  );

CREATE POLICY "Allow delete day activities with edit permission" ON day_activities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM trip_days td 
      WHERE td.day_id = day_activities.day_id 
      AND user_has_edit_permission(td.trip_id)
    )
  );

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_trip_share_permission TO public;
GRANT EXECUTE ON FUNCTION user_has_edit_permission TO public;
GRANT EXECUTE ON FUNCTION user_has_read_permission TO public;