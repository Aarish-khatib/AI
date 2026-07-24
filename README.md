# Limitless AI

Limitless AI v5 is a local-first AI and media workspace for chat, image generation, video generation, animation, layered image editing, timeline video editing, and an optional desktop coding agent. It keeps the monochrome, free-first direction of v4.1 while turning generated outputs into durable assets and editable, versioned projects.

## What is included

- Streaming chat across OpenRouter's currently free text models
- Task-aware routing by capability, context, recent reliability, and latency
- Images, PDFs, audio, video, and text-file attachments
- Message editing, regeneration, Markdown, tables, and copyable code blocks
- Free-first visual routing with a default **Never spend** lock
- Dedicated OpenRouter image and asynchronous video generation
- Automatic discovery and prioritization of zero-price OpenRouter visual models
- Optional Pollinations free-quota text-to-video and image-to-video with a client-safe publishable key
- Account-free AI Horde community generation for images, edits, variations, upscaling, and background isolation
- In-browser motion rendering for image animation and free keyframe-to-video fallback
- Free text-model planning + community keyframe + local video composition when no free AI video model exists
- Persistent OpenRouter, Pollinations, AI Horde, and local-render job resumption with bounded retries
- Prompt-directed image editing, variations, upscaling, and background isolation
- A layered image canvas with transforms, blend modes, filters, text, shapes, masks, outpainting canvas expansion, undo/redo, checkpoints, AI-fill handoff, and PNG export
- A video timeline with trimming, ordering, speed, volume, transitions, effects, captions, preview, undo/redo, checkpoints, and browser video/audio export
- A unified Library for durable assets, editable projects, jobs, progress, errors, and sync
- A provider-plugin registry that keeps routing policy separate from provider implementations
- User-controlled cross-chat memory and automatic long-conversation compression
- Native IndexedDB storage instead of writing full chats on every streamed token
- A Web Crypto AES-GCM device vault for the user's OpenRouter key
- One-time, verified migration from all v1 `localStorage` records
- Recovery snapshots, revision numbers, tombstones, JSON backup, and conflict copies
- Optional Supabase magic-link accounts, explicit authenticated-role grants, RLS-protected records, and private Storage
- A hardened local project companion with realpath workspace checks and server-enforced approvals
- PWA installation, Vercel deployment, and a generated source ZIP

## Start locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

The app works without Supabase. Free community image generation and local motion also work without an OpenRouter key. Add a personal OpenRouter key inside Settings for free chat, free-model planning, and any OpenRouter visual models you deliberately choose. The key is validated, encrypted on the device, excluded from cloud sync, excluded from backups, and excluded from the generated source archive.

For true hosted AI video without an OpenRouter video model, optionally set `NEXT_PUBLIC_POLLINATIONS_PUBLISHABLE_KEY` to a client-safe, budgeted `pk_` App Key. Never place a Pollinations `sk_` key in a browser environment variable. If the free quota is empty or unavailable, Limitless automatically falls back to local motion.

## Zero-cost creation engine

Studio defaults to **Auto · free route engine** with **Never spend** enabled.

| Request | Zero-cost route |
| --- | --- |
| Image generation | Zero-price OpenRouter image model when available, then AI Horde |
| Image edit or variation | Zero-price reference-capable model when available, then AI Horde image-to-image |
| Upscale | Zero-price model when available, then AI Horde + RealESRGAN post-processing |
| Background isolation | Zero-price model when available, then AI Horde background post-processing |
| Animate an uploaded image | Zero-price OpenRouter model, then Pollinations free-quota image-to-video, then local motion |
| Text-to-video | Zero-price OpenRouter model, then Pollinations free-quota AI video, then a community keyframe + local motion |

The local fallback creates a real downloadable video file, but it is a camera-motion composition rather than full generative scene motion. OpenRouter or Pollinations handles full generative scene motion when a usable free model or quota is available. Pollinations quota is limited rather than unlimited.

AI Horde is a volunteer-run public inference network. Anonymous requests use its lowest-priority queue and can be slow at busy times. Never place private or identifying information in community prompts. The app disables paid and unknown-price models while Never spend is enabled.

### Optional free-quota AI video

Create a Pollinations publishable App Key with an explicit budget, then add:

```dotenv
NEXT_PUBLIC_POLLINATIONS_PUBLISHABLE_KEY=pk_your_publishable_app_key
```

Pollinations publishable keys are intended for browser clients. Limitless checks the key balance, discovers the currently accessible video catalog, prefers the lowest-cost compatible model, uses provider safety filters, can upload an unlisted reference image for image-to-video, and falls back automatically on exhausted quota, rate limits, or provider errors. Uploaded references use Pollinations media storage and are retained under that provider's current lifecycle.

## Optional Supabase account sync

1. Create a Supabase project.
2. Open its SQL editor.
3. Run both migrations in filename order:
   - `supabase/migrations/202607230001_limitless_foundation.sql`
   - `supabase/migrations/20260724071429_limitless_v5_foundation.sql`
4. Copy `.env.example` to `.env.local`.
5. Add your project URL and **publishable** key:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

6. In Supabase Authentication, add your local and production URLs to the allowed redirect URLs.
7. Restart the development server.

Do not add a service-role key to the project, browser, database, or ZIP. The supplied SQL enables Row Level Security on every application table and keeps the `limitless-media` bucket private.

### Cloud data model

