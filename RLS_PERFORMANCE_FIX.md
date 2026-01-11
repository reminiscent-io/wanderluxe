# RLS Performance Fix Summary

## Issues Fixed

This migration addresses all performance warnings from Supabase's database linter:

### 1. Auth RLS Initialization Plan (35 warnings)
**Problem**: `auth.uid()` calls were being re-evaluated for each row instead of once per query.

**Solution**: Wrapped all `auth.uid()` calls in subqueries: `(select auth.uid())`

**Performance Impact**: Significant improvement for queries that scan multiple rows. Instead of calling `auth.uid()` thousands of times, it's now called once per query.

### 2. Multiple Permissive Policies (81 warnings)
**Problem**: Multiple RLS policies existed for the same table/role/action combinations, causing PostgreSQL to evaluate all of them.

**Solution**: Consolidated duplicate policies into single, optimized policies per operation (SELECT/INSERT/UPDATE/DELETE).

**Tables Fixed**:
- `trips` - 5+ duplicate insert policies → 1 policy
- `transportation` - 4+ duplicate policies per operation → 1 policy each
- `expenses` - 2 duplicate insert policies → 1 policy
- `other_expenses` - 3+ duplicate policies per operation → 1 policy each
- `accommodation_travelers` - 3 policies → 4 comprehensive policies
- `day_activity_travelers` - 3 policies → 4 comprehensive policies
- `reservation_travelers` - 3 policies → 4 comprehensive policies
- `transportation_travelers` - 3 policies → 4 comprehensive policies
- `trip_shares` - 2 duplicate select policies → 1 policy
- `trip_days` - 2+ duplicate policies per operation → 1 policy each
- `vision_board_items` - 2+ duplicate policies per operation → 1 policy each
- `profiles` - 2+ duplicate policies → 2 policies

### 3. Duplicate Indexes (12 warnings)
**Problem**: Identical indexes existed on multiple tables, wasting storage and write performance.

**Solution**: Dropped older duplicate indexes, keeping the better-named ones.

**Indexes Dropped**:
- `accommodation_travelers`: Kept `idx_acctrav_*`, dropped `idx_accommodation_travelers_*`
- `accommodations`: Kept `accommodations_trip_id_idx`, dropped `idx_accommodations_trip_id`
- `day_activity_travelers`: Kept `idx_acctrav_*`, dropped `idx_day_activity_travelers_*`
- `expenses`: Kept `expenses_trip_id_idx`, dropped `idx_expenses_trip_id`
- `reservation_travelers`: Kept `idx_rsvtrav_*`, dropped `idx_reservation_travelers_*`
- `transportation_travelers`: Kept `idx_tptrav_*`, dropped `idx_transportation_travelers_*`
- `trip_shares`: Kept `trip_shares_trip_id_idx`, dropped `idx_trip_shares_trip_id`
- `trips`: Kept `trips_user_id_idx`, dropped `idx_trips_user_id`

## How to Apply

### Option 1: Using Supabase CLI (Recommended)
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push
```

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20260111000000_fix_rls_performance.sql`
4. Execute the SQL

### Option 3: Using Local Development
```bash
# If using local Supabase
supabase start
supabase db reset
```

## Verification

After applying the migration, re-run the Supabase linter to verify all issues are resolved:

```sql
-- In Supabase SQL Editor
SELECT * FROM pg_catalog.lint_database();
```

Or use the Supabase Dashboard's Database Linter under Database > Reports.

## Expected Results

- ✅ 0 auth_rls_initplan warnings
- ✅ 0 multiple_permissive_policies warnings
- ✅ 0 duplicate_index warnings
- ✅ Faster query performance, especially for trips with many items
- ✅ Reduced database storage from removed duplicate indexes
- ✅ Simpler RLS policy maintenance

## RLS Policy Structure

All policies now follow this optimized pattern:

```sql
-- SELECT: Owners + shared users (view or edit)
FOR SELECT USING (
  trip_id IN (
    SELECT id FROM trips
    WHERE user_id = (select auth.uid())
    OR id IN (
      SELECT trip_id FROM trip_shares
      WHERE shared_with_user_id = (select auth.uid())
    )
  )
);

-- INSERT/UPDATE/DELETE: Owners + edit permission only
FOR [INSERT|UPDATE|DELETE] [WITH CHECK|USING] (
  trip_id IN (
    SELECT id FROM trips
    WHERE user_id = (select auth.uid())
    OR id IN (
      SELECT trip_id FROM trip_shares
      WHERE shared_with_user_id = (select auth.uid())
      AND permission_level = 'edit'
    )
  )
);
```

## Breaking Changes

**None** - This migration only optimizes existing policies without changing their logic or behavior.

## Rollback

If you need to rollback, you can revert the migration:

```bash
supabase db reset --version 20260110235959
```

Or manually drop the new policies and recreate the old ones (not recommended).
