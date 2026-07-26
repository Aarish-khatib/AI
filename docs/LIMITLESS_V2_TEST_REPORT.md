# Limitless AI v2 final test report

Date: 2026-07-26  
Release: 2.0.0

## Source release gate

The authoritative final source passed:

- 31 platform, streaming, integrity, workspace, sync, key-routing, provider, and
  release contract tests
- 4 artifact lifecycle, import, export, versioning, and formula-safety tests
- 17 Finale Free/BYOK, endpoint, pairing, remote-permission, sandbox, Build,
  professional-document, provider-runtime, Ollama-stream and layout/form tests
- 10 companion path, origin, secret, environment, deletion, and approval tests
- 1 rendered Worker-output test
- TypeScript and ESLint
- Finale migration, RLS, provider-policy, environment, release-state, Tauri,
  Capacitor, and workflow validation
- Worker/Vinext production build and artifact validation
- optimized Vercel/Next.js production build
- production dependency audit with zero known vulnerabilities

Total automated tests: **63 passed, 0 failed**.

## Dependency audit

The shipped production graph has zero known vulnerabilities. The full
development graph reports 17 high findings in ESLint's transitive
`brace-expansion`/`minimatch` chain. npm reports no compatible fix for the
installed lint stack, so no unsafe forced override was added.

## Browser QA

The post-Finale cloud-browser attempt was environment-limited. A local Next.js
server became ready, but the managed browser rejected both `127.0.0.1` and
`localhost` before the app loaded. This is not reported as a successful final
live pass. The final source is covered by the full automated interaction gate
plus both production builds.

## Archive QA

The sealing workflow validates ZIP CRCs, safe paths, required migrations/docs/
tests/workflows/handoff records, per-file sizes and SHA-256 digests, checksum
list equality, generated-folder exclusions, environment-file exclusions, and
secret-shaped values. The archive is then extracted to a fresh directory and
its own integrity and full release gates are run before delivery.

No production migration, provider billing request, OAuth flow, native signing,
store submission, remote-control activation, or deployment is part of this
local release validation.
