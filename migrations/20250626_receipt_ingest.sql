-- 6.1  memory table (if not exists)
create table if not exists chat_memory (
  trip_id uuid primary key references trips (trip_id) on delete cascade,
  summary text not null
);

-- 6.2  pgvector (optional; keep if you already installed)
-- create extension if not exists vector;

alter table chat_logs
  add column if not exists embedding vector(1536);

-- 6.3  RPC used by chat-ai to insert rows safely
drop function if exists public.map_extraction_to_tables(uuid, jsonb);

create or replace function public.map_extraction_to_tables(
  in_trip_id uuid,
  extraction jsonb
) returns void
language plpgsql security definer as $$
declare
  t text := extraction->>'type';
begin
  if t = 'hotel' then
    insert into accommodations (
      stay_id, trip_id, title, hotel, hotel_address,
      hotel_checkin_date, hotel_checkout_date,
      cost, currency, order_index
    )
    values (
      gen_random_uuid(), in_trip_id,
      coalesce(extraction->'data'->>'hotel_name', 'Accommodation'),
      extraction->'data'->>'hotel_name',
      extraction->'data'->>'address',
      (extraction->'data'->>'check_in_date')::date,
      (extraction->'data'->>'check_out_date')::date,
      (extraction->'data'->>'total_cost')::numeric,
      coalesce(extraction->'data'->>'currency', 'USD'),
      coalesce(
        (select max(order_index)+1 from accommodations where trip_id=in_trip_id), 0)
    );
  elsif t = 'flight' then
    insert into transportation (
      id, trip_id, type, provider, details, confirmation_number,
      start_date, start_time, end_date, end_time,
      departure_location, arrival_location,
      cost, currency
    )
    values (
      gen_random_uuid(), in_trip_id, 'flight',
      extraction->'data'->>'airline',
      extraction->'data'->>'flight_number',
      extraction->'data'->>'flight_number',
      (extraction->'data'->>'departure_time')::timestamp::date,
      (extraction->'data'->>'departure_time')::timestamp::time,
      (extraction->'data'->>'arrival_time')::timestamp::date,
      (extraction->'data'->>'arrival_time')::timestamp::time,
      extraction->'data'->>'departure_city',
      extraction->'data'->>'arrival_city',
      (extraction->'data'->>'total_cost')::numeric,
      coalesce(extraction->'data'->>'currency', 'USD')
    );
  end if;
end;
$$;

-- 6.4  HTTP trigger → chat-summariser
create or replace function fn_notify_summariser()
returns trigger language plpgsql as $$
begin
  perform net.http_post(
    url := 'https://arnengxblsfnezrqcsxw.functions.supabase.co/chat-summariser',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('record', NEW)
  );
  return NEW;
end;
$$;

drop trigger if exists trg_chat_memory on chat_logs;
create trigger trg_chat_memory
after insert on chat_logs
for each row execute function fn_notify_summariser();
