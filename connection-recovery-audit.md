# Connection recovery sweep

Rule: a dropped connection must not blank a page, falsely sign someone out, silently discard progress, or change an already completed action.

## Reviewed paths
- Home, method, privacy, terms: no data loaders; shared root recovery now uses PageError.
- Discover, startup, research, scan, workspace list/detail, credits, history/admin, invites: shared bounded query retries; every loader now has a local error and missing-resource boundary.
- Auth guard: network verification failures show recovery instead of redirecting a signed-in founder to sign-in. Sign-in, signup, reset and Google handlers release busy state on thrown errors.
- Settings, claims, checkout, team actions: existing visible mutation errors and finally cleanup; no automatic mutation replay. Team reads and writes now check database errors rather than presenting false membership/ownership failures.
- Research and scan drivers: existing three-failure backoff, saved progress and manual restart; terminal entry guards remain. Stage/failure writes now condition on current status, and stage claims/cluster reads check database failures.
- Demand checks: existing bounded driver and cached evidence; failed manual retry is now visible, and claim/completion database failures no longer report success.
- Weekly watch: reads use shared retries; sync failures now show saved-findings reassurance and explicit retry instead of console-only failure.
- Competitor profiles: failed reads/enrichment have a visible failed state; banner generation retains the existing brand fallback and clears failed shared promises.
- Workspace saves: existing local-first pending edits, visible save error and explicit retry; no changes to merge or permissions.
- Payment fulfillment/refunds: existing signature verification, checked RPC errors and pending-only failure updates retained. No paid/refunded records modified.
- Context.dev calls: existing provider deadline and error handling retained; no model/provider or credit settings changed.

## Verification
- Signed-in workspace: three injected read failures, then manual retry restored real workspace rows.
- Auth verification interruption: stayed on requested workspace URL, then retry restored signed-in workspace list.
- Prior startup check: three injected failures, then retry restored RemitLoom.
- 39 focused loading, driver, demand and discovery tests pass.
- Credit-page failure injection was inconclusive because catalog data was already cached; checkout remains separately blocked by existing payment configuration.

## Limits
- Generated database transports have no app-owned timeout; these generated files were left unchanged. This sweep verifies rejected connections, not indefinitely hanging transports.
- No email delivery workflow exists until sender domain setup; no sent records changed.
- No live payment, account mutation or permission change was performed.