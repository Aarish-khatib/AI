# Environment variables

| Variable | Scope | Required | Purpose |
|---|---|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser | Cloud only | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser | Cloud only | Public project key protected by RLS |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser | Legacy fallback | Older public key name |
| `NEXT_PUBLIC_POLLINATIONS_PUBLISHABLE_KEY` | Browser | Optional | Client-safe budgeted video route |
| `NEXT_PUBLIC_POLLINATIONS_RUN_BUDGET` | Browser | Optional | Finite local run ceiling; `0` disables |
| `LIMITLESS_APP_ORIGIN` | Edge Function | Pairing only | Exact allowed web origin |
| `SUPABASE_URL` | Edge Function | Pairing only | Injected project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Edge Function | Pairing only | Auth validation |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function secret | Pairing only | Pairing-code table access |

Never expose a service-role key, private provider key, desktop signing secret,
or Apple credential through a `NEXT_PUBLIC_` variable. Tauri signing and
notarization values belong only in protected CI secrets named in the desktop
workflow. Provider BYOK values belong only in the encrypted in-app vault.
