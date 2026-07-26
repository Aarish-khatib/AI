-- Limitless AI v2 Session 2: private structured artifacts, immutable versions,
-- export jobs, and artifact assets.
--
-- Apply after 20260726010000_limitless_v2_atomic_sync.sql. This migration is
-- additive: it does not rename, rewrite, or delete any v4, v5, or v6 record.

create table if not exists public.artifacts (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  device_id text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.artifact_versions (
  user_id uuid not null,
  id text not null,
  artifact_id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint artifact_versions_artifact_fk
    foreign key (user_id, artifact_id)
    references public.artifacts(user_id, id)
    on delete cascade
);

create table if not exists public.artifact_exports (
  user_id uuid not null,
  id text not null,
  artifact_id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  device_id text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id),
  constraint artifact_exports_artifact_fk
    foreign key (user_id, artifact_id)
    references public.artifacts(user_id, id)
    on delete cascade
);

create table if not exists public.artifact_assets (
  user_id uuid not null,
  id text not null,
  artifact_id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  device_id text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id),
  constraint artifact_assets_artifact_fk
    foreign key (user_id, artifact_id)
    references public.artifacts(user_id, id)
    on delete cascade
);

create index if not exists artifacts_user_updated_idx
  on public.artifacts (user_id, updated_at desc);
create index if not exists artifacts_user_type_idx
  on public.artifacts (user_id, ((payload ->> 'type')));
create index if not exists artifact_versions_user_artifact_created_idx
  on public.artifact_versions (user_id, artifact_id, created_at desc);
create index if not exists artifact_exports_user_artifact_updated_idx
  on public.artifact_exports (user_id, artifact_id, updated_at desc);
create index if not exists artifact_exports_user_status_idx
  on public.artifact_exports (user_id, ((payload ->> 'status')), updated_at desc);
create index if not exists artifact_assets_user_artifact_updated_idx
  on public.artifact_assets (user_id, artifact_id, updated_at desc);

alter table public.artifacts enable row level security;
alter table public.artifact_versions enable row level security;
alter table public.artifact_exports enable row level security;
alter table public.artifact_assets enable row level security;

revoke all on table
  public.artifacts,
  public.artifact_versions,
  public.artifact_exports,
  public.artifact_assets
from public, anon;

grant select, insert, update, delete on table
  public.artifacts,
  public.artifact_exports,
  public.artifact_assets
to authenticated;
grant select, insert on table public.artifact_versions to authenticated;

drop policy if exists "artifacts_select_own" on public.artifacts;
create policy "artifacts_select_own"
  on public.artifacts for select
  to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "artifacts_insert_own" on public.artifacts;
create policy "artifacts_insert_own"
  on public.artifacts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "artifacts_update_own" on public.artifacts;
create policy "artifacts_update_own"
  on public.artifacts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "artifacts_delete_own" on public.artifacts;
create policy "artifacts_delete_own"
  on public.artifacts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "artifact_versions_select_own" on public.artifact_versions;
create policy "artifact_versions_select_own"
  on public.artifact_versions for select
  to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "artifact_versions_insert_own" on public.artifact_versions;
create policy "artifact_versions_insert_own"
  on public.artifact_versions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "artifact_versions_update_own" on public.artifact_versions;
drop policy if exists "artifact_versions_delete_own" on public.artifact_versions;

drop policy if exists "artifact_exports_select_own" on public.artifact_exports;
create policy "artifact_exports_select_own"
  on public.artifact_exports for select
  to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "artifact_exports_insert_own" on public.artifact_exports;
create policy "artifact_exports_insert_own"
  on public.artifact_exports for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "artifact_exports_update_own" on public.artifact_exports;
create policy "artifact_exports_update_own"
  on public.artifact_exports for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "artifact_exports_delete_own" on public.artifact_exports;
create policy "artifact_exports_delete_own"
  on public.artifact_exports for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "artifact_assets_select_own" on public.artifact_assets;
create policy "artifact_assets_select_own"
  on public.artifact_assets for select
  to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "artifact_assets_insert_own" on public.artifact_assets;
create policy "artifact_assets_insert_own"
  on public.artifact_assets for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "artifact_assets_update_own" on public.artifact_assets;
create policy "artifact_assets_update_own"
  on public.artifact_assets for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "artifact_assets_delete_own" on public.artifact_assets;
create policy "artifact_assets_delete_own"
  on public.artifact_assets for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Extend the Session 1 compare-and-swap protocol. SECURITY INVOKER preserves
-- the table policies above; the browser never receives a privileged key.
create or replace function public.limitless_write_revisioned(
  p_table text,
  p_id text,
  p_expected_revision bigint,
  p_payload jsonb,
  p_revision bigint,
  p_device_id text,
  p_updated_at timestamptz,
  p_deleted_at timestamptz default null
)
returns table (
  applied boolean,
  id text,
  payload jsonb,
  revision bigint,
  device_id text,
  updated_at timestamptz,
  deleted_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;
  if p_table not in (
    'chats',
    'media_jobs',
    'media_assets',
    'media_projects',
    'memory_items',
    'artifacts',
    'artifact_exports',
    'artifact_assets'
  ) then
    raise exception 'Unsupported revisioned table.';
  end if;
  if p_id is null or btrim(p_id) = '' or p_device_id is null or btrim(p_device_id) = '' then
    raise exception 'Record and device identifiers are required.';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Payload must be a JSON object.';
  end if;
  if p_revision < 1 or (
    p_expected_revision is not null and p_revision <= p_expected_revision
  ) then
    raise exception 'The new revision must advance the expected revision.';
  end if;

  return query execute format(
    $statement$
      with attempted as (
        insert into public.%1$I as target (
          user_id,
          id,
          payload,
          revision,
          device_id,
          updated_at,
          deleted_at
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (user_id, id) do update
          set payload = excluded.payload,
              revision = excluded.revision,
              device_id = excluded.device_id,
              updated_at = excluded.updated_at,
              deleted_at = excluded.deleted_at
          where target.revision = $8
        returning
          true as applied,
          target.id,
          target.payload,
          target.revision,
          target.device_id,
          target.updated_at,
          target.deleted_at
      )
      select * from attempted
      union all
      select
        false as applied,
        current.id,
        current.payload,
        current.revision,
        current.device_id,
        current.updated_at,
        current.deleted_at
      from public.%1$I as current
      where current.user_id = $1
        and current.id = $2
        and not exists (select 1 from attempted)
      limit 1
    $statement$,
    p_table
  )
  using
    current_user_id,
    p_id,
    p_payload,
    p_revision,
    p_device_id,
    p_updated_at,
    p_deleted_at,
    p_expected_revision;
end;
$$;

revoke all on function public.limitless_write_revisioned(
  text,
  text,
  bigint,
  jsonb,
  bigint,
  text,
  timestamptz,
  timestamptz
) from public, anon;

grant execute on function public.limitless_write_revisioned(
  text,
  text,
  bigint,
  jsonb,
  bigint,
  text,
  timestamptz,
  timestamptz
) to authenticated;

notify pgrst, 'reload schema';
