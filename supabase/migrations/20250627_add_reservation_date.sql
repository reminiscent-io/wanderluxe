-- Add reservation_date field to reservations table
-- This allows proper date-based grouping for reservations

ALTER TABLE reservations 
ADD COLUMN reservation_date DATE;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_reservations_reservation_date 
ON reservations(reservation_date);

-- Update existing reservations to set reservation_date based on trip_days
-- This ensures existing data has proper dates
UPDATE reservations 
SET reservation_date = trip_days.date
FROM trip_days 
WHERE reservations.day_id = trip_days.day_id 
AND reservations.reservation_date IS NULL;