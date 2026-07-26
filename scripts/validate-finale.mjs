import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
const required = [
  "docs/LIMITLESS_V2_SESSION_5_FINALE_REPORT.md",
  "docs/LIMITLESS_V2_SETUP.md",
  "docs/LIMITLESS_V2_ENVIRONMENT_VARIABLES.md",
  "docs/LIMITLESS_V2_SECURITY.md",
  "docs/LIMITLESS_V2_REMOTE_DESKTOP_THREAT_MODEL.md",
  "docs/LIMITLESS_V2_MIGRATION.md",
  "docs/LIMITLESS_V2_ROLLBACK.md",
  "docs/LIMITLESS_V2_TEST_REPORT.md",
  "docs/LIMITLESS_V2_KNOWN_LIMITATIONS.md",
  "docs/LIMITLESS_V2_FILE_CHANGES.md",
  "docs/LIMITLESS_V2_MINIMAL_OWNER_ACTIONS.md",
  "docs/LIMITLESS_DOCUMENT_PDF_ARCHITECTURE.md",
  "docs/LIMITLESS_DOCUMENT_IMPORT_COMPATIBILITY.md",
  "docs/LIMITLESS_PROVIDER_HUB.md",
  "docs/LIMITLESS_FREE_AND_PAID_MODES.md",
  "docs/LIMITLESS_PROVIDER_SECURITY.md",
  "docs/LIMITLESS_PROVIDER_BENCHMARKS.md",
  "docs/LIMITLESS_BUILDER_AGENT_ARCHITECTURE.md",
  "docs/limitless-v2/FEATURE_MATRIX.yaml",
  "docs/limitless-v2/RELEASE_GATES.md",
  "desktop/src-tauri/tauri.conf.json",
  "mobile/capacitor.config.ts",
  "mobile/package-lock.json",
  "supabase/config.toml",
  "supabase/functions/device-pairing/index.ts",
  "supabase/migrations/20260726190000_limitless_v2_verified_release.sql",
];
for (const path of required) assert.ok(existsSync(resolve(root, path)), `Missing ${path}`);

const migration = read("supabase/migrations/20260726143000_limitless_v2_finale.sql");
assert.match(migration, /alter table public\.platform_records enable row level security/i);
assert.ok((migration.match(/enable row level security/gi) || []).length >= 10);
assert.ok((migration.match(/\(select auth\.uid\(\)\) = user_id/gi) || []).length >= 10);
assert.match(migration, /security invoker/i);
assert.doesNotMatch(migration, /security definer/i);
assert.match(migration, /revoke all on public\.device_pairing_codes from authenticated/i);

const policy = read("lib/finale/policy.mjs");
assert.match(policy, /Free mode rejects paid and unknown-cost routes/);
assert.match(policy, /Paid mode never falls back to free or unknown-cost routes/);
assert.match(policy, /connect-src 'none'/);
assert.match(policy, /Secure device pairing requires Web Crypto/);

const release = read("lib/release-state.mjs");
assert.match(release, /appBuilder: \{ ready: true/);
assert.match(release, /providerMarketplace: \{ ready: true/);
assert.match(release, /remoteDesktop: \{ ready: false/);

const env = read(".env.example");
assert.doesNotMatch(env, /^SUPABASE_SERVICE_ROLE_KEY=/m);
assert.doesNotMatch(env, /^OPENAI_API_KEY=/m);

const tauri = JSON.parse(read("desktop/src-tauri/tauri.conf.json"));
assert.equal(tauri.identifier, "com.limitless.ai.desktop");
assert.equal(tauri.app.security.freezePrototype, true);
assert.match(tauri.app.security.csp, /object-src 'none'/);
assert.equal(tauri.plugins.updater.active, false);
assert.doesNotMatch(JSON.stringify(tauri), /example\.invalid/i);

const chat = read("app/page.tsx");
assert.match(chat, /executeProviderWithPolicy/);
assert.match(chat, /finaleState\.usageMode\.limitlessFree/);
assert.match(chat, /confirmedPaidCost/);

const providerRuntime = read("lib/finale/provider-runtime.ts");
assert.match(providerRuntime, /circuit_open/);
assert.match(providerRuntime, /confirmation_required/);
assert.match(providerRuntime, /activeRequests/);

console.log("Finale contract validation passed.");
