// Guided founder journey: Search a market → Choose an idea → Inspect the evidence → Claim & build.
// Pure rules only (no React, no storage access) so they stay testable.
import { z } from "zod";
import { fallback } from "@tanstack/zod-adapter";
import { INDUSTRIES } from "./taxonomy";
import { matchesFreshness } from "./research-utils";

export const JOURNEY_STEPS = [
  { n: 1, key: "search", label: "Search a market", short: "Search" },
  { n: 2, key: "choose", label: "Choose an idea", short: "Choose" },
  { n: 3, key: "inspect", label: "Inspect the evidence", short: "Inspect" },
  { n: 4, key: "claim", label: "Claim & build", short: "Claim" },
] as const;
export type JourneyStepNumber = (typeof JOURNEY_STEPS)[number]["n"];
export type JourneyStatus = "done" | "current" | "upcoming";

/** Step states for the tracker: steps before `current` are done; `complete` marks every step done. */
export function journeyStatuses(current: JourneyStepNumber | null, complete = false): JourneyStatus[] {
  if (current === null) return JOURNEY_STEPS.map(() => "upcoming");
  return JOURNEY_STEPS.map((s) => (complete || s.n < current ? "done" : s.n === current ? "current" : "upcoming"));
}

// ---------- Discover URL state ----------

/** Pseudo-industry for founders' personal picks (same industry/region as what they claimed). */
export const FOR_YOU = "for-you";

export const discoverSearchSchema = z.object({
  view: fallback(z.string(), "guided").default("guided"),
  industry: fallback(z.string(), "all").default("all"),
  region: fallback(z.string(), "all").default("all"),
  model: fallback(z.string(), "all").default("all"),
  fresh: fallback(z.string(), "all").default("all"),
  overview: fallback(z.string(), "map").default("map"),
  research: fallback(z.boolean(), false).default(false),
  /** Prefilled research question (e.g. "Run fresh" after reused results). */
  q: fallback(z.string(), "").default(""),
  rerun: fallback(z.boolean(), false).default(false),
});
export type DiscoverSearch = z.infer<typeof discoverSearchSchema>;
export const DISCOVER_DEFAULTS: DiscoverSearch = discoverSearchSchema.parse({});

export type DiscoverView = "guided" | "all";
export type OverviewPanel = "map" | "changes" | "runs";
export const OVERVIEW_PANELS: readonly OverviewPanel[] = ["map", "changes", "runs"];

export function normalizeView(v: string): DiscoverView {
  return v === "all" ? "all" : "guided";
}
export function normalizeOverview(v: string): OverviewPanel {
  return (OVERVIEW_PANELS as readonly string[]).includes(v) ? (v as OverviewPanel) : "map";
}

// ---------- Filtering ----------

export interface CatalogFilters {
  industry: string;
  region: string;
  model: string;
  fresh: string;
}

type Filterable = {
  industry: string | null;
  geography: string | null;
  business_model_type?: string | null;
};

function matchesFilters(c: Filterable, f: CatalogFilters, iso: string | null | undefined, now: number) {
  return (
    (f.industry === "all" || c.industry === f.industry) &&
    (f.region === "all" || c.geography === f.region) &&
    (f.model === "all" || c.business_model_type === f.model) &&
    matchesFreshness(iso, f.fresh, now)
  );
}

export function filterCards<C extends Filterable & { business_model_type: string | null; research_at: string; last_scanned_at: string | null }>(
  cards: C[],
  f: CatalogFilters,
  now = Date.now(),
): C[] {
  return cards.filter((c) => matchesFilters(c, f, c.last_scanned_at ?? c.research_at, now));
}

/** Market scans follow the same filters (no business model on scans); newest first, at most `limit`. */
export function filterQuakes<Q extends { startup: Filterable; completed_at: string | null; created_at: string }>(
  quakes: Q[],
  f: CatalogFilters,
  limit = 6,
  now = Date.now(),
): Q[] {
  return quakes
    .filter((q) => matchesFilters({ industry: q.startup.industry, geography: q.startup.geography }, { ...f, model: "all" }, q.completed_at ?? q.created_at, now))
    .slice(0, limit);
}

export function filterNodes<N extends Filterable & { created_at: string }>(nodes: N[], f: CatalogFilters, now = Date.now()): N[] {
  return nodes.filter((n) => matchesFilters({ industry: n.industry, geography: n.geography }, { ...f, model: "all" }, n.created_at, now));
}

export function filtersActive(f: CatalogFilters): boolean {
  return f.industry !== "all" || f.region !== "all" || f.model !== "all" || f.fresh !== "all";
}

// ---------- Step 1: industry choices and spotlights ----------

export interface IndustryChoice {
  value: string;
  label: string;
  count: number;
}

