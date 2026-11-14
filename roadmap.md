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

## Ready next
- [x] Five-credit startup claims: atomic workspace creation and charge, confirmation, duplicate/failure protection. Verified 25 → 20 credits, one charge, existing workspace opens without another charge, and direct workspace inserts are blocked.
- [x] Credit wallets and auditable history, 25 welcome credits, 5-credit successful discovery with confirmation, atomic idempotent reservations and settlement, public package page and protected admin controls. Verified a signed-in cached search: 25 → 20 credits, one ledger entry, no phone overflow.
- Credit payments: provider and four products created, embedded checkout and signed webhook fulfillment/refund handling implemented. Blocked: provisioned payment secrets are missing from the app runtime, so purchase/decline/refund end-to-end checks and tax configuration are unverified. Live onboarding is also required; do not claim real purchases work.
- Admin allocation: verified-email allowlist configured for the requested account. Blocked: that account does not exist in app auth yet; signup and email verification are required before the million-credit grant and admin checks.
- Guided first visit: a short dismissible "how to read this page" tour on the first startup page a newcomer opens
- Real photography: swap the generated start-page photos for licensed or team-supplied images
- Server-side scheduled monitoring (needs background execution; scheduled callbacks end after a few seconds, so scans currently run while a founder visits)
- Shareable OG images per startup (generated brand card)
