# Final verification and validation report

Date: 2026-07-26  
Release: Limitless AI v2 post-Finale verified release

## Independent audit result

The prior `Limitless-AI-v2-Final-Release.zip` matched its source snapshot, but a
requirement-by-requirement audit found material gaps behind several release
claims. The verified release repairs those gaps rather than relabeling them:

- Build Studio now performs real local generation, bounded public GitHub ZIP
  import, repository analysis, approval tracking, local verification, duplicate
  and last-known-good recovery.
- Provider Hub now has one policy-enforced streaming runtime with normalized
  events and errors, cancellation, timeouts, bounded retry/429 behavior, circuit
  breaking, in-flight deduplication, redaction, actual-cost capture, and strict
  Free/BYOK routing.
- Professional Document/PDF Studio now persists layout, typography, citations,
  footnotes, bookmarks, forms, and export profiles into real DOCX/PDF output.
- Supabase release validation now covers all six additive migrations, 23 public
  tables, owner-only RLS policies, grants, indexes, and JWT-protected device
  pairing.
- Desktop/mobile release configuration no longer contains a placeholder updater
  URL or no-op mobile build; release credentials remain external and fail-closed.

The complete classification for every master and Finale requirement is in
`FINAL_REQUIREMENTS_COMPLIANCE_MATRIX.md`.

## Source validation

The following commands passed against the repaired authoritative source:

| Command | Result |
|---|---|
| `npm run release:validate` | Pass |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run test:contracts` | 31 passed |
| `npm run test:artifacts` | 4 passed |
| `npm run test:finale` | 17 passed |
| `npm run test:security` | 10 passed |
| `node --test tests/rendered-html.test.mjs` | 1 passed |
| `npm run validate:finale` | Pass |
| `npm run validate:supabase` | Pass: 6 migrations, 23 public tables |
| `npm run validate:native` | Pass |
| `npm run build` | Pass: Worker/Vinext |
| `npm run build:vercel` | Pass: optimized Next.js/Vercel output |
| `npm audit --omit=dev` | Pass: 0 known production vulnerabilities |
| `npm --prefix mobile ci` and config TypeScript check | Pass |

Total automated tests: **63 passed, 0 failed**.

## Security and audit evidence

- Strict Free mode cannot escalate to a paid provider.
- Paid BYOK requires a verified key, budgets, and confirmation where policy
  requires it; no implicit free or paid fallback occurs.
- Provider keys and headers are redacted from runtime results and diagnostics.
- Preview content uses an opaque sandbox and deny-by-default content security
  policy; unsupported framework execution is labeled `requires-runtime`.
- Imports enforce scheme, host, archive-size, path, entry-count, and integrity
  boundaries.
- Public Supabase tables enable RLS and define owner-scoped policies.
- The pairing function requires JWT verification and authenticated ownership.
- Native updater configuration is disabled until a real HTTPS endpoint and
  public key are supplied to the release workflow.
- Repository and archive secret/exclusion scans are release gates.

The full dependency audit reports 17 high findings only in the development-only
ESLint/minimatch transitive chain, with no compatible npm fix. The shipped
production dependency graph reports zero known vulnerabilities. No unsafe
dependency override was applied.

## Environment-limited evidence

- Managed cloud-browser QA was attempted against both local preview addresses;
  the browser returned `ERR_BLOCKED_BY_CLIENT` before application code loaded.
  No browser success is claimed. A reachable preview smoke pass remains an
  owner deployment action.
- Rust/Cargo is absent from this runtime, so the desktop binary was not compiled
  locally. Tauri manifests and workflows pass static validation; signed builds
  require a Rust/Tauri runner and owner credentials.
- Capacitor configuration compiles locally. Complete Android/iOS builds require
  their platform SDK runners and signing remains owner-controlled.
- Production migrations, OAuth, paid requests, deployment, signing, and remote
  signaling were not performed.

## Archive acceptance

The final archive is created only after the source gate and handoff checksum
generation. It is then extracted into a fresh directory, checked for ZIP
integrity, manifest/checksum agreement, executable permissions, prohibited
artifacts, and secret patterns, followed by a locked install and the same full
release gate.

The archive SHA-256 and exact post-seal clean-extraction result are reported
with the downloadable release. They cannot be embedded into the archive without
changing the archive hash.
