import type { ProjectDTO } from "./dto";

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
