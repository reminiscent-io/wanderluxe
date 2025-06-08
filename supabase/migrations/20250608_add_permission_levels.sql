-- Add permission_level column to trip_shares table
ALTER TABLE trip_shares 
ADD COLUMN permission_level VARCHAR(20) NOT NULL DEFAULT 'edit';

-- Add constraint to ensure only valid permission levels
ALTER TABLE trip_shares 
ADD CONSTRAINT trip_shares_permission_level_check 
CHECK (permission_level IN ('read', 'edit'));

-- Update existing records to have 'edit' permission (maintaining current behavior)
UPDATE trip_shares SET permission_level = 'edit' WHERE permission_level IS NULL;

-- Drop and recreate RLS policies to include permission checks

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Users can update trips shared with them" ON trips;
DROP POLICY IF EXISTS "Users can access accommodations for shared trips" ON accommodations;
DROP POLICY IF EXISTS "Users can access accommodations_days for shared trips" ON accommodations_days;
DROP POLICY IF EXISTS "Users can access transportation for shared trips" ON transportation;
DROP POLICY IF EXISTS "Users can access expenses for shared trips" ON expenses;
DROP POLICY IF EXISTS "Users can access trip_days for shared trips" ON trip_days;
DROP POLICY IF EXISTS "Users can access day_activities for shared trips" ON day_activities;
DROP POLICY IF EXISTS "Users can access reservations for shared trips" ON reservations;

-- Create new policies with permission level checks

-- Trips: Read access for any shared trip, edit only for edit permission
CREATE POLICY "Users can view trips shared with them" 
ON trips FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = trips.trip_id 
    AND trip_shares.shared_with_email = auth.email()
  )
);

CREATE POLICY "Users can update trips shared with them (edit permission)" 
ON trips FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = trips.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

-- Trip days: Read access for any shared trip, edit only for edit permission
CREATE POLICY "Users can view trip_days for shared trips" 
ON trip_days FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
  )
);

CREATE POLICY "Users can modify trip_days for shared trips (edit permission)" 
ON trip_days FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

CREATE POLICY "Users can update trip_days for shared trips (edit permission)" 
ON trip_days FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

CREATE POLICY "Users can delete trip_days for shared trips (edit permission)" 
ON trip_days FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

-- Day activities: Read access for any shared trip, edit only for edit permission
CREATE POLICY "Users can view day_activities for shared trips" 
ON day_activities FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    JOIN trip_days ON trip_days.day_id = day_activities.day_id
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
  )
);

CREATE POLICY "Users can modify day_activities for shared trips (edit permission)" 
ON day_activities FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trip_shares 
    JOIN trip_days ON trip_days.day_id = day_activities.day_id
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

CREATE POLICY "Users can update day_activities for shared trips (edit permission)" 
ON day_activities FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    JOIN trip_days ON trip_days.day_id = day_activities.day_id
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

CREATE POLICY "Users can delete day_activities for shared trips (edit permission)" 
ON day_activities FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    JOIN trip_days ON trip_days.day_id = day_activities.day_id
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

-- Reservations: Read access for any shared trip, edit only for edit permission
CREATE POLICY "Users can view reservations for shared trips" 
ON reservations FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    JOIN trip_days ON trip_days.day_id = reservations.day_id
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
  )
);

CREATE POLICY "Users can modify reservations for shared trips (edit permission)" 
ON reservations FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trip_shares 
    JOIN trip_days ON trip_days.day_id = reservations.day_id
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

CREATE POLICY "Users can update reservations for shared trips (edit permission)" 
ON reservations FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    JOIN trip_days ON trip_days.day_id = reservations.day_id
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

CREATE POLICY "Users can delete reservations for shared trips (edit permission)" 
ON reservations FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    JOIN trip_days ON trip_days.day_id = reservations.day_id
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

-- Accommodations: Read access for any shared trip, edit only for edit permission
CREATE POLICY "Users can view accommodations for shared trips" 
ON accommodations FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = accommodations.trip_id 
    AND trip_shares.shared_with_email = auth.email()
  )
);

CREATE POLICY "Users can modify accommodations for shared trips (edit permission)" 
ON accommodations FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = accommodations.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

CREATE POLICY "Users can update accommodations for shared trips (edit permission)" 
ON accommodations FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = accommodations.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

CREATE POLICY "Users can delete accommodations for shared trips (edit permission)" 
ON accommodations FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = accommodations.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

-- Accommodations days: Read access for any shared trip, edit only for edit permission
CREATE POLICY "Users can view accommodations_days for shared trips" 
ON accommodations_days FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    JOIN trip_days ON trip_days.trip_id = accommodations_days.day_id
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
  )
);

CREATE POLICY "Users can modify accommodations_days for shared trips (edit permission)" 
ON accommodations_days FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trip_shares 
    JOIN trip_days ON trip_days.trip_id = accommodations_days.day_id
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

CREATE POLICY "Users can update accommodations_days for shared trips (edit permission)" 
ON accommodations_days FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    JOIN trip_days ON trip_days.trip_id = accommodations_days.day_id
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

CREATE POLICY "Users can delete accommodations_days for shared trips (edit permission)" 
ON accommodations_days FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    JOIN trip_days ON trip_days.trip_id = accommodations_days.day_id
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

-- Transportation: Read access for any shared trip, edit only for edit permission
CREATE POLICY "Users can view transportation for shared trips" 
ON transportation FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = transportation.trip_id 
    AND trip_shares.shared_with_email = auth.email()
  )
);

CREATE POLICY "Users can modify transportation for shared trips (edit permission)" 
ON transportation FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = transportation.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

CREATE POLICY "Users can update transportation for shared trips (edit permission)" 
ON transportation FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = transportation.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

CREATE POLICY "Users can delete transportation for shared trips (edit permission)" 
ON transportation FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = transportation.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

-- Expenses: Read access for any shared trip, edit only for edit permission
CREATE POLICY "Users can view expenses for shared trips" 
ON expenses FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = expenses.trip_id 
    AND trip_shares.shared_with_email = auth.email()
  )
);

CREATE POLICY "Users can modify expenses for shared trips (edit permission)" 
ON expenses FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = expenses.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

CREATE POLICY "Users can update expenses for shared trips (edit permission)" 
ON expenses FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = expenses.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);

CREATE POLICY "Users can delete expenses for shared trips (edit permission)" 
ON expenses FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = expenses.trip_id 
    AND trip_shares.shared_with_email = auth.email()
    AND trip_shares.permission_level = 'edit'
  )
);