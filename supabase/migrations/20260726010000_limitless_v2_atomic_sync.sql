-- Limitless AI v2 Session 1: compare-and-swap cloud writes.
-- Apply after the v4 and v5 migrations. This migration is additive.
--
-- The function runs with the signed-in caller's privileges, so every table's
-- existing RLS ownership policies remain authoritative. A write succeeds only
-- when the expected revision still matches under PostgreSQL's row lock.

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
    'memory_items'
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
