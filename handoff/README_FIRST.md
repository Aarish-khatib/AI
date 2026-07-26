# Limitless AI v2 — Final release

This is the complete portable source release for Sessions 1–4 and the unified
Session 5 Finale. It preserves the verified v5 migration/rollback baseline and
contains the application, additive migrations, tests, native foundations,
workflows, release records, manifests, checksums, and apply/rollback helpers.

## Completed product

- Resilient Chat, account-isolated storage, atomic sync, encrypted key routing,
  strict spending controls, backups, recovery, and hardened companion access
- Editable presentation, document, spreadsheet, PDF, and canvas workspaces with
  real Office/PDF/image imports and exports
- Typed Build Studio with versioned virtual files, opaque network-denied
  previews, checkpoints, restore, repository indexes, and validated project ZIPs
- Intelligence Hub foundations with cited local knowledge, explicit memory,
  automation dry runs, privacy states, evaluations, and redacted diagnostics
- Professional Document & PDF Studio and Universal Provider Hub
- Strict Limitless Free versus verified, budget-locked user-paid BYOK routing
- Account-scoped v10 state, owner-only Finale database tables, pairing function,
  Tauri desktop source, Capacitor mobile source, and release CI

## Verify before use

1. Extract the archive.
2. Open the `limitless-ai-website` directory.
3. Run `bash handoff/verify-checkpoint.sh`.
4. For the full clean gate, run `bash handoff/verify-checkpoint.sh --install`.
5. Review `docs/LIMITLESS_V2_SETUP.md`, the migration guide, and the known
   limitations before deploying.

No production migration, deployment, paid provider request, OAuth
authorization, remote-control activation, or native signing was performed while
creating this source release.
