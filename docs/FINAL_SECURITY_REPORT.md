# Final security report

Date: 2026-07-26  
Scope: post-Finale source and portable release

## Findings repaired in this audit

1. Paid provider execution in Provider Hub bypassed the common retry,
   cancellation, circuit-breaker, deduplication and actual-cost runtime.
   Provider Hub and Chat now share `executeProviderWithPolicy`.
2. Chat previously used only the legacy free OpenRouter path and did not enforce
   the Finale usage-mode state. It now loads the account-scoped mode and cannot
   mix free and paid routes.
3. Custom provider headers could overwrite the adapter Authorization header.
   Verified adapter credentials now take precedence.
4. Paid requests above the confirmation threshold were not enforced inside the
   execution boundary. The runtime now requires an explicit confirmation flag.
5. Compatible endpoints accepted query strings that could carry tokens. Query
   options are rejected, as are credentials, unsafe schemes and remote private
   addresses.
6. Pairing attempt updates were not conditioned on the observed attempt count.
   Wrong and correct consume updates now use optimistic conditions plus the
   single-use `consumed_at` predicate.
7. The Edge Function had no checked-in explicit JWT setting. `supabase/config.toml`
   now requires JWT verification.
8. Relationship indexes for remote devices and agent steps were missing from
   the Finale migration. An additive hardening migration adds them.
9. The desktop updater contained a fake endpoint and empty active key. The
   checked-in updater is disabled; the signed workflow validates and injects a
   real HTTPS endpoint/public key only when owner secrets exist.

## Authorization and tenant isolation

- Every client-owned public table enables RLS.
- Owner policies use `(select auth.uid()) = user_id`.
- Client tables receive explicit `authenticated` grants, which keeps Data API
  exposure intentional.
- `device_pairing_codes` has no browser-client grant or policy.
- The auth trigger is in `private`, has a fixed empty search path and is revoked
  from `public`, `anon`, and `authenticated`.
- Revision writes are `security invoker`, table-allowlisted and expected-revision
  bounded.
- Artifact/media storage policies require the first path segment to equal the
  authenticated user UUID.

The migration validator checks all 23 public tables, the complete additive
chain, explicit privileges, optimized owner policies, pairing isolation and
critical relationship indexes. A production database/advisor run still
requires the owner’s Supabase project.

## Provider and cost boundary

- Free mode is default and permits only `free`, `local`, or browser classes.
- Entering a key does not change the usage mode.
- Paid mode requires: explicit Free-mode exit, Never Spend disabled, a verified
  healthy provider, positive per-request/daily/monthly budgets, a positive
  estimate, and confirmation at/above the configured threshold.
- Paid mode never falls back to a free or unknown-cost provider.
- Free failures never escalate to paid execution.
- In-flight requests are deduplicated by task/provider/model/prompt/route hash.
- Retry count is bounded by provider policy and paid-candidate budget.
- 408/429/5xx errors are normalized; Retry-After is bounded; repeated failures
  open a provider circuit.
- Provider-reported cost replaces the estimate when present; otherwise the
  event remains visibly `estimated`.
- Encrypted keys are stored separately from account state. Only masked suffixes
  are persisted.
- Key replacement and deletion require explicit confirmation in the UI.

## Browser, preview and native boundaries

- Static Build previews use an opaque iframe sandbox and CSP with
  `connect-src 'none'`, no parent/host filesystem access and a bounded error
  bridge.
- React/Next/full-stack projects never receive a fabricated preview pass
  without a connected runtime.
- Remote sessions default off, use expiring permissions and support revoke and
  emergency stop.
- Desktop credentials use the OS keychain; Tauri permissions and CSP are
  minimal.
- Updater configuration is disabled in source and only enabled by a
  credential-gated signed release job.
- Mobile source contains no signing secrets or production credentials.

## Secret and archive controls

- `.env*` files other than `.env.example`, private keys, logs, generated output,
  dependency folders and nested archives are excluded.
- Text files are scanned for common provider, AWS, Supabase and bearer-token
  shapes.
- Diagnostics redact secret-shaped keys and values.
- The release manifest verifies per-file size, mode and SHA-256.
- The archive verifier rejects absolute/traversal paths and unexpected files.

## Residual security limitations

These controls cannot be truthfully verified without external systems:

- DNS rebinding protection for arbitrary compatible endpoints needs a trusted
  server gateway; the browser validator blocks the obvious local/private cases.
- Production RLS behavior and database advisor results need the owner project.
- Passkeys need a reviewed WebAuthn challenge service and production origin.
- Remote screen/control needs signaling and capture infrastructure.
- Native signing, notarization and updater serving need owner identities and
  hosted release infrastructure.
- PDF encryption, tagged PDF/PDF-A conformance and cryptographic signatures
  need a specialist PDF backend.
