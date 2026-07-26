-- Limitless AI v2 Finale: additive, owner-isolated platform records.
-- Apply after every earlier Limitless v2 migration.

create table if not exists public.platform_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision bigint not null check (revision > 0),
  device_id text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.user_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  platform text not null default 'unknown',
  status text not null default 'paired' check (status in ('pending','paired','offline','revoked')),
  permissions jsonb not null default '[]'::jsonb check (jsonb_typeof(permissions) = 'array'),
  credential_hash text not null,
  credential_version integer not null default 1 check (credential_version > 0),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.remote_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  device_id uuid not null,
  status text not null default 'pending' check (status in ('pending','active','stopped','expired','revoked')),
  permissions jsonb not null default '[]'::jsonb check (jsonb_typeof(permissions) = 'array'),
  credential_hash text not null,
  credential_version integer not null default 1 check (credential_version > 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  idle_expires_at timestamptz not null,
  stopped_at timestamptz,
  revoked_at timestamptz,
  primary key (user_id, id),
  foreign key (user_id, device_id) references public.user_devices(user_id, id) on delete cascade
);

create table if not exists public.project_agent_runs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  project_id text not null,
  status text not null check (status in ('planned','awaiting-approval','running','passed','failed','cancelled')),
  plan jsonb not null default '[]'::jsonb check (jsonb_typeof(plan) = 'array'),
  repository_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.project_agent_steps (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  run_id uuid not null,
  step_index integer not null check (step_index >= 0),
  action text not null,
  risk text not null check (risk in ('read','approval','blocked')),
  status text not null check (status in ('pending','approved','running','passed','failed','cancelled')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, run_id) references public.project_agent_runs(user_id, id) on delete cascade,
  unique (user_id, run_id, step_index)
);

create table if not exists public.document_preflight_reports (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  document_id text not null,
  source_revision bigint not null check (source_revision > 0),
  findings jsonb not null default '[]'::jsonb check (jsonb_typeof(findings) = 'array'),
  passed boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.provider_credentials_metadata (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null,
  status text not null check (status in ('requires-key','untested','healthy','degraded','rate-limited','cooling-down','disabled','blocked')),
  masked_suffix text,
  catalog jsonb not null default '[]'::jsonb check (jsonb_typeof(catalog) = 'array'),
  catalog_fetched_at timestamptz,
  verified_at timestamptz,
  last_error_code text,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider_id)
);

create table if not exists public.user_ai_usage_modes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  limitless_free boolean not null default true,
  never_spend boolean not null default true,
  paid_status text not null default 'locked' check (paid_status in ('locked','ready','active')),
  default_provider_id text not null default '',
  default_model text not null default '',
  policy jsonb not null default '{}'::jsonb check (jsonb_typeof(policy) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  check (not limitless_free or never_spend)
);

create table if not exists public.user_ai_budgets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  max_cost_per_request_usd numeric(12,6) not null default 0 check (max_cost_per_request_usd >= 0),
  daily_budget_usd numeric(12,6) not null default 0 check (daily_budget_usd >= 0),
  monthly_budget_usd numeric(12,6) not null default 0 check (monthly_budget_usd >= 0),
  confirm_above_usd numeric(12,6) not null default 0 check (confirm_above_usd >= 0),
  spent_today_usd numeric(12,6) not null default 0 check (spent_today_usd >= 0),
  spent_month_usd numeric(12,6) not null default 0 check (spent_month_usd >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_cost_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  provider_id text not null,
  model_id text not null,
  task_id text not null,
  amount_usd numeric(12,6) not null check (amount_usd >= 0),
  cost_kind text not null check (cost_kind in ('estimated','actual')),
  provider_request_id text,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, provider_id, task_id)
);

-- Pairing codes contain credential material and deliberately have no client RLS
-- policies or grants. Only the authenticated Edge Function's service role uses it.
create table if not exists public.device_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null check (char_length(device_name) between 1 and 80),
  code_hash text not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists platform_records_user_updated_idx
  on public.platform_records (user_id, updated_at desc);
create index if not exists user_devices_user_status_idx
  on public.user_devices (user_id, status, last_seen_at desc);
create index if not exists remote_sessions_user_status_idx
  on public.remote_sessions (user_id, status, expires_at);
create index if not exists project_agent_runs_user_updated_idx
  on public.project_agent_runs (user_id, updated_at desc);
