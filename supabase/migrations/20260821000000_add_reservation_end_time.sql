-- Restaurant reservations get an optional end time, mirroring day_activities.
-- Floating wall-clock like every other time column (see CLAUDE.md §17) — the
-- reservation's own `timezone` column is display metadata, never a conversion.
--
-- Nullable with no backfill on purpose: NULL means "the user never said when it
-- ends". Readers that need a span (calendar chips, the iCal feed) fall back to a
-- 90-minute default, so existing rows keep working without a data migration and
-- the column can be dropped again with no loss.
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS end_time time without time zone;
