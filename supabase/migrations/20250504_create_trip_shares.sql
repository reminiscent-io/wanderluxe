-- Create trip_shares table
CREATE TABLE IF NOT EXISTS public.trip_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(trip_id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (trip_id, shared_with_email)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS trip_shares_trip_id_idx ON public.trip_shares(trip_id);
CREATE INDEX IF NOT EXISTS trip_shares_shared_with_email_idx ON public.trip_shares(shared_with_email);

-- Create RLS (Row Level Security) policies
-- Enable RLS on the trip_shares table
ALTER TABLE public.trip_shares ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view trips shared with them
-- Either you are the one who shared the trip, or you are the one the trip was shared with
CREATE POLICY "Trips shared with user are viewable" ON public.trip_shares
  FOR SELECT
  USING (
    auth.uid() = shared_by_user_id OR 
    auth.email() = shared_with_email
  );

-- Policy to allow trip owners to share their trips
CREATE POLICY "Trip owners can share trips" ON public.trip_shares
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.trip_id = trip_id AND trips.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.trip_shares
      WHERE trip_shares.trip_id = trip_id AND trip_shares.shared_with_email = auth.email()
    )
  );

-- Policy to allow users to delete trip shares they created
CREATE POLICY "Users can delete shares they created" ON public.trip_shares
  FOR DELETE
  USING (
    auth.uid() = shared_by_user_id OR
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.trip_id = trip_id AND trips.user_id = auth.uid()
    )
  );

-- Add RLS Policy for trips table to allow access to shared trips
CREATE POLICY "Users can view and edit trips shared with them" ON public.trips
  FOR ALL
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trip_shares
      WHERE trip_shares.trip_id = trip_id AND trip_shares.shared_with_email = auth.email()
    )
  );

-- Add RLS Policy for accommodations table to allow access to shared trips
CREATE POLICY "Users can view and edit accommodations for trips shared with them" ON public.accommodations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.trip_id = accommodations.trip_id AND (
        trips.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.trip_shares
          WHERE trip_shares.trip_id = trips.trip_id AND trip_shares.shared_with_email = auth.email()
        )
      )
    )
  );

-- Add RLS Policy for trip_days table to allow access to shared trips
CREATE POLICY "Users can view and edit trip days for trips shared with them" ON public.trip_days
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.trip_id = trip_days.trip_id AND (
        trips.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.trip_shares
          WHERE trip_shares.trip_id = trips.trip_id AND trip_shares.shared_with_email = auth.email()
        )
      )
    )
  );

-- Add RLS Policy for day_activities table to allow access to shared trips
CREATE POLICY "Users can view and edit day activities for trips shared with them" ON public.day_activities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_days
      WHERE trip_days.day_id = day_activities.day_id AND 
      EXISTS (
        SELECT 1 FROM public.trips
        WHERE trips.trip_id = trip_days.trip_id AND (
          trips.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.trip_shares
            WHERE trip_shares.trip_id = trips.trip_id AND trip_shares.shared_with_email = auth.email()
          )
        )
      )
    )
  );

-- Add RLS Policy for transportation table to allow access to shared trips
CREATE POLICY "Users can view and edit transportation for trips shared with them" ON public.transportation
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.trip_id = transportation.trip_id AND (
        trips.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.trip_shares
          WHERE trip_shares.trip_id = trips.trip_id AND trip_shares.shared_with_email = auth.email()
        )
      )
    )
  );