create index if not exists document_preflight_user_document_idx
  on public.document_preflight_reports (user_id, document_id, created_at desc);
create index if not exists ai_cost_events_user_created_idx
  on public.ai_cost_events (user_id, created_at desc);
create index if not exists device_pairing_codes_expiry_idx
  on public.device_pairing_codes (expires_at) where consumed_at is null;

alter table public.platform_records enable row level security;
alter table public.user_devices enable row level security;
alter table public.remote_sessions enable row level security;
alter table public.project_agent_runs enable row level security;
alter table public.project_agent_steps enable row level security;
alter table public.document_preflight_reports enable row level security;
alter table public.provider_credentials_metadata enable row level security;
alter table public.user_ai_usage_modes enable row level security;
alter table public.user_ai_budgets enable row level security;
alter table public.ai_cost_events enable row level security;
alter table public.device_pairing_codes enable row level security;

revoke all on public.platform_records, public.user_devices, public.remote_sessions,
  public.project_agent_runs, public.project_agent_steps, public.document_preflight_reports,
  public.provider_credentials_metadata, public.user_ai_usage_modes, public.user_ai_budgets,
  public.ai_cost_events, public.device_pairing_codes from public, anon;
revoke all on public.device_pairing_codes from authenticated;

grant select, insert, update, delete on public.platform_records, public.user_devices,
  public.remote_sessions, public.project_agent_runs, public.project_agent_steps,
  public.document_preflight_reports, public.provider_credentials_metadata,
  public.user_ai_usage_modes, public.user_ai_budgets, public.ai_cost_events to authenticated;

create policy platform_records_owner on public.platform_records
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy user_devices_owner on public.user_devices
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy remote_sessions_owner on public.remote_sessions
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy project_agent_runs_owner on public.project_agent_runs
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy project_agent_steps_owner on public.project_agent_steps
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy document_preflight_reports_owner on public.document_preflight_reports
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy provider_credentials_metadata_owner on public.provider_credentials_metadata
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy user_ai_usage_modes_owner on public.user_ai_usage_modes
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy user_ai_budgets_owner on public.user_ai_budgets
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy ai_cost_events_owner on public.ai_cost_events
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Extend the existing atomic, expected-revision writer with the Finale state table.
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
  if current_user_id is null then raise exception 'Authentication is required.'; end if;
  if p_table not in (
    'chats','media_jobs','media_assets','media_projects','memory_items',
    'artifacts','artifact_exports','artifact_assets','platform_records'
  ) then raise exception 'Unsupported revisioned table.'; end if;
  if p_id is null or btrim(p_id) = '' or p_device_id is null or btrim(p_device_id) = '' then
    raise exception 'Record and device identifiers are required.';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then raise exception 'Payload must be a JSON object.'; end if;
  if p_revision < 1 or (p_expected_revision is not null and p_revision <= p_expected_revision) then
    raise exception 'The new revision must advance the expected revision.';
  end if;
  return query execute format(
    $statement$
      with attempted as (
        insert into public.%1$I as target
          (user_id,id,payload,revision,device_id,updated_at,deleted_at)
        values ($1,$2,$3,$4,$5,$6,$7)
        on conflict (user_id,id) do update set
          payload=excluded.payload, revision=excluded.revision, device_id=excluded.device_id,
          updated_at=excluded.updated_at, deleted_at=excluded.deleted_at
        where target.revision=$8
        returning true, target.id, target.payload, target.revision,
          target.device_id, target.updated_at, target.deleted_at
      )
      select * from attempted
      union all
      select false,current.id,current.payload,current.revision,current.device_id,
        current.updated_at,current.deleted_at
      from public.%1$I current
      where current.user_id=$1 and current.id=$2
        and not exists (select 1 from attempted)
      limit 1
    $statement$, p_table
  ) using current_user_id,p_id,p_payload,p_revision,p_device_id,p_updated_at,p_deleted_at,p_expected_revision;
end;
$$;

revoke all on function public.limitless_write_revisioned(
  text,text,bigint,jsonb,bigint,text,timestamptz,timestamptz
) from public, anon;
grant execute on function public.limitless_write_revisioned(
  text,text,bigint,jsonb,bigint,text,timestamptz,timestamptz
) to authenticated;

notify pgrst, 'reload schema';
