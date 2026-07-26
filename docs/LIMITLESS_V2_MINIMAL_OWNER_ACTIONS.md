# Minimal owner actions

Perform only the actions that apply, in this order:

1. Back up the current production project and database.
2. Approve and apply all unapplied Supabase migrations in filename order.
3. Configure the pairing Edge Function secrets and exact production origin,
   then deploy it.
4. Add the public Supabase variables to the existing Vercel project.
5. Authorize any desired OAuth connector; leave unused connectors disconnected.
6. Enter personal provider keys in the encrypted in-app Provider Hub and test
   each connection. Set budgets before disabling Limitless Free.
7. Approve the production web deployment.
8. If native releases are wanted, add Windows signing and Apple
   signing/notarization secrets, replace the updater endpoint/public key, then
   manually approve the draft CI release.
9. Approve operating-system microphone, screen, or accessibility permissions
   only when deliberately using those features.
10. Push or merge the source through the owner’s normal reviewed Git workflow.
