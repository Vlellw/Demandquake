# src/lib rules

- Query recovery retries only browser network TypeErrors twice with delayed backoff; application/provider failures and mutations are never automatically replayed. Page error recovery invalidates failed reads before resetting the route.

- Demand checks are cached per startup and section in a service-only table and run one section per call (`advanceDemandEvidence`), driven from the Evidence tab; they use background Context.dev requests that yield to paid research, so they never slow searches and resume on the next visit.
- Demand-check numbers are counted in `src/lib/demand.ts` (tested); AI only filters and groups, quotes must appear verbatim in their source, and research-assistant quotes/figures are re-opened on the cited page before display, so nothing unsourced is shown.
- Weekly web watch shares one set of Context.dev monitors per startup across subscribed workspaces; findings are pulled when a workspace opens (at most every few hours) and monitors are deleted when the last workspace stops or is deleted, because monitor slots are limited.
