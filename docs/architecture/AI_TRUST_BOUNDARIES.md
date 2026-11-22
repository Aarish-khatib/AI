# AI integration trust boundaries

This is a **developer review checklist**, not an audit certification. Limitless AI v2 supports optional external AI providers, local/browser workspaces, user-supplied keys, and optional Supabase synchronization. Each boundary below should be checked against the current implementation before release.

## Data-flow boundaries

| Boundary | Risk to review | Expected behavior to verify |
| --- | --- | --- |
| Browser workspace → external model provider | Private prompts, attachments, or context leave the device | Make the selected provider and transmitted content clear; do not silently send local artifacts |
| User key vault → provider request | API key exposure in logs, URLs, analytics, or exports | Keep keys out of URLs, diagnostic output, shared artifacts, and repository files |
| Provider response → rendered UI | Untrusted HTML, Markdown, tool instructions, and links | Render safely; treat model output as data, not executable authority |
| Model/tool suggestion → local or remote action | Prompt injection causing file, network, or account changes | Require scoped authorization for consequential actions; validate arguments independently |
| Browser storage → application state | Malformed, stale, or attacker-controlled persisted data | Validate schemas and versions; recover without data loss where possible |
| Anonymous workspace → signed-in account | Cross-user or cross-tenant data leakage | Test identity transitions and owner isolation before synchronization |
| Client → Supabase | Privilege escalation or unauthorized row access | Enforce authorization server-side with RLS; never rely solely on UI checks |
| Provider route → paid endpoint | Unexpected charges or fallback to unknown-cost models | Verify the default spending lock fails closed, including retries and fallbacks |
| Desktop companion → local filesystem | Unintended access to private paths | Require origin-bound pairing, narrow paths, and explicit approval for sensitive actions |

## Release-oriented checks

1. **Prompt injection:** Feed a retrieved document that says to reveal secrets or execute a tool call. Confirm the application does not grant it authority.
2. **Secret handling:** Exercise success, failure, retry, and cancellation paths with a synthetic key. Inspect browser-visible logs, exported diagnostics, and generated artifacts for leakage.
3. **Cost controls:** With the spending lock enabled, simulate missing prices, unavailable free routes, and provider errors. Confirm no paid request is sent.
4. **Provider failure:** Simulate timeouts, partial streams, malformed responses, and cancellation. Verify that partial content is labeled correctly and retries do not duplicate actions.
5. **Isolation:** Switch between anonymous and authenticated workspaces and between two test users. Verify no data is visible to the wrong identity.
6. **Sync conflicts:** Simulate stale revisions and offline edits. Verify conflict handling preserves recoverable user data.
7. **Companion permissions:** Try an expired pairing token, an unapproved path, and a mismatched origin. Verify requests fail closed.
8. **Import/render safety:** Test untrusted Markdown, HTML, document imports, and filenames containing traversal sequences. Verify sanitization and bounded processing.

## Evidence to record

For each release, record the tested commit SHA, environment, command or manual steps, result, and any unresolved limitation. A README feature claim or the existence of a validation script is **not** evidence that the check passed. Avoid publishing logs containing keys, private prompts, personal information, or user documents.

## Scope

This checklist does not assert that any particular control is implemented correctly. See the repository README and `docs/limitless-v2/FEATURE_MATRIX.yaml` for intended functionality and documented limitations; use source review and actual test output for verification.
