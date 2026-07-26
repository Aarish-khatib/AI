# Repository index

## Entry points

- `app/page.tsx`: client application orchestration, auth workspace switching,
  chat routing, cloud sync, Studio, Agent, settings, and recovery.
- `app/layout.tsx`, `app/globals.css`: application shell, metadata, CSP-facing
  layout, monochrome design system, and responsive behavior.
- `components/ChatWorkspace.tsx`: streaming conversation UI.
- `components/Studio.tsx`: generation routing and durable media jobs.
- `components/ImageEditor.tsx`, `components/VideoEditor.tsx`: v5 editable media
  projects.
- `components/artifacts/ArtifactWorkspace.tsx`: artifact lifecycle, autosave,
  versions, import/export, recovery, and AI handoff.
- `components/artifacts/ArtifactEditors.tsx`: presentation, document,
  spreadsheet, PDF, and canvas editors.
- `components/UtilityViews.tsx`: Library, Models, Agent, and Settings views.

## Data and security

- `lib/types.ts`: durable application records.
- `lib/artifacts/types.ts`, `lib/artifacts/model.ts`: typed artifact content,
  lifecycle factories, chat conversion, and bounded spreadsheet formulas.
- `lib/artifacts/importers.ts`, `lib/artifacts/exporters.ts`: bounded Office
  imports, compatibility reports, and real portable file output.
- `lib/local-store.ts`: scoped IndexedDB, v4 migration, vault, backups, media,
  projects, versions, memory, artifacts, exports, assets, tombstones, and
  recovery.
- `lib/workspace-scope.mjs`: anonymous/account database names and safe import
  policy.
- `lib/integrity.mjs`: canonical SHA-256 backup integrity.
- `lib/revision-protocol.mjs`: revision-only conflict decisions.
- `lib/cloud-sync.ts`: Supabase auth, storage, pagination, hydration, and atomic
  revision sync.
- `supabase/migrations/`: additive schema, RLS, storage, and atomic-write SQL.
- `lib/release-state.mjs`: fail-closed feature readiness and diagnostic
  redaction.

## AI and providers

- `lib/openrouter.ts`: model discovery, capability checks, strict visual price
  verification, streaming, Quality Boost, image/video APIs, and prompt planning.
- `lib/key-pool.ts`, `lib/key-pool-policy.mjs`: three-slot encrypted key routing.
- `lib/provider-registry.ts`: provider-neutral creative route declarations.
- `lib/ai-horde.ts`, `lib/pollinations.ts`, `lib/local-motion.ts`: community,
  budgeted hosted, and private browser routes.
- `lib/media-library.ts`: durable offline media materialization.

## Local companion

- `companion/server.mjs`: localhost tool server, pairing, sessions, approval
  enforcement, and workspace tools.
- `companion/security.mjs`: path/origin/secret/approval/environment boundaries.
- `companion/security.test.mjs`: companion boundary tests.

## Tests and builds

- `tests/contracts.test.mjs`: provider, storage, sync, stream, release, and
  workspace contracts.
- `tests/artifacts.test.ts`: account-isolated lifecycle, backup integrity,
  real-file export/import, and formula-safety tests.
- `tests/rendered-html.test.mjs`: independent Worker-render smoke check.
- `scripts/sites-env.sh`: isolated writable tool environment.
- `scripts/build-verified.sh`, `scripts/validate-artifact.sh`: Worker build and
  artifact validation.
- `next.config.ts`, `vite.config.ts`, `wrangler.jsonc`, `vercel.json`:
  Vercel/Worker deployment targets.

## High-risk and protected files

- `lib/local-store.ts`, `lib/cloud-sync.ts`, all SQL migrations, vault/key-pool
  code, `companion/security.mjs`, and `companion/server.mjs`.
- Existing migration filenames and legacy storage keys must not be renamed or
  deleted.
- No provider secret, service-role key, `.env` file, dependency directory,
  build cache, or hosting metadata belongs in a release/checkpoint archive.

## Major dependency boundaries

- Browser UI never receives a Supabase service-role key.
- Supabase publishable access is limited by grants and per-user RLS.
- Artifact cloud rows are owner-scoped; artifact versions are immutable;
  exports and assets keep offline copies and use short-lived signed URLs.
- Office ZIP imports enforce CRC, path, file-count, per-file, total-size, and
  XML-size boundaries before editable conversion.
- Provider keys remain in the active workspace’s local encrypted vault.
- Pollinations accepts only a client-safe `pk_` value plus a finite public run
  budget and still requires per-run consent.
- Companion access is loopback-only, exact-origin bound, expiring, and
  separately approved for sensitive actions.
