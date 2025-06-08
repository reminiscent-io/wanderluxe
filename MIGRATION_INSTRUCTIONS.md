# Critical Database Migration Required

## Problem
Your permission system has conflicting Row Level Security (RLS) policies causing:
1. Permission changes appearing to work but not persisting
2. "Row violates row-level security policy" errors when adding activities
3. View-only users still able to make changes

## Solution
Run the complete SQL script `RLS_ENFORCEMENT_MIGRATION.sql` in your Supabase SQL Editor.

## Steps
1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire contents of `RLS_ENFORCEMENT_MIGRATION.sql`
3. Paste and execute the script
4. Test permission toggling and activity creation

## What This Fixes
- **Removes duplicate policies** causing conflicts
- **Implements proper permission enforcement** at database level
- **Fixes day_activities table** RLS policy errors
- **Enables persistent permission changes** in the UI

## After Migration
- Permission toggles will persist when dialog is closed/reopened
- View-only users will be blocked from all database modifications
- Activity creation will work properly for users with edit permissions
- All database operations will respect the granular permission system

The migration is safe and backward-compatible. All existing data and permissions will be preserved.