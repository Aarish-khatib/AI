# Environment capabilities

Recorded: 2026-07-26

| Capability | State |
|---|---|
| Scratch filesystem | Writable but may be recycled between sessions |
| Durable file handoff | Available through the final checkpoint ZIP |
| Git | Available locally; baseline commit created |
| Git remote/push | No remote configured; no push attempted |
| Network | Restricted but npm registry access works |
| Package installation | Works through the integrity-checked isolated installer |
| Node/npm/build tools | Available |
| Supabase CLI | Unavailable |
| Production Supabase access | No credentials; migration cannot be applied here |
| Vercel CLI/deployment | Unavailable and not authorized |
| Sites project | No `.openai/hosting.json`; local-only validation applies |
| ZIP tools | `zip` and `unzip` available |
| Source archive size | Approximately 1.5 MiB before build/dependency output |
| Visual preview | Local preview started; desktop interaction smoke passed |
| Mobile viewport automation | Browser exposed no supported resize control; static responsive validation used |
| Signing certificates | Not available |

Do not retry unavailable production, signing, remote-repository, or unsupported
viewport capabilities unless the environment or owner authorization changes.
