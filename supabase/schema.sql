create table if not exists public.district_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  district_id text not null,
  district_name text not null,
  role text not null default 'district_user'
    check (role in ('district_user', 'district_admin')),
  created_at timestamptz not null default now()
);

alter table public.district_profiles enable row level security;
drop policy if exists "Users can read their own district profile" on public.district_profiles;
create policy "Users can read their own district profile"
  on public.district_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.district_profiles from anon, authenticated;
grant select on public.district_profiles to authenticated;

create table if not exists public.district_data (
  district_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.district_data enable row level security;
drop policy if exists "Users can read their district data" on public.district_data;
create policy "Users can read their district data"
  on public.district_data
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.district_profiles profile
      where profile.user_id = auth.uid()
        and profile.district_id = district_data.district_id
    )
  );

drop policy if exists "Users can create their district data" on public.district_data;
create policy "Users can create their district data"
  on public.district_data
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.district_profiles profile
      where profile.user_id = auth.uid()
        and profile.district_id = district_data.district_id
    )
  );

drop policy if exists "Users can update their district data" on public.district_data;
create policy "Users can update their district data"
  on public.district_data
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.district_profiles profile
      where profile.user_id = auth.uid()
        and profile.district_id = district_data.district_id
    )
  )
  with check (
    exists (
      select 1
      from public.district_profiles profile
      where profile.user_id = auth.uid()
        and profile.district_id = district_data.district_id
    )
  );

revoke all on public.district_data from anon;
grant select, insert, update on public.district_data to authenticated;
