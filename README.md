# Limitless AI v2

Limitless AI v2 is a local-first AI and media workspace for chat, image and
video generation, animation, layered image editing, timeline video editing,
durable projects, and an optional local coding companion.

This final portable release contains the completed v2 platform foundation,
Artifact Workspace, Build Studio, Intelligence Hub, professional Document & PDF
Studio, Universal Provider Hub, and native security foundations. It
strengthens streaming, account isolation, backups, cloud concurrency, provider
spending safety, multi-key routing, diagnostics, and the desktop companion,
then adds editable, versioned presentations, documents, spreadsheets, PDFs,
canvases, projects, and professional reports without removing the v5 creative
tools. External-only and fail-closed states are tracked honestly in
`docs/limitless-v2/FEATURE_MATRIX.yaml`.

## Included product features

- Streaming multimodal chat with interruption-safe partial responses
- Continue, retry, edit, regenerate, and branch controls with stable message IDs
- Smart scroll behavior and bounded rendering for long conversations
- Three encrypted OpenRouter key slots with priority, health, cooldown, and
  bounded failover
- Optional Quality Boost using a second healthy route
- Free-first image, edit, variation, upscale, background-removal, video, and
  animation routing
- A default **Never spend** lock that rejects paid and unknown-cost visual
  routes
- Dedicated OpenRouter image and asynchronous-video APIs
- AI Horde community image generation
- Optional budgeted Pollinations hosted video with explicit consent for every
  run
- An always-available browser motion-video fallback on supported browsers
- Layered image canvas with transforms, blend modes, filters, text, shapes,
  masks, canvas expansion, history, checkpoints, AI-fill handoff, and PNG export
- Video timeline with trimming, ordering, speed, volume, transitions, effects,
  captions, history, checkpoints, preview, and browser export
- Chat-linked artifact cards and prompt-to-artifact creation
- A private Artifact Workspace with search, type filters, autosave, undo/redo,
  named checkpoints, version restore, recoverable trash, duplication, and
  export history
- Editable presentation slides with themes, layouts, speaker notes, positioned
  text/shapes/images/tables/charts/diagrams, presenter view, PPTX, and PDF
  export
- Structured document blocks with headings, lists, tables, images, comments,
  headers/footers, page numbers, find/replace, DOCX, PDF, Markdown, and HTML
  export
- Multi-sheet spreadsheets with bounded formulas, formatting, dimensions,
  freeze panes, filters, sorting, charts, XLSX, CSV, and PDF export
- Structured canvas and PDF foundations with real PNG/PDF export
- Bounded, CRC-checked PPTX, DOCX, and XLSX import with an explicit
  compatibility report; CSV, PDF, Markdown, and sanitized HTML import
- Durable jobs, assets, projects, editor versions, and user-approved memory
- Durable artifacts, immutable artifact versions, offline export files, and
  artifact assets
- IndexedDB workspaces isolated per anonymous visitor or authenticated user
- Checksummed v10 backups with v4/v5/v6/v7 import compatibility and conflict
  recovery
- Optional Supabase authentication, private storage, RLS, and revision-checked
  cloud synchronization
- Origin-bound, expiring desktop-companion pairing and exact local approvals
- Typed Build Studio with secure preview, checkpoints, code import/export, and
  local coding-agent security foundations
- Cited Intelligence Hub with explicit memory, automation dry runs, privacy
  states, evaluations, and redacted diagnostics
- Professional Document & PDF Studio with 21 original templates and preflight
- Universal Provider Hub with strict Limitless Free and verified paid BYOK modes
- Tauri desktop and Capacitor mobile source with device pairing and CI workflows
- A monochrome responsive PWA, Vercel build, and Worker/Vinext build

No provider secret, Supabase service-role key, user vault, dependency folder,
build cache, or generated source archive is shipped by the application.

## Start locally

Requirements: Node.js 22.13 or newer.

```bash
npm run install:ci
npm run dev
```

Open the URL printed by the development server. The app works locally without
Supabase. AI Horde image generation and browser motion rendering do not require
an OpenRouter key. Chat and OpenRouter generation require each user to add
their own key in **Settings → OpenRouter key pool**.

`npm ci` is also supported. `npm run install:ci` is preferred in constrained
environments because it uses the repository's isolated npm cache.

## First deployment

Use the same GitHub repository, Vercel project, and public domain as the
existing app. Keeping the domain is important because a browser's old local
data is available only to that same origin.

### 1. Apply the Supabase migrations

