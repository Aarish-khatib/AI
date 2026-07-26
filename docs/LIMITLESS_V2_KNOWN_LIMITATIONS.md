# Known limitations

The authoritative post-Finale limitation and exact owner-action record is
`FINAL_KNOWN_LIMITATIONS.md`. This compatibility summary is retained for older
handoff links.

- Production Supabase migration, Edge deployment, OAuth, and Vercel deployment
  require the owner’s credentials and approval.
- Desktop and mobile sources are CI-configured; no signed/notarized/store binary
  is included.
- Passkey UI remains disabled until hosted Supabase passkey infrastructure and
  a reviewed challenge flow are configured.
- Remote desktop is a fail-closed security foundation, not an enabled control
  service.
- OAuth/MCP connectors, durable scheduling, and real-time multi-user presence
  are labeled as requiring infrastructure.
- Provider catalogs, prices, quotas, and terms change. Paid mode never infers
  cost from a model name and requires re-verification.
- Custom compatible cloud endpoints need a trusted server gateway for DNS
  resolution/rebinding enforcement; the browser validator blocks obvious
  private, loopback, credential-bearing, and insecure targets.
- Accessibility preflight is local guidance, not a third-party certification.
- The final cloud-browser preview was blocked before app load on both supported
  local addresses; the release does not claim a browser pass.
- Rust/Cargo and mobile platform SDKs are not present locally. Native source and
  workflows are validated, and mobile configuration TypeScript passes.
- Advanced PDF encryption, tagging, PDF/A and cryptographic signatures require
  a specialist backend and are not claimed.
