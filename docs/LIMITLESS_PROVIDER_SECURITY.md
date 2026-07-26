# Provider security

- Secrets are encrypted per local account workspace and excluded from sync,
  backups, exports, diagnostics, logs, and public environment variables.
- Auth headers are adapter-owned; cookie, host, proxy, forwarded, origin,
  referer, transfer, and browser security headers cannot be forwarded.
- Remote compatible endpoints require HTTPS and cannot embed credentials.
- Provider verification uses a model-catalog request and does not run a model.
- Free and paid execution graphs are disjoint.
- Rate limits, cooldowns, bounded failover, task deduplication, and interrupted
  paid-request non-replay prevent request storms and duplicate spending.
- Errors are normalized and credential-shaped values are redacted.

Server-side compatible gateways must additionally resolve and pin DNS, re-check
redirect targets, enforce egress allowlists, and limit response sizes.
