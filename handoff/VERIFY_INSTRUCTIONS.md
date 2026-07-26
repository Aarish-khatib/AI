# Verification instructions

## Source integrity

From the extracted project root:

```bash
bash handoff/verify-checkpoint.sh
```

This checks every recorded source digest and rejects dependency folders, build
caches, environment files, and nested ZIPs.

## Complete release gate

```bash
bash handoff/verify-checkpoint.sh --install
```

The full gate installs the exact lockfile and runs:

- 31 platform/contract tests
- 4 artifact lifecycle/import/export tests
- 17 Finale policy, Build, pairing, document, and provider tests
- 10 companion-security tests
- 1 rendered-output test
- TypeScript and ESLint
- Finale migration/RLS/provider/native-manifest validation
- Worker/Vinext and optimized Vercel/Next.js production builds
- production dependency audit

Expected result: all 63 tests and both builds pass, and the shipped dependency
graph reports zero known vulnerabilities.

## Archive verification

From the project root beside the ZIP:

```bash
npm run release:verify -- ../Limitless-AI-v2-Final-Verified-Release.zip
```

This validates ZIP CRCs, safe paths, required release records, source sizes and
SHA-256 values, exclusions, the checksum list, and secret-shaped values.

## Post-deployment smoke test

Use disposable data on the existing domain. Confirm legacy local data migrates,
Limitless Free is the default, account isolation holds, backups restore, all
artifact editors export real files, Build preview remains opaque/network-denied,
paid BYOK requires a verified key plus hard budgets, and remote desktop/passkeys
remain disabled until their reviewed hosted infrastructure exists.
