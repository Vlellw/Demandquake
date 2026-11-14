import type { ProjectDTO, ProjectUpdate, ScanSummaryDTO } from "./dto";

/** Progress counters for a founder workspace. */
export function projectProgress(p: Pick<ProjectDTO, "checklist" | "assumptions" | "roadmap">) {
  const checks = p.checklist.length;
  const checksDone = p.checklist.filter((c) => c.done).length;
  const tested = p.assumptions.filter((a) => a.status !== "untested").length;
  const validated = p.assumptions.filter((a) => a.status === "validated").length;
  const invalidated = p.assumptions.filter((a) => a.status === "invalidated").length;
  const items = p.roadmap.flatMap((r) => r.items);
  const itemsDone = items.filter((i) => i.done).length;
  return { checks, checksDone, assumptions: p.assumptions.length, tested, validated, invalidated, items: items.length, itemsDone };
}

/** Next status when a founder cycles an assumption: untested → validated → invalidated → untested. */
export function nextAssumptionStatus(s: "untested" | "validated" | "invalidated") {
  return s === "untested" ? "validated" : s === "validated" ? "invalidated" : "untested";
}

const SCAN_VERDICT_TITLE: Record<string, string> = {
  strengthened: "opportunity strengthened",
  weakened: "opportunity weakened",
  mixed: "mixed signals",
  unchanged: "no material change",
};

/**
 * Activity entries for completed market scans that are not in the founder's log yet.
 * Each scan is logged once (stable id), dated when it completed, and links to its result.
 */
export function scanUpdatesToLog(updates: ProjectUpdate[], scans: ScanSummaryDTO[], slug: string): ProjectUpdate[] {
  const logged = new Set(updates.map((u) => u.id));
  return scans
    .filter((s) => s.status === "complete" && !logged.has(`scan-${s.id}`))
    .map((s) => {
      const n = s.changes.length;
      const lead = s.headline?.trim() || (n ? `${n} new development${n === 1 ? "" : "s"} found.` : "No new developments affected this opportunity.");
      const text = [lead, s.summary?.trim()].filter(Boolean).join("\n\n").slice(0, 2000);
      return {
        id: `scan-${s.id}`,
        at: s.completed_at ?? s.created_at,
        kind: "scan" as const,
        title: `Market scan · ${SCAN_VERDICT_TITLE[s.verdict ?? "unchanged"] ?? "no material change"}`.slice(0, 200),
        text,
        url: `/startup/${slug}/quake/${s.id}`,
      };
    });
}

export const MARKET_CHECK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * A workspace re-checks the market automatically when its newest evidence (last completed scan,
 * or the original research when never scanned) is more than a week old.
 */
export function marketCheckDue(opts: { lastScanAt: string | null; researchAt: string | null; now: number }): boolean {
  const times = [opts.lastScanAt, opts.researchAt].filter((t): t is string => !!t).map((t) => new Date(t).getTime());
  if (!times.length) return false;
  return opts.now - Math.max(...times) > MARKET_CHECK_INTERVAL_MS;
}

export interface Recommendation<C> {
  card: C;
  reason: string;
}

/**
 * Personalised picks for a signed-in founder: unclaimed-by-them startups sharing an industry
 * (strongest signal) or a concrete region with startups they already claimed. No match → no pick.
 */
export function recommendStartups<
  C extends { id: string; slug: string; industry: string | null; geography: string | null; research_at: string },
>(
  cards: C[],
  projects: { name: string; startup_id: string | null; research: { startup_slug?: string; industry?: string | null; geography?: string | null } }[],
  limit = 3,
): Recommendation<C>[] {
  if (!projects.length) return [];
  const ownedIds = new Set(projects.map((p) => p.startup_id).filter(Boolean));
  const ownedSlugs = new Set(projects.map((p) => p.research.startup_slug).filter(Boolean));
  const scored = cards
    .filter((c) => !ownedIds.has(c.id) && !ownedSlugs.has(c.slug))
    .map((c) => {
      const byIndustry = c.industry ? projects.find((p) => p.research.industry === c.industry) : undefined;
      // "Global" says nothing about fit, so only a concrete shared region counts.
      const byGeo =
        c.geography && c.geography !== "Global" ? projects.find((p) => p.research.geography === c.geography) : undefined;
      const score = (byIndustry ? 3 : 0) + (byGeo ? 1 : 0);
      const reason = byIndustry
        ? `Same industry as ${byIndustry.name}`
        : byGeo
          ? `Same region as ${byGeo.name}`
          : "";
      return { card: c, reason, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.card.research_at).getTime() - new Date(a.card.research_at).getTime());
  return scored.slice(0, limit).map(({ card, reason }) => ({ card, reason }));
}
