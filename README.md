# Demandquake

**Less guessing. More evidence.**

Demandquake is an evidence-first startup discovery and founder workspace application. It researches real customer problems, turns source-backed signals into startup concepts, and helps founders investigate, claim and develop those opportunities.

Instead of asking AI to invent the next successful startup, Demandquake asks: **what problems are people already experiencing, and what evidence supports building a solution?**

**Website:** [demandquake.live](https://demandquake.live)

> Demandquake supports research and decision-making. A generated idea is not proof of demand, a validated business, or a prediction of success. Source-backed facts and AI-generated hypotheses are deliberately kept distinct.

## Contents

- [Founder journey](#founder-journey)
- [Features](#features)
- [Research and evidence](#research-and-evidence)
- [Public and private claims](#public-and-private-claims)
- [Credits](#credits)
- [Demo and accounts](#demo-and-accounts)
- [Technology](#technology)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Application pages](#application-pages)
- [Development setup](#development-setup)
- [Testing](#testing)
- [Security and data integrity](#security-and-data-integrity)
- [Deployment](#deployment)
- [Limitations and configuration](#limitations-and-configuration)
- [Contributing](#contributing)

## Founder journey

### 1. Search & Discover

Describe a market, audience or recurring problem. For example:

> What problems do small independent clinics in Finland face with appointment cancellations and filling empty slots?

Review the credit cost and start research. Demandquake plans focused queries, gathers relevant web evidence, identifies recurring problems and generates startup concepts. The discovery page also highlights four best-documented ideas and provides access to the startup catalog.

### 2. Inspect the evidence

Open an idea to inspect its problem, target customers and supporting research. The inspection page has six tabs:

| Tab | Purpose |
| --- | --- |
| Evidence | Explore the evidence map, cited facts, deeper demand checks and original publications. |
| Competitors | Compare existing products, company profiles, positioning and differentiation. |
| Assessment | Review qualitative reasoning and explicitly labelled AI hypotheses. |
| Market changes | Read market scans and their implications for the opportunity. |
| Business plan | Explore proposed pricing, go-to-market steps, risks and validation experiments. |
| Other opportunities | Compare related problems and startup opportunities. |

**What the sources say** remains visible in Evidence. More detailed checks and **Original publications** are grouped behind **Show more evidence**. Demand checks start when inspection opens, even if the details are collapsed or another tab is selected.

### 3. Claim & build

Claim an idea publicly or privately and open its founder workspace. Edit the concept, track assumptions, collaborate with co-founders, monitor market changes and download a pitch PDF.

## Features

- **Live market research:** focused web, Reddit, forum and news searches through Context.dev.
- **Evidence-backed startup concepts:** recurring problems become ideas with linked supporting material.
- **Clear provenance:** cited facts are separate from AI interpretations and untested assumptions.
- **Deeper demand checks:** customer discussions, review gaps, pricing, company signals, market context and local demand where relevant.
- **Competitor intelligence:** real brand logos and company profiles retrieved through Context.dev, with cached and checked company matches.
- **Interactive evidence map:** source relationships with pan and zoom; map gestures stay locked until activated so ordinary page scrolling is not interrupted.
- **Founder workspaces:** editable startup details, assumptions, status selectors, notes and recommended actions.
- **Co-founder collaboration:** invitation links, shared editing, membership controls and conflict-aware saves.
- **Opportunity Quakes:** market re-checks that show changed evidence, assessments and implications.
- **Weekly web watch:** Context.dev monitors for relevant topics and competitor pricing pages.
- **Pitch export:** a downloadable landscape PDF with one complete pitch slide per page and source links.
- **Credits and history:** individual balances, configurable action costs and an auditable ledger.
- **Read-only first-visit demo:** labelled examples under the display name Test user, with an exit to personal sign-in.
- **Account controls:** sign-in, password recovery, settings and email-code verification for account deletion.
- **Startup artwork:** topic-specific generated backgrounds, loaded separately from research and shared across cards and profiles.

## Research and evidence

### Initial research budget

New searches retain **at most 20 relevant, distinct sources**, rather than filling the result set with weak material:

| Search channel | Initial budget |
| --- | --- |
| Web searches | Four essential intents, up to three results each |
| Reddit | One query, up to four results |
| Industry news | Up to four results |
| Retained source pool | Maximum 20 after relevance filtering and URL deduplication |

The essential intents are **complaints, requests, forums and market news**. These limits are centralized in `src/lib/research-search.ts`. A search can return fewer sources when results are missing, duplicated or unsuitable.

The pipeline plans queries, retrieves sources, extracts signals, groups supported problems, researches competitors and generates concepts. Concise analysis targets up to three supported problem clusters. It is optimized for roughly two-minute discovery; one recorded end-to-end check completed in 118 seconds, but this is not a guaranteed completion time. Provider latency and rate limits can extend it. Decorative artwork does not block completion.

### Deeper checks

Initial discovery and deeper evidence are separate layers. Depending on the startup and available sources, additional checks cover:

- Customer complaints, requests and Reddit discussions.
- Competitor reviews, recurring dissatisfaction and product gaps.
- Existing product pricing and competitor applications.
- Company funding, announcements and other observable company signals.
- Relevant how-to videos and their observable audience counts.
- Dated regulatory or industry changes that may explain why a problem matters now.
- Source-verified market-size figures.
- Local businesses, ratings and geographic demand when location is relevant.

Checks run section-by-section, cache results and expose loading, failure and retry states. They may take longer than initial discovery and can resume on a later visit. A missing or inconclusive result is not replaced with invented evidence.

### Evidence rules

1. Significant factual claims link to their original sources.
2. Publication dates are retained when available, along with retrieval information.
3. AI-generated ideas, hypotheses, pricing suggestions and interpretations remain labelled as AI.
4. Quotes and figures used by deeper checks are verified against cited material before display.
5. Assessments use qualitative reasoning, not fabricated startup-success probabilities.
6. Visual map positions are not market measurements or proof of demand.
7. Sample data is labelled and never presented as live research.
8. API failures are shown honestly rather than filled with fabricated results.

The product helps founders find evidence worth investigating. Real validation still requires customer conversations, experiments and observable behavior.

## Public and private claims

Generated startups are public to the signed-in research catalog until privately claimed. Public does **not** mean anonymous access to protected research.

| Option | Default cost | Visibility |
| --- | --- | --- |
| Public claim | 5 credits | The startup remains searchable and other founders can also claim it. |
| Private claim | 20 credits | The startup and its protected research are available only to the workspace owner and invited co-founders. |

- A private claim is available only when no other founders are already building the startup.
- The owner of a public workspace can upgrade it to private when eligible, paying only the difference. At default prices, a 5-credit public claim upgrades for 15 credits.
- Opening an existing workspace does not charge again.
- Failed claims do not charge credits.
- Deleting a private workspace returns its startup to the public signed-in catalog.
- Public startup visibility does not make founders' workspace notes, assumptions or credit records public.

Creation, privacy changes and charging are atomic operations enforced by the backend, not browser-controlled balance updates.

## Credits

**Current mode: free credit packages, without checkout.** Every signed-in user can repeatedly add package credits without a per-account grant limit. Grants are recorded in transaction history as free adjustments, not purchases.

| Rule | Default |
| --- | --- |
| New-account welcome balance | 50 credits |
| Successful discovery search | 5 credits |
| Public claim | 5 credits |
| Private claim | 20 credits |

| Free package | Credits added |
| --- | --- |
| Starter | 100 |
| Explorer | 500 |
| Pro | 1,500 |
| Business | 5,000 |

Prices and package definitions are configurable. The app displays applicable costs before confirmation. Failed searches and failed API actions do not consume action credits; retries and refreshes must not double-charge.

Wallets are environment-scoped and use an append-only ledger with reservations and settlement. Balance reads have bounded timeouts and explicit retry feedback rather than indefinite loading dots. Missing payment configuration does not block credit balance reads.

**Legacy payment support:** Stripe checkout, order snapshots, signature-verified webhook fulfillment and refunds remain in the codebase. They are not the current package-acquisition flow. Existing paid records are retained; re-enabling purchases requires payment configuration and separate end-to-end verification.

## Demo and accounts

First-time signed-out visitors see a **read-only Test user demo** with labelled sample search, evidence and workspace content.

- Test user is a presentation mode, not an authenticated account or shared identity.
- The demo reads no protected catalog rows and cannot run research, spend credits or change real workspaces.
- **Leave demo and sign in** exits the demo and opens personal access.
- Leaving the demo is remembered locally in that browser.
- An existing personal session takes precedence over demo mode.

The sign-in UI supports email-based access and Google. Provider availability and email delivery depend on hosted configuration. The Continue with Lovable button is not part of the current sign-in screen.

## Technology

| Layer | Technology |
| --- | --- |
| Application framework | TanStack Start v1 |
| Interface | React 19 and TypeScript |
| Routing | TanStack Router with file-based routes |
| Data loading and cache | TanStack Query |
| Tooling | Vite and Bun |
| Styling | Tailwind CSS v4, shared design tokens and shadcn/Radix components |
| Backend services | Lovable Cloud for database, authentication and storage |
| AI | Lovable AI Gateway with structured JSON output |
| Research and brand data | Context.dev |
| Evidence maps | React Flow, with D3 utilities for visualizations |
| Animation and icons | Motion and Lucide |
| PDF export | html2canvas-pro and jsPDF |
| Optional legacy payments | Stripe through the Lovable connector gateway |
| Tests | Vitest, Testing Library and jsdom |
| Hosted server target | Cloudflare Worker runtime |

The visual system uses Libre Franklin, a light layout, navy hierarchy and restrained accents. It follows the structure of the Lindström-inspired redesign without copying its brand assets. Generated startup imagery is topic-specific and excludes text, logos and watermarks.

## Architecture

```text
Founder interface
    |
    +-- TanStack routes and Query cache
    |
    +-- Authenticated server functions (*.functions.ts)
            |
            +-- Server-only research modules (*.server.ts)
            |       +-- Context.dev
            |       +-- Lovable AI Gateway
            |
            +-- Lovable Cloud
                    +-- Persisted research stages and evidence
                    +-- Startups, workspaces and memberships
                    +-- Wallets, reservations and ledger
                    +-- Brand/demand caches and artwork storage
```

### Research execution

`advanceRun` in `src/lib/pipeline.server.ts` advances a persisted research run through its stages. Client drivers call the next stage and refresh visible progress. Workers are stateless: the database, not an in-memory process, holds the run state.

Serial research stages use one driver; concept generation can use parallel workers. Each server invocation keeps at most five outbound requests in flight. Terminal-state checks prevent late workers from turning a completed run into a false failure or charging it twice.

### Server boundaries

External provider calls stay in server-only modules. Browser interactions reach application logic through `createServerFn` wrappers. Public server routes are used for external HTTP endpoints such as payment webhooks; public endpoint placement is not permission to return private data.

The hosted runtime is a Worker, not a Node.js server. Preserve the existing Vite/TanStack bootstrap and server boundaries when extending integrations.

### Workspaces and monitoring

Workspace saves check `updated_at` and use three-way merges by item ID to avoid overwriting co-founder edits. Invitations establish membership through a controlled acceptance operation.

Market scans run while the founder is using the app, including automatic re-checks when evidence is over a week old. Weekly web watch uses shared Context.dev monitors per startup and retrieves findings when a workspace opens. The last subscriber stopping or deleting their workspace triggers monitor cleanup.

## Project structure

```text
src/
  routes/                  File-based pages and public HTTP endpoints
    _authenticated/        Protected discovery, inspection and workspace pages
    api/public/            Banner delivery and legacy payment webhook
  components/              Shared UI, evidence, startup, demo and workspace views
  hooks/                   Auth, research/scan drivers, demand loading and saving
  lib/                     Domain rules, queries, server functions and integrations
    pipeline.server.ts     Initial discovery orchestration
    research-search.ts     Initial search budgets and source selection
    contextdev.server.ts   Research provider integration
    ai.server.ts           Structured AI generation
    demand*.ts             Deeper demand evidence and rules
    watch*.ts              Weekly web watch
    projects.functions.ts  Claims, workspace operations and collaboration
    credit-*.ts            Credit rules, environment, reads and queries
    credits.functions.ts   Account reads and free package grants
    access.server.ts       Startup and scan visibility guards
    project-merge.ts       Conflict-aware shared editing
    query-recovery.ts      Bounded network-only read retries
    pitch-download.ts      Pitch PDF export
  integrations/            Generated backend clients and auth integration
  test/                    Unit and component regression tests
  styles.css               Tailwind v4 and semantic design tokens
  router.tsx               Router and query integration
  start.ts                 Server-function auth and request middleware
  server.ts                Server rendering/error wrapper
drizzle/                   Managed schema and migration history
public/                    Static assets and favicon
AGENTS.md                  Repository rules for contributors and coding agents
roadmap.md                 Task tracking, including historical changes
```

Historical roadmap entries can describe replaced UI or earlier defaults. Use this README and the current implementation for present behavior.

## Application pages

| Path | Purpose | Access |
| --- | --- | --- |
| `/` | Public home and first-visit demo entry | Public |
| `/demo` | Labelled sample experience | Public |
| `/method` | How the research process works | Public |
| `/auth` | Personal sign-in | Public |
| `/reset-password` | Password recovery | Recovery flow |
| `/discover` | Search and startup catalog | Verified sign-in |
| `/research/$runId` | Research progress and generated results | Verified sign-in and applicable data access |
| `/startup/$slug` | Startup inspection | Verified sign-in and startup visibility |
| `/startup/$slug/quake/$scanId` | Market scan details | Verified sign-in and startup visibility |
| `/workspace` | My startups | Verified sign-in |
| `/workspace/$projectId` | Founder workspace | Owner or invited member |
| `/invite/$token` | Co-founder invitation acceptance | Sign-in and valid invitation |
| `/credits` | Package catalog and free grants | Catalog is public; grants require sign-in |
| `/credits/history` | Personal credit transactions | Verified sign-in |
| `/credits/admin` | Credit configuration and administration | Verified administrator |
| `/settings` | Personal account settings | Verified sign-in |
| `/privacy`, `/terms` | Legal information | Public |

`_authenticated` is a pathless route layout, not part of the visible URL. Journey state and inspection tabs use validated URL search parameters so links and browser history preserve context.

## Development setup

### Prerequisites

- Git and Bun; Node.js is useful for tooling compatibility.
- Authorized access to this repository and its connected Lovable project.
- A configured Lovable Cloud backend for real authenticated flows.
- Context.dev and Lovable AI Gateway access for live research.

### Install and run

Clone this repository, open its directory, then run:

```sh
bun install
bun run dev
```

Use the development URL printed by Vite. In the Lovable workspace, the preview server is already managed for you.

### Configuration

This is a connected full-stack application, not a frontend-only repository that recreates its backend on installation. A standalone clone needs authorized environment configuration and access to equivalent schema, authentication, storage and provider services.

| Configuration | Role |
| --- | --- |
| Generated browser backend configuration (`VITE_*`) | Public client connection settings supplied by Lovable Cloud |
| Generated server backend configuration | Server-side backend access supplied by the platform |
| `CONTEXT_DEV_API_KEY` | Server-only Context.dev research access |
| `CONTEXT_DEV_RPM` | Optional provider request-rate setting |
| `LOVABLE_API_KEY` | Server-only AI/connector gateway access |
| `VITE_PAYMENTS_CLIENT_TOKEN` | Optional legacy payment environment selection |
| `STRIPE_SANDBOX_API_KEY`, `STRIPE_LIVE_API_KEY` | Optional legacy gateway payment connections |
| `PAYMENTS_SANDBOX_WEBHOOK_SECRET`, `PAYMENTS_LIVE_WEBHOOK_SECRET` | Optional legacy webhook verification |

**Never commit secrets or put private keys in `VITE_*` variables.** Browser-prefixed values can be bundled into client code. Lovable Cloud manages its generated credentials; do not edit generated integration files or assume managed service credentials can be exported.

Schema changes should follow the connected project's managed migration workflow. Do not treat a fresh clone as permission to replay all migrations against the production database.

### Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start local development |
| `bun run test` | Run the Vitest suite |
| `bun run test:watch` | Run tests in watch mode |
| `bun run lint` | Run ESLint |
| `bun run format` | Format files with Prettier |
| `bun run build` | Create a production build outside the managed preview workflow |
| `bun run build:dev` | Build in development mode |
| `bun run preview` | Preview a local build |

In Lovable, edits update the managed preview and its automatic build checks. Local previewing alone does not establish that every Worker-hosted integration works after deployment.

## Testing

Run the complete suite:

```sh
bun run test
```

Run focused regressions when working on a specific domain:

```sh
bunx vitest run src/test/research-search.test.ts src/test/research-completion.test.ts
bunx vitest run src/test/credits.test.ts src/test/free-credit-grant.test.ts src/test/credit-read.test.ts
bunx vitest run src/test/demand.test.ts src/test/journey.test.ts src/test/demo-session.test.tsx
```

Tests cover source selection, evidence rules, credit costs, idempotent grants, wallet environments, bounded reads, research completion, driver concurrency, scan handling, navigation, demo behavior, redirects and account-deletion safety.

For integration changes, also exercise the real signed-in flow: perform the action, reload the page, and confirm persisted results and transaction history. A passing unit suite or read-only demo is not an end-to-end check of live providers, access controls or email delivery.

## Security and data integrity

- Protected research requires verified sign-in; the public home reads no research rows.
- Row-level access rules protect workspaces, memberships, private startups and personal credit data.
- Service-level startup and scan operations first verify visibility through the caller's authorized client.
- Internal competitor and demand caches are service-only; user-facing data passes through controlled DTOs.
- Authenticated server functions receive the caller's bearer token through shared middleware.
- Server-function requests have CSRF protection.
- Public/private claims and free grants use atomic, service-only backend operations.
- Package amounts are read server-side; the browser cannot choose an arbitrary balance adjustment.
- Grant request IDs deduplicate retries without limiting intentional repeat grants.
- Credit reservations and terminal-state settlement prevent duplicate charges across workers and refreshes.
- Only workspace owners can invite or delete; members can read and collaborate within permitted operations.
- Role assignment is protected and never derived from user-editable profile metadata.
- Account deletion verifies an email code and targets only the authenticated caller.
- Read recovery retries bounded network failures, not arbitrary provider failures or potentially destructive mutations.
- Legacy payment fulfillment requires signature verification; no browser success screen can allocate paid credits.

## Deployment

The project is developed and published through [Lovable](https://lovable.dev), with a connected repository and managed backend.

1. Keep code and managed configuration in sync through the connected project.
2. Run relevant tests and review the preview's current build and runtime signals.
3. Verify authenticated research, evidence access, claims and free grants after related changes.
4. Publish through Lovable when ready.
5. Check the published application and its custom domain after deployment.

A Git commit saves source changes, it does not itself publish the website. Deployment must preserve Worker-compatible code and the configured authentication, AI and connector access.

## Limitations and configuration

- **No guaranteed demand:** source-backed problems are starting points, not proof that customers will buy a proposed solution.
- **Variable research time:** initial discovery aims for about two minutes; provider congestion, retries and rate limits can extend it.
- **Deeper checks take longer:** they are cached and incremental, and not every topic has evidence for every section.
- **Provider costs remain real:** free application credits do not make Context.dev or AI usage unlimited or cost-free for the project operator.
- **Monitor capacity is limited:** weekly watch shares monitors and cleans up unused subscriptions to conserve provider capacity.
- **Watch findings sync on visits:** this is not a guarantee of continuous scheduled server-side scans.
- **Weekly-watch email notifications are not complete:** sender-domain setup is still required; do not advertise working email alerts.
- **Payments are not required in the current flow:** free grants replace checkout. Legacy purchase flows need configuration and re-verification before reuse.
- **Hosted account configuration matters:** Google availability, email-code delivery and recovery/deletion emails must be checked in the configured environment.
- **Demo is read-only:** it cannot substitute for a personal account in live research or collaboration.
- **External sources can change:** publication access, completeness, freshness and quoted material may become unavailable over time.

## Contributing

Read `AGENTS.md` and the relevant directory rules before changing the project.

- Preserve source links, honest failure states and explicit AI labels.
- Keep pure business rules testable and add regression tests for changes to costs, limits or permissions.
- Keep external calls server-only and preserve TanStack file-based routing.
- Use shared design components and semantic tokens rather than creating a separate visual system.
- Never edit generated backend clients or commit secrets.
- Verify private access and shared-workspace behavior when changing related data paths.
- Update this README when product behavior or setup requirements change.

## License

No standalone license file is currently included. Do not assume the repository grants open-source redistribution rights; confirm licensing with the project owners before redistributing the code.
