-- SQL Script: Add Trip Owners to trip_shares Table
-- Run this ONCE to add owners to existing trips that don't already have them

-- First, let's check if the shared_with_user_id column exists
-- (This assumes it might not exist based on the type definitions I saw)
-- If this column doesn't exist, you'll need to add it first:

-- ADD COLUMN IF IT DOESN'T EXIST (uncomment if needed):
-- ALTER TABLE trip_shares ADD COLUMN IF NOT EXISTS shared_with_user_id UUID REFERENCES auth.users(id);

-- Now insert trip owners into trip_shares for trips that don't already have owner records
INSERT INTO trip_shares (trip_id, shared_by_user_id, shared_with_user_id, first_name, last_name, permission_level, created_at)
SELECT 
  t.trip_id,
  t.user_id as shared_by_user_id,
  t.user_id as shared_with_user_id,  -- Owner shares with themselves
  COALESCE(SPLIT_PART(p.full_name, ' ', 1), 'Trip') as first_name,
  COALESCE(TRIM(SUBSTRING(p.full_name FROM POSITION(' ' IN p.full_name) + 1)), 'Owner') as last_name,
  'edit' as permission_level,
  t.created_at
FROM trips t
LEFT JOIN profiles p ON t.user_id = p.id
WHERE NOT EXISTS (
  -- Only insert if owner doesn't already exist in trip_shares
  SELECT 1 FROM trip_shares ts 
  WHERE ts.trip_id = t.trip_id 
  AND ts.shared_by_user_id = ts.shared_with_user_id 
  AND ts.shared_by_user_id = t.user_id
);

-- Verify the results
SELECT 
  t.destination,
  ts.first_name,
  ts.last_name,
  CASE 
    WHEN ts.shared_by_user_id = ts.shared_with_user_id THEN 'Owner'
    ELSE 'Shared'
  END as role_type
FROM trips t
JOIN trip_shares ts ON t.trip_id = ts.trip_id
ORDER BY t.created_at DESC, role_type DESC;