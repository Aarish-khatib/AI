# LIMITLESS AI v2: COMPLETE ONE-SHOT AUTONOMOUS MASTER PROMPT

You are the lead autonomous engineering agent responsible for upgrading the existing production repository from **Limitless AI v5** to **Limitless AI v2**.


The upgrade must also make Limitless AI capable of producing highly professional,
original, realistic websites and applications, including advanced 3D and
interactive experiences when requested. Website/app creation must automatically
enter the dedicated Limitless Build Studio with chat and a live project
workspace visible together, real editable source files, secure preview,
validation, version history, project ZIP download, and optional user-approved
publishing.


The owner is not expected to manually assemble, wire, configure, or repeatedly
guide this upgrade.

Operate under a ZERO-TOUCH IMPLEMENTATION PRINCIPLE:

- Perform every repository edit yourself.
- Create every required file yourself.
- Install and configure dependencies yourself when safe.
- Create migrations, policies, schemas, setup scripts, CI workflows, example
  configuration, tests, documentation, and recovery tooling yourself.
- Detect the existing package manager, framework, environment, deployment
  system, Supabase structure, and project conventions automatically.
- Reuse existing connected infrastructure wherever safe.
- Prefer built-in, local, browser-based, self-hosted, or free-first fallbacks
  when external services are unavailable.
- Do not ask the owner to manually copy code between files, create folders,
  write SQL, repair configuration, or perform repetitive setup that the agent
  can complete.
- Reduce unavoidable owner actions to the smallest possible set of simple
  approvals, account authorizations, credential entry, or platform-specific
  signing steps.
- Never claim that an external service is connected when credentials or account
  authorization are still missing.
- When a service cannot be activated automatically, complete the full code,
  interface, validation, fallback, setup wizard, and exact one-action activation
  path so the feature is ready immediately after authorization.


The owner has a limited GPT Work usage window and intends to complete this
upgrade within five sessions or fewer.


The owner has access to GPT Work through a one-month ChatGPT Plus subscription.


GPT Work may operate inside an isolated or temporary execution environment.

Do not assume that it can push to GitHub, preserve local Git commits between
sessions, access the owner's normal filesystem, or directly modify the
production repository.

When direct persistence is unavailable, the agent must produce one complete,
downloadable, portable handoff bundle containing every changed file, migration,
test, document, manifest, patch, and exact resume record required for the owner
to upload or push with minimal effort.

Do not waste model usage repeatedly attempting unsupported Git, deployment, or
filesystem operations.


The complete Limitless AI v2 upgrade must therefore be organized to reach the
strongest genuinely complete state within 30 calendar days or less.

This deadline does not permit removing requirements, weakening security,
skipping migrations, faking functionality, omitting tests, or claiming
incomplete foundations are production complete.

Use the month as an execution deadline, not as permission to cut scope.


Operate under a TOKEN-EFFICIENT, USAGE-EFFICIENT, NO-CORNER-CUTTING PRINCIPLE:

- Minimize unnecessary model tokens, repeated analysis, repeated repository
  scans, repeated explanations, and duplicate implementation.
- Preserve every requirement in this specification.
- Do not reduce scope merely to save tokens.
- Do not skip security, migrations, tests, validation, data protection, or
  recovery requirements.
- Do not replace real implementation with placeholders.
- Use tools, indexes, diffs, tests, static analysis, and targeted repository
  searches instead of repeatedly reasoning from scratch.
- Spend the highest reasoning effort only on architecture, security, complex
  debugging, migrations, provider routing, concurrency, data integrity, and
  difficult integration.
- Use concise execution notes and machine-readable progress instead of long
  narrative updates.
- Prefer complete vertical slices over broad unfinished scaffolding.
- Reuse verified decisions and outputs instead of regenerating them.
- Continue automatically and preserve exact resume points between sessions.

This entire prompt is the complete, authoritative specification. Read it completely before modifying anything. Do not rely on a partial reading, keyword scan, summary, cached assumption, or a plan generated before the repository audit.

Before making code changes:

1. Save or update this specification as `docs/LIMITLESS_V2_MASTER_SPEC.md`.
2. Create or update `docs/LIMITLESS_V2_PROGRESS.md`.
3. Create `docs/LIMITLESS_V2_IMPLEMENTATION_PLAN.md`.
4. Inspect the complete repository and current Git state.
5. Run the real baseline validation available in the repository.
6. Continue automatically into implementation.

Do not stop after producing a plan, audit, scaffold, mock-up, interface, placeholder, or partial demonstration.

Implement the complete upgrade as far as the available environment genuinely permits. Continue through all phases without asking me to resend later sections.

Only pause when one of these is genuinely necessary:

- A secret, external credential, certificate, or paid service is required and is not available.
- A destructive action requires approval.
- Production Supabase access or a production database mutation requires approval.
- A GitHub push, merge, release, production deployment, or domain change requires approval.
- An operating-system permission must be granted manually.
- Apple notarization or Windows signing credentials are required.
- A decision cannot be safely inferred from the existing codebase or this specification.

Do not repeatedly ask for permission for ordinary safe repository inspection, edits, dependency installation, targeted tests, lint, TypeScript checks, local builds, documentation, or checkpoint commits.

## Autonomous execution contract

Work in safe, recoverable phases. Keep the repository usable and buildable after every phase whenever technically possible.

For each phase:

1. Inspect the existing implementation and tests.
2. Identify reusable code and compatibility constraints.
3. Record the intended change briefly.
4. Implement real production code.
5. Add or update targeted tests.
6. Run relevant validation.
7. Fix regressions caused by the phase.
8. Update `docs/LIMITLESS_V2_PROGRESS.md`.
9. Create a safe checkpoint commit when Git identity is available.
10. Continue automatically.

Use vertical working slices rather than creating a large disconnected skeleton.

When specialist agents or subagents are available, coordinate separate workstreams for:

- Architecture and dependency audit
- Chat streaming and rendering performance
- Supabase schema, migrations, storage, authentication, and RLS
- Artifact Workspace and export engines
- Presentation, document, and spreadsheet editors
- Website builder and sandbox security
- Image/video generation and provider routing
- OpenRouter key-pool security and routing
- Tauri desktop application
- Pairing, sessions, device permissions, and relay design
- Coding agent
- Remote desktop transport and native controls
- Testing, accessibility, CI, security review, and release workflows
- Documentation and beginner setup

The lead agent owns integration. Do not allow multiple agents to edit the same core files independently without coordination.

## Git and production safety

Inspect the actual Git state before changing files.

If already inside a Git worktree, remain in it. Otherwise create or use a branch named:

`limitless-v2-upgrade`

Never modify, merge into, force-reset, push to, or deploy the production `main` branch without explicit approval.

Never silently run destructive commands such as:

- `git reset --hard`
- `git clean -fd`
- `git push --force`
- destructive database resets
- deleting uncommitted user work
- rewriting shared history
- disk formatting
- privilege escalation
- disabling security software
- opening unauthenticated public ports

Before major changes:

- Record `git status`
- Record the current commit
- Preserve pre-existing changes
- Create a recoverable baseline
- Never overwrite unrelated work

Create persistent Git checkpoints when available, otherwise create portable downloadable checkpoints after completed phases when safe. Never push or deploy without approval.

## Progress and resume requirements

Continuously maintain `docs/LIMITLESS_V2_PROGRESS.md` with:

- Current phase
- Completed tasks
- In-progress tasks
- Remaining tasks
- Decisions and trade-offs
- Files added, modified, and removed
- Dependencies added and why
- Migrations created
- Tests and commands run
- Passed tests
- Failed tests
- Tests not run
- Environment limitations
- External credentials or infrastructure still needed
- Exact next action
- Exact resume instruction

If a model limit, tool limit, crash, or interruption is approaching:

1. Finish the current safe atomic change.
2. Save all files.
3. Run the most relevant targeted validation.
4. Update the progress file.
5. Commit locally only when persistent Git is available; otherwise export the portable checkpoint bundle.
6. Record the exact resume point.

Do not leave important knowledge only in chat memory.

## Truthfulness and definition of completion

Do not fabricate successful tests, binaries, deployments, provider access, signing, releases, quotas, or generated outputs.

A feature is not complete merely because:

- A page or button exists
- A TypeScript interface exists
- A database table exists
- A mock card renders
- A route returns sample data
- A placeholder says “coming soon”
- A download link points nowhere
- A test only checks mocked output
- An export is empty or invalid
- A desktop app is only a browser wrapper
- A security-sensitive feature has no enforcement layer

Use these labels honestly:

- Production functional
- Locally functional
- Foundation implemented
- CI-configured but not built here
- Requires credentials
- Requires production infrastructure
- Not verified
- Blocked

Never describe scaffolding as a completed production feature.

## Interpretation rule

The requirements below are binding. When two requirements appear to conflict:

1. Preserve user data and security first.
2. Preserve existing working production functionality second.
3. Prefer official provider behavior and current documented APIs.
4. Prefer the safer, reversible implementation.
5. Record the decision in the progress file.

Do not weaken security or data isolation to satisfy a UI requirement.

---

# AUTHORITATIVE PRODUCT AND ENGINEERING SPECIFICATION

You are upgrading my existing production application, Limitless AI v5, into a major release named:

LIMITLESS AI v2

This is an upgrade of the existing repository, not a new demo and not a rebuild from scratch.

You must inspect the complete current repository before changing anything. Preserve every working v5 feature, existing user account, conversation, project, asset, provider, backup, browser migration, Supabase integration, storage policy, security control and deployment configuration unless this prompt explicitly tells you to remove it.

The final application must remain deployable on Vercel and must continue using the existing Supabase project safely.

IMPORTANT AUTONOMOUS WORKING METHOD

Do not attempt one enormous uncontrolled rewrite.

Work in safe phases and keep the project runnable after every phase:

Phase 0: Audit and safety baseline
Phase 1: Streaming and interface improvements
Phase 2: Remove obsolete and broken features
Phase 3: Universal Artifact Workspace
Phase 4: Image/video improvements and compliant OpenRouter multi-key routing
Phase 5: Limitless Desktop architecture and pairing
Phase 6: Coding agent and remote desktop
Phase 7: Testing, documentation and release preparation

Before each phase:

1. Inspect the relevant existing files.
2. Explain briefly what will change.
3. Implement the change.
4. Run the available validation commands.
5. Fix all errors caused by the change.
6. Keep a short progress log in `docs/LIMITLESS_V2_PROGRESS.md`.
7. Continue automatically to the next phase unless a real external credential, certificate or unavailable platform blocks you.

Do not stop after writing a plan.

Do not only describe code that should be written. Modify the actual repository.

Do not fabricate successful tests, binaries, deployments, signing, provider access or release links.

When something cannot be completed in the current coding environment, implement everything that can be implemented, create the correct GitHub Actions workflow or build configuration, mark the limitation honestly and provide the exact command needed elsewhere.

Do not ask me to manually create files that you can create yourself.

Do not delete working functionality to make TypeScript or tests pass.

Do not replace complex features with fake placeholders.

Keep the application runnable throughout development.

==================================================
1. NON-NEGOTIABLE PRODUCT RULES
==================================================

Keep the current black-and-white minimalistic identity.

Do not redesign the entire interface.

Improve polish, animation, spacing, responsiveness, accessibility and usability while keeping the current Limitless AI design recognizable.

Avoid:

- Bright or excessive colours
- Excessive gradients
- Glassmorphism
- Unnecessary popups
- Oversized cards
- Distracting animations
- Fake loading delays
- Fake AI reasoning
- Fake generated files
- Buttons that do nothing
- Hardcoded demonstration results

All major features must work from the central chat and also have dedicated workspace pages.

All new features must support, where applicable:

- Autosave
- Undo and redo
- Version history
- Retry
- Cancellation
- Recovery after refresh
- Clear loading states
- Safe error messages
- Keyboard navigation
- Screen-reader labels
- Mobile responsiveness
- Permission checks
- Data isolation
- Proper empty states
- Real exports
- No silent data loss

Use the existing technology stack wherever practical. Do not replace the whole framework unnecessarily.

Add heavy editor libraries through lazy loading and dynamic imports so the normal chat page stays fast.

Use feature flags for large unfinished modules so partially completed features cannot break production.

==================================================
2. PHASE 0: REPOSITORY AUDIT AND SAFETY BASELINE
==================================================

Before implementation, inspect and document:

- Framework and package versions
- Application routes
- Chat architecture
- AI provider architecture
- Streaming implementation
- Supabase client and server setup
- Authentication flow
- Database migrations
- Row Level Security policies
- Storage buckets and policies
- Local browser storage
- Existing migration from v4.1
- Backup and recovery implementation
- Image generation
- Video generation
- Existing editors
- Project and asset storage
- Background jobs
- Settings
- Website ZIP download functionality
- Broken optional cloud-sync email flow
- Existing desktop agent code
- Current tests
- Current build commands
- Vercel configuration
- Existing secrets and environment variables

Create:

`docs/LIMITLESS_V2_ARCHITECTURE_AUDIT.md`

The audit must clearly separate:

- Working features
- Partially working features
- Broken features
- Security-sensitive features
- Features that can be reused
- Features that require replacement

Create a safe baseline by running the existing:

- Install command
- Lint
- TypeScript check
- Tests
- Production build

Record the real baseline results.

Create new migrations for all database changes. Never edit an already-applied migration.

Never perform destructive database operations without a safe migration path.

==================================================
3. PHASE 1: REBUILD AI RESPONSE STREAMING
==================================================

The current AI response animation is slow, glitchy and visually rough.

Replace it with a polished streaming experience inspired by the quality of ChatGPT, Claude and Gemini, without copying their branding or layouts.

Requirements:

- Stream tokens or sensible text chunks
- Never animate one character at a time
- Minimise time to first visible output
- Prevent flickering
- Prevent duplicated text
- Prevent lost text after reconnecting
- Prevent broken Markdown during generation
- Avoid replacing the complete message on every token
- Batch rendering updates for performance
- Keep paragraphs readable while they stream
- Render code blocks progressively and safely
- Render tables without overflowing the conversation
- Preserve scroll position when the user scrolls upward
- Auto-scroll only when the user is already near the bottom
- Do not repeatedly snap the page downward
- Add a subtle monochrome streaming cursor
- Remove the cursor when generation completes
- Virtualise very long conversations
- Lazy-load heavy message content
- Avoid decoding or rendering off-screen videos unnecessarily
- Clean up stale object URLs and event listeners
- Support network interruption recovery
- Prevent duplicate assistant messages after retrying
- Allow cancellation through `AbortController`
- Ensure cancellation reaches provider adapters where supported

Add polished controls:

- Stop
- Continue
- Retry
- Regenerate
- Copy
- Edit user message
- Branch conversation
- Expand long response
- Collapse long response

Add meaningful tool states:

- Connecting
- Thinking
- Searching
- Reading attachment
- Creating image
- Creating video
- Creating presentation
- Creating document
- Building website
- Running code
- Waiting for desktop approval
- Exporting
- Syncing
- Reconnecting

Do not show private chain-of-thought.

Do not display fake progress percentages when the provider does not provide measurable progress. Use indeterminate progress instead.

Build a provider-neutral streaming adapter so OpenRouter and future providers use the same stable message-event format.

Suggested internal events:

- `message.started`
- `message.delta`
- `message.completed`
- `message.failed`
- `tool.started`
- `tool.progress`
- `tool.completed`
- `tool.failed`
- `artifact.created`
- `artifact.updated`

Acceptance criteria:

- No character-by-character typing
- No visible text duplication
- No page jumping
- Markdown stays readable during streaming
- Stop works
- Retry does not duplicate messages
- Long chats remain responsive
- Mobile chat remains usable

==================================================
4. PHASE 2: REMOVE OBSOLETE AND BROKEN FEATURES
==================================================

A. REMOVE LIMITLESS SOURCE-CODE ZIP DOWNLOAD

The current Settings section allows users to download the complete Limitless AI website source code as a ZIP.

Remove this feature completely.

Remove:

- Settings button
- Menu item
- Client code
- Server action
- API route
- Archive-building code
- Old endpoint
- Unused dependency
- Documentation reference
- Translation string
- Test fixture
- Any alternate path exposing the production source archive

Search the entire repository for related references.

Old download endpoints must return a safe 404 or authorization failure.

Users must still be able to export websites they personally create through the Website Builder.

Do not confuse user-created website export with downloading the Limitless AI platform source.

B. REMOVE BROKEN OPTIONAL CLOUD-SYNC EMAIL FLOW

The current optional cloud-sync system asks the user for an email address and then produces:

`Invalid path specified in request URL`

Remove this separate email-only cloud-sync flow completely.

Remove:

- Email prompt
- Broken request
- Obsolete endpoint
- Dead client functions
- Dead server functions
- Unused environment checks
- Obsolete UI
- Unused database references, only when confirmed unused elsewhere

Do not remove or damage normal Supabase authentication.

Keep proper account-based synchronization:

- Signed-out users use local storage
- Signed-in users sync through their authenticated Supabase account
- Existing `Sync now` functionality remains
- Browser migration remains
- Recovery snapshots remain
- Conflict-safe syncing remains

Show proper sync state:

- Local only
- Syncing
- Synced
- Offline
- Conflict detected
- Sync failed

Never silently overwrite newer data.

Acceptance criteria:

- No website-source ZIP option remains
- Old ZIP endpoint is inaccessible
- No email-only cloud-sync prompt remains
- Supabase sign-in still works
- Signed-in synchronization still works
- Signed-out local mode still works

==================================================
5. PHASE 3: UNIVERSAL ARTIFACT WORKSPACE
==================================================

Create a major system called:

ARTIFACT WORKSPACE

Users must be able to create and edit these directly through chat:

- Presentations
- Documents
- PDFs
- Spreadsheets
- Websites
- Reports
- Notes
- Forms
- Charts
- Diagrams
- Code projects

Examples:

