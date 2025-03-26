
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
