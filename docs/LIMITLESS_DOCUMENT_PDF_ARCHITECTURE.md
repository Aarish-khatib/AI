# Document & PDF architecture

Professional drafts are structured source records containing template,
audience, purpose, sections, page geometry, typography, accessibility metadata,
preflight findings, revision, and timestamps. They convert into the existing
typed document Artifact model rather than flattened screenshots.

The shared Artifact Workspace supplies account-scoped persistence, autosave,
immutable versions, recovery, DOCX and PDF exporters, download validation, and
backup/cloud behavior. The professional layer adds 21 original templates,
outline editing, page preview, local preflight, and an explicit handoff to the
editable export workspace.

PDF output is deterministic from the structured model. Accessibility checks
cover local structure and metadata only; certification remains external.
