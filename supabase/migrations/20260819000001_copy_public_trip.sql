-- Copy a showcase trip into the caller's own account.
--
-- A finished, fully-populated itinerary is the best teaching surface the app
-- has: it demonstrates every feature at once without a word of instruction.
-- This makes one reachable as a starting point rather than only as a display.
--
-- SECURITY DEFINER because the copy writes across six tables in one
-- transaction; every write is pinned to auth.uid() and the source is required
-- to be a public trip, so the definer rights cannot be used to read or write
-- anything the caller could not already see.

CREATE OR REPLACE FUNCTION public.copy_public_trip(
  source_trip_id uuid,
  new_arrival_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller      uuid := auth.uid();
  src         public.trips%ROWTYPE;
  new_trip_id uuid := gen_random_uuid();
  day_shift   int  := 0;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to copy a trip'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO src
  FROM public.trips
  WHERE trip_id = source_trip_id
    AND is_public = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That trip is not available to copy'
      USING ERRCODE = 'P0002';
  END IF;

  -- Rebase the whole itinerary onto the caller's own start date. Every date in
  -- the trip moves by the same number of days, so relative structure survives.
  IF new_arrival_date IS NOT NULL THEN
    day_shift := new_arrival_date - src.arrival_date;
  END IF;

  DROP TABLE IF EXISTS _wl_day_map;
  DROP TABLE IF EXISTS _wl_stay_map;
  CREATE TEMP TABLE _wl_day_map  (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP;
  CREATE TEMP TABLE _wl_stay_map (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP;

  -- The trip itself. Deliberately not carried over: slug and summary (unique
  -- to the published showcase), the calendar feed token (a fresh one is minted
  -- on demand), and is_public (a copy is always private).
  INSERT INTO public.trips (
    trip_id, user_id, destination,
    primary_destination, primary_destination_place_id,
    arrival_date, departure_date, budget, timezone,
    cover_image_url, cover_image_position, image_position,
    cover_image_photographer, cover_image_photographer_username,
    is_public, hidden, calendar_feed_enabled
  )
  VALUES (
    new_trip_id, caller, src.destination,
    src.primary_destination, src.primary_destination_place_id,
    src.arrival_date + day_shift, src.departure_date + day_shift,
    src.budget, src.timezone,
    src.cover_image_url, src.cover_image_position, src.image_position,
    src.cover_image_photographer, src.cover_image_photographer_username,
    false, false, false
  );

  -- Days, remembering old -> new so the children can be re-pointed.
  WITH mapped AS MATERIALIZED (
    SELECT day_id AS old_id, gen_random_uuid() AS new_id, date, title, description,
           image_url, image_position
    FROM public.trip_days
    WHERE trip_id = source_trip_id
  ),
  inserted AS (
    INSERT INTO public.trip_days (day_id, trip_id, date, title, description, image_url, image_position)
    SELECT new_id, new_trip_id, date + day_shift, title, description, image_url, image_position
    FROM mapped
  )
  INSERT INTO _wl_day_map (old_id, new_id)
  SELECT old_id, new_id FROM mapped;

  -- Stays.
  WITH mapped AS MATERIALIZED (
    SELECT stay_id AS old_id, gen_random_uuid() AS new_id, title, hotel, hotel_details,
           hotel_url, hotel_website, hotel_address, hotel_phone, hotel_place_id,
           hotel_checkin_date, hotel_checkout_date, checkin_time, checkout_time,
           final_accommodation_day, cost, currency, expense_type, image_url,
           order_index, description, timezone
    FROM public.accommodations
    WHERE trip_id = source_trip_id
  ),
  inserted AS (
    INSERT INTO public.accommodations (
      stay_id, trip_id, title, hotel, hotel_details, hotel_url, hotel_website,
      hotel_address, hotel_phone, hotel_place_id,
      hotel_checkin_date, hotel_checkout_date, checkin_time, checkout_time,
      final_accommodation_day, cost, currency, expense_type, image_url,
      order_index, description, timezone
    )
    SELECT new_id, new_trip_id, title, hotel, hotel_details, hotel_url, hotel_website,
           hotel_address, hotel_phone, hotel_place_id,
           hotel_checkin_date + day_shift, hotel_checkout_date + day_shift,
           checkin_time, checkout_time,
           CASE
             WHEN final_accommodation_day ~ '^\d{4}-\d{2}-\d{2}$'
               THEN ((final_accommodation_day::date + day_shift)::text)
             ELSE final_accommodation_day
           END,
           cost, currency, expense_type, image_url,
           order_index, description, timezone
    FROM mapped
  )
  INSERT INTO _wl_stay_map (old_id, new_id)
  SELECT old_id, new_id FROM mapped;

  -- Which days each stay spans.
  INSERT INTO public.accommodations_days (id, stay_id, day_id, date)
  SELECT gen_random_uuid(), sm.new_id, dm.new_id, ad.date + day_shift
  FROM public.accommodations_days ad
  JOIN public.accommodations a ON a.stay_id = ad.stay_id
  JOIN _wl_stay_map sm ON sm.old_id = ad.stay_id
  JOIN _wl_day_map  dm ON dm.old_id = ad.day_id
  WHERE a.trip_id = source_trip_id;

  INSERT INTO public.day_activities (
    id, trip_id, day_id, title, description, start_time, end_time, order_index,
    cost, currency, timezone,
    location_address, location_phone, location_place_id, location_rating, location_website
  )
  SELECT gen_random_uuid(), new_trip_id, dm.new_id, act.title, act.description,
         act.start_time, act.end_time, act.order_index,
         act.cost, act.currency, act.timezone,
         act.location_address, act.location_phone, act.location_place_id,
         act.location_rating, act.location_website
  FROM public.day_activities act
  JOIN _wl_day_map dm ON dm.old_id = act.day_id
  WHERE act.trip_id = source_trip_id;

  INSERT INTO public.reservations (
    id, trip_id, day_id, restaurant_name, reservation_time, number_of_people,
    address, phone_number, website, place_id, rating, notes, image_url,
    cost, currency, order_index, timezone
  )
  SELECT gen_random_uuid(), new_trip_id, dm.new_id, r.restaurant_name, r.reservation_time,
         r.number_of_people, r.address, r.phone_number, r.website, r.place_id, r.rating,
         r.notes, r.image_url, r.cost, r.currency, r.order_index, r.timezone
  FROM public.reservations r
  JOIN _wl_day_map dm ON dm.old_id = r.day_id
  WHERE r.trip_id = source_trip_id;

  -- Transportation hangs off the trip rather than a day. Confirmation numbers
  -- and live flight status belong to the original traveller, not the copier.
  INSERT INTO public.transportation (
    id, trip_id, type, provider, details,
    departure_location, arrival_location, departure_timezone, arrival_timezone,
    start_date, end_date, start_time, end_time, cost, currency
  )
  SELECT gen_random_uuid(), new_trip_id, t.type, t.provider, t.details,
         t.departure_location, t.arrival_location, t.departure_timezone, t.arrival_timezone,
         t.start_date + day_shift, t.end_date + day_shift, t.start_time, t.end_time,
         t.cost, t.currency
  FROM public.transportation t
  WHERE t.trip_id = source_trip_id;

  RETURN new_trip_id;
END;
$$;

REVOKE ALL ON FUNCTION public.copy_public_trip(uuid, date) FROM public;
GRANT EXECUTE ON FUNCTION public.copy_public_trip(uuid, date) TO authenticated;
