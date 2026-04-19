-- Trip reminder emails — cron wiring for the `send-trip-reminders` Edge Function.
--
-- Approach:
--   - pg_cron ticks hourly (UTC). The Edge Function itself gates on 20:00
--     America/New_York, which handles DST without scheduling tricks.
--   - `trip_reminder_sends` provides idempotency so retries or overlapping
--     ticks can't double-send.
--
-- One-time setup (run in the Supabase SQL editor, not in this migration, so
-- the secret isn't committed):
--
--   alter database postgres
--     set app.trip_reminder_url = 'https://<project-ref>.supabase.co/functions/v1/send-trip-reminders';
--   alter database postgres
--     set app.cron_secret = '<CRON_SECRET>';

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.trip_reminder_sends (
  trip_id uuid        not null,
  sent_on date        not null,
  sent_at timestamptz not null default now(),
  primary key (trip_id, sent_on)
);

-- Only the Edge Function (service role) writes here; RLS on with no policies
-- locks out anon/authenticated clients entirely.
alter table public.trip_reminder_sends enable row level security;

-- Recreate the schedule idempotently so re-running this migration is safe.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'send-trip-reminders-hourly') then
    perform cron.unschedule('send-trip-reminders-hourly');
  end if;

  perform cron.schedule(
    'send-trip-reminders-hourly',
    '0 * * * *',
    $job$
    select net.http_post(
      url     := current_setting('app.trip_reminder_url', true),
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    )
    where current_setting('app.trip_reminder_url', true) is not null
      and current_setting('app.cron_secret', true)      is not null;
    $job$
  );
end
$$;
