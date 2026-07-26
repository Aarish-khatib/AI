import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const migrationDirectory = resolve(root, "supabase/migrations");
const migrationNames = readdirSync(migrationDirectory)
  .filter((name) => name.endsWith(".sql"))
  .sort();
assert.ok(migrationNames.length >= 6, "The complete additive migration chain is required.");
const migrations = migrationNames.map((name) => ({
  name,
  sql: readFileSync(resolve(migrationDirectory, name), "utf8"),
}));
const combined = migrations.map(({ sql }) => sql).join("\n");
const tables = [...combined.matchAll(/create table if not exists public\.([a-z0-9_]+)/gi)]
  .map((match) => match[1]);
assert.ok(tables.length >= 20, "Expected the complete public table set.");

for (const table of new Set(tables)) {
  assert.match(
    combined,
    new RegExp(`alter table public\\.${table} enable row level security`, "i"),
    `${table} must enable RLS`,
  );
}

const clientTables = [
  "profiles",
  "chats",
  "media_jobs",
  "user_preferences",
  "media_assets",
  "media_projects",
  "memory_items",
  "project_versions",
  "artifacts",
  "artifact_versions",
  "artifact_exports",
  "artifact_assets",
  "platform_records",
  "user_devices",
  "remote_sessions",
  "project_agent_runs",
  "project_agent_steps",
  "document_preflight_reports",
  "provider_credentials_metadata",
  "user_ai_usage_modes",
  "user_ai_budgets",
  "ai_cost_events",
];
for (const table of clientTables) {
  assert.match(combined, new RegExp(`(?:grant[\\s\\S]{0,500}|grant[^;]+)\\b${table}\\b`, "i"), `${table} needs an explicit authenticated grant`);
  assert.match(combined, new RegExp(`create policy[\\s\\S]{0,240}on public\\.${table}\\b`, "i"), `${table} needs an RLS policy`);
}

assert.match(combined, /revoke all on public\.device_pairing_codes from authenticated/i);
assert.doesNotMatch(
  combined,
  /grant\s+[^;]*\bon\s+(?:table\s+)?public\.device_pairing_codes\s+to\s+authenticated/i,
  "Pairing codes must never be granted to browser clients.",
);
assert.ok((combined.match(/\(select auth\.uid\(\)\)/gi) || []).length >= 35, "RLS policies should use the optimized auth.uid() form.");
assert.match(combined, /create index if not exists remote_sessions_user_device_idx/i);
assert.match(combined, /create index if not exists project_agent_steps_user_run_idx/i);
assert.match(combined, /create schema if not exists private/i);
assert.match(combined, /revoke all on function private\.handle_new_limitless_user\(\) from public, anon, authenticated/i);
assert.doesNotMatch(
  migrations.at(-1).sql,
  /security definer/i,
  "The final hardening migration must not add a privileged function.",
);

const functionSource = readFileSync(
  resolve(root, "supabase/functions/device-pairing/index.ts"),
  "utf8",
);
assert.match(functionSource, /auth\.getUser\(\)/);
assert.match(functionSource, /\.is\("consumed_at", null\)/);
assert.match(functionSource, /\.eq\("attempts", record\.attempts\)/);
assert.doesNotMatch(functionSource, /console\.(?:log|info|debug)\(/);
const config = readFileSync(resolve(root, "supabase/config.toml"), "utf8");
assert.match(config, /\[functions\.device-pairing\][\s\S]*verify_jwt\s*=\s*true/);

console.log(JSON.stringify({
  migrations: migrationNames,
  publicTables: [...new Set(tables)].length,
  rlsValidated: true,
  explicitPrivilegesValidated: true,
  pairingBoundaryValidated: true,
}, null, 2));
