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

## In progress
- [ ] Lindström-style redesign: light design system, Libre Franklin, pill buttons, utility bar + header with search, photo hero carousel, centered section headings, stat counters, article-style cards, mosaic, navy band, footer
- [ ] Newcomer-friendly cleanup: plain-language labels, how-it-works steps, simpler cards, clear next steps on every page
- [ ] Restyle every page (startup profile, research run, market change, workspace, method, sign-in, invite) and charts for the light theme

## Ready next
- Server-side scheduled monitoring (needs background execution; scheduled callbacks end after a few seconds, so scans currently run while a founder visits)
- Shareable OG images per startup (generated brand card)
