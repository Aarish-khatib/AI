# Final feature matrix

Date: 2026-07-26

| Product area | Delivery state | Evidence | External boundary |
|---|---|---|---|
| Core chat, streaming, Continue/Branch/recovery | Verified local and production-build functional | `app/page.tsx`, `lib/streaming.mjs`, contract tests | Live provider response needs an authorized key/free route |
| Account-isolated local workspaces/backups | Verified | `lib/local-store.ts`, backup and workspace tests | None for local mode |
| Atomic cloud sync | Verified source and migration | `lib/cloud-sync.ts`, revision migration/tests | Production Supabase apply/sign-in |
| Artifact Workspace | Verified | Artifact UI/store/export/import tests | Complex unsupported Office objects are reported |
| Presentation/PPTX | Verified | Structured editor and PPTX/PDF tests | Exact unsupported PowerPoint objects are reported |
| Document/DOCX | Verified | Structured editor, DOCX export/import tests | Track changes and advanced Office objects |
| Spreadsheet/XLSX/CSV | Verified | Custom OOXML writer/reader and formula tests | Macros/external data connections unsupported |
| PDF/canvas | Verified local core | PDF/PNG exporters and tests | Tagged PDF, PDF/A, encryption, vector text reconstruction |
| Professional Document & PDF Studio | Verified core, partial advanced conformance | Draft/layout/preflight/export sources and form/layout tests | Specialist conformance/encryption backend |
| Build Studio static projects | Verified | Prompt/Git/ZIP/import/index/preview/version/export tests | None for static source |
| Build Studio React/Next/full-stack | Source-functional, runtime blocked | `requires-runtime` verification evidence | Isolated dependency/build/server runtime |
| GitHub export/publishing | Fail-closed | Explicit approval records | GitHub/deployment credentials and authorization |
| Intelligence local knowledge/memory | Verified local core | Intelligence UI/store | Hosted retrieval, OAuth, sharing |
| Durable automations | Partial/fail-closed | Local dry-run records | Scheduler/worker/notification service |
| Realtime collaboration | External | Local comments/review structures | Presence/invite/CRDT infrastructure |
| Universal Provider Hub | Verified runtime | Provider Hub, normalized runtime, 15+ Finale tests | Actual provider calls require user credentials |
| Limitless Free | Verified default | Policy, state defaults, tests | A usable external free model may still need a free-route key |
| Paid BYOK | Verified control plane | Shared Chat/manual runtime, budgets, confirmation, cost events | Actual billing/provider behavior requires user credential |
| Media providers | Verified free-first/local fallback core | Studio/provider registry/job tests | Hosted capability/quota changes |
| Supabase schema/RLS | Verified statically | Six migrations, 23-table validator | Production apply and database-advisor run |
| Secure pairing | Verified source/local contract | Edge source, SQL, policy/tests | Edge deployment and service-role environment |
| Desktop | CI-configured | Tauri source and signed workflow | Rust runner here; signing/notarization/updater hosting |
| Mobile | CI-configured | Pinned Capacitor project and Android/iOS compile workflow | Local platform SDKs and store signing |
| Passkeys | Fail-closed external | Security Centre state | WebAuthn challenge service/production origin |
| Remote desktop | Fail-closed external | Threat model/session permissions/revoke tests | Signaling/capture/control infrastructure |
| Portable release | Verified | Manifest/checksum/secret/exclusion/clean-extraction gate | None |

“Verified” never means deployed, connected, signed, published, billed, or
externally certified unless the evidence column says so.