- Create a 12-slide presentation about renewable energy
- Edit slide 4
- Add a comparison chart
- Make the presentation more professional
- Turn this report into a presentation
- Create a school project document
- Fix the formatting
- Export this to DOCX and PDF
- Build a responsive website for my business
- Add a contact form
- Change the website to a black-and-white style
- Create a spreadsheet from this data
- Add formulas and charts
- Continue editing the artifact from earlier

Every artifact must have:

- Stable artifact ID
- Owner ID
- Type
- Title
- Structured content
- Current version ID
- Created timestamp
- Updated timestamp
- Autosave state
- Export state
- Thumbnail where appropriate

Every edit must create or update a real structured version.

The AI must update the existing artifact when the user refers to it later. It must not create an unrelated new copy unless requested.

Each artifact appears in chat as an interactive card with:

- Preview
- Open editor
- Rename
- Duplicate
- Continue editing with AI
- Version history
- Restore version
- Export
- Download
- Delete with confirmation

Add dedicated routes or menus for:

- Presentations
- Documents
- Spreadsheets
- Websites
- All artifacts

Use a shared artifact shell for:

- Toolbar
- Autosave
- Undo and redo
- Version history
- Export jobs
- AI editing
- Sharing controls
- Recovery
- Permissions

Store structured data rather than only final binary files.

Store large binary exports in private Supabase Storage, not directly in database rows.

Use signed URLs with short expiry for private downloads.

Add new safe SQL migrations for:

- `artifacts`
- `artifact_versions`
- `artifact_exports`
- `artifact_assets`
- `artifact_collaborators` only if sharing is implemented
- Background export jobs

Add complete RLS so users cannot access another user’s private artifacts.

==================================================
6. PRESENTATION EDITOR
==================================================

Create a real browser presentation editor.

Required:

- Slide navigator
- Drag-and-drop reordering
- Add slide
- Duplicate slide
- Delete slide
- Multiple layouts
- Themes
- Editable text boxes
- Images
- Shapes
- Icons
- Tables
- Charts
- Diagrams
- Background settings
- Speaker notes
- Presenter preview
- Undo and redo
- Autosave
- Version history
- AI editing
- Regenerate selected slide
- Regenerate selected element
- Apply a theme to all slides
- Export to real PPTX
- Export to PDF
- Export individual slides as PNG

PPTX export must create a valid PowerPoint file.

Do not export flat screenshots and call them an editable presentation.

Maintain editable text, images, tables and charts in PPTX wherever technically practical.

Use a reliable maintained library such as PptxGenJS if it fits the current stack.

==================================================
7. DOCUMENT EDITOR
==================================================

Create a real rich-text document editor.

Required:

- Headings
- Paragraph styles
- Lists
- Tables
- Images
- Captions
- Links
- Citations
- Headers
- Footers
- Page numbers
- Page breaks
- Comments
- Find and replace
- Word count
- Undo and redo
- Autosave
- Version history
- AI rewrite
- AI shorten
- AI expand
- AI grammar correction
- AI formatting
- Export to DOCX
- Export to PDF
- Export to Markdown
- Export to HTML
- Import DOCX when practical

Keep document content editable after generation.

Use a structured editor model rather than storing only HTML.

==================================================
8. SPREADSHEET EDITOR
==================================================

Create a functional spreadsheet editor.

Required:

- Multiple sheets
- Editable cells
- Rows and columns
- Formula bar
- Common formulas
- Formatting
- Sorting
- Filtering
- Freeze panes
- Tables
- Charts
- CSV import and export
- XLSX import and export
- AI data cleanup
- AI formula generation
- AI analysis
- AI chart suggestions
- Undo and redo
- Autosave
- Version history

Do not use a static HTML table as a fake spreadsheet.

Validate formulas and prevent formulas from accessing application secrets.

==================================================
9. WEBSITE BUILDER
==================================================

Create a browser-based website and web-app builder.

Required:

- Generate from a prompt
- Multi-page projects
- File tree
- Visual preview
- Code editor
- Component structure
- Asset management
- Desktop preview
- Tablet preview
- Mobile preview
- Live reload
- Error overlay
- Console output
- AI editing of selected elements
- AI code editing
- Undo and redo
- Version history
- Export complete project as ZIP
- Export static HTML when appropriate
- Optional deployment integration
- Sandboxed preview

Generated previews must run in a restrictive sandbox.

Do not allow preview code to access:

- Supabase session tokens
- OpenRouter keys
- Pollinations keys
- Application cookies
- Private storage
- Parent-window APIs that are not explicitly allowed

User-created website ZIP export must remain available.

The Limitless AI platform source ZIP must not be available.

==================================================
10. PHASE 4: IMAGE AND VIDEO GENERATION
==================================================

Improve image, video, animation and related editing to the strongest practical level available.

The system must be free-first, not falsely advertised as permanently unlimited or premium-quality for free.

Keep `Never Spend`.

When Never Spend is enabled:

- Never use paid models
- Never use routes with unknown pricing
- Never silently spend user credits
- Never silently switch to a paid model
- Explain when no safe free route is available
- Offer local or browser fallbacks where supported

Improve:

IMAGE

- Text-to-image
- Image-to-image
- Reference images
- Inpainting
- Outpainting
- Object removal
- Background removal
- Background replacement
- Variations
- Upscaling
- Transparent PNG
- Aspect ratios
- Resolution controls
- Seed when supported
- Negative prompt when supported
- Style controls
- Fast, Balanced and Highest Available quality modes

VIDEO

- Text-to-video
- Image-to-video
- Video variations
- Motion strength
- Camera controls
- Video extension when supported
- Frame interpolation
- Upscaling
- Captions
- Audio tracks
- Voiceover import
- Transitions
- Effects
- Timeline editing
- Browser motion-video fallback

Add optional prompt enhancement:

- Preserve the user’s main subject
- Preserve named details
- Preserve requested text
- Do not silently change identity, count or composition
- Let the user inspect and edit the enhanced prompt
- Let the user disable enhancement

Upgrade the provider registry.

Each provider adapter must expose capabilities such as:

- Input types
- Output types
- Cost status
- Pricing confidence
- Availability
- Authentication requirement
- Supported resolutions
- Supported durations
- Editing support
- Streaming support
- Average reliability
- Average latency

Routing should consider:

- Never Spend mode
- User preference
- Cost
- Free quota
- Model availability
- Rate limit
- Requested quality
- Requested speed
- Output type
- Privacy
- Reliability
- Provider health

Implement:

- Health checks
- Circuit breaker
- Retry with exponential backoff
- Fallback routing
- Maximum retry count
- Cancellation
- Persistent background jobs
- Resume after refresh
- Progress events
- Generation history
- Version history
- Reusable assets
- Provider disclosure
- Model disclosure
- Error explanations

Do not create infinite retry loops.

Do not expose provider private keys in the browser.

Each user’s OpenRouter key must remain stored through the existing encrypted key system.

Never place OpenRouter, service-role, Pollinations secret or relay credentials in public environment variables.

==================================================
10A. OPENROUTER MULTI-KEY POOL AND QUALITY ROUTING
==================================================

Add secure support for up to three OpenRouter API-key slots per Limitless AI account:

- Slot 1: Primary key, required only for users who choose OpenRouter-backed features
- Slot 2: Optional backup key
- Slot 3: Optional backup key

Do not make an OpenRouter key mandatory for users who only use other supported providers, local features, artifacts, or browser fallbacks.

The Settings interface must clearly explain:

- Users may add one, two, or three keys
- Each key must be owned or legitimately administered by that user or their organization
- Keys may belong to separate accounts only when this is permitted by the provider's current terms and policies
- The system must not encourage account farming, quota evasion, rate-limit circumvention, or creation of extra accounts to bypass provider restrictions
- Multiple keys improve resilience, failover, workload distribution, and optional quality comparison, but do not guarantee unlimited usage
- Provider limits, model availability, pricing, and free quotas can still apply independently to every key

Never describe this feature as unlimited, near-unlimited, or a way to bypass limits.

KEY-VAULT REQUIREMENTS

Reuse and strengthen the existing encrypted key vault.

For each key slot, store only encrypted key material and safe metadata such as:

- Slot ID
- User-defined label
- Masked suffix
- Enabled or disabled state
- Health state
- Last successful use
- Last failure
- Cooldown-until timestamp
- Consecutive failure count
- Optional user-defined priority

Never expose full keys in:

- Client logs
- Server logs
- Analytics
- Error messages
- Browser bundles
- Database plaintext
- Exported backups
- Screenshots
- Public environment variables

Provide controls to:

- Add a key
- Test a key
- Replace a key
- Disable a key
- Remove a key
- Reorder priority
- View masked status
- View rate-limit or cooldown state when safely known

Require re-authentication or another suitable confirmation before revealing, replacing, or deleting sensitive key material.

ROUTING BEHAVIOR

Create a provider-neutral OpenRouter key-pool manager.

Normal requests must use one suitable key at a time, not send the same request through all keys by default.

Select a key using a safe policy that considers:

- Enabled state
- Current cooldown
- Recent 401, 402, 403, 408, 429, and 5xx failures
- Retry-After headers
- User priority
- Model compatibility
- Remaining quota only when the provider exposes it reliably
- Never Spend mode
- Requested latency and quality
- Recent reliability

Use least-loaded or weighted round-robin routing among healthy eligible keys.

When a request fails:

- Do not retry endlessly
- Respect Retry-After
- Put rate-limited keys into cooldown
- Do not repeatedly retry invalid or unauthorized keys
- Fail over to another eligible key only when the request is safe to retry
- Use idempotency protection to avoid duplicate generations or duplicate charges
- Preserve the same job and message identity during failover
- Clearly disclose that failover occurred without revealing key details

Do not split one streamed response across different keys mid-generation unless the provider protocol and application logic explicitly support safe continuation. Prefer restarting safely with clear status when continuation is impossible.

QUALITY BOOST MODE

Add an optional mode named:

Quality Boost

It must be disabled by default.

When enabled, and only when the user has explicitly allowed it, the system may use up to three eligible keys or models for independent candidate generation, evaluation, or synthesis when this can genuinely improve quality.

Examples:

- Generate multiple image prompt candidates, then select the strongest
- Compare multiple text answers and synthesize one final response
- Produce alternative website layouts
- Generate multiple presentation outlines before creating the final deck
- Use a critic model to review a draft

Quality Boost must:

- Show that multiple requests may be made
- Show the maximum number of calls before execution
- Respect Never Spend across every call
- Use only free routes when Never Spend is enabled
- Never use unknown-cost routes in Never Spend mode
- Avoid redundant calls for simple requests
- Allow cancellation
- Record which provider/model produced each candidate without exposing key identity
- Stop early when a sufficiently strong result is found
- Enforce a strict request budget per task

Do not use all three keys simultaneously for every message, image, video, or artifact. That would waste quotas and may create duplicate charges.

FREE-FIRST AND NEVER-SPEND RULES

Never Spend applies to the complete key pool, not only the primary slot.

When Never Spend is enabled:

- Every candidate route on every key must be verified as free
- Unknown pricing is rejected
- Paid fallback is forbidden
- Quality Boost may only use free routes
- The UI must explain when no safe free route is currently available

When Never Spend is disabled:

- Display a clear cost warning before multi-call Quality Boost tasks
- Respect any user-defined per-request and daily budget
- Never silently multiply paid requests across all keys

USAGE AND STATUS UI

Add a compact OpenRouter Key Pool section in Settings showing:

- Primary, Backup 1, Backup 2
- Connected, invalid, rate-limited, cooling down, disabled, or untested
- Masked key ending
- Last checked time
- Preferred priority
- Test button
- Remove button
- Quality Boost toggle
- Per-task request budget

Add a non-sensitive status indicator in generation details showing:

- OpenRouter route used
- Model
- Whether failover occurred
- Whether Quality Boost was used
- Number of candidate calls
- Never Spend enforcement status

Never expose which account or raw key was used.

CONCURRENCY AND ABUSE PROTECTION

Implement:

- Per-user concurrency limits
- Per-key concurrency limits
- Global job limits
- Backpressure
- Cooldowns
- Exponential backoff with jitter
- Request deduplication
- Idempotency keys
- Cancellation propagation
- Maximum candidate counts
- Maximum retry counts
- Audit events without secret material

Do not:

- Automatically create OpenRouter accounts
- Rotate keys to evade a provider ban
- Ignore provider rate-limit headers
- Retry through every key after an authorization failure that indicates an account-level restriction
- Use keys belonging to unrelated users
- Share one user's key pool with another user
- Claim that three keys guarantee uninterrupted service

DATABASE AND SYNC

Prefer the existing encrypted key-vault architecture.

If key metadata must be synchronized across devices:

- Sync only encrypted key blobs and non-sensitive metadata
- Use authenticated ownership checks and RLS
- Never store plaintext keys server-side
- Never include keys in ordinary backups unless the backup is strongly encrypted and the user explicitly chooses to include them
- Preserve per-device local-only storage as an option

Add migrations only if genuinely required. Never modify old applied migrations.

TESTING REQUIREMENTS

Add tests for:

- One-key operation
- Two-key failover
- Three-key failover
- Invalid primary key with healthy backup
- 429 cooldown and Retry-After handling
- 401 or 403 invalid-key handling
- 5xx retry limits
- Idempotency during failover
- No duplicate assistant messages
- No duplicate image or video jobs
- Never Spend across all slots
- Quality Boost request-budget enforcement
- Cancellation across candidate calls
- Per-user key isolation
- Encrypted storage
- Secret redaction
- Removal and replacement of keys
- Disabled-key exclusion
- No plaintext key in browser bundles, logs, database rows, exports, or analytics

ACCEPTANCE CRITERIA

This feature is acceptable only when:

- One primary slot and two optional slots exist
- Normal routing works with only one key
- Backup keys are optional
- Healthy backup failover works
- Rate-limited keys cool down correctly
- Invalid keys are not retried endlessly
- Duplicate generations are prevented
- Quality Boost is explicit and disabled by default
- Never Spend is enforced across all keys and all candidate calls
- No UI or documentation promises unlimited usage
- No part of the implementation encourages quota bypass or account farming
- Keys remain private and isolated per user
- Users can test, disable, replace, reorder, and remove their own keys

==================================================
11. PHASE 5: LIMITLESS DESKTOP
==================================================

Create a real downloadable desktop application named:

LIMITLESS DESKTOP

Use Tauri 2 unless the current architecture provides a clearly better secure alternative.

Support:

- Windows 10
- Windows 11
- Current supported macOS versions
- Apple Silicon where possible
- Intel macOS where possible

WINDOWS

Provide configuration for:

- Standard installer EXE
- Standalone executable when practical
- Clean installation
- Clean uninstallation
- Automatic update checking
- User-approved updates only

Users must not need to install:

- Node.js
- Rust
- Python
- Git

for ordinary installation and remote-control use.

MACOS

Provide configuration for:

- DMG or normal application bundle
- Apple Silicon build
- Intel build where supported
- Permission descriptions
- Signing instructions
- Notarisation instructions

Never claim a binary is signed unless it is actually signed.

If the current environment cannot build Windows or macOS binaries, create correct GitHub Actions workflows that build them on the proper operating systems.

==================================================
12. DESKTOP DOWNLOAD LOCATIONS
==================================================

Add Limitless Desktop download access in:

1. Public homepage
2. Bottom of the chat sidebar or chat navigation
3. Desktop connection page
4. Settings under `Desktop App`

Keep it visible but not intrusive.

Homepage section:

`Bring Limitless AI to your computer`

Display:

- Download for Windows
- Download for macOS
- Supported operating systems
- Current version
- File size when known
- Checksum when known
- Release notes
- Basic installation instructions

Detect the visitor’s platform and highlight the matching version.

Always allow users to choose the other version.

Download buttons must point to real configured release assets.

Prefer GitHub Releases or another secure configured release system.

Do not add a fake `.exe` file.

If no real release exists yet, show an honest `Build not published yet` state in development. Do not publish a dead download button.

==================================================
13. ACCOUNT AND DEVICE PAIRING
==================================================

Users must connect Limitless Desktop to their Limitless AI account.

Support:

- One-time pairing code
- QR pairing
- Device naming
- Device list
- Device revocation
- Session expiration
- Pairing-code expiration
- Single-use codes
- Rate limiting
- Secure token rotation
- Encrypted credential storage
- Windows Credential Manager
- macOS Keychain

Pairing flow:

1. User signs into Limitless AI
2. User opens Desktop Devices
3. User selects Pair new device
4. Server creates a short-lived single-use code
5. Browser shows the code and QR
6. User enters or scans it in Limitless Desktop
7. Desktop shows requested permissions
8. User approves
9. Device appears in the account
10. User can revoke it at any time

Prevent:

- Pairing-code reuse
- Brute-force code guessing
- Pairing without approval
- Session fixation
- Plain-text credential storage
- Long-lived unrotated access tokens

Add safe database migrations for:

- `desktop_devices`
- `desktop_pairing_codes`
- `desktop_sessions`
- `desktop_permissions`
- `remote_sessions`
- `desktop_audit_events`
- `coding_jobs`
- `coding_job_events`

Use strict RLS.

Sensitive token hashes must be stored instead of raw tokens where practical.

==================================================
14. PHASE 6: CODING AGENT
==================================================

Add a coding-agent workflow inspired by modern coding assistants such as Codex and Cursor, without copying proprietary code, branding or interfaces.

Support:

- Open a local folder
- Open a Git repository
- Read project structure
- Search files
- Read files
- Create files
- Edit files
- Rename files
- Move files
- Delete files with confirmation
- Generate patches
- Preview diffs
- Apply or reject changes
- Run terminal commands
- Run tests
- Run lint
- Run builds
- Read errors and logs
- Git status
- Git diff
- Create a commit after approval
- Never push without explicit approval
- Cancellation
- Background jobs
- Job recovery
- Audit history
- Browser-chat progress streaming

Example browser requests:

- Open my project and find the login error
- Fix the TypeScript errors
- Run the tests
- Explain why the build failed
- Create a new page
- Show me the diff before applying it
- Do not modify database code
- Revert the last coding-agent change

