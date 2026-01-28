-- Migration: Fix trip_shares owner records
-- Cleans up duplicates and backfills owner email/names

-- Backfill existing records: link trip_shares to users where email matches
-- This fixes all existing records that were created without shared_with_user_id
UPDATE trip_shares ts
SET shared_with_user_id = au.id
FROM auth.users au
WHERE LOWER(ts.shared_with_email) = LOWER(au.email)
  AND ts.shared_with_user_id IS NULL;

-- Clean up duplicate records: if owner shared trip with their own email,
-- delete the redundant share record (keep the owner record)
DELETE FROM trip_shares ts
USING auth.users au
WHERE ts.shared_by_user_id != ts.shared_with_user_id  -- Not the owner record
  AND LOWER(ts.shared_with_email) = LOWER(au.email)   -- Email matches a user
  AND ts.shared_with_user_id = au.id                   -- Already linked to that user
  AND EXISTS (
    -- There's an owner record for the same trip by the same user
    SELECT 1 FROM trip_shares owner_rec
    WHERE owner_rec.trip_id = ts.trip_id
      AND owner_rec.shared_by_user_id = owner_rec.shared_with_user_id
      AND owner_rec.shared_with_user_id = ts.shared_with_user_id
  );

-- Backfill owner records: add email to owner records that don't have one
-- Owner records are identified by shared_by_user_id = shared_with_user_id
UPDATE trip_shares ts
SET shared_with_email = LOWER(au.email)
FROM auth.users au
WHERE ts.shared_by_user_id = ts.shared_with_user_id
  AND ts.shared_with_user_id = au.id
  AND ts.shared_with_email IS NULL;

-- Fix owner records that have "Trip Owner" as the name
-- Update to use profile name if available, otherwise email prefix
UPDATE trip_shares ts
SET
  first_name = COALESCE(
    NULLIF(SPLIT_PART(p.full_name, ' ', 1), ''),
    INITCAP(SPLIT_PART(au.email, '@', 1))
  ),
  last_name = NULLIF(
    TRIM(SUBSTRING(p.full_name FROM POSITION(' ' IN p.full_name) + 1)),
    ''
  )
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE ts.shared_by_user_id = ts.shared_with_user_id
  AND ts.shared_with_user_id = au.id
  AND ts.first_name = 'Trip'
  AND ts.last_name = 'Owner';
