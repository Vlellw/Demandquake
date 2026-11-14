# Completion handling audit

Rule: completed research and market scans must not display late background errors or offer retries for already completed work. Real ongoing failures remain visible. Settled records, permissions, settings and example data remain unchanged.

| Place | Review result |
| --- | --- |
| Discover search confirmation (`ResearchStep`) | Follows: starts/reuses research and navigates to its result; does not drive completed work. |
| Research page and stage rail | Follows after original fix: completion wins over driver errors; stage rail derives status from stored run. |
| Discovery browser workers (`use-run-driver`) | Follows after original fix: terminal responses/polled state stop workers and suppress late errors. |
| Discovery advancement (`advanceDiscovery`, `advanceRun`) | Follows after original fix: terminal reads precede credit checks, recheck closes settlement race, pipeline exits on terminal status. |
| Discovery retry (`retryDiscovery`, `retryRun`) | Follows: retry pipeline operates only on failed runs; completed UI has no retry. |
| Startup profile manual market scan | Follows: starts/reuses scan and navigates to scan details. |
| Market scan detail page | Fixed: completed status now excludes failure display. |
| Scan browser driver (`use-scan-driver`) | Fixed: checks detail and workspace list polling, ignores cancelled/terminal responses, hides completed and stale scan errors, refreshes workspace list after advancement. |
| Founder workspace manual scan and weekly-on-visit scan (`MarketWatch`) | Follows with driver fix: only an active scan shows worker errors; completed scans are history entries. No scheduled server scan job is used. |
| Scan advancement (`advanceMarketScan`, `advanceScan`) | Follows: terminal server scans return status without starting another stage. |
| Scan completion stages (no new publications and AI analysis) | Follows: store complete status and actual findings; no completion-triggered retry. |
| Credit rules (`shouldChargeDiscovery`) | Follows: only completed research without API failure is chargeable. |
| Database reservation/start/attach/retry functions | Follows: reservations are owner-scoped and cached completion settles immediately; retry only renews released reservations. |
| Database `settle_run_credits` trigger and `settle_credit_reservation` | Follows: complete/failed states settle only reserved holds; row locks and idempotency prevent repeat charges. Read-only review; no records or functions changed. |