Permission levels:

1. Read only
2. Edit files
3. Run approved safe commands
4. Request approval for every command
5. Elevated action requiring explicit confirmation

Before changing files:

- Take a local recovery snapshot or Git diff baseline
- Show affected files
- Allow cancellation

Before destructive commands:

- Show the exact command
- Explain the effect
- Require confirmation

Never silently run:

- Disk formatting
- Account creation
- Credential modification
- Firewall disabling
- Antivirus disabling
- Privilege escalation
- Hidden persistence
- Destructive Git commands
- Remote pushes
- Secret extraction

Respect:

- `.gitignore`
- Repository instruction files
- Existing code conventions
- User-specified protected paths

Redact secrets from logs and chat output.

==================================================
15. REMOTE DESKTOP
==================================================

Add full remote-desktop control for the user’s own paired devices.

Capabilities:

- Screen viewing
- Mouse control
- Keyboard control
- Clipboard, with permission
- File browser
- File upload
- File download
- File editing
- Terminal access
- Application launching
- Window listing
- Screenshot capture
- Multi-monitor selection
- Resolution control
- Quality control
- Connection statistics
- Reconnection after brief loss
- Read-only mode
- Full-control mode
- Coding-agent mode

Security is mandatory.

Remote control must be disabled by default.

Require:

- Explicit device pairing
- Explicit permission categories
- Explicit session approval
- Visible active-session indicator
- Persistent tray or menu-bar icon
- Visible Stop session button
- Emergency disconnect shortcut
- Automatic idle timeout
- Maximum session duration
- Device revocation
- Session revocation
- Per-device permissions
- Per-session permissions
- Audit history

Permission categories:

- View screen
- Control mouse
- Control keyboard
- Clipboard read
- Clipboard write
- Browse files
- Upload files
- Download files
- Edit files
- Use terminal
- Launch applications
- Capture screenshots

Do not implement:

- Hidden control
- Invisible monitoring
- Hidden screenshots
- Undisclosed recording
- Permission-prompt bypass
- Security-control bypass
- Antivirus disabling
- Automatic privilege escalation
- Secret extraction
- Publicly exposed unauthenticated ports

Use encrypted communication.

Prefer:

- Authenticated WebRTC peer-to-peer connection
- Secure signalling
- Authenticated TURN relay fallback
- Short-lived session credentials

Protect signalling and relay infrastructure with:

- Authentication
- Authorization
- Rate limiting
- Replay protection
- Session validation
- Device validation
- Short-lived credentials
- Safe audit logs

Do not store screen content in normal server logs.

UNATTENDED ACCESS

Unattended access may be included only as a user-enabled option.

It must be:

- Disabled by default
- Explicitly enabled on the physical computer
- Protected by device authentication
- Protected by a separate PIN or operating-system authentication
- Clearly displayed as enabled
- Immediately revocable
- Never hidden
- Never silently enabled by the web application

==================================================
16. CHAT TOOL ROUTING
==================================================

All major capabilities must work from chat.

The system should recognise requests to:

- Chat
- Search
- Read files
- Generate images
- Edit images
- Generate video
- Edit video
- Create presentations
- Edit presentations
- Create documents
- Edit documents
- Create spreadsheets
- Analyse spreadsheets
- Build websites
- Edit websites
- Open a local project
- Run a coding task
- Connect to a paired computer
- Start screen viewing
- Request control
- Open a terminal
- Transfer files

Do not force users to select a tool manually for every request.

Use intent detection and tool routing.

For sensitive actions, show a confirmation request rather than immediately executing.

Every tool operation in chat should appear as a structured card containing:

- Action
- Status
- Progress
- Target
- Artifact or device
- Provider or execution location
- Permission request when needed
- Cancel
- Retry
- Open result
- Error details

The user must always understand whether work is running:

- In the browser
- On the server
- Through an external provider
- On their paired computer

==================================================
17. SECURITY AND DATA PROTECTION
==================================================

Never expose:

- Supabase service-role keys
- OpenRouter keys
- Pollinations secret keys
- Desktop relay secrets
- Signing credentials
- Provider private keys
- User credentials
- Pairing tokens
- Remote-session tokens

Never place secrets inside:

- `NEXT_PUBLIC_*`
- Client JavaScript bundles
- Git repository
- Logs
- Analytics events
- Exported backups
- Downloadable artifacts
- Error messages

All privileged Supabase operations must run server-side.

Use RLS for all user-owned data.

Add storage policies for private artifacts and desktop-related files.

Prevent users from:

- Reading another user’s artifacts
- Editing another user’s artifacts
- Accessing another user’s devices
- Starting sessions on another user’s devices
- Reading another user’s audit events
- Reusing pairing codes
- Creating privileged audit records from the client

Add rate limits for:

- Authentication
- Pairing
- Export generation
- Provider generation
- Remote-session creation
- Coding jobs
- Failed permission requests

Add CSRF protection where applicable.

Validate all API input with schemas.

Sanitise filenames and paths.

Prevent path traversal.

Prevent zip-slip during archive extraction.

Prevent generated websites from escaping their preview sandbox.

==================================================
18. PERFORMANCE
==================================================

Keep the main chat fast.

Implement:

- Route-based code splitting
- Dynamic imports
- Lazy-loaded editors
- Lazy-loaded media
- Virtualised message lists
- Virtualised asset lists
- Web Workers for heavy browser tasks
- Background export jobs
- Streaming downloads
- Cancellation
- Thumbnail generation
- Media cleanup
- Efficient caching
- Memory cleanup
- Object URL cleanup

Do not load presentation, spreadsheet, website-builder or remote-desktop libraries on the normal homepage until needed.

Do not store huge binary files directly in PostgreSQL.

Use private object storage.

Use resumable upload where practical.

Expire temporary files.

==================================================
19. TESTING
==================================================

Add real automated tests for:

CHAT

- Streaming
- Cancellation
- Reconnection
- Retry
- Markdown
- Code blocks
- Long conversations
- Scroll preservation
- No duplicate messages

REMOVALS

- Website-source ZIP button removed
- Old source ZIP endpoint blocked
- Email-only cloud-sync flow removed
- Supabase authentication unaffected
- Account sync unaffected

ARTIFACTS

- Creation
- Editing
- Autosave
- Undo and redo
- Version creation
- Version restoration
- Permission isolation
- Export jobs
- Private download access

EXPORTS

- PPTX
- DOCX
- PDF
- XLSX
- CSV
- User-created website ZIP

MEDIA

- Provider selection
- Never Spend enforcement
- Retry limits
- Provider fallback
- Multi-key pool selection and failover
- 429 cooldown and Retry-After handling
- Quality Boost request-budget enforcement
- Key isolation and secret redaction
- Job cancellation
- Job recovery

DESKTOP

- Pairing-code expiry
- Pairing-code single use
- Rate limiting
- Device revocation
- Session revocation
- Permission enforcement
- Read-only sessions
- Full-control approval
- Emergency disconnect
- Coding diff approval
- Command approval
- Secret redaction

SECURITY

- RLS isolation
- Path traversal
- Zip-slip
- Preview sandbox
- Secret scan
- Unauthorized artifact access
- Unauthorized device access

Run all available:

- Lint
- TypeScript checks
- Unit tests
- Integration tests
- Browser tests
- Accessibility tests
- Production web build
- Vercel build
- Dependency audit
- Secret scan
- SQL migration validation
- Windows build through CI
- macOS build through CI

Never report a test as passed unless it actually ran successfully.

Clearly report:

- Passed
- Failed
- Not run
- Blocked by environment

==================================================
20. GITHUB ACTIONS AND RELEASES
==================================================

Create GitHub Actions workflows for:

- Web lint and type checking
- Web tests
- Production web build
- Windows Tauri build
- macOS Apple Silicon build
- macOS Intel build when supported
- Release creation
- Release asset upload
- Checksum generation
- Secret scanning
- Dependency scanning

Release assets should use predictable names such as:

- `Limitless-Desktop-Windows-x64-Setup.exe`
- `Limitless-Desktop-Windows-x64.exe`
- `Limitless-Desktop-macOS-arm64.dmg`
- `Limitless-Desktop-macOS-x64.dmg`
- `checksums.txt`

The website download configuration must read release information from a secure configurable source.

Do not hardcode a fake version or nonexistent download URL.

==================================================
21. FINAL DELIVERABLES
==================================================

Deliver:

1. Complete updated repository
2. New SQL migration files
3. Updated web application
4. Artifact Workspace
5. Presentation editor
6. Document editor
7. Spreadsheet editor
8. Website builder
9. Improved media routing
10. Secure OpenRouter multi-key pool and Quality Boost routing
11. Tauri desktop application source
12. Windows build configuration
13. macOS build configuration
14. GitHub Actions
15. Desktop pairing system
16. Coding-agent foundation
17. Remote-desktop foundation
18. Tests
19. Updated README
20. Beginner deployment guide
21. Environment-variable guide
22. Security architecture
23. Remote desktop threat model
24. Migration guide
25. Rollback guide
26. Test report
27. Known limitations report
28. Exact file-change report

Create:

- `docs/LIMITLESS_V2_SETUP.md`
- `docs/LIMITLESS_V2_ENVIRONMENT_VARIABLES.md`
- `docs/LIMITLESS_V2_SECURITY.md`
- `docs/LIMITLESS_V2_REMOTE_DESKTOP_THREAT_MODEL.md`
- `docs/LIMITLESS_V2_MIGRATION.md`
- `docs/LIMITLESS_V2_ROLLBACK.md`
- `docs/LIMITLESS_V2_TEST_REPORT.md`
- `docs/LIMITLESS_V2_KNOWN_LIMITATIONS.md`
- `docs/LIMITLESS_V2_FILE_CHANGES.md`

The beginner setup guide must explain exactly:

- Which project folder to use
- How to back up the current version
- Which files changed
- Which migration files to run
- Migration order
- Which Vercel variables to add
- Which variables are public
- Which values are secrets
- How to redeploy Vercel
- How to configure Supabase
- How to publish Windows releases
- How to publish macOS releases
- How to configure download links
- How to pair a computer
- How to revoke a device
- How to test remote permissions
- How to verify the old Limitless source ZIP endpoint is gone
- How to verify the broken email-sync flow is gone
- How to test normal account sync
- How to roll back safely

==================================================
22. FINAL ACCEPTANCE CRITERIA
==================================================

The upgrade is acceptable only when:

- Existing v5 user data is preserved
- Existing Supabase authentication works
- Existing account sync works
- Local signed-out usage works
- Streaming is smooth
- Streaming does not duplicate text
- Chat stays responsive
- Limitless source ZIP download is removed
- Broken email-only cloud sync is removed
- Artifacts can be created from chat
- Artifacts can be edited
- Artifact versions can be restored
- PPTX exports are real files
- DOCX exports are real files
- XLSX exports are real files
- User websites export as valid ZIP projects
- Generated website previews are sandboxed
- Never Spend blocks paid and unknown-cost routes
- Provider failures recover safely
- One primary OpenRouter key and two optional backup slots work securely
- Multi-key routing does not bypass provider limits or duplicate requests
- Quality Boost is explicit, budgeted and disabled by default
- Desktop pairing uses expiring single-use codes
- Devices can be revoked
- Remote control requires explicit permission
- Remote sessions are visibly indicated
- Hidden remote access is impossible
- Destructive terminal commands require confirmation
- Git pushes require explicit approval
- Desktop download links use real release assets
- Vercel production build succeeds
- No secret appears in browser bundles or repository scans
- No fake feature, fake test or fake binary is presented as complete



==================================================
23. PROVIDER PLUGIN MARKETPLACE AND DYNAMIC MODEL CATALOG
==================================================

Build the provider system so Limitless AI is not permanently tied to one vendor.

The provider registry must support secure adapters for current and future services, including where technically and legally supported:

- OpenRouter
- Gemini API
- OpenAI
- Anthropic
- Groq
- Cloudflare Workers AI
- Hugging Face inference providers
- Pollinations
- Local Ollama
- LM Studio
- Browser-local models
- Future provider plugins

Do not add fake provider buttons. Only list providers that have a functional adapter or label them clearly as unavailable.

Each provider adapter must declare:

- Provider ID and display name
- Authentication type
- Supported input modalities
- Supported output modalities
- Streaming support
- Tool-call support
- Structured-output support
- Image generation/editing support
- Video generation/editing support
- Audio support
- Maximum context when reliably known
- Cost status and pricing confidence
- Free-route status
- Model availability
- Rate-limit behavior
- Privacy characteristics
- Reliability and latency metrics
- Health-check strategy
- Cancellation behavior

Use a normalized provider interface and capability schema so chat, artifacts, media, and desktop tasks do not depend on vendor-specific code.

Add a dynamic model catalog that can refresh from official provider metadata where supported. Cache it safely, keep a last-known-good catalog, and never trust remote metadata without validation.

Do not automatically enable newly discovered paid models in Never Spend mode.

Add provider preference controls:

- Automatic
- Free-first
- Fastest
- Highest available quality
- Most private
- User-selected provider
- Local-only where available

Provider keys remain isolated per user. Never share one user's credentials, quota, or provider sessions with another user.

==================================================
24. QUALITY EVALUATION, MODEL COUNCIL, AND RESULT VERIFICATION
==================================================

Improve output quality through controlled evaluation rather than blindly making more calls.

Add an optional internal evaluation layer for complex tasks.

For text and code, it may:

- Generate one draft
- Run a critic or verifier
- Repair factual, formatting, structural, or code issues
- Compare a limited number of candidates
- Select or synthesize the strongest result

For presentations, documents, spreadsheets, and websites, it may validate:

- Required sections are present
- Requested length and structure are followed
- Export data matches the editable source
- Links and references are valid where checkable
- Layout does not overflow common viewports or pages
- Generated code builds or previews successfully
- Formulas parse correctly
- PPTX, DOCX, XLSX, PDF, and ZIP files can be reopened or parsed

For media, it may evaluate available metadata and user-request compliance, but must not claim subjective visual quality was verified unless an actual evaluation step ran.

Quality evaluation must:

- Be disabled for trivial requests when unnecessary
- Respect per-task request budgets
- Respect Never Spend for every model call
- Avoid recursive unbounded review loops
- Limit repair attempts
- Allow cancellation
- Record model/provider metadata without exposing key identity
- Clearly report when validation was not possible

Add explicit modes:

- Fast
- Balanced
- Highest Available Quality

Highest Available Quality may invoke limited evaluation or candidate comparison, but must show the expected request count and cost risk before paid multi-call execution.

==================================================
25. OFFICIAL API COMPATIBILITY AND CHANGE RESILIENCE
==================================================

Before implementing or updating external provider integrations, verify the current official API documentation available in the coding environment.

Do not rely only on stale model names, old endpoint shapes, or remembered provider behavior.

Isolate provider-specific request/response mapping inside adapters.

Add compatibility tests for:

- Streaming event parsing
- Tool calls
- Structured outputs
- Image inputs
- Image outputs
- Asynchronous video jobs
- Polling and cancellation
- Retry-After handling
- Provider errors
- Model-not-found responses
- Pricing or free-route uncertainty

When an API feature is unavailable, do not simulate it. Show a clear capability limitation and use a real fallback where one exists.

Keep model IDs configurable through the provider catalog instead of scattering them throughout the application.

==================================================
26. PRIVACY, DATA LIFECYCLE, EXPORT, AND ACCOUNT DELETION
==================================================

Add clear privacy-aware data controls.

Users must be able to:

- View what is stored locally and in the cloud
- Export their conversations, artifacts, projects, and settings
- Choose whether encrypted provider keys are included in an encrypted backup
- Delete individual conversations and artifacts
- Delete generated media
- Revoke desktop devices and sessions
- Remove provider keys
- Request account-data deletion

Account deletion must:

- Require explicit confirmation
- Revoke active desktop and remote sessions
- Revoke or delete stored encrypted provider credentials
- Delete or schedule deletion of private storage objects
- Respect retention requirements that genuinely apply
- Never leave public artifact links active
- Produce a clear completion or pending-deletion state

Do not place secrets in ordinary exports.

Temporary generation files, previews, and signed URLs must expire according to documented retention rules.

==================================================
27. OBSERVABILITY, SUPPORTABILITY, AND SAFE LOGGING
==================================================

Add useful production observability without leaking user content or secrets.

Implement structured, redacted events for:

- Provider health
- Job lifecycle
- Export lifecycle
- Sync failures
- Artifact save failures
- Desktop pairing
- Remote-session state
- Permission denials
- Coding-job lifecycle
- Release metadata failures

Never log:

- Full API keys
- Authorization headers
- Pairing tokens
- Session tokens
- Raw desktop screen content
- Clipboard content
- Private document bodies by default
- User credentials
- Unredacted terminal secrets

Use correlation IDs for jobs and requests.

Add a user-visible diagnostics export that contains safe metadata and redacted logs, never secrets.

Error messages should include an actionable explanation and a safe retry path.

==================================================
28. ACCESSIBILITY, RESPONSIVENESS, AND INPUT METHODS
==================================================

Meet a strong practical accessibility baseline.

Ensure:

- Keyboard navigation throughout chat and editors
- Visible focus states
- Correct labels and roles
- Screen-reader announcements for streaming and job progress
- Reduced-motion support
- High-contrast compatibility
- Touch-friendly controls
- Responsive mobile and tablet layouts
- No keyboard traps
- Editor shortcuts documented
- Drag-and-drop actions have keyboard alternatives
- Colour is not the only status indicator

Test critical flows using automated accessibility checks and manual keyboard review where possible.

==================================================
29. FEATURE FLAGS, ROLLOUT, RECOVERY, AND ROLLBACK
==================================================

Use feature flags for major systems until they pass their release gates:

- New streaming renderer
- Artifact Workspace
- Presentation editor
- Document editor
- Spreadsheet editor
- Website builder
- New media router
- OpenRouter key pool
- Quality Boost
- Desktop pairing
- Coding agent
- Remote desktop
- Unattended access

