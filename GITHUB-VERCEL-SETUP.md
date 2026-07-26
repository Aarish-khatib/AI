# Limitless AI v5 · GitHub, Supabase, and Vercel setup

## 1. Upload to GitHub

Extract the supplied ZIP. It contains one folder named `limitless-ai-website`.

```bash
cd limitless-ai-website
git init
git add .
git commit -m "Launch Limitless AI v5"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPOSITORY.git
git push -u origin main
```

The archive does not include `.git`, `node_modules`, build artifacts, environment files, provider keys, or device-vault data.

## 2. Optional Supabase sync

The website runs without Supabase. Complete this section only if you want accounts and cross-device sync.

1. Create a Supabase project.
2. Run these files in its SQL editor in filename order:
   - `supabase/migrations/202607230001_limitless_foundation.sql`
   - `supabase/migrations/20260724071429_limitless_v5_foundation.sql`
3. Copy the Project URL and publishable key from the project settings.
4. In Authentication URL Configuration, set your Vercel domain as the Site URL and add:
   - `http://localhost:3000`
   - `http://localhost:4173`
   - your Vercel preview/production URLs

Never copy the service-role key.

## 3. Deploy on Vercel

1. Import the GitHub repository at Vercel.
2. Keep Framework Preset set to Next.js.
3. Keep the root directory at the repository root.
4. If using Supabase, add:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

5. Optional: create a client-safe, budgeted Pollinations App Key for true AI video from its free quota, then add:

```text
NEXT_PUBLIC_POLLINATIONS_PUBLISHABLE_KEY
```

Only use a `pk_` publishable key here. Never expose an `sk_` secret key.

6. Deploy.

The configured build command generates the downloadable website source archive and runs the Next.js production build.

## 4. First-run verification

- Open Create and confirm **Never spend** is enabled.
- Generate one free image through **Auto · free route engine**. An OpenRouter key is not required for the AI Horde fallback.
- Upload an image to Animate and confirm the browser creates a downloadable local motion video.
- In Image canvas, add an image and text, save a version, and export PNG.
- In Video editor, add media, trim a clip, add a caption, and export. Source audio is included when the browser exposes a compatible encoder.
- If Pollinations is configured, confirm Settings shows **True AI video route · Ready**. A live generation consumes that key's limited Pollen quota, so it is not part of the no-cost deployment test.
- Optionally add a personal OpenRouter key in Settings and confirm Chat discovers free models.
- Confirm newly available OpenRouter image/video models appear automatically.
- If Supabase is configured, send a magic link and run Sync now.
- Export a backup from Settings.
- If using Agent, update `companion/app-url.txt` to your Vercel URL.

Never spend blocks paid and unknown-price models. Turning it off only reveals those models; Limitless still asks for confirmation before a paid request. AI Horde is a public volunteer network, so do not include private information in community prompts.
