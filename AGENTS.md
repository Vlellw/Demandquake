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
