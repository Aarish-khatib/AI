import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canonicalStringify,
  createIntegrity,
  sha256Hex,
  verifyIntegrity,
} from "../lib/integrity.mjs";
import {
  availableKeySlots,
  createTaskDeduplicator,
  parseRetryAfter,
} from "../lib/key-pool-policy.mjs";
import {
  decideRevisionMerge,
  remoteWriteResult,
} from "../lib/revision-protocol.mjs";
import {
  redactDiagnostics,
  releaseFeatureSnapshot,
  resolveReleaseFeature,
} from "../lib/release-state.mjs";
import {
  branchMessages,
  createSseDecoder,
  createTextBatcher,
  normalizeStreamEvent,
} from "../lib/streaming.mjs";
import {
  copySafeWorkspaceData,
  databaseNameForWorkspace,
  settingMayCrossWorkspace,
  workspaceScopeForUser,
} from "../lib/workspace-scope.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("OpenRouter image and video requests use current multimodal field shapes", async () => {
  const source = await read("lib/openrouter.ts");
  assert.match(source, /image_url:\s*\{\s*url:\s*imageUrl\s*\}/);
  assert.match(source, /frame_type:\s*"first_frame"/);
  assert.match(source, /generate_audio:\s*request\.audio/);
  assert.match(source, /\/content\?index=0/);
  assert.doesNotMatch(source, /\n\s+audio:\s*request\.audio/);
});

test("chat catalogue rejects models that do not declare text output", async () => {
  const source = await read("lib/openrouter.ts");
  assert.match(source, /export const modelHasTextOutput/);
  assert.match(source, /declared\.includes\("text"\)/);
  assert.match(source, /lyria\|imagen\|veo/);
  assert.match(source, /modelIsFree\(model\) && modelHasTextOutput\(model\)/);
});

test("v2 artifact stores extend rather than replace the legacy migration contract", async () => {
  const source = await read("lib/local-store.ts");
  assert.match(source, /const DB_VERSION = 7/);
  for (const store of [
    "assets",
    "projects",
    "versions",
    "memory",
    "artifacts",
    "artifactVersions",
    "artifactExports",
    "artifactAssets",
  ]) {
    assert.match(source, new RegExp(`createObjectStore\\("${store}"`));
  }
  assert.match(source, /legacy-migration-v4/);
  assert.match(source, /version:\s*10/);
  assert.match(source, /\[4,\s*5,\s*6,\s*7,\s*10\]/);
});

