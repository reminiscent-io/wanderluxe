-- Debug script to test reservation insertion and identify RLS issues
-- Run this in Supabase SQL Editor to test the exact scenario

-- First, let's check the structure of the reservations table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'reservations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if user_has_edit_permission function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'user_has_edit_permission';

-- Check current RLS policies on reservations
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'reservations' 
ORDER BY cmd;

-- Test the permission function manually with a sample trip_id
-- Replace 'your-trip-id-here' with an actual trip ID you're testing with
-- SELECT user_has_edit_permission('your-trip-id-here') AS has_permission;