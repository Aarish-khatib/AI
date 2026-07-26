# Rollback

1. Stop new deployment traffic and preserve logs without credential values.
2. Redeploy the last known-good web artifact. Keep the same domain.
3. Do not delete the additive database tables; older clients ignore them.
4. Disable the pairing Edge Function and revoke affected devices/sessions if
   the incident involves native access.
5. Reset Provider Hub to Limitless Free and Never Spend.
6. Restore user data only from a checksum-valid backup. Preserve divergent work
   as a recovered branch.
7. Re-run the old release’s verification gate before reopening traffic.

The release archive contains `handoff` material from earlier sessions and a
current source manifest. Destructive schema rollback is intentionally omitted;
it risks deleting user data and requires a separately reviewed owner action.
