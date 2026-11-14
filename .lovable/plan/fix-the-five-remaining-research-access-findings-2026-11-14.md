# Fix the five remaining research-access findings

## Approval needed: public browsing will change

Require a signed-in Demandquake account to browse startup profiles, research runs, problem clusters, evidence, and market scans. Shared research links will ask visitors to sign in first. The credit offers, How it works, and sign-in pages will remain public.

**Assumption:** All signed-in Demandquake users may browse the shared research catalog. Private founder workspaces remain limited to their owners and invited co-founders. If research must instead be private to the person who paid for it, that requires a different access model.

## Changes

- Remove anonymous, unrestricted reads from only the five selected research tables. Replace them with authenticated-user access checks.
- Require verified sign-in for the existing research read functions and use the caller's database access, rather than privileged reads.
- Keep the public home page as an introduction with a sign-in-to-discover button; move the research catalog to a signed-in Discover page.
- Keep existing startup, research, and scan URLs, but place their pages under the existing signed-in layout to avoid broken refreshes or sign-in loops.
- Preserve evidence links, AI assumption labels, credit charging, and owner/member workspace restrictions.

## Technical details

- Apply the access changes through a database migration, scoped to `discovery_runs`, `sources`, `market_scans`, `clusters`, and `startups`.
- Use `requireSupabaseAuth` and `context.supabase` for catalog reads; preserve the existing bearer middleware and managed `_authenticated` layout.
- Check all read paths, including competitor enrichment and scan actions, so alternate public functions cannot expose restricted research.
- Preserve each content page's Demandquake metadata and update navigation for the new catalog location.

## Verification and completion

- Verify anonymous reads fail, signed-in catalog browsing works, and private workspaces remain restricted.
- Test direct shared links, refreshes, sign-out, evidence links, and research progress.
- Run existing tests and a follow-up security scan.
- Mark only the five selected findings fixed after verification; do not fix or ignore other findings.
- Commit the changes.

**Current status:** No changes to these five findings have been made. They remain active pending approval of the public-browsing change.