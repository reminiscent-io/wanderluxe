# Database Migration for Permission Levels

## Run these SQL commands in Supabase SQL Editor:

```sql
-- Step 1: Add permission_level column to trip_shares table
ALTER TABLE trip_shares 
ADD COLUMN permission_level VARCHAR(20) NOT NULL DEFAULT 'edit';

-- Step 2: Add constraint to ensure only valid permission levels
ALTER TABLE trip_shares 
ADD CONSTRAINT trip_shares_permission_level_check 
CHECK (permission_level IN ('read', 'edit'));

-- Step 3: Update existing records to have 'edit' permission (maintaining current behavior)
UPDATE trip_shares SET permission_level = 'edit' WHERE permission_level IS NULL;
```

## Steps to apply in Supabase:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the above SQL commands
4. Run them one by one or all at once
5. Verify the migration worked by checking the trip_shares table structure

After running these commands, the permission system will work correctly.