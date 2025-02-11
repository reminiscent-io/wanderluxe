
-- Update day_activities table to ensure consistent types
ALTER TABLE day_activities 
ALTER COLUMN cost TYPE numeric,
ALTER COLUMN currency SET DEFAULT 'USD',
ALTER COLUMN currency SET NOT NULL,
ALTER COLUMN order_index SET DEFAULT 0,
ALTER COLUMN order_index SET NOT NULL;

-- Update exchange_rates table
ALTER TABLE exchange_rates 
ALTER COLUMN rate TYPE numeric,
ALTER COLUMN currency_from SET NOT NULL,
ALTER COLUMN currency_to SET NOT NULL;

-- Update accommodations table
ALTER TABLE accommodations 
ALTER COLUMN expense_cost TYPE numeric,
ALTER COLUMN currency SET DEFAULT 'USD',
ALTER COLUMN order_index SET DEFAULT 0,
ALTER COLUMN order_index SET NOT NULL;

-- Update restaurant_reservations table
ALTER TABLE restaurant_reservations 
ALTER COLUMN cost TYPE numeric,
ALTER COLUMN currency SET DEFAULT 'USD',
ALTER COLUMN currency SET NOT NULL,
ALTER COLUMN order_index SET DEFAULT 0,
ALTER COLUMN order_index SET NOT NULL;
