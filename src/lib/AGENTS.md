# src/lib rules
- The first-visit demo is client-only presentation state, never an authenticated identity; static labelled samples read no catalog rows and leaving it persists locally without changing personal sessions or access rules.

- Free package grants use an authenticated function and service-only atomic RPC that reads package amounts server-side and logs adjustments; request keys deduplicate retries without imposing a per-account grant cap.

- Initial research request and retention budgets live in `research-search.ts`; select one query per essential intent and reject low-relevance/duplicate hits so smaller pools remain demand-focused.
- Initial discovery uses concise low-effort analysis with up to three supported clusters; only generation uses parallel browser workers and artwork loads separately so it cannot delay research completion or settlement.

- Query recovery retries only browser network TypeErrors twice with delayed backoff; application/provider failures and mutations are never automatically replayed. Page error recovery invalidates failed reads before resetting the route.

- Demand checks are cached per startup and section in a service-only table and run one section per call (`advanceDemandEvidence`), driven from the Evidence tab; they use background Context.dev requests that yield to paid research, so they never slow searches and resume on the next visit.
- Demand-check numbers are counted in `src/lib/demand.ts` (tested); AI only filters and groups, quotes must appear verbatim in their source, and research-assistant quotes/figures are re-opened on the cited page before display, so nothing unsourced is shown.
- Weekly web watch shares one set of Context.dev monitors per startup across subscribed workspaces; findings are pulled when a workspace opens (at most every few hours) and monitors are deleted when the last workspace stops or is deleted, because monitor slots are limited.
- Competitor brand data is fetched lazily per startup (`brands.server.ts`) and cached per domain in `brand_profiles`; name-only competitors resolve through brand search, same-name filtering (`sameNameCandidates`) and an AI check against the source description, cached in `brand_name_lookups`, so each company costs credits once and lookalike brands are never shown.
- Service-client functions keyed by a startup slug, id or scan first confirm visibility through the caller's client (`access.server.ts`), because privately claimed startups are hidden only by RLS.
