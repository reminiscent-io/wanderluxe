---
name: create-showcase-trip
description: Generate a luxury showcase trip itinerary for the WanderLuxe Explore page. Use when the user wants to create a new public trip, add a destination to the showcase collection, or populate the Explore page with content. Asks for destination, time of year, and duration, then produces a complete itinerary with SQL ready to insert into Supabase.
---

# Create Showcase Trip

## Purpose

Generate a thoughtful, luxury travel itinerary and insert it as a public trip on the WanderLuxe Explore page, linked to the admin account.

## Workflow

### Step 1: Gather Inputs

Ask the user for the following (if not already provided):

1. **Destination** - City/region and country. If the user is unsure, suggest 3-5 luxury destinations that complement the existing showcase collection and the time of year.
2. **Time of year** - Month or date range. Advise on whether the timing is ideal for the destination (peak season, shoulder season, weather, cultural events). Suggest better windows if the timing is suboptimal.
3. **Duration** - Number of nights (recommend 5-8 for most destinations). Consider flight time — farther destinations warrant longer stays.

### Step 2: Design the Itinerary

Follow these principles:

**Pacing & Philosophy**
- This is a luxury trip, not a checklist. Never over-schedule. 2-3 structured activities per day maximum, with generous breathing room.
- Mornings should feel unhurried. Not every day needs a 7 AM start.
- Include at least one full "slow day" — beach/pool/spa with minimal structure.
- Arrival day: settle in, explore the hotel, one dinner. Never pack the arrival day.
- Departure day: breakfast, maybe one small errand (gift shopping), transfer. That's it.
- Balance active days (excursions, cultural sites) with recovery days (beach, spa, leisure).

**Accommodation**
- One hotel per trip unless the trip naturally splits between two distinct regions (e.g., safari + city, island hopping). Maximum 2 hotels.
- Choose the single best hotel in the destination — the kind of place that defines the trip. Iconic, design-forward, or quietly legendary.
- Include real hotel details: name, address, phone, website URL, check-in/check-out dates.
- Calculate total cost as cost_per_night x number_of_nights.

**Dining**
- One notable dinner reservation per evening. Not every meal needs to be a production — some lunches should be casual, stumbled-upon, or at the hotel.
- Mix Michelin-level fine dining with beloved local institutions. The best trips alternate between the two.
- Include the restaurant name, address, time, party size (default 2), estimated cost, and a brief note about what makes it special.

**Activities**
- Prioritize experiences unique to the destination. No generic "city walking tour" filler.
- Include one signature splurge experience per trip (private boat charter, helicopter, exclusive access).
- Cultural/historical sites should feel curated, not encyclopedic. Pick the 2-3 best, not all 10.
- Leave unstructured time for serendipity — the best travel moments are unplanned.

**Transportation**
- Include realistic flight routing from a major US city (vary the origin: NYC, Miami, Chicago, Dallas, LA, San Francisco).
- Include local transfers (airport to hotel, inter-city if applicable).
- Use real airline names and realistic flight times.
- Business/first class pricing for international flights.

**Social Context**
- Note what makes this time of year special: festivals, seasons, social scene, weather conditions.
- This context helps the trip feel intentional, not arbitrary.

### Step 3: Format as Supabase SQL

Generate a single `DO $$` PL/pgSQL block that inserts everything in one transaction.

**Admin account:** `user_id = 'a33fd435-65cd-4e75-9901-6db43e204b1b'`

**Database schema reference:**

