-- Public trip titles + slug history.
--
-- Showcase itineraries are now named "N Days in X", where N is the number of
-- nights spent at that place (read from the hotel stay, not the trip span) and
-- a trip with two hotels lists two legs. `destination` stays the place string
-- because weather, the Expedia deep link and map geocoding read it; `title` is
-- what cards, the <h1>, the <title> tag and JSON-LD show when present.
--
-- Every old slug is kept in `previous_slugs` so the server can 301 the URL
-- Google already indexed to its replacement (scripts/prerender.ts emits the
-- map, server/index.ts serves the redirect).

alter table public.trips
  add column if not exists title text,
  add column if not exists previous_slugs text[] not null default '{}';

comment on column public.trips.title is
  'Display title. Public showcase trips use "N Days in X" (N = nights at that place). NULL falls back to destination.';
comment on column public.trips.previous_slugs is
  'Former public slugs, kept so /explore/<old> can 301 to the current slug.';

-- Rename one public trip's slug, remembering the old one for redirects.
-- Idempotent: a trip already on the new slug is left alone.
create or replace function public.rename_public_trip(
  p_old_slug text,
  p_new_slug text,
  p_title text
) returns void
language plpgsql
as $$
begin
  update public.trips
     set title = p_title,
         previous_slugs = array_append(
           array_remove(previous_slugs, slug),
           slug
         ),
         slug = p_new_slug
   where is_public = true
     and slug = p_old_slug
     and slug is distinct from p_new_slug;
end;
$$;

-- Nights by stay, from accommodations.hotel_checkout_date - hotel_checkin_date:
--   Porto Cervo 5 · Mykonos 5 · Tokyo 6 · Sabi Sands 3 + Cape Town 5 ·
--   Marrakech 5 · St. Barths 6
select public.rename_public_trip('porto-cervo-italy-5-nights',            '5-days-in-porto-cervo',                     '5 Days in Porto Cervo');
select public.rename_public_trip('mykonos-greece-5-nights',               '5-days-in-mykonos',                         '5 Days in Mykonos');
select public.rename_public_trip('tokyo-japan-6-nights',                  '6-days-in-tokyo',                           '6 Days in Tokyo');
select public.rename_public_trip('sabi-sands-cape-town-8-nights',         '3-days-in-sabi-sands-5-days-in-cape-town',  '3 Days in Sabi Sands, 5 Days in Cape Town');
select public.rename_public_trip('marrakech-morocco-5-nights',            '5-days-in-marrakech',                       '5 Days in Marrakech');
select public.rename_public_trip('st-barths-french-west-indies-6-nights', '6-days-in-st-barths',                       '6 Days in St. Barths');

-- Two public trips never had a slug ("New York - Example Trip", "Paris"), so
-- they were reachable only at noindex /trip/<uuid> URLs and never fit the
-- showcase standard. Unpublish them; New York is rebuilt as "3 Days in New
-- York" in the content phase.
update public.trips
   set is_public = false
 where is_public = true
   and slug is null;
