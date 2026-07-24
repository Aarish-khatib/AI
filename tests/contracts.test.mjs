import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

test("v5 adds stores without replacing the v4 legacy migration marker", async () => {
  const source = await read("lib/local-store.ts");
  assert.match(source, /const DB_VERSION = 5/);
  for (const store of ["assets", "projects", "versions", "memory"]) {
    assert.match(source, new RegExp(`createObjectStore\\("${store}"`));
  }
  assert.match(source, /legacy-migration-v4/);
  assert.match(source, /version:\s*5/);
});

test("never-spend remains default and provider routes are declarative", async () => {
  const studio = await read("components/Studio.tsx");
  const registry = await read("lib/provider-registry.ts");
  assert.match(studio, /useState\(true\)/);
  assert.match(studio, /buildCreativeRoutes/);
  for (const provider of ["openrouter", "pollinations", "ai-horde", "local"]) {
    assert.match(registry, new RegExp(`id:\\s*"${provider}"`));
  }
});

test("cloud migration grants only authenticated app users and scopes storage paths", async () => {
  const migration = await read(
    "supabase/migrations/20260724071429_limitless_v5_foundation.sql",
  );
  assert.match(migration, /from public, anon/);
  assert.match(migration, /to authenticated/);
  assert.match(migration, /create table if not exists public\.project_versions/);
  assert.match(migration, /storage\.foldername\(name\)/);
  assert.match(migration, /revoke all on function private\.handle_new_limitless_user/);
});

test("sync compares revisions before timestamps and preserves version history", async () => {
  const source = await read("lib/cloud-sync.ts");
  assert.match(source, /local\.revision > remote\.revision/);
  assert.match(
    source,
    /local\.revision === remote\.revision[\s\S]*local\.updatedAt > Date\.parse/,
  );
  assert.match(source, /resolvedChatConflicts/);
  assert.match(source, /from\("project_versions"\)/);
  assert.match(source, /\.range\(start, start \+ pageSize - 1\)/);
});

test("source package contains no privileged Supabase service key variable", async () => {
  const [environment, cloud] = await Promise.all([
    read(".env.example"),
    read("lib/cloud-sync.ts"),
  ]);
  assert.doesNotMatch(`${environment}\n${cloud}`, /SUPABASE_SERVICE_ROLE_KEY\s*=/);
});
