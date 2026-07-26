-- Limitless AI v5: editable projects, durable assets, explicit memory,
-- and least-privilege policies. Apply after the v4 foundation migration.
-- This migration is additive and does not delete existing user records.

create table if not exists public.media_assets (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  device_id text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.media_projects (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  device_id text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.memory_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  device_id text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.project_versions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  project_id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists media_assets_user_updated_idx
  on public.media_assets (user_id, updated_at desc);
create index if not exists media_assets_user_kind_idx
  on public.media_assets (user_id, ((payload ->> 'kind')));
create index if not exists media_projects_user_updated_idx
  on public.media_projects (user_id, updated_at desc);
create index if not exists media_projects_user_kind_idx
  on public.media_projects (user_id, ((payload ->> 'kind')));
create index if not exists memory_items_user_updated_idx
  on public.memory_items (user_id, updated_at desc);
create index if not exists project_versions_user_project_created_idx
  on public.project_versions (user_id, project_id, created_at desc);

alter table public.media_assets enable row level security;
alter table public.media_projects enable row level security;
alter table public.memory_items enable row level security;
alter table public.project_versions enable row level security;

-- The browser receives only a publishable key. Table access is granted to
-- authenticated users and then narrowed to the current user's rows by RLS.
revoke all on table
  public.profiles,
  public.chats,
  public.media_jobs,
  public.user_preferences,
  public.media_assets,
  public.media_projects,
  public.memory_items,
  public.project_versions
from public, anon;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table
  public.chats,
  public.media_jobs,
  public.media_assets,
  public.media_projects,
  public.memory_items
to authenticated;
grant select, insert on table public.project_versions to authenticated;
grant select, insert, update on table public.user_preferences to authenticated;

-- Recreate the v4 policies with explicit roles.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "chats_select_own" on public.chats;
create policy "chats_select_own"
  on public.chats for select
  to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "chats_insert_own" on public.chats;
create policy "chats_insert_own"
  on public.chats for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "chats_update_own" on public.chats;
create policy "chats_update_own"
  on public.chats for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "chats_delete_own" on public.chats;
create policy "chats_delete_own"
  on public.chats for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "media_select_own" on public.media_jobs;
create policy "media_select_own"
  on public.media_jobs for select
  to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "media_insert_own" on public.media_jobs;
create policy "media_insert_own"
  on public.media_jobs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "media_update_own" on public.media_jobs;
create policy "media_update_own"
  on public.media_jobs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "media_delete_own" on public.media_jobs;
create policy "media_delete_own"
  on public.media_jobs for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "preferences_select_own" on public.user_preferences;
create policy "preferences_select_own"
  on public.user_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "preferences_insert_own" on public.user_preferences;
create policy "preferences_insert_own"
  on public.user_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "preferences_update_own" on public.user_preferences;
create policy "preferences_update_own"
  on public.user_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "assets_select_own" on public.media_assets;
create policy "assets_select_own"
  on public.media_assets for select
  to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "assets_insert_own" on public.media_assets;
create policy "assets_insert_own"
  on public.media_assets for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "assets_update_own" on public.media_assets;
create policy "assets_update_own"
  on public.media_assets for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "assets_delete_own" on public.media_assets;
create policy "assets_delete_own"
  on public.media_assets for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "projects_select_own" on public.media_projects;
create policy "projects_select_own"
  on public.media_projects for select
  to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "projects_insert_own" on public.media_projects;
create policy "projects_insert_own"
  on public.media_projects for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "projects_update_own" on public.media_projects;
create policy "projects_update_own"
  on public.media_projects for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "projects_delete_own" on public.media_projects;
create policy "projects_delete_own"
  on public.media_projects for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "memory_select_own" on public.memory_items;
create policy "memory_select_own"
  on public.memory_items for select
  to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "memory_insert_own" on public.memory_items;
create policy "memory_insert_own"
  on public.memory_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "memory_update_own" on public.memory_items;
create policy "memory_update_own"
  on public.memory_items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "memory_delete_own" on public.memory_items;
create policy "memory_delete_own"
  on public.memory_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "versions_select_own" on public.project_versions;
create policy "versions_select_own"
  on public.project_versions for select
  to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "versions_insert_own" on public.project_versions;
create policy "versions_insert_own"
  on public.project_versions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "versions_update_own" on public.project_versions;
drop policy if exists "versions_delete_own" on public.project_versions;

-- Keep the auth trigger out of the exposed public API schema.
create schema if not exists private;
drop trigger if exists on_auth_user_created_limitless on auth.users;
drop function if exists public.handle_new_limitless_user();
create or replace function private.handle_new_limitless_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_limitless_user() from public, anon, authenticated;
create trigger on_auth_user_created_limitless
  after insert on auth.users
  for each row execute procedure private.handle_new_limitless_user();

-- Storage upserts need SELECT, INSERT, and UPDATE. Every operation is scoped
-- to a first path segment equal to the signed-in user's UUID.
drop policy if exists "media_objects_select_own" on storage.objects;
create policy "media_objects_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'limitless-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "media_objects_insert_own" on storage.objects;
create policy "media_objects_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'limitless-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "media_objects_update_own" on storage.objects;
create policy "media_objects_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'limitless-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'limitless-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "media_objects_delete_own" on storage.objects;
create policy "media_objects_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'limitless-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
