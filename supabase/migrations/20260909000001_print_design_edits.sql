-- Print Studio: editable copy + finalized editions.
--
-- Two changes to trip_print_designs, and one security fix that has to land
-- with them.
--
-- 1. copy_overrides — the traveler's own words, layered over the AI's at render
--    time rather than replacing them. Keeping the two apart means "revert to
--    the original" costs nothing and the AI's version stays auditable. An
--    absent key means "use the AI's line"; a present key, including an empty
--    string, is a deliberate choice, so deleting a tagline is expressible.
--
-- 2. content_snapshot / finalized_at / finalized_by — an edition renders live
--    from current trip data until someone finalizes it, at which point the
--    itinerary rows are frozen into the row and the page stops drifting. The
--    snapshot holds raw table rows, not a rendered document, so the client
--    keeps projecting it through the same code path a live edition uses.
--
-- 3. The security fix: anon and authenticated currently hold table-wide INSERT
--    and UPDATE on every column, inherited from Supabase's default privileges.
--    Nothing exploits that today only because the table has no INSERT/UPDATE
--    policy. Adding the UPDATE policy below would turn that dormant grant into
--    a real hole: a client could rewrite `design` wholesale and walk straight
--    past the contrast and house-voice guarantees in sanitizePrintDesign, or
--    reassign created_by. So the blanket grants go, and authenticated gets
--    exactly one writable column back.
--
-- Rollback:
--   ALTER TABLE trip_print_designs
--     DROP COLUMN copy_overrides, DROP COLUMN content_snapshot,
--     DROP COLUMN finalized_at, DROP COLUMN finalized_by, DROP COLUMN updated_at;
--   DROP POLICY "trip_print_designs_update_policy" ON trip_print_designs;
--   DROP TRIGGER trg_trip_print_designs_touch ON trip_print_designs;
--   DROP FUNCTION touch_trip_print_designs_updated_at();

ALTER TABLE trip_print_designs
  ADD COLUMN IF NOT EXISTS copy_overrides   JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS content_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS finalized_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- copy_overrides is the one column a browser can write, so it is shape-checked
-- and size-capped in the database rather than on trust. The cap is generous
-- against the real payload (a cover, an intro, a closing and one line per day,
-- each already length-clamped client-side) and still refuses a row stuffed
-- with megabytes of junk.
ALTER TABLE trip_print_designs
  DROP CONSTRAINT IF EXISTS trip_print_designs_copy_overrides_shape;
ALTER TABLE trip_print_designs
  ADD CONSTRAINT trip_print_designs_copy_overrides_shape
  CHECK (jsonb_typeof(copy_overrides) = 'object' AND length(copy_overrides::text) <= 20000);

/* ---------------------------------------------------------------- privileges */

-- Drop the inherited table-wide write grants. Designs are still created only
-- by the Express route under the service role, which is unaffected.
REVOKE INSERT, UPDATE ON trip_print_designs FROM anon, authenticated;

-- The traveler's words, and nothing else. Column-level UPDATE is what makes
-- the RLS policy below safe to add: `design`, `model`, `trip_id`, `created_by`
-- and the finalize columns stay unwritable from a browser no matter what the
-- policy allows.
GRANT UPDATE (copy_overrides) ON trip_print_designs TO authenticated;

/* ---------------------------------------------------------------------- RLS */

DROP POLICY IF EXISTS "trip_print_designs_update_policy" ON trip_print_designs;

-- Editing follows trip edit permission, like every other piece of trip
-- content — not creator-only, since the person who generated the edition is
-- often not the one proofreading it.
--
-- `finalized_at IS NULL` in both clauses is the freeze: once an edition is
-- finalized the database itself stops accepting copy edits, so the guarantee
-- does not depend on the UI hiding a button. Reopening runs through the
-- Express route under the service role.
CREATE POLICY "trip_print_designs_update_policy" ON trip_print_designs
  FOR UPDATE
  USING (can_edit_trip(trip_id) AND finalized_at IS NULL)
  WITH CHECK (can_edit_trip(trip_id) AND finalized_at IS NULL);

/* ------------------------------------------------------------------ updated_at */

-- Runs as the table owner, so it can stamp updated_at even though the caller
-- holds UPDATE on copy_overrides alone.
CREATE OR REPLACE FUNCTION touch_trip_print_designs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_print_designs_touch ON trip_print_designs;
CREATE TRIGGER trg_trip_print_designs_touch
  BEFORE UPDATE ON trip_print_designs
  FOR EACH ROW EXECUTE FUNCTION touch_trip_print_designs_updated_at();
