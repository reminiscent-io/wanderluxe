-- Add is_owner column to trip_shares table
ALTER TABLE trip_shares ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT FALSE;

-- Update existing records to mark owners
-- (Records where the person sharing is the same as the person it's shared with)
UPDATE trip_shares 
SET is_owner = TRUE 
WHERE shared_by_user_id = shared_with_user_id;

-- For any trip owners that might not have records yet, insert them
-- (This handles cases where trip owners weren't added to trip_shares)
INSERT INTO trip_shares (trip_id, shared_by_user_id, shared_with_user_id, first_name, last_name, is_owner, created_at)
SELECT 
  t.trip_id,
  t.user_id as shared_by_user_id,
  t.user_id as shared_with_user_id,
  COALESCE(SPLIT_PART(p.full_name, ' ', 1), 'Trip') as first_name,
  COALESCE(TRIM(SUBSTRING(p.full_name FROM POSITION(' ' IN p.full_name) + 1)), 'Owner') as last_name,
  TRUE as is_owner,
  t.created_at
FROM trips t
LEFT JOIN profiles p ON t.user_id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM trip_shares ts 
  WHERE ts.trip_id = t.trip_id 
  AND ts.shared_by_user_id = t.user_id
  AND ts.shared_with_user_id = t.user_id
)
ON CONFLICT DO NOTHING;

-- Verify the changes
SELECT 
  trip_id,
  first_name,
  last_name,
  is_owner,
  CASE 
    WHEN is_owner THEN 'Owner'
    ELSE 'Shared'
  END as role
FROM trip_shares
ORDER BY trip_id, is_owner DESC;