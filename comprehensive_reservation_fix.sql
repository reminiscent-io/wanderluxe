-- Comprehensive fix for reservation insertion issues
-- This addresses multiple potential causes for the RLS policy failures

-- Step 1: Drop existing policies to start clean
DROP POLICY IF EXISTS "reservations_insert_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_update_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_delete_policy" ON reservations;
DROP POLICY IF EXISTS "reservations_select_policy" ON reservations;

-- Step 2: Check if reservations table has trip_id column
-- If not, we need to handle the relationship through trip_days
DO $$
BEGIN
  -- Check if trip_id column exists in reservations table
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'reservations' 
    AND column_name = 'trip_id'
    AND table_schema = 'public'
  ) THEN
    -- Add trip_id column if it doesn't exist
    ALTER TABLE reservations ADD COLUMN trip_id UUID;
    
    -- Update existing records to populate trip_id
    UPDATE reservations 
    SET trip_id = td.trip_id 
    FROM trip_days td 
    WHERE td.day_id = reservations.day_id;
    
    -- Add foreign key constraint
    ALTER TABLE reservations 
    ADD CONSTRAINT fk_reservations_trip_id 
    FOREIGN KEY (trip_id) REFERENCES trips(trip_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Create simplified RLS policies that work with direct trip_id
CREATE POLICY "reservations_select_policy" ON reservations
FOR SELECT 
TO public
USING (user_has_read_permission(trip_id));

CREATE POLICY "reservations_insert_policy" ON reservations
FOR INSERT 
TO public
WITH CHECK (user_has_edit_permission(trip_id));

CREATE POLICY "reservations_update_policy" ON reservations
FOR UPDATE 
TO public
USING (user_has_edit_permission(trip_id));

CREATE POLICY "reservations_delete_policy" ON reservations
FOR DELETE 
TO public
USING (user_has_edit_permission(trip_id));

-- Step 4: Create fallback policies if user_has_edit_permission doesn't exist
-- Check if the function exists, if not create basic ownership-based policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'user_has_edit_permission'
  ) THEN
    -- Drop the policies we just created
    DROP POLICY IF EXISTS "reservations_insert_policy" ON reservations;
    DROP POLICY IF EXISTS "reservations_update_policy" ON reservations;
    DROP POLICY IF EXISTS "reservations_delete_policy" ON reservations;
    DROP POLICY IF EXISTS "reservations_select_policy" ON reservations;
    
    -- Create basic ownership-based policies
    CREATE POLICY "reservations_select_policy" ON reservations
    FOR SELECT 
    TO authenticated
    USING (
      trip_id IN (
        SELECT trip_id FROM trips WHERE user_id = auth.uid()
        UNION
        SELECT trip_id FROM trip_shares WHERE shared_with_email = auth.email()
      )
    );

    CREATE POLICY "reservations_insert_policy" ON reservations
    FOR INSERT 
    TO authenticated
    WITH CHECK (
      trip_id IN (
        SELECT trip_id FROM trips WHERE user_id = auth.uid()
        UNION
        SELECT trip_id FROM trip_shares 
        WHERE shared_with_email = auth.email() 
        AND permission_level = 'edit'
      )
    );

    CREATE POLICY "reservations_update_policy" ON reservations
    FOR UPDATE 
    TO authenticated
    USING (
      trip_id IN (
        SELECT trip_id FROM trips WHERE user_id = auth.uid()
        UNION
        SELECT trip_id FROM trip_shares 
        WHERE shared_with_email = auth.email() 
        AND permission_level = 'edit'
      )
    );

    CREATE POLICY "reservations_delete_policy" ON reservations
    FOR DELETE 
    TO authenticated
    USING (
      trip_id IN (
        SELECT trip_id FROM trips WHERE user_id = auth.uid()
        UNION
        SELECT trip_id FROM trip_shares 
        WHERE shared_with_email = auth.email() 
        AND permission_level = 'edit'
      )
    );
  END IF;
END $$;