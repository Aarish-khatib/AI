# Builder and coding-agent architecture

Build Studio stores account-scoped virtual files, stack metadata, repository
fingerprints, immutable checkpoints, last-known-good state, build status, and
logs. Imports and exports are bounded, CRC-checked ZIPs.

Static previews are `srcdoc` documents inside opaque sandboxed iframes. CSP
denies networking, forms, objects, base URLs, and external resources; the
iframe receives no same-origin, navigation, modal, download, or parent
privilege. Framework projects keep their real source and require an approved
build runtime rather than faking a rendered result.

The autonomous agent foundation indexes safe source, plans changes, fingerprints
the repository, checkpoints before mutation, and classifies commands. Reads are
bounded; writes and commands require exact approval; destructive, privileged,
persistence, and remote-push commands are blocked. Cloud run/step tables are
owner isolated with RLS.
