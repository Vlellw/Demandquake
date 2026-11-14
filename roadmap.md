# Demandquake roadmap

## Done
- [x] First design system (dark seismic theme) — replaced by the Lindström-style redesign
- [x] Context.dev + AI research pipeline (plan → web/news search → signals & clusters → competitors → startups)
- [x] Discovery dashboard (search, opportunity radar, filters, startup cards)
- [x] Live research screen with real stage progress
- [x] Startup intelligence profile (pitch, identity, evidence map, landscape, assessment, timeline, business plan)
- [x] Opportunity Quake market scan (before/after assessment, new sources, implications)
- [x] Method page
- [x] Auth (email, Google, Lovable) + claim flow + founder workspace — verified signed-in end to end
- [x] Populated with real discoveries: 5 research runs, 15 unique startups
- [x] End-to-end checks, page metadata, rule tests, mobile layout pass (phone menu, pitch player, card footers)
- [x] Hydration-safe relative times; unique startup names
- [x] Competitor logos, colors and company profiles via Context.dev brand data (domain + verified name matches)
- [x] Brand data pre-loaded for all 15 startups
- [x] Workspace market watch: scans run in place, re-check automatically once a week on visit, and auto-log into founder activity
- [x] Discovery page "Opportunity quakes" feed: recent market scans drawn as seismograph traces (one spike per change, colored by implication)
- [x] "Picked for you" on discover for signed-in founders (same industry or concrete region as their claimed startups)
- [x] Co-founder collaboration: invite links, shared editing with conflict-free merging, live sync, remove/leave, activity entries

- [x] Lindström-style redesign: light design system, Libre Franklin, pill buttons, utility bar + header with search, photo hero carousel, centered section headings, stat counters, article-style cards, mosaic, navy band, footer
- [x] Newcomer-friendly cleanup: plain-language labels, how-it-works phases, simpler cards, breadcrumbs and clear next steps on every page
- [x] Every page restyled (startup profile + tabs, research run, market scan, workspace list/detail, how it works, sign-in, reset password, invite, 404) and charts on the light theme; phone layouts and accessibility contrast checked
- [x] Guided founder journey (Choose → Inspect → Claim): step tracker on Discover, startup pages and new workspaces; industry pills with three best-documented ideas; Guided / Full catalog toggle with linkable filters; research in a focused dialog with credit confirmation; market overview tabs (map, changes, past research); startup tab check-offs with next-check guidance, related-problem map and latest scan trace; claim window listing what you get; workspace welcome panel

## Ready next
- [x] Five-credit startup claims: atomic workspace creation and charge, confirmation, duplicate/failure protection. Verified 25 → 20 credits, one charge, existing workspace opens without another charge, and direct workspace inserts are blocked.
- [x] Credit wallets and auditable history, 25 welcome credits, 5-credit successful discovery with confirmation, atomic idempotent reservations and settlement, public package page and protected admin controls. Verified a signed-in cached search: 25 → 20 credits, one ledger entry, no phone overflow.
- Credit payments: test-mode payments connected with four products, embedded checkout and signed webhook fulfillment/refunds. Blocked: live payments need the owner to finish payment onboarding; a full test purchase has not been run end to end.
- Admin allocation: verified-email allowlist configured for the requested account. Blocked: that account does not exist in app auth yet; signup and email verification are required before the million-credit grant and admin checks.
- Guided first visit: a short dismissible "how to read this page" tour on the first startup page a newcomer opens
- Real photography: swap the generated start-page photos for licensed or team-supplied images
- Server-side scheduled monitoring (needs background execution; scheduled callbacks end after a few seconds, so scans currently run while a founder visits)
- Shareable OG images per startup (generated brand card)
- Problem map: spread dots wider when only one industry is shown (related-problem map on startup pages is tightly packed)
- Remember inspection check-offs per account instead of per browser, so progress follows a founder across devices

## In progress
- [x] Remove optional search-focus controls; center and enlarge the query and example choices; example selection and phone width verified.
- [x] Compact evidence map with scroll pan and zoom controls; real startup and phone verified.
- [x] Fix workspace pitch content overlapping its controls and add Recommended actions headline.
- [ ] Verify workspace pitch visually: requested workspace stays on Loading signal in the available preview session.
- [x] Remove the source-card grid only beneath Step 2 Evidence; preserve map source access elsewhere.
- [x] Add a contextual Back button using the browser's page-opening history without storing private browsing records; return navigation verified.
- [x] Remove the highlighted Assessment at a glance block from startup inspection.
- [x] Remove assessment evidence-composition column and expand AI hypotheses to full width.
- [x] Remove checkmarks from startup inspection tabs.
- [x] Remove the next-check recommendation band under startup tabs.
- [x] Merge Search and Choose into Search & Discover, followed by Inspect and Claim; completed research, gated ideas, inspection navigation and phone layout verified.
- [ ] Download the complete workspace pitch as a layout-preserving PDF; verify every exported slide and source links.
- [x] Keep all journey steps neutral on the public home.
- [x] Make the highlighted home-page invitation more noticeable.
- [x] Replace mosaic startup artwork with topic-related, text-free backgrounds.
- [x] Use distinctive topic-specific objects instead of people, with varied compositions; all 26 backgrounds regenerated.
- [x] Apply Sources/footer and competitor-tag cleanup to full catalog cards.
- [x] Remove the highlighted map evidence explanation and strength badge; consolidate the map info buttons.
- [x] Replace the centered navigation menu with a right-side slide-out panel.
- [x] Show numbered journey steps on every page, including the public home.
- [x] Move journey steps into the header, keeping page links in the three-line menu.
- [x] Remove Market changes and Latest research tabs from Discover.
- [x] Remove workspace roadmap checklist cards.
- [x] Replace header search with a menu showing only Go to links.
- [x] Make market choices look subordinate to the search above.
- [x] Remove Unclaimed from claimed workspace pitch.
- [x] Add persistent assumption deletion; temporary assumption deleted and reload verified.
- [x] Generate missing startup backgrounds; all 26 images served successfully; varied abstract moods without text or a focal object requested.
- [x] Remove highlighted method-page item (image-31).
- [x] Strengthen text-free background prompts and correct Trellivo artwork.
- [x] Remove highlighted AI summary heading on Discover; retain inline AI idea label.
- [x] Remove the completed-inspection claim banner.
- [x] Remove competitor and evidence-strength tags from spotlight cards.
- [x] Replace Researched with Sources in the Discover card footer.
- [x] Remove startup key-number band.
- [x] Remove The proposed solution from Overview.
- [x] Remove landscape/timeline previews and Overview headline; keep tab panels.
- [x] AI banner images for startup cards/hero (Gemini 3.1 Flash Lite Image), generated once per startup, stored in private storage, served via /api/public/banner, lazy backfill from cards; step-3 tabs restored per Vlad
