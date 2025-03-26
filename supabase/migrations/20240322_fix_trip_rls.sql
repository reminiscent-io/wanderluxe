
-- Drop existing policies if they exist
drop policy if exists "Users can create their own trips" on trips;
drop policy if exists "Users can view their own trips" on trips;
drop policy if exists "Users can update their own trips" on trips;
drop policy if exists "Users can delete their own trips" on trips;

-- Enable RLS
alter table trips enable row level security;

-- Create policy to allow authenticated users to create their own trips
create policy "Users can create their own trips"
on trips for insert
to authenticated
with check (auth.uid()::text = user_id::text);

-- Allow users to read their own trips
create policy "Users can view their own trips"
on trips for select
to authenticated
using (auth.uid()::text = user_id::text);

-- Allow users to update their own trips
create policy "Users can update their own trips"
on trips for update
to authenticated
using (auth.uid()::text = user_id::text);

-- Allow users to delete their own trips
create policy "Users can delete their own trips"
on trips for delete
to authenticated
using (auth.uid()::text = user_id::text);

-- Enable RLS for trip_days
alter table trip_days enable row level security;

-- Create policies for trip_days
create policy "Users can create their own trip days"
on trip_days for insert
to authenticated
with check (
  auth.uid()::text = (
    select user_id::text 
    from trips 
    where trip_id = trip_days.trip_id
  )
);

create policy "Users can view their own trip days"
on trip_days for select
to authenticated
using (
  auth.uid()::text = (
    select user_id::text 
    from trips 
    where trip_id = trip_days.trip_id
  )
);

create policy "Users can update their own trip days"
on trip_days for update
to authenticated
using (
  auth.uid()::text = (
    select user_id::text 
    from trips 
    where trip_id = trip_days.trip_id
  )
);

create policy "Users can delete their own trip days"
on trip_days for delete
to authenticated
using (
  auth.uid()::text = (
    select user_id::text 
    from trips 
    where trip_id = trip_days.trip_id
  )
);
