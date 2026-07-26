# Limitless AI v2 implementation plan

Source specification: `docs/LIMITLESS_V2_MASTER_SPEC.md`
Specification SHA-256: `ea0005f7af73df1aa48ab2690a88551afa94c710e7870ccc4d988e27ec59d113`

The work follows the specification’s five-session dependency order. A session
may continue into the next one only after its current vertical slice remains
runnable and recoverable.

1. Core platform and data safety: preserve v5 data, rebuild streaming, isolate
   account workspaces, make cloud writes atomic, enforce provider spending
   rules, harden the key vault and companion, and establish recovery and
   diagnostics.
2. Artifacts and creation tools: define the shared artifact schema and shell,
   add revisioned local/cloud persistence, then implement real presentation,
   document, spreadsheet, PDF, canvas, import, and export paths.
3. Website, application, and execution studio: add the isolated Build Studio,
   file tree, code/visual editing, responsive preview, secure runtime, ZIP
   export, and deployment adapters.
4. Intelligence, connections, and collaboration: finish provider plugins,
   dynamic catalogs, retrieval, voice, collaboration, marketplace foundations,
   and organization boundaries.
5. Desktop, mobile, remote, integration, and release: implement Tauri clients,
   device/session controls, visible-consent remote access, end-to-end scenarios,
   platform CI, setup guidance, rollback, and final evidence.

The exact machine-readable assignment and status is in
`docs/limitless-v2/FEATURE_MATRIX.json`.
