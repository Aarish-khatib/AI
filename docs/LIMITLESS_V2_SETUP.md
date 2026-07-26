# Setup

1. Install Node.js 22.13 or newer.
2. Extract the release so `package.json` is at the repository root.
3. Run `npm run setup -- --install`.
4. The app works locally without cloud variables. Run `npm run dev`.
5. For account sync, add the two public Supabase variables listed in
   `LIMITLESS_V2_ENVIRONMENT_VARIABLES.md`.
6. Apply every SQL file in `supabase/migrations` in filename order. Do not edit
   or reorder a migration already applied.
7. Set `LIMITLESS_APP_ORIGIN` for the pairing function, deploy
   `supabase/functions/device-pairing`, and test create/consume/revoke.
8. Run `npm run release:validate`, then deploy the web build through the
   existing Vercel project to preserve browser-origin data.

Provider keys are added by each user inside Provider Hub. They are encrypted in
the account-isolated local vault, excluded from backups/cloud sync, and must pass
an authentication-only connection test before paid mode can unlock.
