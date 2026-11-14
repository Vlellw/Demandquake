<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (Demandquake)

- Research runs advance stage-by-stage through `advanceRun` (`src/lib/pipeline.server.ts`), driven by client polling hooks (`use-run-driver`, `use-scan-driver`); workers are stateless, so all progress lives in the database.
- External calls stay server-only in `*.server.ts` modules (`contextdev.server.ts`, `ai.server.ts`); browser code reaches them only through `createServerFn` wrappers in `*.functions.ts`.
- Pure, testable rules (evidence strength, freshness, URL normalisation, redirects, claim defaults, progress, brand renaming) live in `src/lib/research-utils.ts`, `safe-redirect.ts`, `claim.ts`, `project-progress.ts`, covered by `src/test/rules.test.ts`.
- Relative times render through `<TimeAgo>` and absolute dates format in fixed UTC (`src/lib/format.ts`) so server and browser text match during hydration.
- Generated startup names must be unique: generation is told the taken names and `ensureUniqueName` renames the newer duplicate after insert, because clusters generate in parallel.
- `Badge` renders a `<span>` so it can sit inside paragraphs without invalid nesting.
- Competitor brand data is fetched lazily per startup (`brands.server.ts`) and cached per domain in `brand_profiles`; name-only competitors resolve through brand search, same-name filtering (`sameNameCandidates`) and an AI check against the source description, cached in `brand_name_lookups`, so each company costs credits once and lookalike brands are never shown.
- Competitor cache tables are service-only with RLS enabled and no browser SELECT grants; public competitor details use the existing per-startup DTO functions so internal cache errors and lookup records stay private.
- The shared research catalog requires verified sign-in: research pages live under the managed authenticated layout, catalog readers use the caller's client, and all research/scan/competitor entry points enforce auth; the public home reads no research rows.
- Server stages keep at most 5 outbound requests in flight per invocation (the hosted runtime queues beyond 6, letting per-call timeouts expire).
- Market re-checks run from the founder's browser (workspace auto-scan when evidence is over a week old), not a scheduled callback, because scheduled callbacks are cancelled after a few seconds while a scan takes ~30s.
- Shared workspaces: membership lives in `project_members` (joined only through `accept_project_invite`), RLS lets members read/update but only owners delete or invite, and a trigger locks `user_id`/`startup_id`/`owner_name`. Saves are conditional on `updated_at` and conflicts three-way merge by item id (`project-merge.ts`), so co-founders never overwrite each other.
- Inner pages build headings and key figures from `SectionHeading` / `StatRule` (`src/components/common`), so every page keeps the same Lindström-style structure.
- Credit billing uses environment-scoped wallets, an append-only ledger and atomic reservation/settlement RPCs; database triggers settle discovery on terminal states, preventing duplicate charges across workers and refreshes.
- Startup claims use a service-only atomic RPC that creates the workspace and appends the charge together; browser INSERT on projects is revoked so claims cannot bypass billing, and retries return existing workspaces without a charge.
- Public credit reads allow only active packages and explicitly advertised cost keys; verified admins can read inactive packages and all settings so internal configuration is not public by default.
- Payment functions use the shared gateway Stripe utility, authenticated user identity and server-snapshotted orders; only signature-verified webhooks allocate or reverse credits, keeping test purchases separate from live balances.
- Admin bootstrap uses a service-only allowlist matched to a verified auth email; ordinary browser requests can never assign roles or edit balances.
- Discover state (industry, view, filters, overview tab, jump-to-search request) lives in validated URL search params defined in `src/lib/journey.ts`, so every journey step is linkable and back-button safe; Step 2 check-offs are per-browser localStorage hints, never billing or account data.
- The journey has three parts: Discover combines search and gated idea selection; Inspect and Claim remain distinct startup/workspace pages so scrolling cannot cross journey parts. Legacy Choose links normalize to Discover.
- Workspace assumptions use a dedicated list component with status filters and explicit selectors, connected to the existing project saver; this keeps long hypotheses readable without accidental status changes.

- Startup inspection keeps Overview outside the tab control and defaults to Evidence; Overview counts as viewed on page entry because it remains visible above every panel.

- Corrected existing startup artwork is selected centrally in bannerBackground so cards and profiles share the same replacement without exposing private storage.
- JourneySteps mounts into the shared header slot after hydration; an inline header fallback shows steps on other pages and hides when page-owned progress mounts, preventing duplicate navigation.
- AppHeader uses one shared SiteSearch drawer for navigation, identity and credit controls on all screen sizes so account actions have one consistent home.
- Missing banner requests share their promise across mounted cards and profiles so every subscriber receives the generated image.
- Banner artwork uses a shared version in storage paths and URLs; stale versions regenerate lazily so prompt changes replace cached images without breaking old URLs.
- Pitch PDFs render static copies of the shared player in the browser, one complete slide per page; prepare the Blob before the save click to preserve mobile download activation and private workspace access.
