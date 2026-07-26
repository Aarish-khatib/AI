# Rollback instructions

## Before applying

- Export a current Limitless backup.
- Back up or tag the repository.
- Back up Supabase and private Storage.
- Keep the current deployment available for rollback.

## Source rollback

If the complete release was committed, revert that reviewed commit and redeploy
the previous source through the owner's normal workflow.

If `handoff/apply-checkpoint.mjs` was used, open the printed backup directory
and its `apply-report.json`. Restore `overwritten` and `deleted` files from that
backup, then remove only entries listed as `created`. Do not delete unlisted
paths.

## Browser data

Do not clear site data. Export a v10 backup first. Older app versions may ignore
new stores, but clearing IndexedDB would destroy offline artifacts, project
versions, provider state, recovery branches, and rollback evidence.

## Database rollback

The v2 migrations are additive and older source ignores the new tables. Leaving
them installed is safer than dropping user data during an emergency source
rollback. Any destructive database rollback requires a fresh backup, stopped v2
clients, dependency review, and explicit database-owner approval.

## External services

Disable paid provider routes by returning to Limitless Free and removing the
user-entered keys. Revoke pairing sessions before disabling the pairing
function. Revert OAuth, signing, store, or deployment credentials only through
their owning services.