```sql
-- trips (required: user_id, destination, arrival_date, departure_date, is_public, hidden)
INSERT INTO trips (user_id, destination, arrival_date, departure_date, is_public, hidden)
VALUES (v_user_id, 'Destination Name', 'YYYY-MM-DD', 'YYYY-MM-DD', true, false)
RETURNING trip_id INTO v_trip_id;

-- trip_days (required: trip_id, date, title)
INSERT INTO trip_days (trip_id, date, title)
VALUES (v_trip_id, 'YYYY-MM-DD', 'Day Title')
RETURNING day_id INTO d1;

-- accommodations (required: trip_id, title, order_index)
-- Key fields: hotel, hotel_address, hotel_phone, hotel_url, hotel_checkin_date,
--   hotel_checkout_date, cost, currency, description
INSERT INTO accommodations (trip_id, title, hotel, hotel_address, hotel_phone, hotel_url,
  hotel_checkin_date, hotel_checkout_date, cost, currency, order_index, description)
VALUES (v_trip_id, 'Hotel Name', 'Hotel Name', 'Full Address', '+phone',
  'https://hotel-url', 'YYYY-MM-DD', 'YYYY-MM-DD', total_cost, 'CUR', 0, 'Description')
RETURNING stay_id INTO v_stay_id;

-- accommodations_days (link stay to each night — check-in through night before checkout)
INSERT INTO accommodations_days (stay_id, day_id, date)
VALUES (v_stay_id, d1, 'YYYY-MM-DD');

-- transportation (required: trip_id, type, start_date)
-- type enum: 'flight', 'train', 'car_service', 'shuttle', 'ferry', 'rental_car'
-- Key fields: provider, departure_location, arrival_location, start_date, start_time,
--   end_date, end_time, cost, currency, details
INSERT INTO transportation (trip_id, type, provider, departure_location, arrival_location,
  start_date, start_time, end_date, end_time, cost, currency, details)
VALUES (v_trip_id, 'flight', 'Airline', 'Origin (CODE)', 'Dest (CODE)',
  'YYYY-MM-DD', 'HH:MM', 'YYYY-MM-DD', 'HH:MM', cost, 'USD', 'Notes');

-- day_activities (required: day_id, title, order_index)
-- Key fields: trip_id, description, start_time, end_time, cost, currency
-- Times are 'HH:MM' format (time without time zone)
-- Activities WITHOUT cost:
INSERT INTO day_activities (day_id, trip_id, title, description, start_time, end_time, order_index)
VALUES (d1, v_trip_id, 'Activity', 'Description', '09:00', '12:00', 0);
-- Activities WITH cost:
INSERT INTO day_activities (day_id, trip_id, title, description, start_time, end_time, cost, currency, order_index)
VALUES (d1, v_trip_id, 'Activity', 'Description', '09:00', '12:00', 500, 'EUR', 0);

-- reservations (required: day_id, restaurant_name, order_index)
-- Key fields: trip_id, reservation_time, number_of_people, cost, currency, notes, address
INSERT INTO reservations (day_id, trip_id, restaurant_name, reservation_time,
  number_of_people, cost, currency, notes, order_index, address)
VALUES (d1, v_trip_id, 'Restaurant Name', '20:30', 2, cost, 'CUR',
  'Booking notes', 0, 'Restaurant Address');
```

**SQL template structure:**

```sql
DO $$
DECLARE
  v_trip_id uuid;
  v_stay_id uuid;
  v_user_id uuid := 'a33fd435-65cd-4e75-9901-6db43e204b1b';
  d1 uuid; d2 uuid; d3 uuid; -- ... one per day
BEGIN
  -- 1. Insert trip
  -- 2. Insert trip_days (one per day, RETURNING day_id INTO variables)
  -- 3. Insert accommodation(s) + accommodations_days links
  -- 4. Insert transportation
  -- 5. Insert day_activities (grouped by day, order_index starting at 0)
  -- 6. Insert reservations (linked to correct day_id)
END $$;
```

**Important rules:**
- Escape single quotes in SQL strings by doubling them: `''`
- `accommodations_days` links the stay to each night (check-in date through the night BEFORE checkout)
- `order_index` starts at 0 and increments per item within its parent
- Activities without a cost should NOT include cost/currency columns
- All times use `'HH:MM'` format
- Costs should be in the local currency for the destination (EUR, JPY, ZAR, MAD, etc.) except international flights which use USD
- The `is_public = true` flag is what makes trips visible on the Explore page

### Step 4: Execute

Run the SQL via the Supabase MCP `execute_sql` tool with `project_id = 'arnengxblsfnezrqcsxw'`.

After execution, verify with:

```sql
SELECT t.trip_id, t.destination, t.arrival_date,
  (SELECT count(*) FROM trip_days WHERE trip_id = t.trip_id) as days,
  (SELECT count(*) FROM day_activities WHERE trip_id = t.trip_id) as activities,
  (SELECT count(*) FROM accommodations WHERE trip_id = t.trip_id) as hotels,
  (SELECT count(*) FROM transportation WHERE trip_id = t.trip_id) as transport,
  (SELECT count(*) FROM reservations WHERE trip_id = t.trip_id) as reservations
FROM trips t WHERE t.trip_id = '<new_trip_id>';
```

## Existing Showcase Trips

Keep track of what's already on the Explore page to avoid duplication and ensure variety:

- Porto Cervo, Sardinia, Italy (Jul 2026)
- Mykonos, Greece (Aug 2026)
- Tokyo, Japan (Sep 2026)
- Sabi Sands & Cape Town, South Africa (Oct 2026)
- Marrakech, Morocco (Nov 2026)
- St. Barthelemy, French West Indies (Dec 2026)

When suggesting new destinations, complement this collection geographically and seasonally.

## Quality Checklist

Before executing, verify:
- [ ] Pacing feels relaxed, not rushed (2-3 activities per day max, generous time gaps)
- [ ] Arrival day is light (settle in + dinner only)
- [ ] Departure day is minimal (breakfast + transfer)
- [ ] At least one slow/recovery day exists
- [ ] Hotel is a genuinely iconic or best-in-class property
- [ ] Dining alternates between fine dining and beloved local spots
- [ ] One signature splurge experience is included
- [ ] Flight routing is realistic with real airlines
- [ ] All single quotes are properly escaped in SQL
- [ ] `accommodations_days` covers check-in through night before checkout
- [ ] `order_index` values are sequential within each parent
- [ ] Activities with no cost omit cost/currency columns
