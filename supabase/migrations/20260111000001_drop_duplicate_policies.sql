-- Migration to drop duplicate RLS policies that are causing performance warnings
-- This fixes the "Multiple Permissive Policies" warnings from Supabase linter
--
-- The previous migration created new consolidated policies but failed to drop
-- the old SELECT policies, resulting in duplicate policies for the same role/action.

-- =============================================================================
-- Drop duplicate SELECT policies for *_travelers tables
-- =============================================================================

-- accommodation_travelers: Drop old "acctrav_read" policy (keeping accommodation_travelers_select_policy)
DROP POLICY IF EXISTS "acctrav_read" ON accommodation_travelers;

-- day_activity_travelers: Drop old "acttrav_read" policy (keeping day_activity_travelers_select_policy)
DROP POLICY IF EXISTS "acttrav_read" ON day_activity_travelers;

-- reservation_travelers: Drop old "rsvtrav_read" policy (keeping reservation_travelers_select_policy)
DROP POLICY IF EXISTS "rsvtrav_read" ON reservation_travelers;

-- transportation_travelers: Drop old "tptrav_read" policy (keeping transportation_travelers_select_policy)
DROP POLICY IF EXISTS "tptrav_read" ON transportation_travelers;

-- =============================================================================
-- Drop duplicate SELECT policy for trip_days table
-- =============================================================================

-- trip_days: Drop old "trip_days_select_combined" policy (keeping trip_days_select_policy)
DROP POLICY IF EXISTS "trip_days_select_combined" ON trip_days;
