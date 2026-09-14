-- rename_public_trip() is an operator command, like roll_public_trip_dates().
-- It inherited Postgres's default EXECUTE grant to PUBLIC; RLS already stops a
-- caller touching trips they do not own, but nothing in the app calls it, so
-- keep it out of the API surface.
revoke all on function public.rename_public_trip(text, text, text) from public, anon, authenticated;
