# Security

- Local data is partitioned by anonymous or authenticated workspace.
- Provider credentials use the existing encrypted vault and never enter
  backups, cloud payloads, logs, diagnostics, or browser environment variables.
- Cloud rows use owner keys, RLS, authenticated-only grants, and atomic expected
  revisions. The pairing-code table has no authenticated client grant.
- Free mode blocks paid and unknown-cost providers. Paid mode requires an
  authenticated key test, explicit mode switch, Never Spend off, and positive
  per-request, daily, and monthly limits.
- Build previews use opaque sandboxed iframes with CSP network, object, form,
  storage-origin, parent, and host-filesystem access denied.
- Imported archives enforce path, entry, expansion, extension, size, and CRC
  limits.
- Desktop credentials use the OS keychain. Commands, file mutations, and remote
  permissions require exact visible approval; high-risk commands fail closed.
- Diagnostics redact credential-shaped keys and values.

Production claims require the included tests plus owner-authorized deployment,
RLS, storage, signing, and provider verification.