Feature flags must fail closed for security-sensitive features.

Add:

- Migration compatibility checks
- Recovery snapshots before risky client-data migrations
- Last-known-good settings
- Export-job retry recovery
- Rollback instructions
- Safe disable switches for failing providers or features

A failed new feature must not make normal chat unusable.

==================================================
30. DEPENDENCY AND SOFTWARE-SUPPLY-CHAIN SAFETY
==================================================

Before adding a dependency:

- Check whether existing code already provides the capability
- Prefer maintained packages
- Avoid abandoned packages
- Avoid packages with unnecessary install scripts
- Pin or lock versions through the repository's package manager
- Record why the dependency was selected
- Verify license compatibility where practical
- Run dependency audit tools available in the environment

Do not add multiple large editor frameworks for overlapping purposes.

Keep desktop native permissions minimal.

Generate or update a software bill of materials when practical.

==================================================
31. END-TO-END ACCEPTANCE SCENARIOS
==================================================

Add or document end-to-end verification for these realistic flows:

SCENARIO A: EXISTING USER UPGRADE

1. Open the existing production domain in a browser with v4.1 or v5 local data.
2. Confirm safe migration and recovery snapshot.
3. Sign in.
4. Run Sync now.
5. Confirm no data loss or duplicate conversations.
6. Export a backup.

SCENARIO B: SMOOTH CHAT

1. Start a long streamed answer.
2. Scroll upward during generation.
3. Confirm the page does not snap downward.
4. Stop generation.
5. Retry.
6. Confirm no duplicate assistant message.
7. Confirm Markdown and code remain valid.

SCENARIO C: PRESENTATION

1. Ask chat to create a 12-slide presentation.
2. Open it in the editor.
3. Edit slide 4 through chat.
4. Reorder slides.
5. Restore an older version.
6. Export PPTX and PDF.
7. Reopen or parse the exported PPTX successfully.

SCENARIO D: DOCUMENT

1. Generate a structured report.
2. Edit formatting and a selected paragraph.
3. Add a table and image.
4. Export DOCX and PDF.
5. Verify exported files are valid.

SCENARIO E: SPREADSHEET

1. Import CSV data.
2. Add formulas and a chart.
3. Ask AI to clean the data.
4. Export XLSX.
5. Reopen or parse it successfully.

SCENARIO F: WEBSITE

1. Generate a multi-page website.
2. Edit a selected component.
3. Preview desktop, tablet, and mobile.
4. Verify sandbox isolation.
5. Export a valid user-created website ZIP.
6. Confirm the Limitless AI platform source cannot be downloaded.

SCENARIO G: MEDIA

1. Generate an image using a free route.
2. Edit it using a reference or mask where supported.
3. Generate or attempt a video.
4. Confirm accurate provider/model disclosure.
5. Confirm fallback behavior.
6. Confirm Never Spend blocks paid and unknown-cost routes.

SCENARIO H: OPENROUTER KEY POOL

1. Add one valid primary key.
2. Confirm normal operation.
3. Add two optional authorized backup keys.
4. Simulate primary-key rate limiting.
5. Confirm safe failover without duplicate jobs.
6. Confirm invalid keys cool down or disable appropriately.
7. Confirm raw keys never appear in logs, browser bundles, exports, or analytics.
8. Enable Quality Boost explicitly and verify the request budget.

SCENARIO I: DESKTOP PAIRING

1. Install or run a genuine build.
2. Pair using a short-lived one-time code.
3. Confirm the device appears in the account.
4. Revoke the device.
5. Confirm its sessions stop working.

SCENARIO J: REMOTE SESSION

1. Request view-only access.
2. Confirm visible indicators.
3. Upgrade to control only after explicit permission.
4. Stop through the desktop emergency control.
5. Confirm session termination and audit event.

SCENARIO K: CODING AGENT

1. Open a test repository.
2. Ask for a safe code change.
3. Review the proposed diff.
4. Approve it.
5. Run tests.
6. Confirm no Git push occurs without approval.

==================================================
32. FINAL RELEASE GATES
==================================================

Do not call Limitless AI v2 production-ready unless all applicable release gates pass:

- Existing-user migration is safe
- Authentication works
- RLS isolation is verified
- Signed-out local mode works
- Account sync works
- Chat streaming acceptance tests pass
- Source-code ZIP removal is verified
- Broken email-only sync is removed
- Artifact editors produce real editable outputs
- Export formats validate
- Website sandbox isolation passes
- Never Spend is enforced in the routing layer
- Multi-key routing avoids duplicates and quota-bypass behavior
- Secret scans pass
- Production web build passes
- Vercel-compatible build passes
- Desktop builds are either genuinely produced or explicitly marked CI-only
- Download links point only to real release assets
- Remote access is disabled by default
- Pairing and session revocation work
- Security-sensitive feature flags fail closed
- Known limitations are documented
- Beginner setup, migration, and rollback instructions are complete

If a gate does not pass, document it clearly and do not hide it behind a general “success” statement.



Begin now with Phase 0.

Inspect the complete repository first, create the architecture audit, run the baseline validation and then continue through the implementation phases.

Do not stop after the audit or planning stage.


==================================================
33. PROFESSIONAL WEBSITE AND APPLICATION STUDIO
==================================================

Upgrade the existing Website Builder into a major creation environment named:

LIMITLESS BUILD STUDIO

It must create genuinely professional, realistic, production-oriented websites
and applications from natural-language requests.

It must not produce the stereotypical low-quality “AI website” look.

Avoid by default:

- Generic giant gradient headings
- Random glowing blobs
- Excessive glassmorphism
- Repetitive rounded cards
- Unnecessary dashboards
- Meaningless statistics
- Fake testimonials presented as real
- Fake company logos
- Lorem ipsum in completed projects
- Decorative animations with no purpose
- Huge empty areas
- Tiny unreadable body text
- Poor mobile layouts
- Repeated template sections
- Broken forms
- Buttons with no action
- Placeholder API results presented as real
- Fake backend integration
- Fake publishing or deployment states

Generated work must feel intentionally art-directed for the requested brand,
audience, subject, and purpose.

The studio must support:

- Marketing websites
- Portfolios
- Business websites
- Product landing pages
- SaaS websites
- Dashboards
- Admin panels
- Ecommerce frontends
- Booking experiences
- School and personal projects
- Blogs
- Documentation sites
- Communities
- Internal tools
- CRUD applications
- AI applications
- Real-time applications when infrastructure is available
- Progressive Web Apps
- Responsive web applications
- Multi-page websites
- Single-page applications
- Interactive storytelling sites
- 3D and WebGL experiences
- Code-based prototypes
- Full-stack projects
- Mobile-app project foundations when explicitly requested

Every generated project must use a coherent:

- Information architecture
- Visual hierarchy
- Typography system
- Spacing system
- Colour system
- Component system
- Interaction system
- Responsive strategy
- Accessibility strategy
- Content strategy
- Error-state strategy
- Loading-state strategy

The AI must first infer or ask only when genuinely necessary:

- Project purpose
- Intended audience
- Required pages or screens
- Essential functionality
- Brand personality
- Content availability
- Preferred visual style
- Backend requirements
- Authentication requirements
- Data-storage requirements
- Deployment target

When enough information is already available, begin building immediately rather
than asking unnecessary questions.

The application must distinguish clearly between:

- A visual prototype
- A functional frontend
- A locally functional full-stack application
- A production-connected application
- A deployed application

Never describe a prototype or mock-backed application as production connected.

==================================================
34. AUTOMATIC BUILD-STUDIO MODE
==================================================

When intent detection identifies a request to create, redesign, edit, debug, or
continue a website or application, automatically open Limitless Build Studio.

Do not force the user to manually search for a separate tool.

DESKTOP AND LARGE TABLET LAYOUT

Use a focused split workspace inspired by modern autonomous application builders:

LEFT PANEL

- Approximately 28% to 38% of available width by default
- Resizable
- Collapsible
- Contains the full project conversation
- Shows planning only when useful
- Shows structured build steps
- Shows tool cards
- Shows files being changed
- Shows commands and test results
- Shows screenshots captured by the agent
- Shows errors, retries, approvals, and completion summary
- Preserves the normal chat history
- Supports attachments, voice input, and reference images

RIGHT WORKSPACE

- Approximately 62% to 72% of available width by default
- Live application preview
- Code editor
- File tree
- Visual inspector
- Assets
- Database view where appropriate
- API and server logs
- Browser console
- Test output
- Version history
- Deployment and export controls

The divider must be draggable.

Allow:

- Chat only
- Preview only
- Code only
- Split chat and preview
- Split code and preview
- Three-panel layout on sufficiently large displays
- Full-screen preview
- Pop-out preview

MOBILE LAYOUT

Do not squeeze an unusable desktop interface onto a phone.

Use fast top-level tabs or a bottom switcher for:

- Chat
- Preview
- Code
- Files
- Activity

Preserve the user's position in every tab.

The mobile preview must support common device widths and full-screen viewing.

TOP WORKSPACE CONTROLS

Provide real controls such as:

- Code
- Preview
- Inspect
- Files
- Assets
- Data
- Console
- Tests
- Versions
- Share
- Download
- Publish

Only show controls supported by the current project.

BUILD LIFECYCLE

When a build starts:

1. Create or resolve the persistent project.
2. Open Build Studio.
3. Show a concise task checklist.
4. Generate or edit real project files.
5. Start the secure preview environment.
6. Stream meaningful progress.
7. Refresh the preview after valid changes.
8. Preserve the last-known-good preview if a new build fails.
9. Capture screenshots at important checkpoints.
10. Review the result visually and functionally.
11. Repair detected issues within a bounded attempt budget.
12. Present Preview, Download, and optional Publish actions.

The user must be able to continue chatting while the preview is visible.

Do not hide failures behind a final success message.

==================================================
35. LIVE PREVIEW, VISUAL INSPECTOR, AND DIRECT MANIPULATION
==================================================

Build a real live-preview system.

It must support:

- Secure isolated runtime
- Hot reload
- Build status
- Runtime status
- Compile errors
- Runtime errors
- Browser console
- Network request visibility with secret redaction
- Device-size presets
- Zoom
- Refresh
- Open in a separate preview window
- Last-known-good preview
- Screenshot capture
- Screenshot history

For supported frameworks, map preview elements back to source components.

VISUAL INSPECTOR

Allow the user to select an element in the preview and:

- Ask AI to edit the selected element
- Change text
- Change image
- Change spacing
- Change alignment
- Change colour
- Change typography
- Change border
- Change radius
- Change shadow
- Change layout
- Change animation
- Hide or remove the element
- Duplicate the element
- Convert the element into a reusable component

All direct visual edits must update the real structured project source.

Do not create an unrelated overlay that disappears after reload.

SELECTION-AWARE CHAT

Support commands such as:

- Make this section more premium
- Replace this image
- Reduce this spacing
- Animate this card on scroll
- Make this mobile navigation better
- Turn this into a 3D hero
- Fix this form
- Connect this button
- Use this style throughout the project

The selected element, route, file, or component must be included safely as
structured context.

PREVIEW SECURITY

Run generated code in a restrictive sandbox.

Do not expose:

- Parent application cookies
- Supabase service-role credentials
- User provider keys
- Desktop tokens
- Pairing credentials
- Private browser storage
- Internal application APIs not explicitly bridged

Use a narrow, versioned message bridge.

Validate every message crossing the preview boundary.

==================================================
36. DESIGN INTELLIGENCE AND REFERENCE-BASED CREATION
==================================================

Add a design-intelligence system that can use:

- User-provided screenshots
- User-provided mockups
- User-provided brand assets
- User-provided website links
- Existing project styles
- A written mood or art direction
- A brand kit
- A selected design personality

When a user supplies references:

1. Analyse composition, hierarchy, rhythm, typography, motion, depth, spacing,
   colour relationships, interaction patterns, and responsive behaviour.
2. Extract reusable design principles.
3. Create an original implementation suited to the user's project.
4. Do not copy proprietary source code, branding, protected assets, distinctive
   text, or an entire design one-to-one.
5. Record the derived design direction in the project metadata.
6. Let the user inspect and edit the design direction.

Treat these as explicit quality and inspiration references:

- `https://www.peachweb.io/`
- `https://www.landing.love/categories/3d-website/`
- `https://yutaabe.com/?ref=landing.love`
- The user-provided screenshot showing a curated gallery of polished dark,
  minimal, 3D-oriented websites
- The user-provided screenshot showing an autonomous builder with project chat,
  screenshots, preview, code, and publish controls

These references are inspiration only.

Do not clone their branding, copyrighted assets, source code, page copy, or
distinctive final layout.

DESIGN-DIRECTION GENERATOR

Before or during creation, generate a concise internal design direction covering:

- Brand adjectives
- Visual era
- Composition
- Typography
- Colour palette
- Motion language
- 3D depth
- Image treatment
- Interaction style
- Component shape
- Density
- Responsive behaviour
- Accessibility constraints
- Performance constraints

Examples of supported art directions:

- Premium minimal
- Editorial
- Cinematic
- Futuristic
- Friendly technology
- Luxury
- Playful
- Industrial
- Brutalist
- Soft modern
- High-fashion
- Immersive 3D
- Product-focused
- Data-dense professional
- Calm educational
- Youthful but polished

Do not force the same style onto every project.

==================================================
37. PROFESSIONAL 3D, MOTION, AND INTERACTION ENGINE
==================================================

Support advanced visual experiences when they improve the requested product.

Use maintained technologies appropriate to the existing stack, such as:

- Three.js
- React Three Fiber
- Drei
- WebGL
- WebGPU only with safe capability detection and fallback
- GSAP
- Motion
- Lottie
- Canvas
- SVG
- CSS transforms and scroll timelines

Do not add all libraries to every project.

Select the smallest suitable approach.

Supported capabilities should include where appropriate:

- Interactive 3D hero sections
- Product models
- Camera movement
- Scroll-driven scenes
- Parallax
- Depth layers
- Shader effects
- Particles
- Lighting
- Materials
- Object interactions
- Pointer interactions
- Section transitions
- Text reveals
- Kinetic typography
- Smooth scrolling
- Micro-interactions
- Cursor effects
- Hover states
- Page transitions
- Motion storytelling
- Interactive backgrounds

PERFORMANCE AND ACCESSIBILITY

Every advanced effect must include:

- Capability detection
- Mobile consideration
- Reduced-motion support
- Keyboard-accessible alternatives where applicable
- Low-power fallback
- Static fallback
- Asset compression
- Texture optimization
- Lazy loading
- Cleanup on route changes
- Frame-rate protection
- Memory cleanup
- No unnecessary continuous rendering when off-screen

Do not use 3D only to appear impressive.

The result must remain readable, navigable, responsive, and useful.

Add performance budgets appropriate to the project and record measured results.

Do not claim a performance score that was not measured.

==================================================
38. REAL FULL-STACK APPLICATION GENERATION
==================================================

Build functional applications, not only landing-page screenshots.

Depending on the request and existing repository, support:

- Routing
- Authentication
- Authorization
- User profiles
- Forms
- Schema validation
- File uploads
- Search
- Sorting
- Filtering
- Pagination
- CRUD operations
- Database models
- Supabase integration
- Server actions
- API routes
- Background jobs
- Realtime subscriptions
- Notifications
- Email integration when credentials are supplied
- Role-based access
- Admin interfaces
- Audit history
- Error handling
- Loading states
- Empty states
- Offline-aware behaviour where practical
- PWA manifest and installability
- Responsive navigation
- Accessible dialogs and menus

When the project needs a backend:

- Reuse the application's supported infrastructure where appropriate
- Generate safe migrations
- Add RLS
- Keep secrets server-side
- Create `.env.example`
- Document all required variables
- Never insert real secrets into generated files
- Never claim the backend is connected until it is actually connected and tested

MOCK DATA

Use mock data only when:

- The user explicitly requests a prototype, or
- External credentials are unavailable

When mock data is used:

- Label it clearly
- Keep the data adapter replaceable
- Provide exact connection steps
- Never describe mock-backed actions as functional production integrations

APPLICATION QUALITY

Every generated application must include as applicable:

- Input validation
- Failure states
- Loading states
- Empty states
- Permission checks
- Responsive behaviour
- Accessible interactions
- Real navigation
- Data persistence
- Testable architecture
- Secure API boundaries
- No exposed private keys

==================================================
39. PROJECT FILES, CODE EDITOR, VERSIONING, AND AGENT LOOP
==================================================

The Build Studio must provide a real project workspace.

FILE TREE

Support:

- Files and folders
- Create
- Rename
- Move
- Duplicate
- Delete with confirmation
- Search
- Replace
- Protected files
- Binary asset handling
- Unsaved-change indication

CODE EDITOR

Support:

- Syntax highlighting
- Type awareness where available
- Multiple tabs
- Find and replace
- Formatting
- Diagnostics
- Go to definition where supported
- Diff view
- AI edit
- Selected-code edit
- Apply or reject patch
- Revert
- Keyboard shortcuts

VERSIONING

Every meaningful AI or user change must be recoverable.

Support:

- Autosave
- Named checkpoints
- AI checkpoints
- Version timeline
- Diff
- Restore
- Duplicate as a new project
- Branch from version
- Last-known-good build
- Recovery after refresh
- Recovery after agent interruption

AGENT LOOP

The website/app agent must use a bounded engineering loop:

1. Understand the request.
2. Inspect the project.
3. Define acceptance checks.
4. Implement the smallest coherent slice.
5. Build or run the preview.
6. Read compile and runtime errors.
7. Capture screenshots at required viewport sizes.
8. Inspect visual and functional problems.
9. Repair problems.
10. Run targeted tests.
11. Update progress.
12. Stop when acceptance checks pass or the retry budget is exhausted.

Do not endlessly regenerate the entire project.

Prefer targeted edits.

