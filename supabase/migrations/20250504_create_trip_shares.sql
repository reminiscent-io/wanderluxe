-- Create the trip_shares table for managing trip sharing
CREATE TABLE trip_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL,
  shared_with_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trip_id, shared_with_email)
);

-- Create index on shared_with_email for faster lookup
CREATE INDEX idx_trip_shares_email ON trip_shares(shared_with_email);
CREATE INDEX idx_trip_shares_trip_id ON trip_shares(trip_id);

-- RLS policies for trip_shares

-- Enable RLS on trip_shares
ALTER TABLE trip_shares ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view trip_shares that they created
CREATE POLICY "Users can view trip shares they created" 
ON trip_shares FOR SELECT 
TO authenticated
USING (shared_by_user_id = auth.uid());

-- Create policy to allow users to insert trip_shares for trips they own
CREATE POLICY "Users can share trips they own" 
ON trip_shares FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.trip_id = trip_shares.trip_id 
    AND trips.user_id = auth.uid()
  )
);

-- Create policy to allow users to delete trip_shares they created
CREATE POLICY "Users can delete shares they created" 
ON trip_shares FOR DELETE 
TO authenticated
USING (shared_by_user_id = auth.uid());

-- Create policy allowing users to see trips shared with them
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

-- Create policy allowing users to edit trips shared with them
CREATE POLICY "Users can update trips shared with them" 
ON trips FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = trips.trip_id 
    AND trip_shares.shared_with_email = auth.email()
  )
);

-- Create cascading policy allowing access to trip_days for shared trips
CREATE POLICY "Users can access trip_days for shared trips" 
ON trip_days FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
  )
);

-- Create cascading policy allowing access to day_activities for shared trips
CREATE POLICY "Users can access day_activities for shared trips" 
ON day_activities FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    JOIN trip_days ON trip_days.day_id = day_activities.day_id
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
  )
);

-- Create cascading policy allowing access to accommodations for shared trips
CREATE POLICY "Users can access accommodations for shared trips" 
ON accommodations FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = accommodations.trip_id 
    AND trip_shares.shared_with_email = auth.email()
  )
);

-- Create cascading policy allowing access to accommodations_days for shared trips
CREATE POLICY "Users can access accommodations_days for shared trips" 
ON accommodations_days FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    JOIN trip_days ON trip_days.trip_id = accommodations_days.day_id
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
  )
);

-- Create cascading policy allowing access to transportation for shared trips
CREATE POLICY "Users can access transportation for shared trips" 
ON transportation FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = transportation.trip_id 
    AND trip_shares.shared_with_email = auth.email()
  )
);

-- Create cascading policy allowing access to expenses for shared trips
CREATE POLICY "Users can access expenses for shared trips" 
ON expenses FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    WHERE trip_shares.trip_id = expenses.trip_id 
    AND trip_shares.shared_with_email = auth.email()
  )
);

-- Create cascading policy allowing access to reservations for shared trips
CREATE POLICY "Users can access reservations for shared trips" 
ON reservations FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trip_shares 
    JOIN trip_days ON trip_days.day_id = reservations.day_id
    WHERE trip_shares.trip_id = trip_days.trip_id 
    AND trip_shares.shared_with_email = auth.email()
  )
);

-- Create policy to allow users to view their shared trips
CREATE POLICY "Users can view shared trips" 
ON trip_shares FOR SELECT 
TO authenticated
USING (shared_with_email = auth.email());