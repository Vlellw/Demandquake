# Credit loading sweep

Rule: credit amounts must show the confirmed value, or clear loading/error feedback with a working retry. Connection failure must not appear as zero, endless dots or a completed payment.

| Place reviewed | Result |
| --- | --- |
| Account menu (`CreditBalance`) on all pages | Confirmed balance preserved; explicit loading, failure and retry already added. Signed-in failure/retry verified. |
| Discover research confirmation (`ResearchStep`) | Replaced balance/price dots with explicit states and separate retries. Shared account/catalog reads are bounded. |
| Startup public/private claim confirmation | Replaced balance dots with explicit states and retry. Charging, affordability and claim prices unchanged. |
| Workspace private upgrade (`ClaimAccess`) | Replaced balance dots with explicit states and retry. Atomic upgrade and cost unchanged. |
| Buy credits | Explicit balance states and retry; a failed payment-status read no longer masquerades as waiting for payment. Signed-in actual balance and fault recovery verified. |
| Credit history | Initial reads already use the page error/retry screen; now background refresh failures also show retry while preserving confirmed rows. Signed-in four transaction rows verified. |
| Credit administration | Existing page retry handles initial failures; bounded reads and background refresh feedback added. No admin identity available for end-to-end admin checks. |
| Credit package/price catalog | All consumers use a bounded shared read; route consumers have page retry, research confirmation has local retry. |
| Account read (`getCreditAccount`) | Returns wallet and ledger from authenticated reads, throws on errors; no fake balance fallback. Unchanged. |
| Research driver and start/retry functions | Completion invalidates account reads; start/retry use atomic reservation RPCs. Unchanged. |
| Claims and private upgrade functions | Authenticated identity, atomic RPCs and account invalidation; no balance inferred from UI. Unchanged. |
| Checkout and payment webhook | Checkout does not allocate credits; signed verified webhook fulfills/refunds through RPCs and returns errors for failed processing. Unchanged; no purchase performed. |
| Wallet initialization, reservation, settlement, claim, fulfillment and refund database functions | Reviewed supplied function definitions: stored balances and terminal ledger records remain authoritative; no UI loading placeholder is written to data. Unchanged. |
| Market scans and weekly watch | No separate credit-balance display or wallet-setting job; their pages use the shared menu. Unchanged. |

Tests: 24 credit/read-recovery tests passed. Preview build passed. No settled payments, refunds, ledger records, balances, permissions, settings or example data were changed.