==================================================
40. REAL DOWNLOAD, EXPORT, SHARE, AND PUBLISH RESULTS
==================================================

After creating a website or application, provide real result actions.

PROJECT RESULT CARD

Show:

- Project name
- Current status
- Framework
- Pages or routes
- Last successful build
- Preview
- Open Build Studio
- Continue editing
- Download project
- Download static build when supported
- Version history
- Duplicate
- Share when enabled
- Publish when configured

DOWNLOAD PROJECT

The Download action must create a real ZIP containing the user's generated
project, not the Limitless AI platform source.

The ZIP should include as applicable:

- Source files
- Public assets
- Package manifest
- Correct lockfile when available
- Configuration
- `.env.example`
- Database migrations
- README
- Setup instructions
- Build instructions
- Deployment instructions
- Attribution and asset-license notes
- Test instructions

Never include:

- Real secrets
- User API keys
- Service-role credentials
- Internal Limitless AI source
- Parent application configuration
- Private account data
- Temporary credentials

Validate the ZIP against zip-slip and malformed paths.

Where possible, extract and build the exported project in an isolated validation
job before presenting it as valid.

DOWNLOAD DELIVERY

When an export succeeds:

- Create a real export record
- Store it privately
- Produce a short-lived signed download URL
- Display a functioning Download button or link
- Show file type and size
- Allow regeneration after expiry
- Show a clear error if generation fails

Never display a fake or dead download button.

PUBLISH

Support optional deployment adapters only when properly configured, such as:

- Vercel
- Cloudflare Pages
- Netlify
- Static hosting
- Existing supported deployment providers

Publishing must:

- Require explicit user approval
- Show the target
- Show variables still required
- Never expose secrets
- Show real deployment status
- Return the real deployment URL only after success
- Support rollback or redeploy where the provider allows it
- Never publish automatically merely because the build finished

GITHUB

Allow optional repository export or connection.

Never create, overwrite, push, or make a repository public without explicit
approval.

==================================================
41. LIMITLESS VISUAL SYSTEM AND FEATURE PERSONALITIES
==================================================

Preserve the recognizable black-and-white minimalistic identity of Limitless AI,
but evolve it into a lighter, more expressive system suitable for many features.

BASE VISUAL LANGUAGE

Use:

- White
- Warm off-white
- Light neutral grey
- Soft charcoal
- Deep ink
- Controlled black
- Crisp typography
- Generous but not wasteful spacing
- Thin dividers
- Precise shadows
- Subtle depth
- Clear hierarchy

Do not make the product uniformly pitch-black.

Support polished light and dark themes.

The default may be light-neutral or follow the user's existing preference.

FEATURE PERSONALITIES

Give each major feature a restrained accent-colour personality.

Suggested defaults:

- Core chat: cobalt blue
- Search and research: sky cyan
- Images: magenta or orchid
- Video and motion: coral red
- Presentations: warm yellow or amber
- Documents: violet
- Spreadsheets and data: emerald green
- Websites and apps: energetic lime or warm orange
- Code and developer tools: electric cyan
- Desktop devices: indigo
- Remote sessions: teal
- Security and permissions: amber
- Errors and destructive actions: controlled red
- Success: green

These colours are accent identities, not full-page paint.

Use them for small, deliberate details such as:

- Active navigation marker
- Tool icon
- Progress line
- Focus ring
- Selected state
- Tiny glow
- Status badge
- Chart emphasis
- Workspace header accent

Do not create rainbow clutter.

Do not use colour as the only status indicator.

Every accent must pass practical contrast requirements.

Allow a user to choose:

- Monochrome
- Soft colour
- Expressive colour

Keep the default restrained and polished.

MOTION LANGUAGE

Use smooth, purposeful motion:

- Fast response
- Subtle spring
- Crossfade
- Shared-element transition
- Small scale changes
- Gentle workspace opening
- Clear progress movement

Respect reduced-motion preferences.

Avoid excessive bouncing, spinning, glow, and long cinematic delays in ordinary
product workflows.

==================================================
42. BRAND KITS, DESIGN MEMORY, AND REUSABLE SYSTEMS
==================================================

Allow users to create reusable brand kits containing:

- Brand name
- Logo
- Icon
- Colours
- Typography
- Spacing preference
- Voice and tone
- Image direction
- Motion direction
- Border and radius preference
- Component density
- Accessibility requirements

Brand kits must be private by default.

The user may apply a brand kit to:

- Website
- App
- Presentation
- Document
- Report
- Social or media project

Add project-level design memory.

When the user says:

- Use the same style as my previous site
- Continue the existing brand
- Apply this style to all pages
- Make the presentation match the website

the system should reuse structured brand and design tokens rather than guessing
from scratch.

Support reusable:

- Components
- Sections
- Themes
- Templates
- Layouts
- Motion presets
- Chart themes
- Content blocks

Do not publish private user templates into a shared gallery without explicit
permission.

==================================================
43. CONTENT, ASSET, SEO, AND BUSINESS-READINESS
==================================================

Generated professional sites require more than attractive visuals.

CONTENT QUALITY

- Use real user-provided content when available
- Clearly label temporary placeholder copy
- Do not invent awards, customers, metrics, testimonials, addresses, or legal
  claims as facts
- Use appropriate tone and readable structure
- Avoid repetitive AI-style phrases
- Include useful calls to action
- Keep headings descriptive
- Generate realistic navigation and footer structure
- Support multilingual projects when requested

ASSETS

- Use user-provided or properly licensed assets
- Record attribution requirements
- Avoid unauthorized hotlinking
- Optimize images
- Generate responsive variants
- Use modern formats with fallback
- Add meaningful alt text
- Compress 3D assets and textures
- Remove unused assets

SEO AND DISCOVERY

Support where applicable:

- Title and description metadata
- Canonical URL
- Open Graph metadata
- Social preview
- Sitemap
- Robots configuration
- Structured data
- Semantic headings
- Accessible link text
- Clean routes
- Favicons
- Manifest
- Search-friendly rendering

Do not fabricate SEO performance.

FORMS

Functional forms must include:

- Validation
- Error state
- Success state
- Spam protection strategy
- Accessible labels
- Secure server handling when connected
- Clear disclosure when not yet connected

ANALYTICS

Analytics integration must be optional.

Prefer privacy-conscious configuration.

Never silently add trackers.

==================================================
44. VISUAL AND FUNCTIONAL SELF-REVIEW
==================================================

Before calling a generated website or app complete, perform a real review.

Capture screenshots where the environment supports it at representative sizes,
including:

- Mobile portrait
- Tablet
- Desktop
- Wide desktop when relevant

Review for:

- Overflow
- Clipped text
- Unreadable text
- Broken navigation
- Inconsistent spacing
- Misaligned sections
- Empty or broken media
- Low contrast
- Missing hover or focus states
- Excessive animation
- Layout shift
- 3D fallback failure
- Long-content handling
- Form errors
- Broken routes
- Console errors
- Network failures
- Unhandled loading states

Run available automated checks for:

- Build
- TypeScript
- Lint
- Unit tests
- Browser tests
- Accessibility
- Link validity
- Bundle size
- Performance
- Export validity

Use a bounded repair cycle.

Do not repeatedly redesign a project that already meets the request.

Record what was genuinely checked.

==================================================
45. WEBSITE AND APP STUDIO ACCEPTANCE CRITERIA
==================================================

The upgraded Website and App Studio is acceptable only when:

- Website/app requests automatically open Build Studio
- Chat remains visible alongside the live workspace on desktop
- Mobile uses a practical tabbed workspace
- The split panels are resizable
- The live preview runs in a restrictive sandbox
- Project files are real and editable
- The code editor edits actual source
- The file tree edits actual project files
- Preview errors are visible
- The last-known-good preview survives failed changes
- Users can select preview elements and request targeted edits
- Projects can be restored from version history
- Generated websites are responsive
- Advanced visuals have low-power and reduced-motion fallbacks
- 3D is used only when appropriate
- Functional apps include real state and data flows
- Mock data is clearly labelled
- Backends are never claimed connected until verified
- Visual review runs at multiple viewport sizes when possible
- Export creates a valid project ZIP
- The ZIP never includes Limitless AI platform source or secrets
- The Download action returns a real private export
- Publish requires explicit approval
- Deployment status and URLs are real
- The visual system remains minimalistic and recognizable
- Feature accent colours provide personality without visual clutter
- The result does not imitate a reference site one-to-one
- The final completion report lists every unverified or blocked item honestly



==================================================
46. ZERO-TOUCH BOOTSTRAP, SETUP, AND OWNER EXPERIENCE
==================================================

The product owner must not be required to act as the implementation engineer.

Build a complete zero-touch bootstrap system that performs everything that can
be performed safely inside the available environment.

Create a root-level setup command appropriate to the repository, for example:

- `pnpm limitless:setup`
- `npm run limitless:setup`
- `bun run limitless:setup`
- `./scripts/limitless-setup`

Choose the command based on the real package manager and platform.

The bootstrap system must:

- Verify supported Node, Rust, package-manager, and platform requirements
- Install dependencies
- Validate lockfiles
- Create missing local directories
- Generate safe development configuration
- Create `.env.example`
- Detect missing required variables
- Never generate fake secrets
- Validate Supabase connectivity when credentials exist
- Validate provider connectivity when user credentials exist
- Apply local development migrations safely when authorized
- Seed only non-sensitive development data
- Verify storage buckets and policies
- Verify RLS
- Verify build tools
- Verify Tauri prerequisites
- Run baseline checks
- Generate a safe setup report
- Never overwrite existing secrets
- Never expose secret values in output

Add a first-run setup wizard inside Limitless AI.

The wizard must:

- Detect what already works
- Detect missing optional integrations
- Show required actions separately from optional actions
- Provide one-click OAuth or authorization flows where supported
- Provide paste-and-test fields for credentials that cannot be authorized
  automatically
- Verify every credential immediately
- Store credentials through the encrypted vault
- Allow local-only use without connecting external services
- Allow the user to skip optional services
- Explain exactly what functionality is available before and after activation
- Never block the entire product because one provider is missing

MINIMAL OWNER ACTION POLICY

The owner may be asked only for actions that cannot legally or technically be
performed by the coding agent, such as:

- Approving an OAuth consent screen
- Pasting a private API key
- Approving a production deployment
- Approving a production migration
- Approving a Git push, merge, or release
- Granting operating-system screen, accessibility, microphone, camera, or file
  permissions
- Supplying Windows code-signing or Apple signing/notarization credentials
- Creating or authorizing an external account where no programmatic creation is
  legally supported

For each unavoidable action:

- Combine related actions into one step
- Present plain-language instructions
- Provide a Test button
- Detect completion automatically
- Continue from the exact resume point after completion
- Never ask the user to manually edit source code
- Never ask the user to manually write SQL
- Never ask the user to manually construct JSON
- Never ask the user to repeatedly run commands that the agent can run

Provide a generated document:

`docs/LIMITLESS_V2_MINIMAL_OWNER_ACTIONS.md`

It must contain only genuinely unavoidable actions, in the exact order they are
needed.

==================================================
47. LIMITLESS CONNECT: UNIVERSAL CONNECTORS, MCP, AND AGENT INTEROPERABILITY
==================================================

Create a secure universal integration layer named:

LIMITLESS CONNECT

It must support a provider-neutral connector architecture for services such as:

- Google Drive
- Google Docs
- Google Sheets
- Google Slides
- Gmail
- Google Calendar
- Google Contacts
- GitHub
- GitLab
- Bitbucket
- Notion
- Slack
- Discord
- Microsoft OneDrive
- Microsoft 365
- Dropbox
- Jira
- Linear
- Trello
- Supabase
- PostgreSQL
- MySQL
- REST APIs
- GraphQL APIs
- Webhooks
- RSS and Atom feeds
- Local files
- Paired desktop files and applications
- Custom user-defined APIs
- MCP-compatible tools and resources
- Future provider plugins

Implement an MCP client and server layer where practical so Limitless AI can:

- Discover tools
- Discover resources
- Invoke tools
- Read structured resources
- Expose approved Limitless capabilities to external MCP clients
- Isolate permissions by user, project, connector, and operation
- Validate schemas
- Display tool permissions before first use
- Revoke access instantly
- Log safe audit metadata

Add optional agent-to-agent interoperability through a standards-based adapter
where supported.

Do not permit an external agent to act with broader permissions than the user
explicitly granted.

CONNECTOR EXPERIENCE

The owner should not manually wire APIs.

For every connector:

- Provide a built-in connection card
- Support one-click OAuth where available
- Auto-discover scopes
- Request the minimum scopes
- Explain read and write permissions
- Test the connection automatically
- Show health and last-sync state
- Handle token rotation
- Handle revocation
- Handle rate limits
- Handle offline state
- Handle expired authorization
- Provide local import fallback where useful

Add per-project connector scopes so a connector can be available to one project
without being exposed to every project.

Store tokens only through encrypted server-side or operating-system vaults.

Never expose connector tokens in browser bundles, logs, exports, screenshots,
analytics, or generated projects.

==================================================
48. LIMITLESS AUTOMATIONS AND WORKFLOW ENGINE
==================================================

Create a visual and conversational automation system named:

LIMITLESS AUTOMATIONS

Users must be able to create automations through natural language or a visual
workflow editor.

Supported trigger classes:

- Manual
- Scheduled
- Recurring
- Webhook
- New email
- Calendar event
- File uploaded
- File modified
- Database change
- Git commit
- GitHub issue or pull request
- Failed build
- Form submission
- New spreadsheet row
- New artifact version
- Desktop device online
- Remote-session event
- Provider-health event
- External API event

Supported workflow nodes:

- Connector action
- AI prompt
- Tool call
- Condition
- Branch
- Delay
- Approval
- Loop with strict maximum iterations
- Transform data
- Generate artifact
- Send notification
- Create task
- Run code in an isolated sandbox
- Call webhook
- Update database
- Publish only after explicit approval

Automation requirements:

- Versioned workflow definitions
- Draft and active states
- Test mode
- Dry run
- Manual run
- Scheduled run
- Run history
- Input and output inspection with redaction
- Retry policy
- Exponential backoff
- Idempotency
- Cancellation
- Pause and resume
- Failure notifications
- Recovery after restart
- Per-run cost limit
- Per-run token limit
- Per-run tool-call limit
- Per-user concurrency limits
- Global backpressure
- Secret isolation
- Approval gates
- Audit history
- Feature flags

No automation may silently perform destructive, paid, public, security-sensitive,
or irreversible actions.

Provide templates such as:

- Morning email and calendar summary
- Weekly project report
- Website uptime check
- Failed-build explanation
- Backup project every Friday
- Create an invoice from new spreadsheet rows
- Generate a weekly presentation from analytics
- Monitor provider availability
- Create release notes from commits
- Summarize newly uploaded research
- Notify when desktop device disconnects unexpectedly

The workflow engine must be durable and must not depend on a browser tab staying
open.

When durable server infrastructure is unavailable, provide a clearly labelled
local or desktop scheduler fallback.

==================================================
49. LIMITLESS KNOWLEDGE OS
==================================================

Create a persistent personal and project knowledge system named:

LIMITLESS KNOWLEDGE

Users must be able to create private knowledge spaces from:

- PDFs
- Documents
- Presentations
- Spreadsheets
- Images
- Audio
- Video transcripts
- Websites
- Notes
- Emails
- Cloud-drive folders
- Git repositories
- Database records
- APIs
- Existing artifacts
- Local files
- Desktop folders

Implement:

- Source ingestion
- Structured parsing
- OCR only when genuinely necessary
- Transcription
- Chunking
- Embeddings
- Keyword index
- Hybrid retrieval
- Metadata filters
- Access-control filters
- Source freshness
- Re-indexing
- Duplicate detection
- Version tracking
- Contradiction detection
- Entity extraction
- Relationship graph
- Timeline view
- Saved searches
- Saved questions
- Research reports
- Citation generation
- Page, slide, sheet, file, line, or timestamp references where available
- Source preview
- Source removal
- Project-scoped knowledge
- Local-only knowledge spaces
- Cloud-synced knowledge spaces

Every answer grounded in a knowledge space must distinguish:

- Directly supported source fact
- User-authored note
- AI inference
- Unverified claim
- Outdated source
- Missing evidence

Never invent citations.

Do not expose information from a source the current user or collaborator cannot
access.

Use incremental indexing so changing one file does not require rebuilding the
entire knowledge space.

Add knowledge-space export, backup, deletion, and recovery.

==================================================
50. TRANSPARENT MEMORY CENTRE
==================================================

Create a user-controlled Memory Centre.

Memory scopes:

- Temporary conversation memory
- Personal memory
- Project memory
- Workspace memory
- Brand memory
- Knowledge-space memory
- Repository memory
- Device-local memory
- Team memory where permitted

Users must be able to:

- View every stored memory
- Search memories
- See why a memory was stored
- See which conversations or projects use it
- Edit a memory
- Delete a memory
- Disable memory globally
- Disable memory for one chat
- Mark a conversation temporary
- Mark a memory local-only
- Set an expiry
- Pin important memory
- Prevent selected data from entering memory
- Export memories
- Import memories safely
- Clear one scope
- Clear all memory

Memory must never silently become an inaccessible permanent profile.

Store only useful structured summaries, not private chain-of-thought.

Add deduplication, contradiction handling, freshness, and confidence metadata.

Do not allow team members to read private personal memory.

==================================================
51. REAL-TIME COLLABORATION AND REVIEW
==================================================

Add real-time collaboration across:

- Documents
- Presentations
- Spreadsheets
- Websites
- Code projects
- Whiteboards
- Knowledge spaces
- AI conversations
- Artifact reviews

Implement:

- Presence
- Live cursors
- Selection awareness
- Comments
- Threads
- Mentions
- Suggestions
- Accept or reject
- Roles
- Owner
- Editor
- Commenter
- Viewer
- Guest links
- Link expiry
- Password protection where appropriate
- Workspace-only sharing
- Version history
- Offline edits
- Conflict-free merging
- Restore
- Branch
- Merge review
- Activity feed
- Notifications

