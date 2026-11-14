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
