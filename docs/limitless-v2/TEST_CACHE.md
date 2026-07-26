# Test cache

Last updated: 2026-07-26T16:37:09Z

| Command | Coverage | Result | Invalidate when |
|---|---|---|---|
| `npm run test:contracts` | Streaming, integrity, workspace, sync, provider, release, and source contracts | 31/31 passed | Covered module/test changes |
| `npm run test:artifacts` | Artifact lifecycle, recovery, Office/PDF export/import, formulas | 4/4 passed | Artifact module/test changes |
| `npm run test:finale` | Free/BYOK policy, endpoints, pairing, permissions, sandbox, Build, documents | 8/8 passed | Finale module/test changes |
| `npm run test:security` | Companion paths, secrets, origins, approvals, environment | 10/10 passed | Companion changes |
| `npm test` | TypeScript, all tests, Worker build/artifact validation, rendered output | 54/54 passed | Runtime/build/test changes |
| `npm run lint` | Full source | Passed | Lint-aware source changes |
| `npm run validate:finale` | Required docs, migration/RLS, provider policy, release state, env/native manifests | Passed | Finale contract changes |
| `npm run build:vercel` | Optimized Next.js production build | Passed | App/config/dependency changes |
| `npm audit --omit=dev` | Shipped dependency graph | Passed; 0 known vulnerabilities | Lockfile changes |
| `npm audit` | Full dependency graph | 17 high findings in development-only ESLint transitive chain; no compatible fix | Lockfile changes |
| Final browser preview | Final live interaction smoke pass | Environment-limited; not claimed as passed | Preview environment or UI changes |
| `npm run release:verify` | ZIP CRC, paths, required files, manifest, SHA-256, exclusions, secret scan | Run after sealing | Archive/source changes |

The managed runtime's `Unknown env config "http-proxy"` line is an npm warning,
not an application failure.