Use a proven conflict-free collaboration architecture.

Enforce permissions server-side.

Do not rely only on hidden buttons.

Every collaborator must see who is active and which content is being changed.

Sensitive operations such as publishing, deleting, remote access, secrets, and
production deployment remain owner- or admin-controlled.

==================================================
52. SECURE EXECUTION RUNTIMES
==================================================

Create a tiered execution system.

BROWSER RUNTIME

Use a secure browser runtime for supported JavaScript and Node projects when
practical.

REMOTE ISOLATED RUNTIME

Use an isolated server or desktop runtime for:

- Python
- Rust
- Java
- C#
- Go
- Databases
- Docker-based projects
- Browser automation
- Heavy builds
- Integration tests
- Export validation
- Malware-sensitive operations

Every runtime must enforce:

- CPU limit
- Memory limit
- Disk limit
- Execution timeout
- Network policy
- Filesystem isolation
- Process isolation
- Dependency policy
- Secret-injection boundaries
- Output-size limit
- Log redaction
- Kill switch
- Automatic cleanup
- Snapshot and restore
- Per-user isolation
- Per-project isolation
- Resource accounting
- Abuse detection

Do not allow arbitrary generated code to reach private application networks or
credentials.

Use allowlists for privileged network access.

Display whether code runs:

- In the browser
- On the server
- On the paired desktop
- In a remote sandbox

==================================================
53. AI QUALITY LABORATORY, EVALUATIONS, AND OBSERVABILITY
==================================================

Create a built-in quality and evaluation system named:

LIMITLESS LABS

Track:

- Provider
- Model
- Prompt version
- Tool calls
- Retrieval sources
- Time to first output
- Total latency
- Input tokens
- Output tokens
- Estimated cost
- Free-route state
- Retry count
- Failover count
- Cancellation
- Error reason
- Export validity
- Build success
- Test success
- User rating
- Accessibility result
- Performance result

Add benchmark suites for:

- Chat quality
- Tool routing
- Coding
- Website generation
- Application generation
- Presentation creation
- Document creation
- Spreadsheet formulas
- Image prompt adherence
- Video-job handling
- Knowledge retrieval
- Citation accuracy
- Memory correctness
- Long-conversation stability
- Multi-key routing
- Never Spend enforcement
- Secret redaction
- Remote-session security
- Automation durability

Add:

- Prompt comparison
- Model comparison
- Provider comparison
- A/B testing
- Regression detection
- Golden datasets
- Human review
- Automated scoring
- Release-gate reports
- Trend dashboards
- Safe trace correlation

Use structured telemetry with strict redaction.

Never collect private content by default merely for analytics.

Provide an opt-in diagnostics mode.

==================================================
54. PASSKEYS AND ACCOUNT SECURITY CENTRE
==================================================

Add passkey authentication through WebAuthn where supported.

Preserve existing Supabase authentication and add passkeys as an additional
secure method.

Create an Account Security Centre showing:

- Passkeys
- Recovery methods
- Active browser sessions
- Active mobile sessions
- Paired desktop devices
- Active remote sessions
- Connected providers
- API-key changes
- Data exports
- Account changes
- Failed sign-in attempts
- Security alerts
- Recent sensitive actions
- Revoke all sessions
- Revoke one session
- Remove passkey
- Add passkey
- Rotate recovery codes

Require strong re-authentication for:

- Replacing provider keys
- Revealing recoverable secrets where supported
- Enabling unattended access
- Publishing to production
- Deleting an account
- Exporting encrypted key backups
- Changing recovery settings
- Granting administrator roles

Add secure recovery flows.

Never weaken authentication to make passkey setup easier.

==================================================
55. LIMITLESS LIVE: VOICE, CAMERA, SCREEN, AND MEETINGS
==================================================

Create a real-time multimodal mode named:

LIMITLESS LIVE

Support, where providers and permissions permit:

- Natural voice conversation
- Low-latency streaming audio
- User interruption
- Voice activity detection
- Push-to-talk
- Camera input
- Screen sharing
- Image discussion
- Live whiteboard discussion
- Voice-driven artifact editing
- Voice-driven website editing
- Desktop voice control with explicit permission
- Meeting transcription
- Speaker separation where supported
- Meeting summary
- Action items
- Live translation
- Captions
- Transcript export
- Audio-device selection
- Echo cancellation
- Noise suppression

Always show visible microphone, camera, and screen-sharing state.

Provide immediate stop controls.

Never record or store media without explicit disclosure and permission.

Use local processing where practical for privacy.

==================================================
56. UNIVERSAL CANVAS AND WHITEBOARD
==================================================

Create an infinite collaborative canvas named:

LIMITLESS CANVAS

Users can place and connect:

- Notes
- Text
- Documents
- Slides
- Spreadsheets
- Images
- Videos
- Audio
- Charts
- Diagrams
- Mind maps
- Websites
- Code
- Database results
- Knowledge sources
- AI conversations
- Tasks
- Frames
- Connectors
- Automation nodes

Support:

- Pan
- Zoom
- Multi-select
- Group
- Align
- Distribute
- Snap
- Layers
- Frames
- Comments
- Presence
- Version history
- Templates
- Export
- Presentation mode
- Mobile viewing
- Keyboard alternatives

AI commands:

- Turn these objects into a report
- Create a presentation from this frame
- Summarize this research cluster
- Connect related ideas
- Build an app from this workflow
- Create tasks from this board
- Convert this diagram into code
- Generate a website from this mood board

Canvas objects must remain structured and linked to their source artifacts.

==================================================
57. MOBILE COMPANION APPLICATION AND OFFLINE MODE
==================================================

Create a Limitless mobile companion architecture for:

- Android
- iPhone
- iPad

Use an architecture compatible with the existing stack and long-term
maintenance.

Support:

- Chat
- Voice
- Camera capture
- Document scanning
- Share-to-Limitless
- Uploads
- Artifact viewing
- Lightweight artifact editing
- Approvals
- Automation notifications
- Desktop pairing
- Remote-session emergency stop
- Project status
- Offline notes
- Offline reading
- Push notifications
- Secure local storage
- Biometric lock where supported
- Background upload
- Conflict-safe sync

Do not claim App Store or Play Store publication unless completed.

Create valid build and release workflows where local publication is impossible.

==================================================
58. INDIVIDUAL, FAMILY, SCHOOL, TEAM, AND ORGANIZATION WORKSPACES
==================================================

Support workspace types:

- Individual
- Family
- Student
- Teacher
- Classroom
- Team
- Organization

Add:

- Workspace roles
- Invitations
- Domain invitations
- Member management
- Shared projects
- Shared knowledge spaces
- Shared templates
- Shared connectors
- Provider policies
- Allowed-model policies
- Never Spend enforcement policies
- Usage limits
- Approval policies
- Audit history
- Data-retention policies
- Workspace export
- Workspace deletion
- Admin controls
- Moderation controls
- Guest restrictions

SCHOOL MODE

Provide safer student-focused defaults:

- No unrestricted terminal
- No unrestricted remote access
- Teacher-controlled sharing
- Assignment projects
- Submission state
- Teacher comments
- Rubrics
- Student-safe connectors
- Age-appropriate permissions
- Clear data controls

Do not expose organization data to personal workspaces.

==================================================
59. TEMPLATE, COMPONENT, CONNECTOR, AND AGENT MARKETPLACE
==================================================

Create a secure marketplace for:

- Website templates
- App templates
- Presentation themes
- Document templates
- Spreadsheet models
- Canvas templates
- Automation recipes
- MCP connectors
- Provider plugins
- Coding-agent skills
- Brand kits
- 3D sections
- UI components
- Workflow nodes

Each marketplace item must include:

- Publisher
- Version
- Compatibility
- Permission manifest
- Requested scopes
- Source or package information
- Security scan state
- License
- Update history
- Ratings
- Reviews
- Install
- Update
- Disable
- Uninstall
- Rollback

Third-party code must run in a sandbox.

No marketplace item may receive account-wide secrets or permissions by default.

Add a private workspace marketplace for organizations.

Do not publish user-created private templates without explicit permission.

==================================================
60. UNIVERSAL IMPORT, EXPORT, AND ROUND-TRIP EDITING
==================================================

Support import and round-trip editing for:

- PPTX
- DOCX
- XLSX
- CSV
- PDF
- Markdown
- HTML
- ZIP website projects
- Google Slides
- Google Docs
- Google Sheets
- Notion exports
- Figma exports or supported APIs
- OpenAPI specifications
- Existing websites
- Git repositories
- Image assets
- Audio
- Video
- Common diagram formats where practical

Round-trip editing should preserve, where technically possible:

- Structure
- Styles
- Layout
- Themes
- Speaker notes
- Headers
- Footers
- Formulas
- Sheet names
- Charts
- Links
- Comments
- Metadata
- Assets

Do not silently destroy unsupported content.

Show an import compatibility report containing:

- Preserved features
- Converted features
- Unsupported features
- Potential layout changes
- Missing fonts or assets
- Security warnings

Keep the original import recoverable.

==================================================
61. AUTONOMOUS AI PROJECT MANAGER
==================================================

Create an internal project-management layer named:

LIMITLESS PROJECTS

It must:

- Convert ideas into milestones
- Build dependency graphs
- Estimate complexity
- Identify external prerequisites
- Detect blockers
- Assign specialist agents
- Track acceptance criteria
- Track tests
- Track migrations
- Track documentation
- Track security reviews
- Track releases
- Detect placeholders
- Detect unfinished routes
- Detect dead buttons
- Detect untested exports
- Detect stale dependencies
- Generate daily summaries
- Generate release notes
- Generate rollback plans
- Generate issue lists
- Create GitHub issues only after approval
- Close issues only after verification
- Prepare changelogs
- Preserve exact resume points

The project manager must use a machine-readable feature matrix.

Create:

`docs/limitless-v2/FEATURE_MATRIX.yaml`
`docs/limitless-v2/DEPENDENCY_GRAPH.md`
`docs/limitless-v2/RELEASE_GATES.md`

Each feature record must contain:

- ID
- Name
- Priority
- Dependencies
- Owner workstream
- Status
- Feature flag
- Required migrations
- Required secrets
- Required tests
- Release gate
- Environment limitations
- Exact evidence of completion

No feature may be marked complete without evidence.

==================================================
62. QUOTA EFFICIENCY, CACHING, AND CONTEXT INTELLIGENCE
==================================================

Improve usage efficiency instead of relying only on multiple API keys.

Implement:

- Semantic response caching
- Exact request deduplication
- Tool-result caching
- Retrieval-result caching
- Prompt-prefix caching
- Context summarization
- Conversation compaction
- Project-context retrieval
- Knowledge-space retrieval
- Reuse of validated artifact plans
- Reuse of export intermediates
- Small-model routing for easy tasks
- Large-model escalation only when required
- Local-model fallback
- Browser-model fallback
- Per-task token budgets
- Per-task request budgets
- Per-user daily budgets
- Provider quotas when reliably reported
- User-visible usage estimates
- Cost estimation before paid multi-call tasks
- Early stopping
- Bounded retries
- Bounded critic loops
- Bounded candidate generation

Never reuse private cached content across different users.

Never cache secrets.

Allow users to clear caches.

Never claim exact remaining quota when the provider does not expose it reliably.

==================================================
63. MODULAR INTERNAL SPECIFICATION WITHOUT LOSING THE ONE-SHOT PROMPT
==================================================

This file remains the complete one-shot master specification.

The engineering agent must automatically create a modular internal documentation
set without asking the owner to split the prompt manually.

Create:

`docs/limitless-v2/00_MASTER_INDEX.md`
`docs/limitless-v2/01_CORE_AND_MIGRATION.md`
`docs/limitless-v2/02_CHAT_MEMORY_AND_KNOWLEDGE.md`
`docs/limitless-v2/03_ARTIFACTS_AND_CANVAS.md`
`docs/limitless-v2/04_BUILD_STUDIO.md`
`docs/limitless-v2/05_MEDIA_AND_LIVE.md`
`docs/limitless-v2/06_CONNECTORS_AND_AUTOMATIONS.md`
`docs/limitless-v2/07_DESKTOP_MOBILE_AND_REMOTE.md`
`docs/limitless-v2/08_SECURITY_AND_PRIVACY.md`
`docs/limitless-v2/09_DATABASE_RLS_AND_STORAGE.md`
`docs/limitless-v2/10_TESTING_EVALS_AND_OBSERVABILITY.md`
`docs/limitless-v2/11_RELEASE_DEPLOYMENT_AND_ROLLBACK.md`
`docs/limitless-v2/FEATURE_MATRIX.yaml`
`docs/limitless-v2/DEPENDENCY_GRAPH.md`
`docs/limitless-v2/RELEASE_GATES.md`

Generate these automatically from this specification.

Do not omit requirements while modularizing.

The master file remains authoritative.

==================================================
64. RELEASE TRAINS AND COMPLETE-FEATURE EXPOSURE
==================================================

Implement foundations in dependency order, but expose only completed, tested
features.

Organize release trains:

LIMITLESS AI v2 CORE

- Data preservation
- Authentication
- Streaming
- Existing sync
- Key vault
- Provider routing
- Artifacts
- Core exports
- Build Studio
- Security
- Migrations
- Recovery

LIMITLESS AI v2.1

- Connectors
- Automations
- Knowledge
- Memory Centre
- Collaboration
- Canvas

LIMITLESS AI v2.2

- Desktop
- Mobile companion
- Coding agent
- Voice and Live mode
- Secure runtimes

LIMITLESS AI v2.3

- Remote desktop
- Marketplace
- Team and organization systems
- Advanced external-agent interoperability

These release trains are implementation and rollout controls, not permission to
ignore later features.

The agent must implement every safe and feasible requirement in this one-shot
task, but keep incomplete features behind fail-closed feature flags.

==================================================
65. RESOURCE, PERFORMANCE, AND COST BUDGETS
==================================================

Create explicit configurable budgets for:

- Main chat JavaScript bundle
- Editor bundles
- Initial page load
- Image assets
- 3D assets
- Texture memory
- Browser memory
- Background jobs
- Export duration
- Runtime duration
- API calls
- AI retries
- Critic loops
- Candidate generations
- Database queries
- Database connection count
- Storage retention
- Temporary files
- Remote-session bitrate
- Remote-session frame rate
- Automation concurrency
- Connector concurrency

Choose practical defaults based on the existing stack.

Record measured values where possible.

Do not fabricate measurements.

If a budget is exceeded:

- Warn during development
- Block release where appropriate
- Suggest or apply optimizations
- Record the exception

==================================================
66. LOCAL-FIRST, BUILT-IN, AND NO-CONNECTION FALLBACKS
==================================================

The product must remain useful even when the owner connects nothing.

Provide local or built-in fallbacks wherever technically practical:

- Local signed-out chat history
- Browser-based artifact editing
- Local project storage
- Local exports
- Browser execution
- Local Ollama integration
- LM Studio integration
- Browser-local models where viable
- Local embeddings
- Local knowledge indexing
- Local desktop automation
- Local file search
- Local scheduled jobs through Limitless Desktop
- Static website export
- Local preview
- Local backups
- Manual file import and export

Clearly distinguish:

- Built-in
- Local
- Browser
- User-authorized external service
- Paid optional service

Do not require a cloud connector for basic operation.

Do not advertise a local fallback as equivalent to unavailable premium models.

==================================================
67. SELF-HEALING, DIAGNOSTICS, AND SUPPORT BUNDLE
==================================================

Add a diagnostics and repair centre.

It must detect:

- Missing environment variables
- Invalid provider keys
- Failed migrations
- Incorrect RLS
- Missing storage policies
- Broken release configuration
- Dead download links
- Provider outages
- Stuck jobs
- Corrupt local cache
- Failed sync
- Desktop disconnection
- Pairing failure
- Sandbox failure
- Build failure
- Export failure
- Connector expiry

Provide safe repair actions:

- Retry
- Reconnect
- Rebuild cache
- Restore last-known-good settings
- Re-run validation
- Regenerate signed URL
- Resume job
- Revoke stuck session
- Reapply safe local configuration
- Open exact documentation

Generate a redacted support bundle containing:

- Version
- Platform
- Feature flags
- Safe configuration state
- Failed commands
- Correlation IDs
- Redacted logs
- Test results
- Migration state
- Provider health without secrets

Never include private content or credentials by default.

==================================================
68. COMPLETE ZERO-TOUCH ACCEPTANCE CRITERIA
==================================================

The zero-touch requirement is satisfied only when:

- The agent creates every repository file itself
- The agent creates every migration itself
- The agent creates every required policy itself
- The agent creates CI and release workflows itself
- The agent creates setup and validation scripts itself
- The agent creates documentation itself
- The agent detects the package manager itself
- The agent detects the current architecture itself
- The agent preserves existing user data
- The agent does not ask the owner to manually edit code
- The agent does not ask the owner to manually write SQL
- The agent does not ask the owner to manually create folders
- The agent does not ask the owner to manually assemble configuration files
- External integrations have built-in setup cards or a first-run wizard
- Local fallbacks exist for basic usage
- Missing optional providers do not break core functionality
- Every unavoidable owner action is listed in one minimal document
- Each unavoidable action has an automatic verification step
- Work resumes automatically after authorization
- No fake connected state is shown
- No fake deployment state is shown
- No fake release is shown
- Incomplete systems remain behind fail-closed feature flags
- The final report contains exact evidence of completion and exact blockers

==================================================
69. ADDITIONAL END-TO-END ACCEPTANCE SCENARIOS
==================================================

SCENARIO L: ZERO-TOUCH FIRST RUN

1. Start from a clean checkout.
2. Run the single setup command.
3. Confirm dependencies install.
4. Confirm safe local configuration is generated.
5. Confirm missing optional credentials are detected.
6. Confirm the application starts in local-only mode.
7. Confirm the setup wizard lists optional integrations.
8. Confirm no source editing is required from the owner.

