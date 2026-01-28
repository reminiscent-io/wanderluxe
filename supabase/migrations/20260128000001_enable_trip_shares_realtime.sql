-- Enable realtime for trip_shares table
-- This allows the Travelers panel to update instantly when someone is added/removed

ALTER PUBLICATION supabase_realtime ADD TABLE trip_shares;