Create or open the Supabase project, choose **SQL Editor → New query**, paste a
migration's complete contents, select **Run**, and wait for success before
running the next file.

For a new Supabase project, run all six files in filename order:

1. `supabase/migrations/202607230001_limitless_foundation.sql`
2. `supabase/migrations/20260724071429_limitless_v5_foundation.sql`
3. `supabase/migrations/20260726010000_limitless_v2_atomic_sync.sql`
4. `supabase/migrations/20260726075627_limitless_v2_artifact_workspace.sql`
5. `supabase/migrations/20260726143000_limitless_v2_finale.sql`
6. `supabase/migrations/20260726190000_limitless_v2_verified_release.sql`

For a project that already has the v5 migrations but no v2 migration, run:

```text
supabase/migrations/20260726010000_limitless_v2_atomic_sync.sql
supabase/migrations/20260726075627_limitless_v2_artifact_workspace.sql
supabase/migrations/20260726143000_limitless_v2_finale.sql
supabase/migrations/20260726190000_limitless_v2_verified_release.sql
```

For a database already upgraded with the Session 1 checkpoint, run only:

```text
supabase/migrations/20260726075627_limitless_v2_artifact_workspace.sql
supabase/migrations/20260726143000_limitless_v2_finale.sql
supabase/migrations/20260726190000_limitless_v2_verified_release.sql
```

If the Session 2 migration is already installed, apply the Finale migration and
then the verified-release hardening migration only.

The third migration installs the authenticated, allowlisted, revision-checked
write function used by v2. The fourth creates private artifacts, immutable
versions, exports, and artifact assets, adds owner-only RLS, and extends that
write allowlist. The fifth adds Finale records and pairing state. The sixth adds
relationship indexes and reasserts explicit RLS-backed Data API privileges.
Cloud sync deliberately fails closed until its migrations are installed. Every
migration is additive; none deletes existing records.

In **Authentication → URL Configuration**, set the production site URL and add
the production and local callback URLs to the redirect allowlist.

### 2. Copy the public Supabase values

In Supabase, open the project's API settings and copy:

- Project URL
- Publishable key

Do not use the service-role key.

### 3. Add Vercel environment variables

Open the existing Vercel project:

1. Choose **Settings → Environment Variables**.
2. Select **Add New**.
3. Add each variable name and value exactly.
4. Enable it for Production, Preview, and Development, or only the environments
   you intentionally use.
5. Save the variables.

Required for account sync:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

These values are public browser configuration. Their access is constrained by
the included RLS policies.

### 4. Optionally enable budgeted Pollinations video

This route is optional. Use only a client-safe Pollinations `pk_` publishable
App Key with a finite provider-side budget. Never expose a Pollinations `sk_`
key.

Add both variables in Vercel:

```dotenv
NEXT_PUBLIC_POLLINATIONS_PUBLISHABLE_KEY=pk_your_publishable_app_key
NEXT_PUBLIC_POLLINATIONS_RUN_BUDGET=10
```

The run budget must be an integer from 1 to 1000. `0` disables this browser
route. It is an application-side run ceiling, not a money guarantee; the
provider-side key budget remains essential. The app also requires explicit
confirmation before every Pollinations request, never replays an interrupted
budgeted request automatically, and never uses it while **Never spend** is on.

### 5. Deploy

1. Extract the release ZIP.
2. Copy the contents of its `limitless-ai-website` folder into the repository
   root. `package.json` must be at the root.
3. Commit and push the repository using your normal GitHub workflow.
4. In Vercel, redeploy the existing project after the environment variables
   have been saved.
5. Open the existing production domain in a browser that used the old version.
6. Confirm the local migration, sign in, choose **Sync now**, and export a
   backup.
7. Add one to three personal OpenRouter keys in Settings. Keys stay encrypted
   in the current account's local workspace and are excluded from sync and
   backups.

No deployment, repository push, production migration, or credential entry is
performed automatically by this checkpoint.

## Data safety

### Workspace isolation

Anonymous data and each authenticated account use separate IndexedDB databases.
The first sign-in may copy non-secret anonymous work once. It never copies API
keys, vault records, provider budgets, account state, or sessions. Signing out
switches back to the anonymous workspace.

### Upgrade behavior

The original v1 local records remain readable. Migration first creates a
checksummed recovery snapshot, copies readable records, encrypts the legacy
OpenRouter key, verifies decryption, and only then removes the old plaintext
key. Existing v4/v5 stores and migrations remain intact.

### Backups

