# Limitless AI Desktop

This is a real Tauri 2 source project for Windows and macOS. Device credentials
are stored in the operating-system keychain. Builds and updater artifacts remain
CI-configured until signing identities, notarization credentials, updater
endpoint, and updater public key are supplied by the owner. The checked-in
configuration keeps updates disabled and contains no placeholder endpoint. The
release workflow validates and injects the real HTTPS endpoint and public key
only inside the signed release job.

Remote control is off by default. Pairing, session approval, expiry, revocation,
visible active state, and emergency stop are mandatory server contracts.