test("artifact migration is additive, owner-scoped, and fully RLS protected", async () => {
  const migration = await read(
    "supabase/migrations/20260726075627_limitless_v2_artifact_workspace.sql",
  );
  for (const table of [
    "artifacts",
    "artifact_versions",
    "artifact_exports",
    "artifact_assets",
  ]) {
    assert.match(
      migration,
      new RegExp(`create table if not exists public\\.${table}`),
    );
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security`),
    );
  }
  assert.match(
    migration,
    /revoke all on table[\s\S]*public\.artifacts,[\s\S]*public\.artifact_versions,[\s\S]*public\.artifact_exports,[\s\S]*public\.artifact_assets[\s\S]*from public, anon/,
  );
  assert.match(
    migration,
    /grant select, insert, update, delete on table[\s\S]*public\.artifacts,[\s\S]*public\.artifact_exports,[\s\S]*public\.artifact_assets[\s\S]*to authenticated/,
  );
  assert.match(
    migration,
    /grant select, insert on table public\.artifact_versions to authenticated/,
  );
  assert.match(migration, /\(select auth\.uid\(\)\) = user_id/g);
  assert.match(migration, /security invoker/i);
  assert.doesNotMatch(migration, /security definer/i);
  assert.match(migration, /'artifacts',[\s\S]*'artifact_exports',[\s\S]*'artifact_assets'/);
  assert.doesNotMatch(
    migration.slice(migration.indexOf("if p_table not in"), migration.indexOf(") then")),
    /artifact_versions/,
  );
});

test("never-spend is the default and visual prices fail closed", async () => {
  const [studio, registry, router] = await Promise.all([
    read("components/Studio.tsx"),
    read("lib/provider-registry.ts"),
    read("lib/openrouter.ts"),
  ]);
  assert.match(studio, /useState\(true\)/);
  assert.match(studio, /verifyFreeGenerationModel/);
  assert.match(registry, /generationModelCostClass/);
  assert.match(router, /if \(!verified\.length\) return "unknown"/);
  assert.doesNotMatch(
    router.slice(
      router.indexOf("export function generationModelCostClass"),
      router.indexOf("export async function verifyFreeGenerationModel"),
    ),
    /endsWith\(":free"\)/,
  );
});

test("cloud foundation grants only authenticated app users", async () => {
  const migration = await read(
    "supabase/migrations/20260724071429_limitless_v5_foundation.sql",
  );
  assert.match(migration, /from public, anon/);
  assert.match(migration, /to authenticated/);
  assert.match(migration, /create table if not exists public\.project_versions/);
  assert.match(migration, /storage\.foldername\(name\)/);
  assert.match(migration, /revoke all on function private\.handle_new_limitless_user/);
});

test("atomic sync migration is invoker-secure and compare-and-swap guarded", async () => {
  const migration = await read(
    "supabase/migrations/20260726010000_limitless_v2_atomic_sync.sql",
  );
  assert.match(migration, /security invoker/i);
  assert.match(migration, /target\.revision = \$8/);
  assert.match(migration, /current\.user_id = \$1/);
  assert.match(migration, /revoke all on function[\s\S]*from public, anon/i);
  assert.match(migration, /grant execute on function[\s\S]*to authenticated/i);
  assert.doesNotMatch(migration, /security definer/i);
});

test("sync uses atomic RPC writes and never lets timestamps beat revisions", async () => {
  const source = await read("lib/cloud-sync.ts");
  assert.match(source, /\.rpc\("limitless_write_revisioned"/);
  assert.match(source, /local\.revision > remote\.revision/);
  assert.match(source, /local\.revision === remote\.revision/);
  assert.match(source, /\.range\(start, start \+ pageSize - 1\)/);
  assert.doesNotMatch(source, /\.upsert\(/);
  assert.doesNotMatch(source, /local\.updatedAt > Date\.parse/);
});

test("source configuration contains no privileged service key value", async () => {
  const [environment, cloud] = await Promise.all([
    read(".env.example"),
    read("lib/cloud-sync.ts"),
  ]);
  assert.doesNotMatch(`${environment}\n${cloud}`, /SUPABASE_SERVICE_ROLE_KEY\s*=/);
});

test("SHA-256 implementation matches the standard empty-string vector", () => {
  assert.equal(
    sha256Hex(""),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
});

test("canonical JSON is stable across object insertion order", () => {
  assert.equal(
    canonicalStringify({ z: 1, nested: { b: 2, a: 3 } }),
    canonicalStringify({ nested: { a: 3, b: 2 }, z: 1 }),
  );
});

test("backup integrity round-trips and rejects a changed payload", () => {
  const payload = { format: "limitless-ai-backup", version: 6, chats: [{ id: "1" }] };
  const integrity = createIntegrity(payload);
  assert.equal(verifyIntegrity(payload, integrity), true);
  assert.equal(
    verifyIntegrity({ ...payload, chats: [{ id: "2" }] }, integrity),
    false,
  );
});

test("SSE decoder survives split chunks and emits complete text deltas", () => {
  const events = [];
  const decoder = createSseDecoder((event) => events.push(event));
  decoder.push('data: {"choices":[{"delta":{"cont');
  decoder.push('ent":"Hello"}}]}\n\ndata: [DONE]\n\n');
  decoder.finish();
  assert.deepEqual(events, [{ text: "Hello", done: false }, { done: true }]);
});

test("SSE decoder accepts multi-line data records", () => {
  const events = [];
  const decoder = createSseDecoder((event) => events.push(event));
  decoder.push(
    'data: {"choices":[\ndata: {"delta":{"content":"A"}}]}\n\n',
  );
  decoder.finish();
  assert.equal(events[0].text, "A");
});

test("stream event normalization handles array deltas and provider errors", () => {
  assert.deepEqual(
    normalizeStreamEvent({
      choices: [{ delta: { content: [{ text: "A" }, { text: "B" }] } }],
    }),
    { text: "AB", done: false },
  );
  assert.deepEqual(normalizeStreamEvent({ error: { message: "busy" } }), {
    text: "",
    error: "busy",
  });
});

test("text batching collapses rapid complete snapshots into one render", () => {
  let scheduled;
  const flushed = [];
  const batcher = createTextBatcher((value) => flushed.push(value), {
    schedule: (callback) => {
      scheduled = callback;
      return 1;
    },
    cancel: () => undefined,
  });
  batcher.push("A");
  batcher.push("AB");
  batcher.push("ABC");
  scheduled();
  assert.deepEqual(flushed, ["ABC"]);
});

test("conversation branching retains stable message identities through target", () => {
  const messages = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(branchMessages(messages, "b"), [messages[0], messages[1]]);
  assert.deepEqual(branchMessages(messages, "b", { includeTarget: false }), [
    messages[0],
  ]);
});

test("workspace database names isolate anonymous and authenticated accounts", () => {
  assert.equal(workspaceScopeForUser(), "anonymous");
  assert.equal(workspaceScopeForUser("USER-A"), "user:user-a");
  assert.equal(databaseNameForWorkspace("anonymous"), "limitless-ai");
  assert.notEqual(
    databaseNameForWorkspace(workspaceScopeForUser("user-a")),
    databaseNameForWorkspace(workspaceScopeForUser("user-b")),
  );
});

test("cross-workspace import strips device, key, session, and budget state", () => {
  const copied = copySafeWorkspaceData({
    chats: [{ id: "same-id", title: "safe" }],
    media: [],
    assets: [],
    projects: [],
    versions: [],
    memory: [],
    settings: {
      theme: "mono",
      "device-id": "private",
      "openrouter-api-key": "private",
      "pollinations-runs-used": 2,
      sessionToken: "private",
    },
  });
  assert.deepEqual(copied.chats, [{ id: "same-id", title: "safe" }]);
  assert.deepEqual(copied.settings, { theme: "mono" });
  assert.equal(settingMayCrossWorkspace("quality-boost"), true);
  assert.equal(settingMayCrossWorkspace("last-cloud-sync"), false);
});

test("revision merge ignores clock order and preserves equal-revision branches", () => {
  const local = { revision: 4, updatedAt: 9_999 };
  assert.equal(
    decideRevisionMerge(local, { revision: 3, updatedAt: 99_999 }),
    "keep-local",
  );
  assert.equal(
    decideRevisionMerge(local, { revision: 5, updatedAt: 1 }),
    "replace-and-recover-local",
  );
  assert.equal(
    decideRevisionMerge(local, { revision: 4, updatedAt: 1 }),
    "preserve-branch",
  );
});

test("remote write result preserves concurrent equal-revision payloads", () => {
  const local = { revision: 8 };
  assert.equal(remoteWriteResult(local, undefined, true), "uploaded");
  assert.equal(
    remoteWriteResult(local, { revision: 9, payload: {} }, false),
    "download-remote",
  );
  assert.equal(
    remoteWriteResult(local, { revision: 8, payload: { side: "remote" } }, false),
    "preserve-local-conflict",
  );
});

test("key routing honors priority, disable state, and Retry-After cooldown", () => {
  const now = 10_000;
  const available = availableKeySlots(
    [
      { id: "backup", priority: 2, enabled: true, configured: true },
      { id: "cooldown", priority: 1, enabled: true, configured: true, cooldownUntil: now + 1 },
      { id: "primary", priority: 1, enabled: true, configured: true },
      { id: "off", priority: 0, enabled: false, configured: true },
    ],
    now,
  );
  assert.deepEqual(available.map((slot) => slot.id), ["primary", "backup"]);
  assert.equal(parseRetryAfter("12", now), 12_000);
  assert.equal(parseRetryAfter(new Date(now + 5_000).toUTCString(), now), 5_000);
});

test("task deduplicator prevents replay while a task is active", () => {
  const tasks = createTaskDeduplicator();
  assert.equal(tasks.begin("job-1"), true);
  assert.equal(tasks.begin("job-1"), false);
  assert.equal(tasks.has("job-1"), true);
  tasks.finish("job-1");
  assert.equal(tasks.begin("job-1"), true);
});

test("unready release features fail closed even when explicitly requested", () => {
  assert.equal(resolveReleaseFeature("remoteDesktop", "true"), false);
  assert.equal(resolveReleaseFeature("coreChat"), true);
  assert.equal(resolveReleaseFeature("coreChat", "false"), false);
  const snapshot = releaseFeatureSnapshot();
  assert.equal(snapshot.remoteDesktop, false);
  assert.equal(snapshot.coreChat, true);
  assert.equal(snapshot.officeArtifacts, true);
});

test("diagnostics recursively redact secrets and provider credentials", () => {
  const redacted = redactDiagnostics({
    apiKey: "synthetic-openrouter-value",
    nested: { token: "abc", safe: true },
    accidental: "Bearer hidden-value",
  });
  assert.equal(redacted.apiKey, "[redacted]");
  assert.equal(redacted.nested.token, "[redacted]");
  assert.equal(redacted.nested.safe, true);
  assert.equal(redacted.accidental, "[redacted]");
});

test("production builds no longer create or publish a source archive", async () => {
  const [manifest, settings] = await Promise.all([
    read("package.json"),
    read("components/UtilityViews.tsx"),
  ]);
  assert.doesNotMatch(manifest, /create-website-archive/);
  assert.doesNotMatch(settings, /Limitless-AI-Website\.zip/);
  await assert.rejects(read("scripts/create-website-archive.mjs"), /ENOENT/);
});

test("Pollinations is budgeted, consented, and excluded from automatic resume", async () => {
  const [page, studio, environment] = await Promise.all([
    read("app/page.tsx"),
    read("components/Studio.tsx"),
    read(".env.example"),
  ]);
  assert.match(studio, /window\.confirm/);
  assert.match(studio, /pollinationsRunBudget/);
  assert.match(environment, /NEXT_PUBLIC_POLLINATIONS_RUN_BUDGET=0/);
  const resumeFilter = page.slice(
    page.indexOf("jobs\n      .filter"),
    page.indexOf(".forEach((job)"),
  );
  assert.doesNotMatch(resumeFilter, /pollinations/);
});

test("three encrypted key slots are isolated from exports", async () => {
  const [pool, scope, localStore] = await Promise.all([
    read("lib/key-pool-policy.mjs"),
    read("lib/workspace-scope.mjs"),
    read("lib/local-store.ts"),
  ]);
  assert.match(pool, /\["primary", "backup-1", "backup-2"\]/);
  assert.match(scope, /key-pool-metadata/);
  assert.match(localStore, /settingMayCrossWorkspace/);
  assert.match(localStore, /Encrypted API keys and device-vault data are intentionally excluded/);
});

test("chat UI exposes saved Stop, Continue, Branch, and bounded history controls", async () => {
  const [page, workspace] = await Promise.all([
    read("app/page.tsx"),
    read("components/ChatWorkspace.tsx"),
  ]);
  assert.match(page, /createTextBatcher/);
  assert.match(page, /status:\s*stopped \? "stopped" : "failed"/);
  assert.match(workspace, /onContinue/);
  assert.match(workspace, /onBranch/);
  assert.match(workspace, /visibleLimit/);
  assert.match(workspace, /Jump to latest/);
});

test("Studio and Agent consume the bounded provider key pool", async () => {
  const [page, studio] = await Promise.all([
    read("app/page.tsx"),
    read("components/Studio.tsx"),
  ]);
  assert.match(studio, /openRouterKeys\.slice\(0,\s*3\)/);
  assert.match(studio, /onProviderKeyResult/);
  assert.match(studio, /\[401,\s*403,\s*429\]\.includes/);
  assert.match(page, /readyKeySlots\(keyPool\)\.slice\(0,\s*3\)/);
});

test("authentication changes are serialized before workspace state refresh", async () => {
  const source = await read("app/page.tsx");
  assert.match(source, /let initialized = false/);
  assert.match(source, /let pendingAuth/);
  assert.match(source, /if \(!initialized\)[\s\S]*pendingAuth = identity/);
  assert.match(source, /activateWorkspace\(user\?\.id \|\| null/);
});