V2 now exports format version 10 with a SHA-256 integrity record. Backups include
durable chats, jobs, assets and offline media, projects, editor versions,
memory, structured artifacts, immutable artifact versions, offline exports,
artifact assets, safe settings, revisions, and tombstones. They exclude
provider keys, vault material, sessions, account state, and quota state.

Imports verify integrity before writing. Higher revisions win while the
replaced local version remains recoverable; equal-revision divergence becomes
a recovered branch; lower revisions cannot win because of clock skew. V4, v5,
v4, v5, v6, and v7 backups remain importable.

### Cloud synchronization

Chats, jobs, assets, projects, memory, artifacts, artifact exports, artifact
assets, and the Finale workspace state use an expected-revision RPC under a
database row lock. A stale client
receives the authoritative record and keeps its divergent local work as a
recovered copy. Editor and artifact versions are append-only, all reads are
paginated, media/export/asset blobs remain available locally after sync, signed
download links are short-lived, and RLS restricts every row to its
authenticated owner.

## Provider and spending policy

- OpenRouter text models are filtered to models capable of text output.
- Visual pricing must be verified from current endpoint-specific metadata.
- A `:free` suffix alone is not accepted as proof that visual generation is
  free.
- Paid and unknown-cost visual models remain blocked under **Never spend**.
- Key failover is bounded to three slots and respects `Retry-After` cooldowns.
- A request that has already streamed output is not silently replayed.
- Pollinations is treated as budgeted, not free, and requires per-run approval.
- AI Horde is a volunteer public network; avoid private information in
  community prompts.

The browser fallback exports a real motion video, but it is not the same as
full scene-generative video. Hosted full-generative output depends on current
provider models, quotas, and availability.

## Desktop companion

Run:

```bash
sh companion/start-mac-linux.sh
```

On Windows, double-click `companion/start-windows.bat`.

Set the deployed application origin in `companion/app-url.txt` or through the
documented companion environment setting. Start the companion, enter its
one-time pairing code in the web app, and select an absolute project folder.

The companion:

- listens only on `127.0.0.1`;
- accepts only configured application origins;
- uses one-time pairing codes and expiring sessions;
- supports explicit unpairing;
- blocks secret files and workspace escapes;
- refuses symlink deletion;
- filters child-process environment variables;
- binds each approval to the exact command, workspace, targets, content, and
  request hashes; and
- still requires local approval for terminal or deletion actions.

Shell commands use the operating-system permissions of the person who launched
the companion. Review the complete local approval before entering its code.

## Validation

Run the complete repository gate:

```bash
npm test
npm run lint
npm run build:vercel
npm audit --omit=dev
```

Useful focused commands:

```bash
npm run typecheck
npm run test:contracts
npm run test:artifacts
npm run test:finale
npm run test:security
npm run build
npm run validate:artifact
```

`npm test` covers TypeScript, data/provider/UI contracts, migration and recovery
invariants, companion security, the Worker/Vinext production artifact, and
rendered HTML. `npm run build:vercel` separately validates the optimized Next.js
deployment.

## Project map

```text
app/                         Application shell and design system
components/                  Chat, Studio, editors, Library, settings, agent
components/artifacts/        Shared workspace and structured artifact editors
components/finale/           Build, Intelligence, Documents, Providers, Security
lib/artifacts/               Artifact contracts, models, importers, exporters
lib/finale/                  Finale contracts, policies, stores, adapters
lib/local-store.ts           Scoped IndexedDB, encryption, migration, recovery
lib/cloud-sync.ts            Auth, paginated sync, revision-checked cloud writes
lib/key-pool.ts              Encrypted three-slot provider key pool
lib/openrouter.ts            Discovery, routing, chat, image, and video APIs
lib/provider-registry.ts     Creative-provider capabilities and route policy
companion/                   Local agent server, UI, and security tests
desktop/                     Tauri 2 desktop source and OS-keychain integration
mobile/                      Capacitor mobile companion foundation
supabase/migrations/         Additive database, RLS, storage, and sync setup
tests/                       Behavioral, contract, artifact, and render tests
docs/                        Master specification, progress, decisions, resume state
```

## Final release scope

The portable source implementation is complete. Import compatibility reports
still identify advanced Office features that cannot be reconstructed; the app
does not claim pixel-perfect round trips for macros, animations, SmartArt,
pivot tables, external links, or arbitrary PDF source structure. Production
migrations/deployment, OAuth, provider credentials, passkeys, signed native
binaries, and remote-control relay remain external owner actions rather than
false completion claims.
