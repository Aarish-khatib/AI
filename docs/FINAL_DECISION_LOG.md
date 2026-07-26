# Final verification decision log

Date: 2026-07-26

| ID | Decision | Evidence/rationale |
|---|---|---|
| FV-001 | Choose Outcome A and replace the old ZIP. | The old ZIP matched the pre-audit workspace, but the independent audit found connected implementation/security gaps. |
| FV-002 | Keep the existing account/artifact/finale stores. | Duplicate foundations would risk migration and sync divergence. Repairs extend the v10 state and current artifact model. |
| FV-003 | Make one provider execution boundary authoritative. | Chat and Provider Hub now use `executeProviderWithPolicy`; the legacy free OpenRouter route remains only inside Free mode. |
| FV-004 | Prefer actual provider-reported cost, otherwise label estimates. | Estimates cannot be reported as invoice truth. |
| FV-005 | Require paid confirmation inside the runtime as well as UI. | UI-only confirmation can be bypassed by another caller. |
| FV-006 | Reject compatible endpoint query strings. | Keys/tokens belong in the encrypted credential path, not URLs or logs. |
| FV-007 | Preserve last-known-good Build output on failed verification. | Failed code must not replace the last verified preview/version. |
| FV-008 | Report framework projects as `requires-runtime`. | A static iframe is not evidence that React/Next/server source built successfully. |
| FV-009 | Extend the shared document artifact instead of creating a second editor/exporter. | This preserves autosave/version/import/export behavior and prevents duplicate models. |
| FV-010 | Use standard PDF fonts with explicit substitution reporting. | Browser-safe export is deterministic; requested font names remain in structured source/DOCX. |
| FV-011 | Emit real AcroForm fields only for `fillable-pdf`. | Other PDF profiles should remain ordinary documents; signature fields are not called cryptographic signatures. |
| FV-012 | Add a new migration rather than edit assumed-applied migrations. | Production-safe additive migration practice. |
| FV-013 | Make public Data API grants explicit. | Current Supabase behavior does not guarantee automatic public-schema exposure; RLS remains mandatory. |
| FV-014 | Keep pairing codes inaccessible to clients. | The authenticated Edge Function’s service role is the only intended access path. |
| FV-015 | Disable the updater in checked-in source. | An active fake endpoint/empty key is unsafe. The signed workflow injects validated owner configuration. |
| FV-016 | Upgrade mobile CI from config-only to clean platform compilation. | A configuration syntax check is insufficient evidence for Android/iOS source viability. |
| FV-017 | Stop browser recovery after two blocked local addresses. | Both failures occurred before app load; looping would not create valid product evidence. |
| FV-018 | Preserve explicit limitations instead of weakening the master specification. | External deployment, provider, signing, conformance and realtime requirements remain visible and fail-closed. |
| FV-019 | Build the replacement archive only after the final build/manifests. | Builds can rewrite source-adjacent files such as `next-env.d.ts`; manifests must describe the sealed bytes. |
| FV-020 | Independently install and run gates from the extracted ZIP. | Working-tree success alone does not prove portability. |