SCENARIO M: CONNECTOR

1. Open Limitless Connect.
2. Authorize one supported connector through the built-in flow.
3. Confirm minimum scopes.
4. Read data.
5. Attempt a write.
6. Confirm approval where required.
7. Revoke the connector.
8. Confirm further access fails.

SCENARIO N: AUTOMATION

1. Create a scheduled workflow in natural language.
2. Dry-run it.
3. Confirm each step.
4. Activate it.
5. Simulate a failure.
6. Confirm bounded retry and failure notification.
7. Pause and resume.
8. Inspect the run history.

SCENARIO O: KNOWLEDGE

1. Create a private knowledge space.
2. Add several files and one website.
3. Ask a source-grounded question.
4. Confirm citations.
5. Remove one source.
6. Confirm it no longer contributes.
7. Export and delete the knowledge space.

SCENARIO P: MEMORY

1. Store a user-approved preference.
2. View it in Memory Centre.
3. Edit it.
4. Use it in a project.
5. Set expiry.
6. Delete it.
7. Confirm it is no longer used.

SCENARIO Q: COLLABORATION

1. Invite an editor and a commenter.
2. Edit simultaneously.
3. Add a suggestion.
4. Accept the suggestion.
5. Go offline and edit.
6. Reconnect.
7. Confirm conflict-free merge.
8. Revoke guest access.

SCENARIO R: SECURE RUNTIME

1. Run a supported project in the browser runtime.
2. Run a heavier task in an isolated runtime.
3. Confirm resource limits.
4. Attempt unauthorized filesystem or network access.
5. Confirm denial.
6. Cancel the task.
7. Confirm cleanup.

SCENARIO S: LIVE MODE

1. Start voice mode.
2. Interrupt the assistant.
3. Share a screen with explicit permission.
4. Edit an artifact through voice.
5. Stop screen sharing.
6. Confirm visible indicators disappear.
7. Export transcript only after approval.

SCENARIO T: CANVAS

1. Add notes, images, and a document.
2. Group them in a frame.
3. Ask AI to create a presentation.
4. Confirm linked structured artifacts.
5. Collaborate with another user.
6. Restore an earlier canvas version.

SCENARIO U: MOBILE

1. Sign in on a mobile build or CI-produced test build.
2. Capture a document.
3. Upload it.
4. Receive an approval notification.
5. Approve a safe action.
6. Stop an active remote session.
7. Confirm offline notes sync safely later.

SCENARIO V: MARKETPLACE

1. Install a template with a permission manifest.
2. Confirm sandboxing.
3. Update it.
4. Roll back.
5. Uninstall it.
6. Confirm no secrets or residual permissions remain.

SCENARIO W: ROUND-TRIP IMPORT

1. Import a PPTX, DOCX, and XLSX sample.
2. Edit each.
3. Export each.
4. Reopen or parse each.
5. Review the compatibility report.
6. Confirm unsupported content was not silently discarded.

SCENARIO X: PROJECT MANAGER

1. Load the feature matrix.
2. Detect an unfinished placeholder.
3. Create a task.
4. Implement it.
5. Run its tests.
6. Attach evidence.
7. Mark it complete only after verification.

==================================================
70. FINAL ULTIMATE RELEASE GATES
==================================================

Do not describe the full platform as complete unless all applicable gates pass:

- Zero-touch setup works
- Local-only core use works without external connections
- First-run wizard works
- Minimal owner action document is accurate
- Connectors enforce scopes and revocation
- Automations are durable and bounded
- Knowledge answers are source-grounded
- Memory is visible and user-controlled
- Collaboration enforces roles
- Secure runtimes isolate code
- Evaluations and telemetry redact secrets
- Passkeys and session revocation work
- Live mode shows visible privacy indicators
- Canvas objects remain structured
- Mobile workflows are built or honestly CI-configured
- Workspace boundaries are enforced
- Marketplace permissions are sandboxed
- Round-trip imports produce compatibility reports
- Feature matrix contains evidence
- Quota-efficiency systems isolate users
- Resource budgets are measured or explicitly unmeasured
- Diagnostics produce a redacted support bundle
- Every incomplete feature is fail-closed
- No manual source editing is required from the owner
- No feature is labelled connected, deployed, signed, published, or production
  ready without evidence



==================================================
71. TOKEN AND USAGE EFFICIENCY WITHOUT SCOPE REDUCTION
==================================================

The complete specification remains mandatory.

Token efficiency means eliminating waste, not eliminating requirements.

The engineering agent must reduce token and usage consumption through better
execution discipline.

READING AND CONTEXT RULES

At the beginning of the first session:

- Read the complete master specification once.
- Inspect the repository sufficiently to create a reliable architecture map.
- Create a concise machine-readable repository index.
- Create the feature matrix, dependency graph, and progress file.

At the beginning of later sessions:

- Do not reread every unchanged source file.
- Read the master index, progress file, feature matrix, recent Git history,
  current Git diff, failed-test record, and the relevant specification module.
- Read the complete master specification again only when requirements are
  ambiguous, the specification changed, or a security-sensitive decision needs
  confirmation.
- Never rely only on chat memory.

Create:

`docs/limitless-v2/REPOSITORY_INDEX.md`
`docs/limitless-v2/SESSION_LEDGER.md`
`docs/limitless-v2/DECISION_LOG.md`
`docs/limitless-v2/TEST_CACHE.md`

The repository index must summarize:

- Important directories
- Entry points
- Shared libraries
- Data models
- API routes
- Provider adapters
- Authentication
- Supabase clients
- Migrations
- RLS
- Storage
- Background jobs
- Feature flags
- Tests
- Build commands
- Deployment configuration
- Desktop and mobile roots
- High-risk files
- Protected files
- Major dependency boundaries

Update the index only when architecture changes.

REPOSITORY SEARCH RULES

Use targeted repository tools before opening many files:

- Ripgrep or equivalent search
- Git diff
- Git log
- TypeScript language services
- AST or symbol search
- Package scripts
- Test discovery
- Database schema inspection
- Dependency graph tools
- Build diagnostics

Batch related searches.

Do not repeatedly print or copy entire large files into reasoning context when
a symbol, section, diff, or line range is sufficient.

Do not reopen unchanged files without a reason.

Use hashes, modification times, Git status, or the session ledger to detect
whether a file changed.

IMPLEMENTATION RULES

- Work in dependency order.
- Implement complete vertical slices.
- Batch logically related edits.
- Reuse shared schemas and utilities.
- Avoid duplicate implementations.
- Avoid generating multiple competing frameworks.
- Avoid rewriting stable code.
- Prefer small precise patches.
- Use codemods for repetitive safe changes.
- Use generators for repetitive schemas, tests, and documentation where safe.
- Reuse tested components across features.
- Create shared foundations only when multiple real features require them.
- Do not over-abstract simple one-use code.
- Do not refactor unrelated files during a feature implementation.

EXPLANATION RULES

During execution, communicate briefly.

Do not repeatedly restate:

- The full master specification
- The complete plan
- Requirements already recorded
- Previously resolved decisions
- Long lists of unchanged files
- Full test logs when a concise summary and saved report are sufficient

Record detailed evidence in repository files.

In chat, report only:

- What was completed
- What failed
- What is currently running
- What genuinely requires approval
- Exact session resume point

Do not spend a session producing narrative documentation before meaningful
implementation.

Documentation must be created incrementally from verified implementation data.

TESTING EFFICIENCY

Use targeted tests while implementing.

Run the full suite only:

- At the baseline
- At major phase gates
- Before release
- After changes to shared critical infrastructure
- When targeted failures indicate a wider regression

Maintain a test cache containing:

- Command
- Relevant commit
- Files covered
- Result
- Timestamp
- Reason to invalidate

Do not treat stale test results as current after relevant files change.

Do not rerun an expensive unchanged suite without a reason.

Never skip a required final release-gate test to save usage.

BUILD EFFICIENCY

- Reuse dependency caches.
- Reuse build caches.
- Reuse export fixtures.
- Reuse local development databases safely.
- Use incremental TypeScript checks where available.
- Use affected-test selection where reliable.
- Use incremental linting during development.
- Use full clean builds at release gates.
- Preserve last-known-good artifacts and previews.
- Avoid reinstalling unchanged dependencies.
- Avoid clearing caches unless corruption is suspected.

MODEL AND TOOL ROUTING FOR DEVELOPMENT

When GPT Work supports internal model or agent routing:

- Use deterministic repository tools before model reasoning.
- Use fast or lower-cost internal workers for mechanical searches, formatting,
  simple tests, and repetitive safe edits.
- Use the strongest reasoning worker for architecture, migrations, security,
  concurrency, provider routing, complex debugging, and final integration.
- Do not spawn multiple agents to duplicate the same investigation.
- Do not generate several candidate implementations unless comparison is
  genuinely valuable.
- Limit critic and repair loops.
- Stop when acceptance criteria pass.

If internal model selection is not available, apply the same principle by using
the current model economically.

PARALLEL WORK

Use parallel specialist workstreams only when they:

- Modify separate files or modules
- Have clear contracts
- Do not duplicate repository scans
- Do not independently redesign shared architecture
- Can be integrated during the same session

Assign one shared owner for:

- Core schemas
- Database migrations
- Provider interfaces
- Artifact models
- Feature flags
- Security policies

Review and integrate parallel changes centrally.

Do not create parallel work merely to appear faster.

OUTPUT COMPRESSION

Store large generated reports in repository files.

Do not paste full reports into chat.

Use compact tables or structured YAML/JSON/Markdown for:

- Feature status
- Test status
- Migration status
- Blockers
- Session resume points
- Evidence

Never compress away critical failures or security limitations.

==================================================
72. FIVE-SESSION COMPLETION STRATEGY
==================================================

Target completion in no more than five GPT Work sessions.

This is a throughput target, not permission to fake completion or cut scope.

Before implementation, assign every feature in the machine-readable feature
matrix to one of these sessions.

SESSION 1: CORE PLATFORM AND DATA SAFETY

Complete as much as possible of:

- Repository audit and baseline
- User-data preservation
- Existing v4.1/v5 migration safety
- Authentication
- Local signed-out mode
- Account synchronization
- Browser migration
- Recovery snapshots
- Streaming rebuild
- Obsolete source-ZIP removal
- Broken email-sync removal
- Provider-neutral AI foundation
- Encrypted key vault
- Three-slot OpenRouter key pool
- Never Spend enforcement
- Core migrations
- Core RLS and storage policies
- Feature flags
- Background-job foundation
- Setup and diagnostics foundation

Do not spend the full session only auditing.

Begin implementation immediately after the minimum safe baseline.

SESSION 2: ARTIFACTS AND CREATION TOOLS

Complete as much as possible of:

- Shared Artifact Workspace
- Artifact persistence and versioning
- Presentation editor
- PPTX export
- Document editor
- DOCX export
- Spreadsheet editor
- XLSX and CSV export
- PDF export
- Private storage
- Signed downloads
- Import and round-trip foundations
- Canvas foundation
- Artifact tests
- Export-validation tests

SESSION 3: WEBSITE, APPLICATION, AND EXECUTION STUDIO

Complete as much as possible of:

- Limitless Build Studio
- Split chat and live preview mode
- Code editor
- File tree
- Visual inspector
- Responsive preview
- 3D and motion foundations
- Full-stack app generation
- Secure preview sandbox
- Browser runtime
- Isolated-runtime interfaces
- Project ZIP export
- Deployment adapters
- GitHub export foundation
- Brand kits
- Design memory
- Visual and functional review
- Website/app tests

SESSION 4: INTELLIGENCE, CONNECTIONS, AND COLLABORATION

Complete as much as possible of:

- Media provider improvements
- Image and video jobs
- Provider marketplace
- Dynamic model catalog
- Knowledge OS
- Memory Centre
- Limitless Connect
- MCP support
- Automations
- Real-time collaboration
- Universal Canvas completion
- Voice and Live foundations
- Quality evaluations
- Observability
- Quota efficiency
- Caching
- Organization and school workspace foundations
- Marketplace foundations

SESSION 5: DESKTOP, MOBILE, REMOTE, INTEGRATION, AND RELEASE

Complete as much as possible of:

- Tauri desktop application
- Secure pairing
- Device management
- Coding agent
- Remote-session foundation
- Remote desktop permissions
- Mobile companion foundation
- Passkeys and Security Centre
- Final integration
- Complete migration review
- RLS review
- Secret scanning
- Accessibility
- Performance
- Full web validation
- Windows and macOS CI
- Release workflows
- Setup wizard
- Documentation
- Beginner deployment guide
- Rollback guide
- Known limitations
- Final evidence report

SESSION BOUNDARY RULES

At the end of every session:

1. Finish the current safe atomic change.
2. Save all work.
3. Run the most relevant targeted validation.
4. Fix regressions that can be fixed safely.
5. Update the feature matrix.
6. Update the progress file.
7. Update the session ledger.
8. Create a local checkpoint commit if supported; otherwise create a portable checkpoint bundle.
9. Record the exact first task for the next session.
10. Record commands already run so they are not repeated unnecessarily.

Never begin the next session by redoing completed work.

If a session finishes its assigned work early, continue into the next session's
work automatically.

If a session cannot finish its assigned work:

- Preserve working vertical slices.
- Keep incomplete parts fail-closed.
- Move the exact remainder forward.
- Do not restart the phase from zero.
- Do not hide incomplete work.

==================================================
73. TOKEN BUDGETS AND STOPPING RULES
==================================================

Create a session budget before substantial work begins.

The budget must allocate effort among:

- Repository inspection
- Implementation
- Testing
- Debugging
- Integration
- Progress recording

Implementation must receive the majority of the session budget.

Suggested default allocation:

- 10% inspection and targeted planning
- 55% implementation
- 20% testing and debugging
- 10% integration
- 5% progress, evidence, and resume documentation

Adjust when security or migration risk requires more inspection.

Do not use a fixed percentage when it would cause unsafe work.

STOP WASTEFUL LOOPS

Stop and change strategy when:

- The same test fails three times for the same unchanged reason.
- The same provider request fails repeatedly without new evidence.
- The same implementation is rewritten without a new requirement.
- A missing credential blocks only one optional feature.
- A build failure originates from unavailable external infrastructure.
- A critic loop no longer produces meaningful improvement.
- A visual repair loop reaches its configured maximum.

When blocked:

- Document the blocker.
- Implement a fallback or activation path.
- Continue with unrelated requirements.

Do not spend an entire session waiting on one optional external service.

==================================================
74. QUALITY PRESERVATION UNDER TOKEN LIMITS
==================================================

Token limits must never justify:

- Skipping RLS
- Skipping ownership checks
- Exposing secrets
- Disabling TypeScript
- Suppressing lint globally
- Removing tests
- Faking exports
- Faking binaries
- Faking deployments
- Faking provider access
- Faking successful builds
- Leaving destructive actions unprotected
- Removing recovery
- Removing audit history
- Omitting data migration safety
- Marking foundations as production complete
- Ignoring accessibility for critical flows
- Publishing incomplete security-sensitive features

When the remaining session budget cannot safely finish a feature:

- Finish a smaller complete vertical slice.
- Put the unfinished portion behind a fail-closed flag.
- Add exact tests and resume instructions.
- Continue it in the next session.

Never create broad unfinished scaffolding merely to increase the reported
completion percentage.

==================================================
75. TOKEN-EFFICIENT ACCEPTANCE CRITERIA
==================================================

The usage-efficiency layer is acceptable only when:

- The complete specification remains present.
- No feature is deleted to reduce token usage.
- The repository is not fully rescanned without reason each session.
- Later sessions start from progress, Git history, and relevant modules.
- Repeated plans and explanations are avoided.
- Repository searches are targeted and batched.
- Unchanged files are not repeatedly reopened.
- Targeted tests are used during implementation.
- Full validation still runs at release gates.
- Test results include commit-aware validity.
- Build and dependency caches are reused.
- Parallel agents do not duplicate work.
- Critical decisions are stored once and reused.
- Session ledgers prevent repeated work.
- Model effort is concentrated on difficult tasks.
- Simple work uses deterministic tools first.
- No security or quality gate is removed.
- No fake completion is reported.
- The exact next action is always preserved.
- The project can resume after a limit without repeating completed work.


==================================================
76. ONE-MONTH COMPLETION DEADLINE
==================================================

Target the strongest complete, tested, secure, and deployable Limitless AI v2
implementation within 30 calendar days or less from the first GPT Work session.

The deadline is mandatory for planning and execution efficiency.

It does not allow:

- Removing requirements
- Downgrading security
- Skipping RLS
- Skipping migrations
- Skipping final validation
- Replacing production features with mocks
- Marking foundations as complete
- Hiding blocked work
- Publishing unsafe features
- Faking binaries, deployments, tests, or provider access

Create:

`docs/limitless-v2/ONE_MONTH_EXECUTION_PLAN.md`
`docs/limitless-v2/DAILY_PROGRESS.md`
`docs/limitless-v2/USAGE_BUDGET.md`

The one-month execution plan must contain:

- Day range
- Session number
- Assigned workstreams
- Dependencies
- Expected deliverables
- Validation gates
- Remaining blockers
- Risk level
- Exact evidence required for completion

The daily progress file must contain only concise verified facts:

- Date
- Session
- Completed work
- Tests run
- Failures
- Blockers
- Changed files
- Current commit
- Next exact action

The usage budget must track:

- Sessions used
- Approximate relative usage consumed when observable
- Expensive tasks already completed
- Expensive tasks still remaining
- Full-suite runs already completed
- Full-suite runs still required
- External blockers
- Remaining deadline days

Do not invent token counts or exact usage values when GPT Work does not expose
them.

==================================================
77. THIRTY-DAY EXECUTION CALENDAR
==================================================

Organize the implementation into five major Work sessions, with recovery days
and follow-up validation available inside the one-month window.

DAYS 1–5: SESSION 1 — CORE PLATFORM

Deliver:

