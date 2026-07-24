-- Limitless AI v4: private, per-user, revisioned cloud sync.
-- Run in the Supabase SQL editor, then copy only the project URL and
-- publishable key into .env.local. Never expose a service-role key.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.chats (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  device_id text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.media_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  device_id text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 1 check (revision > 0),
  device_id text not null,
  updated_at timestamptz not null default now()
);

create index if not exists chats_user_updated_idx
  on public.chats (user_id, updated_at desc);
create index if not exists chats_user_deleted_idx
  on public.chats (user_id, deleted_at)
  where deleted_at is not null;
create index if not exists media_jobs_user_updated_idx
  on public.media_jobs (user_id, updated_at desc);
create index if not exists media_jobs_user_status_idx
  on public.media_jobs (user_id, ((payload ->> 'status')));

alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.media_jobs enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using ((select auth.uid()) = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "chats_select_own" on public.chats;
create policy "chats_select_own"
  on public.chats for select
  using ((select auth.uid()) = user_id);

drop policy if exists "chats_insert_own" on public.chats;
create policy "chats_insert_own"
  on public.chats for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "chats_update_own" on public.chats;
create policy "chats_update_own"
  on public.chats for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "chats_delete_own" on public.chats;
create policy "chats_delete_own"
  on public.chats for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "media_select_own" on public.media_jobs;
create policy "media_select_own"
  on public.media_jobs for select
  using ((select auth.uid()) = user_id);

drop policy if exists "media_insert_own" on public.media_jobs;
create policy "media_insert_own"
  on public.media_jobs for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "media_update_own" on public.media_jobs;
create policy "media_update_own"
  on public.media_jobs for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "media_delete_own" on public.media_jobs;
create policy "media_delete_own"
  on public.media_jobs for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "preferences_select_own" on public.user_preferences;
create policy "preferences_select_own"
  on public.user_preferences for select
  using ((select auth.uid()) = user_id);

drop policy if exists "preferences_insert_own" on public.user_preferences;
create policy "preferences_insert_own"
  on public.user_preferences for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "preferences_update_own" on public.user_preferences;
create policy "preferences_update_own"
  on public.user_preferences for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.handle_new_limitless_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_limitless on auth.users;
create trigger on_auth_user_created_limitless
  after insert on auth.users
  for each row execute procedure public.handle_new_limitless_user();

insert into storage.buckets (id, name, public, file_size_limit)
values ('limitless-media', 'limitless-media', false, 104857600)
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "media_objects_select_own" on storage.objects;
create policy "media_objects_select_own"
  on storage.objects for select
  using (
    bucket_id = 'limitless-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "media_objects_insert_own" on storage.objects;
create policy "media_objects_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'limitless-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "media_objects_update_own" on storage.objects;
create policy "media_objects_update_own"
  on storage.objects for update
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
  using (
    bucket_id = 'limitless-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