/** Only industries that actually have startups, in the taxonomy's order, each with its count. */
export function industryChoices(cards: { industry: string | null }[]): IndustryChoice[] {
  const counts = new Map<string, number>();
  for (const c of cards) if (c.industry) counts.set(c.industry, (counts.get(c.industry) ?? 0) + 1);
  const known = INDUSTRIES.filter((i) => counts.has(i)).map((i) => ({ value: i, label: i, count: counts.get(i)! }));
  const extra = [...counts.keys()]
    .filter((k) => !(INDUSTRIES as readonly string[]).includes(k))
    .sort()
    .map((k) => ({ value: k, label: k, count: counts.get(k)! }));
  return [...known, ...extra];
}

export const EVIDENCE_RANK: Record<string, number> = { strong: 3, moderate: 2, emerging: 1, weak: 1 };

export const EVIDENCE_LABEL: Record<string, string> = {
  strong: "Strong evidence",
  moderate: "Moderate evidence",
  emerging: "Emerging evidence",
  weak: "Thin evidence",
};

/**
 * The best-documented ideas: ranked by the problem's evidence strength, then the number of
 * sources behind it, then the newest research. This ranks documentation, never chance of success.
 */
export function rankSpotlights<C extends { evidence_strength: string | null; evidence_count: number; research_at: string }>(
  cards: C[],
  limit = 3,
): C[] {
  return [...cards]
    .sort(
      (a, b) =>
        (EVIDENCE_RANK[b.evidence_strength ?? ""] ?? 0) - (EVIDENCE_RANK[a.evidence_strength ?? ""] ?? 0) ||
        b.evidence_count - a.evidence_count ||
        new Date(b.research_at).getTime() - new Date(a.research_at).getTime(),
    )
    .slice(0, limit);
}

// ---------- Step 1 gate: the market opens only after a completed search ----------

export const SEARCH_DONE_KEY = "dq-search-done";

/** Pure check of the stored flag, so the rule is testable without a browser. */
export function parseSearchDone(raw: string | null | undefined): boolean {
  return raw === "1";
}

export function isSearchDone(): boolean {
  try {
    return parseSearchDone(window.localStorage.getItem(SEARCH_DONE_KEY));
  } catch {
    return false;
  }
}

export function markSearchDone(): void {
  try {
    window.localStorage.setItem(SEARCH_DONE_KEY, "1");
  } catch {
    // Private browsing: the gate simply stays closed.
  }
}

// ---------- Step 2: inspection checklist ----------

export const INSPECTION_STEPS = [
  { tab: "overview", label: "Read the problem and idea" },
  { tab: "evidence", label: "Check the sources" },
  { tab: "landscape", label: "Look at competitors" },
  { tab: "assessment", label: "Read the assessment" },
  { tab: "updates", label: "See market changes" },
] as const;
export type InspectionTab = (typeof INSPECTION_STEPS)[number]["tab"];
const INSPECTION_TABS = INSPECTION_STEPS.map((s) => s.tab) as readonly string[];

/** Reads a stored list of visited tabs, ignoring anything malformed or unknown. */
export function parseVisited(raw: string | null | undefined): InspectionTab[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return [...new Set(v.filter((x): x is InspectionTab => typeof x === "string" && INSPECTION_TABS.includes(x)))];
  } catch {
    return [];
  }
}

export function markVisited(visited: readonly string[], tab: string): InspectionTab[] {
  const next = new Set(visited.filter((x): x is InspectionTab => INSPECTION_TABS.includes(x)));
  if (INSPECTION_TABS.includes(tab)) next.add(tab as InspectionTab);
  return INSPECTION_STEPS.map((s) => s.tab).filter((t) => next.has(t));
}

export function inspectionProgress(visited: readonly string[]) {
  const seen = new Set(visited);
  const done = INSPECTION_STEPS.filter((s) => seen.has(s.tab)).length;
  const next = INSPECTION_STEPS.find((s) => !seen.has(s.tab)) ?? null;
  return { done, total: INSPECTION_STEPS.length, complete: done === INSPECTION_STEPS.length, next };
}

/** The essential step after `tab` that hasn't been checked yet (wrapping around), or null when all are done. */
export function nextInspection(visited: readonly string[], tab: string) {
  const seen = new Set([...visited, tab]);
  const start = Math.max(0, INSPECTION_TABS.indexOf(tab));
  for (let i = 1; i <= INSPECTION_STEPS.length; i++) {
    const s = INSPECTION_STEPS[(start + i) % INSPECTION_STEPS.length]!;
    if (!seen.has(s.tab)) return s;
  }
  return null;
}

export const inspectionStorageKey = (slug: string) => `dq:inspected:${slug}`;
