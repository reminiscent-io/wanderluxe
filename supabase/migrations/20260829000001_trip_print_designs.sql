-- Print Studio (Pro feature): AI-generated print design specs for a trip.
-- Each row is one generated design (palette, font pairing, motif, editorial
-- copy) produced by the OpenAI-backed /api/trips/:id/print-design route and
-- rendered client-side at /trip/:tripId/print/:designId.
--
-- Writes happen only through the Express route (service role, which also
-- enforces the Pro tier and a per-user daily generation cap), so there are no
-- INSERT/UPDATE policies for users. Reads follow trip access; creators can
-- delete their own designs.
--
-- Rollback: DROP TABLE trip_print_designs;

CREATE TABLE IF NOT EXISTS trip_print_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_prompt TEXT,
  design JSONB NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_print_designs_trip
  ON trip_print_designs(trip_id, created_at DESC);

-- Backs the per-user daily generation cap in the Express route.
CREATE INDEX IF NOT EXISTS idx_trip_print_designs_creator_date
  ON trip_print_designs(created_by, created_at DESC);

ALTER TABLE trip_print_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_print_designs_select_policy" ON trip_print_designs
  FOR SELECT
  USING (can_access_trip(trip_id));

CREATE POLICY "trip_print_designs_delete_policy" ON trip_print_designs
  FOR DELETE
  USING (created_by = auth.uid());
