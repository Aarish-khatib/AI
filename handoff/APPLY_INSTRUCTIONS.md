# Apply instructions

## Recommended complete-project method

1. Back up the current GitHub repository, production database, and deployed
   environment variables.
2. Extract `Limitless-AI-v2-Final-Verified-Release.zip`.
3. Use the extracted `limitless-ai-website` directory as the repository root.
   `package.json` must be at that root.
4. Preserve the existing Vercel project and public domain so browser-local data
   remains on the same origin.
5. Review `handoff/CHANGED_FILES.json` and `handoff/DELETED_FILES.json`.
6. Run `bash handoff/verify-checkpoint.sh --install`.
7. Follow `docs/LIMITLESS_V2_MIGRATION.md` and
   `docs/LIMITLESS_V2_ENVIRONMENT_VARIABLES.md`.
8. Commit, push, migrate, and deploy only through the repository owner's normal
   reviewed workflow.

## Controlled overlay helper

The helper can overlay the release onto an existing Limitless AI v5 checkout.
Its default mode only prints a plan. Apply mode backs up overwritten/deleted
files and requires separate deletion consent.

```bash
node handoff/apply-checkpoint.mjs /absolute/path/to/existing-repository
node handoff/apply-checkpoint.mjs /absolute/path/to/existing-repository \
  --apply --confirm-deletions
```

## Supabase

Review and apply migrations in filename order. Existing projects should apply
only migrations not already recorded:

```text
supabase/migrations/202607230001_limitless_foundation.sql
supabase/migrations/20260724071429_limitless_v5_foundation.sql
supabase/migrations/20260726010000_limitless_v2_atomic_sync.sql
supabase/migrations/20260726075627_limitless_v2_artifact_workspace.sql
supabase/migrations/20260726143000_limitless_v2_finale.sql
supabase/migrations/20260726190000_limitless_v2_verified_release.sql
```

Deploy `supabase/functions/device-pairing/index.ts` only after reviewing its
secrets, origin policy, rate limits, and production project configuration.
The source release does not apply any migration or function automatically.

Never put an OpenRouter key, a provider secret, a Supabase secret/service-role
key, signing credential, or store credential in a public environment variable.
