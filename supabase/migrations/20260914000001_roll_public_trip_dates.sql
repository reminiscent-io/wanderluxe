-- Keep showcase itineraries evergreen.
--
-- A public trip needs concrete dates to have days, but a showcase page whose
-- dates have passed reads as stale. roll_public_trip_dates() shifts every
-- public trip whose departure is behind us forward by whole years until it is
-- in the future again, moving its days, stays, transport and expenses with it
-- so the itinerary stays internally consistent. Weekday alignment is not
-- preserved; showcase pages show month + nights, not weekdays.
--
-- Run it each January (or whenever a page has aged out):
--   select public.roll_public_trip_dates();
-- Returns the number of trips moved.

create or replace function public.roll_public_trip_dates()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  years integer;
  moved integer := 0;
begin
  for t in
    select trip_id, arrival_date, departure_date
      from public.trips
     where is_public = true
       and departure_date < current_date
  loop
    -- Enough whole years to land the departure after today.
    years := ceil((current_date - t.departure_date)::numeric / 365.25)::integer;
    if years < 1 then
      years := 1;
    end if;

    update public.trips
       set arrival_date   = arrival_date   + make_interval(years => years),
           departure_date = departure_date + make_interval(years => years)
     where trip_id = t.trip_id;

    update public.trip_days
       set date = date + make_interval(years => years)
     where trip_id = t.trip_id;

    update public.accommodations
       set hotel_checkin_date  = hotel_checkin_date  + make_interval(years => years),
           hotel_checkout_date = hotel_checkout_date + make_interval(years => years)
     where trip_id = t.trip_id;

    update public.accommodations_days ad
       set date = ad.date + make_interval(years => years)
      from public.accommodations a
     where ad.stay_id = a.stay_id
       and a.trip_id = t.trip_id;

    update public.transportation
       set start_date = start_date + make_interval(years => years),
           end_date   = case when end_date is null then null
                             else end_date + make_interval(years => years) end
     where trip_id = t.trip_id;

    update public.expenses
       set date = date + make_interval(years => years)
     where trip_id = t.trip_id
       and date is not null;

    update public.other_expenses
       set date = date + make_interval(years => years)
     where trip_id = t.trip_id
       and date is not null;

    moved := moved + 1;
  end loop;

  return moved;
end;
$$;

comment on function public.roll_public_trip_dates() is
  'Shift every past public (showcase) trip forward by whole years so Explore never lists a stale itinerary. Returns trips moved.';

-- Owner-only: nothing in the app calls this; it is an operator command.
revoke all on function public.roll_public_trip_dates() from public, anon, authenticated;
