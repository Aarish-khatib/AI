# Migration

Before migration, export a verified backup and preserve the current deployment.
Apply these files in lexical order:

1. `202607230001_limitless_foundation.sql`
2. `20260724071429_limitless_v5_foundation.sql`
3. `20260726010000_limitless_v2_atomic_sync.sql`
4. `20260726075627_limitless_v2_artifact_workspace.sql`
5. `20260726143000_limitless_v2_finale.sql`
6. `20260726190000_limitless_v2_verified_release.sql`

All changes are additive. The fifth migration adds Finale state, devices,
sessions, agent runs, document preflight, provider metadata, usage modes,
budgets, cost events, pairing codes, indexes, RLS, grants, and the extended
atomic-write allowlist. The sixth adds verified-release relationship indexes and
reasserts explicit RLS-backed client privileges for current Supabase Data API
behavior. Neither runs automatically from the client.

After applying, inspect RLS and grants, deploy the pairing function with secrets,
sign in as two test users, confirm cross-account reads/writes fail, perform a
revision conflict test, and restore a v10 backup into a disposable account.
