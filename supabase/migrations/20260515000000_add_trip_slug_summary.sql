-- Slug + summary columns for public trips, with auto-disambiguation trigger.
-- Slugs power SEO-friendly URLs at /explore/{slug}; summary provides authored
-- meta descriptions and JSON-LD descriptions for showcase content.

alter table public.trips
  add column if not exists slug text,
  add column if not exists summary text;

create unique index if not exists trips_slug_unique
  on public.trips (slug)
  where is_public = true and slug is not null;

create or replace function public.ensure_unique_public_slug() returns trigger
language plpgsql
as $$
declare
  base text;
  candidate text;
  n int := 1;
begin
  if new.is_public is true and new.slug is not null then
    base := new.slug;
    candidate := base;
    while exists (
      select 1 from public.trips
      where is_public = true
        and slug = candidate
        and trip_id <> new.trip_id
    ) loop
      n := n + 1;
      candidate := base || '-' || n;
    end loop;
    new.slug := candidate;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ensure_unique_public_slug on public.trips;
create trigger trg_ensure_unique_public_slug
  before insert or update of slug, is_public on public.trips
  for each row execute function public.ensure_unique_public_slug();

-- Backfill curated showcase trips by exact destination match (idempotent via slug-is-null guard).

update public.trips set
  slug = 'porto-cervo-italy-5-nights',
  summary = 'A five-night Sardinian escape in Porto Cervo: Costa Smeralda yachts, Hotel Cala di Volpe, and Michelin dining curated for slow Mediterranean summers.'
where is_public = true and slug is null and destination = 'Porto Cervo, Italy';

update public.trips set
  slug = 'mykonos-greece-5-nights',
  summary = 'Five nights of curated Mykonos luxury: Belvedere Hotel suites, Nammos beach club afternoons, Scorpios sunsets, and private catamaran days in the Cyclades.'
where is_public = true and slug is null and destination = 'Mykonos, Greece';

update public.trips set
  slug = 'tokyo-japan-6-nights',
  summary = 'A six-night luxury Tokyo itinerary: Aman Tokyo, sushi temples in Ginza, teamLab Planets, and the quietest corners of the city after dark.'
where is_public = true and slug is null and destination = 'Tokyo, Japan';

update public.trips set
  slug = 'sabi-sands-cape-town-8-nights',
  summary = 'An eight-night South African journey: Singita Sabi Sand Big Five safari, then Cape Town wine country, Table Mountain, and the V&A Waterfront in style.'
where is_public = true and slug is null and destination = 'Sabi Sands & Cape Town, South Africa';

update public.trips set
  slug = 'marrakech-morocco-5-nights',
  summary = 'A five-night Marrakech escape: Royal Mansour riads, Jemaa el-Fnaa souks at dusk, an Atlas Mountain day trip, and modernist desert dining at La Mamounia.'
where is_public = true and slug is null and destination = 'Marrakech, Morocco';

update public.trips set
  slug = 'st-barths-french-west-indies-6-nights',
  summary = 'Six nights on St. Barthélemy: Eden Rock beach suites, Le Toiny dinners, Colombier hikes, and Gustavia harbor afternoons in pure West Indies luxury.'
where is_public = true and slug is null and destination = 'St. Barthélemy, French West Indies';
