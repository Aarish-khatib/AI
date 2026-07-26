# Decision log

| ID | Decision | Reason |
|---|---|---|
| D-001 | Preserve v5 as the immutable rollback baseline. | Existing users and migration behavior must remain recoverable. |
| D-002 | Use one IndexedDB database per anonymous/account workspace. | Reusing record IDs must never expose another account’s local records or vault. |
| D-003 | Copy anonymous work once on sign-in, excluding all secrets and account/budget state. | Preserve work without moving credentials across identities. |
| D-004 | Use revisions, never client clocks, to select winners. | Clock skew must not overwrite newer work; equal-revision divergence is retained. |
| D-005 | Use a security-invoker compare-and-swap RPC. | RLS remains authoritative and concurrent writes fail closed. |
| D-006 | Treat visual price as free only with current endpoint/SKU evidence. | A model suffix or unknown catalog price cannot authorize spending. |
| D-007 | Treat Pollinations as budgeted, consented, and non-replayable. | A publishable key does not make usage unlimited or zero-cost. |
| D-008 | Limit encrypted OpenRouter routing to three explicit slots. | Bounded failover is understandable, testable, and avoids request storms. |
| D-009 | Do not retry after streamed content is emitted. | Mixing responses or duplicating partial work is worse than preserving it for Continue. |
| D-010 | Bind the companion to exact allowed origins and expiring sessions. | Loopback alone does not prevent another local web origin from invoking it. |
| D-011 | Deny secret-bearing file paths before companion reads or writes. | Workspace approval is not permission to expose credentials implicitly. |
| D-012 | Remove the app-served source ZIP. | Source distribution belongs in deliberate release/checkpoint artifacts, not the production UI. |
| D-013 | Keep incomplete specification features false in the release registry. | Planned work must not appear production-ready before its acceptance evidence exists. |
| D-014 | Keep free and paid execution as separate fail-closed graphs. | A fallback or unknown price must never create an unapproved charge. |
| D-015 | Verify provider credentials with catalog reads, not paid generations. | Connection tests should prove authentication without consuming model budget. |
| D-016 | Use one structured Artifact model for professional document exports. | DOCX/PDF output must remain editable and versioned instead of becoming a screenshot. |
| D-017 | Run Build previews in opaque network-denied iframes. | Generated code must not inherit the app origin, secrets, storage, or host access. |
| D-018 | Ship native source and CI honestly without unsigned binaries. | Signing, notarization, store identities, and updater infrastructure require owner credentials. |
| D-019 | Keep remote desktop false until a reviewed hosted relay is deployed. | Pairing foundations alone do not prove safe production control. |
