# Final known limitations and exact owner actions

Date: 2026-07-26

These are external or specialist-platform limitations, not hidden pass results.

| Limitation | Current safe state | Exact external action |
|---|---|---|
| Production Supabase schema | Six additive migrations and RLS pass static validation; nothing applied | Review backup, link the owner project, run `supabase db push`, then run the Supabase database/RLS advisors |
| Pairing Edge Function | Source requires JWT and authenticated `getUser`; no deployment claimed | Set `LIMITLESS_APP_ORIGIN`, deploy `device-pairing` with JWT verification, then perform create/consume/revoke with two real accounts/devices |
| Vercel/Worker production | Both local production builds are required; no deployment claimed | Configure the documented public variables, create a preview deployment, run smoke/accessibility checks, then promote with owner approval |
| Paid providers | Runtime/policy tests pass without transmitting a key or incurring cost | Add a user-owned key in Provider Hub, verify models, configure budgets, approve one low-cost request and compare the provider invoice/request ID |
| Free external model | Free policy is strict, but an external free model may require a free-route account key | Configure an authorized free/local route; Free mode itself must remain on |
| OAuth/MCP connectors | Shown unavailable rather than connected | Register OAuth apps/minimum scopes and deploy callback/token storage before enabling each connector |
| Durable automations | Local dry run only | Deploy a scheduler/worker and notification path; test retry, pause/resume and audit history |
| Realtime collaboration | Local comments/review only | Deploy invitations, presence and conflict-safe shared editing, then test two-account revoke/offline merge |
| Passkeys | Disabled/fail-closed | Deploy a reviewed WebAuthn challenge service on the final production origin and complete cross-device recovery tests |
| React/Next/full-stack preview | Source retained and marked `requires-runtime` | Connect an isolated build/runtime with dependency allowlists, CPU/memory/network limits, cancellation and cleanup |
| GitHub export/publish | Approval records only; no external side effect | Connect GitHub/deployment credentials, show exact repo/branch/target, obtain approval, then run the external action |
| Remote desktop | Permissions/revoke foundation only; control disabled | Deploy audited signaling, TURN, capture/control transport, visible consent indicators and emergency-stop verification |
| Desktop binary | Tauri source and workflow only | Supply signing/notarization secrets, real HTTPS updater endpoint/public key, run the workflow, verify signatures and publish the draft intentionally |
| Mobile binaries | CI generates unsigned test builds | Run GitHub Android/iOS jobs; add owner signing/store credentials only for reviewed store releases |
| Advanced PDF conformance | Real PDF/forms/layout work; encryption/tagging/PDF-A/signature not claimed | Connect a licensed or audited server PDF backend and conformance validators |
| Complex PDF/Office round trip | Compatibility report preserves/flags supported geometry/content | Validate representative owner files; use Office/PDF specialist conversion for macros, exact masters, SmartArt, track changes or scanned/vector reconstruction |
| Accessibility certification | Local preflight and semantic controls only | Run axe/manual keyboard/screen-reader tests on a deployed preview and remediate before claiming conformance |
| Final cloud-browser QA | Managed browser rejected both local addresses before load | Run the documented smoke sequence on a reachable preview deployment; this audit does not claim a browser pass |
| Desktop local compile | Rust/Cargo is absent in this environment | Run `cargo check --locked --manifest-path desktop/src-tauri/Cargo.toml` on a Rust/Tauri runner after committing a generated Cargo lockfile |

The absence of these external actions does not authorize fallback to fake data,
fake connection state, unsigned download buttons or paid-provider escalation.
