# Balance loading without payment setup

Rule: a signed-in founder can read their actual available credits and use already-granted credits even before payment setup is complete. Missing payment setup must not block wallet reads. Test and live wallets remain separate; checkout still requires payment credentials.

## Screens and actions reviewed

| Location | Code reviewed | Result |
| --- | --- | --- |
| Header menu on every page | `CreditBalance.tsx`, `credit-queries.ts` | Pass: shared bounded wallet read, actual balance less reservations, retry feedback. |
| Discover search confirmation and start | `ResearchStep.tsx` | Pass: same wallet read and environment helper; does not require checkout. |
| Startup public/private claim confirmation | `startup.$slug.tsx` | Pass: same wallet read/helper; charges remain atomic. |
| Workspace claim status and private upgrade | `ClaimAccess.tsx`, `queries.ts`, `projects.functions.ts` | Pass: claim read and upgrade use the same nonthrowing environment helper. |
| Buy credits balance and payment-return status | `credits.tsx` | Pass: wallet read independent of payment setup; payment readiness remains separate. |
| Transaction history, reservations and payment history | `credits.history.tsx` | Pass: same bounded read and account-scoped records. |
| Credit administration, adjustments and package edits | `credits.admin.tsx`, `credits.functions.ts`, `payments.functions.ts` | Pass: wallet reads/adjustment environment no longer depend on payment setup; package edits still need Stripe. No admin role granted or action performed. |
| Research retry | `research.$runId.tsx`, `research.functions.ts` | Pass: same helper; server reservation uses supplied validated environment. |
| Research background advancement | `use-run-driver.ts`, `pipeline.server.ts`, `research.functions.ts` | Pass: existing reservations authorize advancement; completion refreshes the wallet; no payment configuration lookup. |
| Market scan advancement | `use-scan-driver.ts`, `scan.server.ts` | Pass: no founder-wallet payment configuration dependency. |
| Demand checks and weekly watches | `demand.server.ts`, `watch.server.ts` | Pass: provider usage is distinct from the founder wallet; no Stripe environment lookup. |
| Checkout and webhook | `stripe.ts`, `stripe.server.ts`, `payments.functions.ts`, `api/public/payments/webhook.ts` | Pass: payment credentials remain required; webhook signature and environment matching are unchanged. |

## Database functions reviewed through a read-only schema query

- `ensure_credit_wallet`, `credit_signup_wallets`: create environment-scoped welcome wallets without Stripe configuration; existing wallets are not replaced.
- `reserve_discovery_credits`, `start_paid_discovery`, `renew_discovery_reservation`: use the requested wallet and reservation environment, without payment configuration.
- `attach_credit_run`, `settle_credit_reservation`, `settle_run_credits`: use the stored reservation environment; terminal settlement remains idempotent.
- `claim_startup_with_credits`, `make_project_private_with_credits`: atomic wallet and startup updates, independent of checkout readiness.
- `adjust_credit_balance`: environment-scoped, idempotent adjustments, independent of payment setup.
- `fulfill_credit_payment`, `refund_credit_payment`: operate on verified, environment-matched payment records; unchanged.

No additional location retains the missing-configuration exception: all founder-credit paths use the already-corrected shared `getStripeEnvironment` helper. No database migrations, settings, permissions, example data, settled ledger entries, payments or refunds were changed during this sweep.

## Verification

- Missing-payment-token browser check: real 10-credit balance and existing transaction history load.
- Focused tests cover absent/test/live configuration, account/admin query dispatch, actual balance preservation, and payment-form refusal without configuration.
- Signed-in missing-token checks show 10 credits in Discover search confirmation, startup claim confirmation and workspace private-upgrade confirmation. No research, claim, adjustment or purchase was submitted. Admin authorization was not changed; admin read dispatch is covered by a focused test, not a privileged browser session.
- 28 focused credit tests pass; preview build reports build OK.