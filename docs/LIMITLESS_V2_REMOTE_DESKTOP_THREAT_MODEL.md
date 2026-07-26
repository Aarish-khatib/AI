# Remote desktop threat model

Protected assets are device files, screens, credentials, sessions, project
source, clipboard data, and user attention. Threats include stolen pairing
codes, replay, malicious local origins, expired devices, overbroad permissions,
hidden recording, unattended control, and credential reuse.

Controls are short-lived one-time hashed pairing codes, five-attempt lockout,
authenticated ownership, OS-keychain device credentials, credential versioning,
per-session permissions, short expiry and idle expiry, visible active state,
revocation, and emergency stop. Remote sessions are off by default and the
release flag remains false.

The included implementation is a security and pairing foundation, not an active
production remote-control service. Enabling screen capture or control still
requires a reviewed signaling/relay deployment, platform permission prompts,
visible indicators, TURN policy, penetration testing, and owner approval.
