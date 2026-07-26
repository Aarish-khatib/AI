# Limitless Free and paid BYOK modes

`Use Limitless Free` is on by default and forces `Never Spend`. It accepts only
verified free, local, or browser provider classes. Paid and unknown-cost routes
are rejected; there is no automatic downgrade or cross-mode fallback.

Paid BYOK requires a warning confirmation, Free off, Never Spend off, a provider
key that passed an authentication-only connection test, a paid provider class,
and positive per-request, daily, and monthly budgets. Allow/block lists and
deduplication still apply. Any invalid or exceeded estimate blocks before the
request.

Cost records are labeled `estimated` unless the provider returns authoritative
actual cost. The provider’s invoice is authoritative. Reset to Free immediately
restores Never Spend and clears paid defaults.
