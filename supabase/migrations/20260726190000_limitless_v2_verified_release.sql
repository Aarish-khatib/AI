-- Limitless AI v2 verified-release hardening.
-- Additive only: improves relationship indexes and explicit Data API privileges.

create index if not exists remote_sessions_user_device_idx
  on public.remote_sessions (user_id, device_id);
create index if not exists project_agent_steps_user_run_idx
  on public.project_agent_steps (user_id, run_id);
create index if not exists device_pairing_codes_user_expiry_idx
  on public.device_pairing_codes (user_id, expires_at desc)
  where consumed_at is null;

-- New Supabase projects no longer expose public-schema tables to the Data API
-- automatically. Keep access intentional and RLS-backed on every client table.
revoke all on public.platform_records, public.user_devices, public.remote_sessions,
  public.project_agent_runs, public.project_agent_steps, public.document_preflight_reports,
  public.provider_credentials_metadata, public.user_ai_usage_modes, public.user_ai_budgets,
  public.ai_cost_events, public.device_pairing_codes from public, anon;
revoke all on public.device_pairing_codes from authenticated;

grant select, insert, update, delete on public.platform_records, public.user_devices,
  public.remote_sessions, public.project_agent_runs, public.project_agent_steps,
  public.document_preflight_reports, public.provider_credentials_metadata,
  public.user_ai_usage_modes, public.user_ai_budgets, public.ai_cost_events to authenticated;

notify pgrst, 'reload schema';
