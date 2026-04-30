-- PA Plan Advisor — roles per functional spec (§4.1): Admin, Internal user, Client user.
-- Mirrors Supabase pattern: https://supabase.com/docs/guides/auth/managing-user-data#using-triggers
-- Role is stored on public.profiles; on signup / metadata change it is derived from auth.users.raw_user_meta_data->>'role'
-- (dashboard or Admin API). Invalid or missing values default to 'client'.

create type public.app_role as enum ('admin', 'internal', 'client');

create table public.profiles (
  id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null default 'client',
  full_name text,
  updated_at timestamptz not null default now(),
  primary key (id)
);

comment on table public.profiles is 'Application profile per auth user; role matches PA Plan Advisor §4.1.';
comment on column public.profiles.role is 'admin = full control; internal = calculations/summaries; client = external client user.';

alter table public.profiles enable row level security;

-- Read own row (JWT must be present — anon has no uid).
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

grant select on table public.profiles to anon, authenticated;
grant all on table public.profiles to service_role;

-- INSERT: follow Supabase docs trigger name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parsed public.app_role;
  r text;
  fn text;
begin
  r := lower(trim(coalesce(new.raw_user_meta_data ->> 'role', 'client')));
  parsed := case r
    when 'admin' then 'admin'::public.app_role
    when 'internal' then 'internal'::public.app_role
    when 'client' then 'client'::public.app_role
    when 'customer' then 'client'::public.app_role
    else 'client'::public.app_role
  end;

  fn := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.profiles (id, role, full_name)
  values (new.id, parsed, fn);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles in sync when role/name is edited in the Auth UI or via admin API (e.g. seed script).
create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parsed public.app_role;
  r text;
  fn text;
begin
  r := lower(trim(coalesce(new.raw_user_meta_data ->> 'role', 'client')));
  parsed := case r
    when 'admin' then 'admin'::public.app_role
    when 'internal' then 'internal'::public.app_role
    when 'client' then 'client'::public.app_role
    when 'customer' then 'client'::public.app_role
    else 'client'::public.app_role
  end;

  fn := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.profiles (id, role, full_name)
  values (new.id, parsed, fn)
  on conflict (id) do update
    set role = excluded.role,
        full_name = excluded.full_name,
        updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_metadata_updated
  after update of raw_user_meta_data, email on auth.users
  for each row
  when (
    old.raw_user_meta_data is distinct from new.raw_user_meta_data
    or old.email is distinct from new.email
  )
  execute function public.sync_profile_from_auth_user();

-- Existing users (before this migration): copy metadata into profiles.
insert into public.profiles (id, role, full_name)
select
  u.id,
  case lower(trim(coalesce(u.raw_user_meta_data ->> 'role', 'client')))
    when 'admin' then 'admin'::public.app_role
    when 'internal' then 'internal'::public.app_role
    when 'client' then 'client'::public.app_role
    when 'customer' then 'client'::public.app_role
    else 'client'::public.app_role
  end,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, ''), '@', 1)
  )
from auth.users u
on conflict (id) do nothing;
