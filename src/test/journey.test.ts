import { describe, expect, it } from "vitest";
import {
  DISCOVER_DEFAULTS,
  discoverSearchSchema,
  filterCards,
  industryChoices,
  inspectionProgress,
  journeyStatuses,
  markVisited,
  nextInspection,
  normalizeOverview,
  normalizeView,
  parseSearchDone,
  parseVisited,
  rankSpotlights,
} from "@/lib/journey";

const NOW = new Date("2026-11-14T12:00:00Z").getTime();
const card = (over: Partial<{ id: string; industry: string | null; geography: string | null; business_model_type: string | null; evidence_strength: string | null; evidence_count: number; research_at: string; last_scanned_at: string | null }>) => ({
  id: "x",
  industry: "Healthcare",
  geography: "Europe",
  business_model_type: "B2B SaaS",
  evidence_strength: "moderate",
  evidence_count: 10,
  research_at: "2026-11-10T12:00:00Z",
  last_scanned_at: null,
  ...over,
});

describe("journey steps", () => {
  it("marks earlier steps done, the current one current and later ones upcoming", () => {
    expect(journeyStatuses(2)).toEqual(["done", "current", "upcoming", "upcoming"]);
  });
  it("marks every step done once the founder has a workspace", () => {
    expect(journeyStatuses(4, true)).toEqual(["done", "done", "done", "done"]);
  });
});

describe("step 1 spotlights", () => {
  it("shows three ideas at most", () => {
    const cards = Array.from({ length: 6 }, (_, i) => card({ id: String(i) }));
    expect(rankSpotlights(cards)).toHaveLength(3);
  });
  it("ranks strong evidence above moderate even with fewer sources", () => {
    const ranked = rankSpotlights([card({ id: "many", evidence_count: 40 }), card({ id: "strong", evidence_strength: "strong", evidence_count: 8 })]);
    expect(ranked.map((c) => c.id)).toEqual(["strong", "many"]);
  });
  it("breaks equal strength by number of sources, then newest research", () => {
    const ranked = rankSpotlights([
      card({ id: "older", evidence_count: 12, research_at: "2026-11-01T00:00:00Z" }),
      card({ id: "fewer", evidence_count: 5 }),
      card({ id: "newer", evidence_count: 12, research_at: "2026-11-12T00:00:00Z" }),
    ]);
    expect(ranked.map((c) => c.id)).toEqual(["newer", "older", "fewer"]);
  });
});

describe("industry choices", () => {
  it("lists only industries that have startups, with their counts", () => {
    const choices = industryChoices([card({}), card({}), card({ industry: "Education" }), card({ industry: null })]);
    expect(choices).toEqual([
      { value: "Healthcare", label: "Healthcare", count: 2 },
      { value: "Education", label: "Education", count: 1 },
    ]);
  });
});

describe("discover filters", () => {
  const f = { industry: "all", region: "all", model: "all", fresh: "all" };
  it("keeps only the chosen industry", () => {
    expect(filterCards([card({ id: "h" }), card({ id: "e", industry: "Education" })], { ...f, industry: "Education" }, NOW).map((c) => c.id)).toEqual(["e"]);
  });
  it("uses the last market scan date for freshness", () => {
    const scanned = card({ id: "s", research_at: "2026-09-01T00:00:00Z", last_scanned_at: "2026-11-13T00:00:00Z" });
    expect(filterCards([scanned, card({ id: "old", research_at: "2026-09-01T00:00:00Z" })], { ...f, fresh: "7d" }, NOW).map((c) => c.id)).toEqual(["s"]);
  });
});

describe("discover URL state", () => {
  it("defaults to the guided view with nothing selected", () => {
    expect(DISCOVER_DEFAULTS).toMatchObject({ view: "guided", industry: "all", research: false });
  });
  it("falls back to defaults for malformed values", () => {
    expect(discoverSearchSchema.parse({ view: 7, research: "yes" })).toMatchObject({ view: "guided", research: false });
  });
  it("treats unknown views and panels as the defaults", () => {
    expect(normalizeView("expert")).toBe("guided");
    expect(normalizeView("all")).toBe("all");
    expect(normalizeOverview("radar")).toBe("map");
    expect(normalizeOverview("runs")).toBe("runs");
  });
});

describe("step 2 inspection", () => {
  it("has five essential checks and ignores the business plan tab", () => {
    expect(inspectionProgress(markVisited([], "plan"))).toMatchObject({ done: 0, total: 5, complete: false });
  });
  it("is complete after all five essentials", () => {
    const visited = ["overview", "evidence", "landscape", "assessment", "updates"].reduce<string[]>((v, t) => markVisited(v, t), []);
    expect(inspectionProgress(visited).complete).toBe(true);
  });
  it("suggests the next unchecked essential after the current tab", () => {
    expect(nextInspection(["overview"], "overview")?.tab).toBe("evidence");
    expect(nextInspection(["overview", "evidence", "assessment"], "evidence")?.tab).toBe("landscape");
    expect(nextInspection(["evidence", "landscape", "assessment", "updates"], "updates")?.tab).toBe("overview");
    expect(nextInspection(["overview", "evidence", "landscape", "assessment"], "updates")).toBeNull();
  });
  it("reads stored progress safely", () => {
    expect(parseVisited("not json")).toEqual([]);
    expect(parseVisited(JSON.stringify(["evidence", "hacked", 4, "evidence"]))).toEqual(["evidence"]);
  });
});

describe("search gate", () => {
  it("opens the market only when the stored flag is exactly set", () => {
    expect(parseSearchDone("1")).toBe(true);
    expect(parseSearchDone(null)).toBe(false);
    expect(parseSearchDone(undefined)).toBe(false);
    expect(parseSearchDone("")).toBe(false);
    expect(parseSearchDone("yes")).toBe(false);
    expect(parseSearchDone("0")).toBe(false);
  });
});
