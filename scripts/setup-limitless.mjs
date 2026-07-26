import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const major = Number(process.versions.node.split(".")[0]);
if (major < 22) {
  console.error("Limitless AI v2 requires Node.js 22.13 or newer.");
  process.exit(1);
}
if (!existsSync("package-lock.json") || !existsSync("supabase/migrations")) {
  console.error("Run this command from the extracted repository root.");
  process.exit(1);
}
if (process.argv.includes("--install")) {
  const result = spawnSync("npm", ["run", "install:ci"], { stdio: "inherit", shell: false });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`
Limitless AI v2 setup check passed.

Required only for cloud accounts and sync:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Optional budgeted hosted video:
  NEXT_PUBLIC_POLLINATIONS_PUBLISHABLE_KEY
  NEXT_PUBLIC_POLLINATIONS_RUN_BUDGET

Provider API keys are entered in the encrypted in-app Provider Hub. Never put
private provider keys or a Supabase service-role key in browser variables.

Apply supabase/migrations in filename order, deploy device-pairing only after
setting LIMITLESS_APP_ORIGIN, then run:
  npm run release:validate

See docs/LIMITLESS_V2_MINIMAL_OWNER_ACTIONS.md for the exact external steps.
`);