| Resource | Purpose | Protection |
| --- | --- | --- |
| `auth.users` | Account identity and email | Supabase Auth |
| `profiles` | App profile and account timestamps | Own-row RLS |
| `chats` | Revisioned conversation payloads and tombstones | Own-row RLS |
| `media_jobs` | Image/video job state and output metadata | Own-row RLS |
| `media_assets` | Durable media metadata and private storage pointers | Own-row RLS |
| `media_projects` | Image canvas and video timeline project state | Own-row RLS |
| `project_versions` | Append-only image and video editor checkpoints | Own-row RLS |
| `memory_items` | Facts explicitly saved by the user | Own-row RLS |
| `user_preferences` | Optional syncable preferences | Own-row RLS |
| `limitless-media` | Attachments and generated media | Private bucket + path RLS |

## Zero-loss upgrade behavior

On first launch, v5:

1. Copies the exact legacy chat, model, and health records into a checksummed recovery record.
2. Normalizes a copy of every readable legacy conversation into IndexedDB.
3. Encrypts the legacy OpenRouter key with a non-exportable AES-GCM key.
4. Decrypts the new ciphertext and compares it to the original.
5. Removes the old plaintext key only after verification succeeds.
6. Leaves the original legacy chat record untouched as an emergency fallback.

Chats, jobs, assets, projects, and memory carry `revision`, `deviceId`, `updatedAt`, and optional `deletedAt` fields. Revisions are compared before timestamps, and cloud sync never silently replaces divergent equal revisions: it creates a clearly named recovered copy. Editor checkpoints sync as append-only records. Deletions are tombstones so another device cannot accidentally resurrect or destroy data.

V5 backups include conversations, assets and their offline media, editable projects, checkpoints, memory, generation jobs, settings, revisions, and tombstones. V4 backups remain importable. Secrets and vault material are intentionally excluded.

## OpenRouter behavior

- Free chat models are discovered from `/api/v1/models`.
- Image models are discovered from `/api/v1/images/models` and generated through `/api/v1/images`.
- Video models are discovered from `/api/v1/videos/models`.
- Visual models are cost-classified as free, paid, or unknown from live pricing metadata.
- Paid and unknown-price models are hidden and blocked while Never spend is enabled.
- Video jobs are submitted to `/api/v1/videos`, stored immediately, and checked through `/api/v1/videos/{id}`.
- Unfinished video jobs are checked again when the app reopens.
- If a user unlocks spending and explicitly selects a paid model, Limitless shows its reported price and asks for confirmation before submitting.

No secret provider key is included. Each user controls their own OpenRouter account and spending. A deployer may optionally configure a client-safe, budgeted Pollinations `pk_` key for shared free-quota video; `sk_` keys must remain server-side.

## Desktop project agent

Run:

```bash
sh companion/start-mac-linux.sh
```

On Windows, double-click `companion/start-windows.bat`.

Then open Agent in the web app, enter the one-time code shown by the local companion, and choose an absolute project folder.

Security boundaries:

- The companion listens only on `127.0.0.1`.
- Pairing is rate-limited and bound to the web-app origin.
- File paths are checked lexically and through `realpath`.
- Symlinks cannot escape the selected workspace for file operations.
- Review mode is enforced by the local server, not only by the web interface.
- Each approval is bound to one exact action and payload, expires after 90 seconds, and works once.
- Enabling Trusted mode requires a local approval.
- Terminal and delete actions still require local approval in Trusted mode.
- Terminal commands receive a small allowlist of environment variables; cloud and provider secrets are removed.

Shell commands still run with the operating-system permissions of the person who launched the companion. Read every terminal approval before entering its code.

## Validation

```bash
npm run lint
npm run typecheck
npm run test:security
npm run build:vercel
npm test
```

`npm test` verifies types, provider/API contracts, storage migration invariants, the five companion security properties, the Cloudflare/Vinext production artifact, and rendered HTML. `npm run build:vercel` verifies the standard Next.js deployment.

## Deployment

### Vercel

1. Push this directory to GitHub.
2. Import the repository in Vercel.
3. Add the optional two public Supabase variables.
4. Deploy. `vercel.json` runs `npm run build:vercel`.

### Cloudflare/Sites-compatible build

The project retains its Vite + Vinext build:

```bash
npm run build
```

The output is validated in `dist/`.

## Project map

```text
app/                         Next.js shell and monochrome design system
components/                  Chat, Studio, canvas, timeline, Library, agent, settings
lib/local-store.ts           IndexedDB v5, encryption, migration, assets, projects, recovery
lib/cloud-sync.ts            Supabase auth, revision merge, offline-preserving private uploads
lib/openrouter.ts            Discovery, routing, chat, image, video APIs
lib/provider-registry.ts     Declarative creative-provider capabilities and route ordering
lib/ai-horde.ts              Anonymous community image jobs and resumption
lib/local-motion.ts          In-browser motion-video composition and export
companion/                   Local agent server and security tests
supabase/migrations/         Complete account/database/storage setup
scripts/                     Verified builds and source-archive generation
```

## Important privacy choices

- The OpenRouter key is a device secret, not user profile data.
- A Supabase publishable key may be present in browser code; its safety depends on the included RLS policies.
- No service-role key belongs in this repository.
- Limitless does not proxy chats through its own server.
- Cloud sync is optional. The app remains usable and recoverable offline.