- Repository audit and baseline
- Architecture index
- Data-preservation safeguards
- Authentication preservation
- Local signed-out mode
- Account synchronization
- Browser migration
- Recovery snapshots
- Streaming rebuild
- Broken-feature removals
- Provider-neutral routing
- Encrypted key vault
- Three-slot OpenRouter pool
- Never Spend
- Core migrations
- Core RLS
- Feature flags
- Setup and diagnostics foundation

Do not spend more than the minimum safe time on planning.

DAYS 6–10: SESSION 2 — ARTIFACTS

Deliver:

- Shared Artifact Workspace
- Artifact versions
- Presentation editor
- PPTX export
- Document editor
- DOCX export
- Spreadsheet editor
- XLSX and CSV export
- PDF export
- Private storage
- Signed downloads
- Import foundations
- Artifact tests
- Export validation

DAYS 11–15: SESSION 3 — BUILD STUDIO

Deliver:

- Split chat and workspace mode
- Live preview
- Code editor
- File tree
- Visual inspector
- Website generation
- App generation
- Responsive preview
- Professional design system
- 3D and motion foundations
- Secure preview sandbox
- Browser runtime
- Project ZIP export
- Publish adapters
- Brand kits
- Design memory
- Website/app tests

DAYS 16–20: SESSION 4 — INTELLIGENCE AND CONNECTIONS

Deliver:

- Media routing improvements
- Image and video jobs
- Provider marketplace
- Dynamic model catalog
- Knowledge OS
- Memory Centre
- MCP and connectors
- Automations
- Collaboration
- Canvas
- Voice/Live foundations
- Evaluation system
- Observability
- Quota efficiency
- Caching
- Workspace and marketplace foundations

DAYS 21–25: SESSION 5 — DESKTOP, MOBILE, REMOTE, AND RELEASE

Deliver:

- Tauri desktop application
- Pairing
- Device management
- Coding agent
- Remote-session foundation
- Remote permissions
- Mobile companion foundation
- Passkeys
- Security Centre
- Final integration
- Full migration review
- RLS review
- Secret scan
- Accessibility
- Performance
- Web validation
- Desktop CI
- Release workflows
- Setup wizard
- Deployment guide
- Rollback guide
- Known limitations
- Final evidence report

DAYS 26–30: VALIDATION AND RECOVERY BUFFER

Use only for:

- Fixing failed release gates
- Completing carried-over vertical slices
- Final full-suite validation
- Security review
- Migration verification
- Export verification
- Build verification
- CI verification
- Documentation accuracy
- Rollback verification
- Release preparation

Do not intentionally delay known work until the buffer.

If work finishes early, continue immediately.

==================================================
78. DEADLINE-AWARE PRIORITIZATION WITHOUT CUTTING SCOPE
==================================================

Use dependency-first prioritization.

Complete shared foundations before dependent features.

Prioritize in this order when work competes for the same session:

1. Existing user-data safety
2. Authentication and authorization
3. RLS and secret protection
4. Existing production functionality
5. Core chat and streaming
6. Shared artifact and job foundations
7. Real exports
8. Build Studio
9. Provider routing and Never Spend
10. Knowledge, memory, and connectors
11. Desktop pairing and coding agent
12. Remote-session safety
13. Mobile, marketplace, and organization layers
14. Visual polish beyond acceptance requirements

This ordering does not remove lower items.

It only controls execution sequence.

When a feature cannot be fully activated because of external credentials or
platform restrictions:

- Finish the full internal implementation
- Add the setup wizard
- Add the verification flow
- Add a local or built-in fallback where practical
- Keep the external activation fail-closed
- Continue with unrelated work
- Record the exact unavoidable owner action

Do not let one unavailable external integration consume an entire session.

==================================================
79. MONTHLY USAGE CONSERVATION RULES
==================================================

Use the smallest amount of GPT Work usage that still preserves correctness.

Do:

- Read the complete specification once during Session 1
- Use modular specification files in later sessions
- Reuse the repository index
- Reuse the decision log
- Reuse the feature matrix
- Reuse Git history
- Reuse valid test results until relevant files change
- Use targeted searches
- Use targeted tests
- Use incremental builds
- Batch related changes
- Batch related validation
- Store long reports in files
- Keep chat updates brief
- Use exact resume points
- Use lower-cost deterministic tools for mechanical work
- Use strongest reasoning only for high-risk work
- Continue automatically across assigned session work

Do not:

- Repeat full audits
- Re-explain the entire plan
- Reopen unchanged files
- Re-run unaffected expensive suites
- Generate duplicate candidate implementations
- Spawn agents that duplicate work
- Rewrite stable architecture
- Produce long commentary instead of editing
- Spend usage polishing incomplete foundations
- Rebuild already validated exports without reason
- Re-index unchanged knowledge data
- Retry blocked external services endlessly

Full validation remains mandatory before release.

==================================================
80. ONE-MONTH ACCEPTANCE CRITERIA
==================================================

The one-month execution requirement is satisfied only when:

- The master specification remains complete
- No feature was deleted to meet the deadline
- No security requirement was weakened
- No test was falsely reported
- No blocked feature was presented as complete
- Five major sessions were planned
- Daily and session progress were recorded
- Work resumed without repeating completed tasks
- The repository remained recoverable
- Core features were implemented before optional activation work
- External blockers did not halt unrelated implementation
- The final five-day buffer was reserved for validation and repair
- The final report clearly separates:
  - Production functional
  - Locally functional
  - CI-configured
  - Requires credentials
  - Requires production infrastructure
  - Not verified
  - Blocked
- The final state is the strongest honestly completed version achievable within
  30 days


==================================================
81. ISOLATED GPT WORK ENVIRONMENT AND PORTABLE HANDOFF
==================================================

Assume the engineering environment may be isolated, temporary, and unable to:

- Push to GitHub
- Open the owner's local repository directly
- Preserve local commits after the session
- Access production services
- Deploy to Vercel
- Publish release assets
- Modify the owner's computer
- Retain generated files unless they are explicitly exported

The agent must detect the actual capabilities once and record them in:

`docs/limitless-v2/ENVIRONMENT_CAPABILITIES.md`

Record:

- Filesystem persistence
- Git availability
- Git commit availability
- Remote-origin availability
- Push availability
- Network availability
- Package-install availability
- Build-tool availability
- Supabase access
- Vercel access
- Release access
- Artifact-download support
- Maximum practical archive size
- Known session limits

Do not repeatedly retest an unsupported capability unless the environment
changes.

When direct Git persistence is unavailable, portable artifact delivery becomes
the authoritative checkpoint mechanism.

==================================================
82. PORTABLE CHECKPOINT BUNDLES
==================================================

At the end of every meaningful milestone and every Work session, generate one
downloadable checkpoint bundle.

Preferred bundle name:

`Limitless-AI-v2-Session-<N>-Checkpoint.zip`

The bundle must contain, as applicable:

- The complete changed repository or a complete overlay containing every
  changed and added file
- Deleted-files manifest
- Unified Git patch
- Binary assets that cannot be represented in a patch
- SQL migrations
- Supabase policies
- Storage policies
- Environment-variable example files
- Setup scripts
- CI workflows
- Tests
- Test fixtures
- Documentation
- Feature matrix
- Progress file
- Session ledger
- Decision log
- Repository index
- Test cache
- Environment-capabilities report
- Exact resume instruction
- Integrity manifest
- SHA-256 checksums
- Import or application script where safe

Create:

`handoff/README_FIRST.md`
`handoff/CHANGED_FILES.json`
`handoff/DELETED_FILES.json`
`handoff/SESSION_STATE.json`
`handoff/APPLY_INSTRUCTIONS.md`
`handoff/VERIFY_INSTRUCTIONS.md`
`handoff/ROLLBACK_INSTRUCTIONS.md`
`handoff/checksums.sha256`

`README_FIRST.md` must tell the owner the minimum required action in plain
language.

The preferred owner workflow must be:

1. Download one checkpoint archive.
2. Extract it into the repository or use the supplied safe apply script.
3. Review the changed-files summary.
4. Run one verification command.
5. Push the result manually only when ready.

Do not require the owner to copy dozens of individual files manually.

Do not require the owner to reconstruct folder structures.

Do not require the owner to manually paste large patches.

Do not require the owner to manually write migration files.

PORTABLE OVERLAY

When exporting only changed files, preserve their exact repository-relative
paths.

Include deletion information separately.

Never rely on empty folders being preserved by ZIP.

Add marker files only where genuinely required.

PATCH REQUIREMENTS

Generate a unified patch for text changes where possible.

Do not rely on the patch alone for:

- Binary files
- Renames that lose metadata
- Large generated assets
- Lockfiles that require exact replacement
- Files omitted by patch tooling

Include exact files as the source of truth.

ARCHIVE VALIDATION

Before presenting a checkpoint archive:

- Verify it opens
- Verify expected files are present
- Verify paths are relative
- Reject path traversal
- Reject absolute paths
- Reject zip-slip paths
- Generate checksums
- Compare the changed-files manifest with the archive
- Confirm no secrets are included
- Confirm no temporary caches are included
- Confirm no dependency directories are included unless explicitly necessary
- Confirm no unrelated user files are included

Never claim the archive is valid unless these checks ran.

==================================================
83. SINGLE-ACTION OWNER HANDOFF
==================================================

Minimize the owner's work.

The agent must create a safe apply helper appropriate to the repository and
platform, such as:

- `handoff/apply-checkpoint.ps1`
- `handoff/apply-checkpoint.sh`
- `handoff/apply-checkpoint.mjs`

The helper must:

- Detect the repository root
- Refuse to run in the wrong directory
- Show the files that will change
- Back up overwritten files
- Apply additions and modifications
- Handle deletions only after clear confirmation
- Preserve unrelated user work
- Never run destructive Git commands
- Never push
- Never deploy
- Never expose secrets
- Produce an application report
- Provide a rollback command or backup location

Also create one verification helper:

- `handoff/verify-checkpoint.ps1`
- `handoff/verify-checkpoint.sh`
- or an equivalent cross-platform command

It should run the minimum reliable verification using the repository's real
package manager and scripts.

When a one-command helper cannot be made safely, provide the smallest possible
manual procedure.

==================================================
84. SESSION CONTINUITY WITHOUT PERSISTENT COMMITS
==================================================

Do not depend on Git commits as the only session memory.

The exact session state must be stored in files included in every checkpoint
bundle.

`handoff/SESSION_STATE.json` must include:

- Session number
- Timestamp
- Source specification version
- Repository baseline identifier
- Changed-files list
- Deleted-files list
- Completed feature IDs
- In-progress feature IDs
- Blocked feature IDs
- Tests run
- Test results
- Failed commands
- External prerequisites
- Exact first task for the next session
- Relevant file paths
- Relevant symbols
- Known errors
- Feature flags
- Migration order
- Archive checksum

The next GPT Work session must begin by reading:

1. `docs/LIMITLESS_V2_MASTER_SPEC.md`
2. `docs/LIMITLESS_V2_PROGRESS.md`
3. `docs/limitless-v2/SESSION_LEDGER.md`
4. `handoff/SESSION_STATE.json`
5. The feature matrix
6. The recent changed-files manifest
7. The relevant specification module

Do not rescan or regenerate completed work.

If the owner uploads the previous checkpoint archive into a new session, treat
it as the authoritative continuation state.

==================================================
85. GIT BEHAVIOUR IN A NON-PERSISTENT ENVIRONMENT
==================================================

Use Git only when it is genuinely useful and available.

Allowed:

- `git status`
- `git diff`
- `git log`
- Local branches
- Local commits when they remain available long enough to produce the handoff
- Patch generation
- File-change discovery

Do not assume local commits survive after the session.

Do not repeatedly attempt:

- Authentication
- Remote push
- GitHub connection
- Deployment
- Release publication

When push is unavailable:

- Record it once
- Continue implementation
- Export the complete checkpoint
- Give the owner the exact optional push command
- Do not count manual push as unfinished implementation work

The owner manually pushing the downloaded result is acceptable.

==================================================
86. TOKEN EFFICIENCY FOR ISOLATED WORK
==================================================

Prevent wasted usage caused by environment limitations.

Do not:

- Retry unavailable push operations
- Retry unavailable deployment operations
- Recreate the same archive repeatedly without changes
- Recompute unchanged checksums
- Reinstall dependencies after an environment reset when cached artifacts are
  available
- Re-audit files already indexed in the uploaded checkpoint
- Repeat long explanations of why the environment is isolated
- Produce multiple overlapping handoff archives per milestone
- Export both a full repository and many redundant partial archives unless
  required by size limits

Do:

- Generate one authoritative archive per session
- Generate smaller milestone archives only after high-risk changes
- Reuse the previous session manifest
- Use incremental overlays where reliable
- Include a full final archive at the end of the month
- Keep the chat response short and link the archive
- Put detailed evidence inside the bundle
- Continue implementation instead of discussing environment limitations

==================================================
87. FINAL MONTH-END DELIVERY PACKAGE
==================================================

At the end of the implementation month, generate one final authoritative
delivery package:

`Limitless-AI-v2-Final-Delivery.zip`

It must contain:

- Complete final repository source
- All migrations in exact order
- All tests
- All CI workflows
- All documentation
- Environment-variable guide
- Setup wizard
- Minimal owner actions
- Build and release instructions
- Deployment instructions
- Rollback instructions
- Known limitations
- Security report
- Test report
- Feature matrix
- Evidence manifest
- Complete file-change report
- Checksums
- Safe apply or replacement instructions
- Exact commands for the owner to verify and push

Exclude:

- `node_modules`
- Build caches
- Local secrets
- Real API keys
- Session tokens
- Service-role credentials
- Signing credentials
- Temporary files
- Unrelated repository content not needed for delivery

Validate the final archive before presenting it.

==================================================
88. PORTABLE DELIVERY ACCEPTANCE CRITERIA
==================================================

The isolated-environment correction is acceptable only when:

- The prompt does not assume GPT Work can push
- The prompt does not depend exclusively on persistent commits
- Unsupported push attempts are not repeated
- Every session produces one authoritative checkpoint
- Checkpoints preserve exact repository-relative paths
- Added, modified, renamed, and deleted files are represented
- Binary files are included
- Migrations are included
- Progress and exact resume state are included
- Checksums are included
- No secrets are included
- The archive is validated
- The owner can apply the result without manually reconstructing files
- One safe verification command is supplied
- The final month-end delivery contains the complete repository
- The owner's manual push is the only normal unavoidable repository action
- No requirement from the master specification is removed or weakened

==================================================
FINAL AUTONOMOUS LAUNCH INSTRUCTION
==================================================

Begin immediately and work on the actual repository.

Complete the upgrade using the least model usage and fewest unnecessary tokens
possible while preserving the complete specification and all quality, security,
testing, migration, and recovery requirements.

Target full implementation in five sessions or fewer and complete the strongest
genuinely finished, tested, and secure release within 30 calendar days or less.

Treat the month as a hard execution window.

Do not cut scope, skip safeguards, omit tests, fake completion, or remove
requirements to meet the deadline.


Do not waste tokens by repeating plans, rescanning unchanged files, reopening
unchanged source, rerunning unaffected tests, producing long narrative updates,
or duplicating work across agents.

Assume this may be an isolated GPT Work environment. Do not waste usage trying
to push or deploy when those operations are unavailable.

At every session boundary, generate one validated downloadable checkpoint
archive containing all changed files, migrations, tests, progress records,
manifests, checksums, apply instructions, verification instructions, and the
exact resume state.

At the final session, generate one complete final repository delivery archive.


Use the repository index, feature matrix, session ledger, decision log, Git
history, test cache, and exact resume points to continue efficiently.


The owner will not manually implement or wire this project.

Perform every safe action yourself.

First:

1. Read this entire specification without skipping any section.
2. Save or update it as `docs/LIMITLESS_V2_MASTER_SPEC.md`.
3. Create the modular internal specification documents automatically.
4. Inspect the complete repository, Git state, package manager, migrations,
   storage, RLS, tests, provider integrations, deployment configuration, and
   existing user-data paths.
5. Preserve all pre-existing user changes.
6. Create a recoverable baseline.
7. Create the architecture audit, implementation plan, feature matrix,
   dependency graph, release gates, progress file, and minimal-owner-actions
   file.
8. Run real baseline validation.
9. Implement Phase 1 and continue through every remaining phase.
10. Use specialist workstreams where supported.
11. Keep the repository buildable.
12. Create safe checkpoint commits.
13. Run targeted tests throughout and full validation at release gates.
14. Fix regressions caused by the upgrade.
15. Keep incomplete features behind fail-closed feature flags.
16. Create all migrations, policies, scripts, setup flows, CI workflows,
    documentation, exports, validation, and recovery tooling yourself.
17. Prefer local, browser, built-in, or free-first fallbacks where external
    services are unavailable.
18. Reduce unavoidable owner involvement to simple authorization, credential,
    permission, signing, or deployment approvals.
19. Never ask the owner to manually edit code, manually write SQL, manually
    construct configuration, or manually create project files.
20. Never push, merge, publish, sign, release, deploy, perform a destructive
    action, or mutate production data without explicit approval.
21. Never claim completion, connection, publication, signing, or successful
    testing without evidence.
22. Continue automatically until every safe and feasible requirement has been
    implemented, validated, documented, or precisely marked as blocked.

If an external requirement prevents activation:

- Finish the complete internal implementation.
- Add a local or safe fallback where practical.
- Add the built-in setup and verification flow.
- Record the one unavoidable owner action.
- Continue with all unrelated work.

If interrupted:

- Finish the current atomic change.
- Save files.
- Run the most relevant test.
- Update progress.
- Commit safely.
- Record the exact resume instruction.

When the environment prevents full completion, state exactly:

“Implementation completed to the maximum level available in this environment.”

Then list every blocked item, the evidence for completed items, and the minimum
remaining owner actions.

Do not stop after planning.

Do not stop after scaffolding.

Do not stop after the audit.

Start now.
