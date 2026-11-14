import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/safe-redirect";
import { changedFields, mergeProject } from "@/lib/project-merge";
import { recommendStartups, marketCheckDue, nextAssumptionStatus, projectProgress, scanUpdatesToLog } from "@/lib/project-progress";
import { pickQuakeFeed, computeEvidenceStrength, freshnessOf, matchesFreshness, normalizeUrl, stripRefLabels, cleanRefLabels, replaceBrandName, brandMatchesCompetitor, sameNameCandidates } from "@/lib/research-utils";
import { buildProjectFromStartup, type StartupForClaim } from "@/lib/claim";

describe("post sign-in redirect", () => {
  it("keeps same-origin app paths, including the claim intent", () => {
    expect(safeRedirect("/startup/mendrelay?claim=1")).toBe("/startup/mendrelay?claim=1");
  });
  it("rejects external and protocol-relative URLs", () => {
    expect(safeRedirect("https://evil.example/x")).toBe("/workspace");
    expect(safeRedirect("//evil.example")).toBe("/workspace");
    expect(safeRedirect("/\\evil.example")).toBe("/workspace");
  });
  it("never loops back to the sign-in pages", () => {
    expect(safeRedirect("/auth?redirect=/x")).toBe("/workspace");
    expect(safeRedirect("/reset-password")).toBe("/workspace");
  });
});

describe("evidence strength comes from source counts, not model opinion", () => {
  it("is strong with 5+ sources across 2+ signal types", () => {
    expect(computeEvidenceStrength(5, 2).level).toBe("strong");
  });
  it("is moderate with 5 sources of a single type", () => {
    expect(computeEvidenceStrength(5, 1).level).toBe("moderate");
  });
  it("is emerging below 3 sources", () => {
    expect(computeEvidenceStrength(2, 2).level).toBe("emerging");
  });
});

describe("freshness filters", () => {
  const now = Date.parse("2026-11-14T12:00:00Z");
  it("buckets a 3-day-old item as last 7 days", () => {
    expect(freshnessOf("2026-11-11T12:00:00Z", now)).toBe("7d");
  });
  it("excludes a 10-day-old item from the 7-day filter", () => {
    expect(matchesFreshness("2026-11-04T12:00:00Z", "7d", now)).toBe(false);
  });
});

describe("source de-duplication", () => {
  it("treats tracking-parameter variants as the same URL", () => {
    expect(normalizeUrl("https://www.example.com/a/?utm_source=x")).toBe(normalizeUrl("https://example.com/a"));
  });
});

describe("AI prose never shows raw citation labels", () => {
  it("strips (S1, C2) labels from text", () => {
    expect(stripRefLabels("Plants report delays (S1, C2).")).toBe("Plants report delays.");
  });
  it("keeps structured ref fields intact", () => {
    expect(cleanRefLabels({ claim: "Delays grow (S3)", refs: ["S3"] })).toEqual({ claim: "Delays grow", refs: ["S3"] });
  });
});

describe("founder workspace", () => {
  const st: StartupForClaim = {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "demo",
    name: "Demo",
    tagline: "t",
    industry: "Manufacturing",
    geography: "Europe",
    brand: { hue: 20, glyph: "orbit", motto: "m" },
    problem: { statement: "p", who_is_affected: "w", why_now: "n", facts: [] },
    solution: { summary: "s", features: [] },
    customers: [],
    business_model: { type: "B2B SaaS", pricing_hypothesis: "", revenue_streams: [], unit_of_value: "" },
    competitors: [],
    assessment: { summary: "", dimensions: [], updated_at: "2026-11-14T00:00:00Z" },
    validation_steps: [{ title: "Interview", description: "", method: "calls", success_signal: "" }],
    pitch: { slides: [] },
    business_plan: { roadmap: [{ phase: "P1", horizon: "0-3 mo", goals: ["a", "b"] }], go_to_market: [], key_risks: [] },
    hypotheses: [{ statement: "h1", type: "market", how_to_test: "x" }, { statement: "h2", type: "pricing", how_to_test: "y" }],
    research_at: "2026-11-14T00:00:00Z",
  };
  it("starts every claimed assumption as untested and every check undone", () => {
    const p = buildProjectFromStartup(st, [], "2026-11-14T00:00:00Z");
    expect(p.assumptions.every((a) => a.status === "untested")).toBe(true);
    expect(p.checklist.every((c) => !c.done)).toBe(true);
  });
  it("cycles assumption status untested → validated → invalidated → untested", () => {
    expect(nextAssumptionStatus("untested")).toBe("validated");
    expect(nextAssumptionStatus("validated")).toBe("invalidated");
    expect(nextAssumptionStatus("invalidated")).toBe("untested");
  });
  it("counts validated and invalidated assumptions as tested", () => {
    const p = buildProjectFromStartup(st, [], "2026-11-14T00:00:00Z");
    const first = p.assumptions[0]!;
    const second = p.assumptions[1]!;
    const pr = projectProgress({ ...p, assumptions: [{ ...first, status: "validated" }, { ...second, status: "invalidated" }] });
    expect(pr.tested).toBe(2);
    expect(pr.items).toBe(2);
  });
});

describe("renaming a duplicate startup rewrites its own copy", () => {
  it("replaces whole-word mentions in nested pitch content, any case", () => {
    const pitch = { slides: [{ headline: "Tallywake finds waste", body: "With TALLYWAKE, teams act." }] };
    expect(replaceBrandName(pitch, "Tallywake", "Yieldglass")).toEqual({
      slides: [{ headline: "Yieldglass finds waste", body: "With Yieldglass, teams act." }],
    });
  });
  it("leaves words that merely contain the name untouched", () => {
    expect(replaceBrandName("Tallywakers love Tallywake", "Tallywake", "Yieldglass")).toBe("Tallywakers love Yieldglass");
  });
});

describe("a domain's brand is only shown for the matching competitor", () => {
  it("accepts the company's own domain", () => {
    expect(brandMatchesCompetitor("Sully.ai", "sully.ai", "Sully")).toBe(true);
    expect(brandMatchesCompetitor("Epic Systems", "epic.com", "Epic")).toBe(true);
  });
  it("rejects a review or news site's brand", () => {
    expect(brandMatchesCompetitor("Sully.ai", "g2.com", "G2")).toBe(false);
    expect(brandMatchesCompetitor("Abridge", "fiercehealthcare.com", "Fierce Healthcare")).toBe(false);
  });
});

describe("name-only competitors are matched against same-name brands only", () => {
  const found = [
    { domain: "litmus.com", name: "Litmus" },
    { domain: "litmus.io", name: "Litmus" },
    { domain: "litmusworld.com", name: "LitmusWorld" },
    { domain: "acme.com", name: "Acme" },
  ];
  it("keeps exact-name brands first and drops unrelated ones", () => {
    expect(sameNameCandidates("Litmus", found).map((c) => c.domain)).toEqual(["litmus.com", "litmus.io", "litmusworld.com"]);
  });
  it("caps how many candidates are verified", () => {
    expect(sameNameCandidates("Litmus", found, 2)).toHaveLength(2);
  });
});

describe("market scans are logged into the founder activity once", () => {
  const scan = (id: string, status: string, verdict: string | null) => ({
    id,
    status,
    verdict,
    headline: "Payers tighten prior authorization rules",
    summary: null,
    candidates_count: 4,
    changes: [],
    created_at: "2026-11-10T10:00:00Z",
    completed_at: status === "complete" ? "2026-11-10T10:01:00Z" : null,
  });
  it("logs completed scans with their verdict and result link", () => {
    const out = scanUpdatesToLog([], [scan("a1", "complete", "strengthened")], "chartweft-coml");
    expect(out).toEqual([
      {
        id: "scan-a1",
        at: "2026-11-10T10:01:00Z",
        kind: "scan",
        title: "Market scan · opportunity strengthened",
        text: "Payers tighten prior authorization rules",
        url: "/startup/chartweft-coml/quake/a1",
      },
    ]);
  });
  it("skips scans already logged and scans still running", () => {
    const existing = [{ id: "scan-a1", at: "x", kind: "scan" as const, title: "t", text: "t" }];
    expect(scanUpdatesToLog(existing, [scan("a1", "complete", "weakened"), scan("b2", "scanning", null)], "s")).toEqual([]);
  });
});

describe("workspaces re-check the market weekly", () => {
  const now = new Date("2026-11-14T12:00:00Z").getTime();
  it("is due when the last scan is more than 7 days old", () => {
    expect(marketCheckDue({ lastScanAt: "2026-11-06T11:00:00Z", researchAt: "2026-11-01T00:00:00Z", now })).toBe(true);
  });
  it("is not due within 7 days of the last scan", () => {
    expect(marketCheckDue({ lastScanAt: "2026-11-08T12:00:00Z", researchAt: "2026-10-01T00:00:00Z", now })).toBe(false);
  });
  it("uses the research date when the startup was never scanned", () => {
    expect(marketCheckDue({ lastScanAt: null, researchAt: "2026-11-10T00:00:00Z", now })).toBe(false);
    expect(marketCheckDue({ lastScanAt: null, researchAt: "2026-11-01T00:00:00Z", now })).toBe(true);
  });
});

describe("home market-shift feed", () => {
  const scan = (id: string, verdict: string, changes: number, at: string) => ({
    id,
    verdict,
    changes: Array.from({ length: changes }, () => ({})),
    completed_at: at,
    created_at: at,
  });
  it("puts scans that changed an assessment before newer no-change scans", () => {
    const feed = pickQuakeFeed(
      [scan("a", "unchanged", 0, "2026-11-14T10:00:00Z"), scan("b", "mixed", 3, "2026-11-12T10:00:00Z"), scan("c", "strengthened", 1, "2026-11-13T10:00:00Z")],
      3,
    );
    expect(feed.map((s) => s.id)).toEqual(["c", "b", "a"]);
  });
  it("respects the limit", () => {
    const feed = pickQuakeFeed([scan("a", "mixed", 1, "2026-11-14T10:00:00Z"), scan("b", "weakened", 2, "2026-11-13T10:00:00Z")], 1);
    expect(feed.map((s) => s.id)).toEqual(["a"]);
  });
});

describe("personalised recommendations", () => {
  const card = (id: string, industry: string | null, geography: string | null, at = "2026-11-10T00:00:00Z") => ({
    id,
    slug: id,
    industry,
    geography,
    research_at: at,
  });
  const project = { name: "Chartweft", startup_id: "own", research: { startup_slug: "own", industry: "Healthcare", geography: "North America" } };

  it("never recommends a startup the founder already claimed", () => {
    const recs = recommendStartups([card("own", "Healthcare", "North America")], [project]);
    expect(recs).toEqual([]);
  });
  it("ranks same-industry picks above same-market picks and explains why", () => {
    const recs = recommendStartups([card("geo", "Education", "North America"), card("ind", "Healthcare", "Europe")], [project]);
    expect(recs.map((r) => r.card.id)).toEqual(["ind", "geo"]);
    expect(recs[0]?.reason).toBe("Same industry as Chartweft");
    expect(recs[1]?.reason).toBe("Same region as Chartweft");
  });
  it("does not treat a shared \"Global\" market as a match", () => {
    const globalProject = { ...project, research: { ...project.research, geography: "Global" } };
    expect(recommendStartups([card("g", "Education", "Global")], [globalProject])).toEqual([]);
  });
  it("skips startups with no shared industry or market", () => {
    expect(recommendStartups([card("x", "Logistics", "Europe")], [project])).toEqual([]);
  });
  it("returns nothing for founders without projects", () => {
    expect(recommendStartups([card("ind", "Healthcare", "Europe")], [])).toEqual([]);
  });
});

describe("co-founder edits merge instead of overwriting each other", () => {
  const check = (id: string, done = false) => ({ id, title: id, description: "", method: "", success_signal: "", done });
  const note = (id: string) => ({ id, at: "2026-11-14T10:00:00Z", kind: "note" as const, title: "Founder note", text: id });
  const base = {
    name: "Chartweft",
    tagline: "t",
    concept: "c",
    assumptions: [],
    checklist: [check("a"), check("b")],
    roadmap: [{ id: "p1", phase: "Validate", horizon: "Month 1", items: [{ id: "i1", text: "x", done: false }, { id: "i2", text: "y", done: false }] }],
    updates: [note("n1")],
  };

  it("keeps a teammate's new note while saving my checklist tick", () => {
    const local = { ...base, checklist: [check("a", true), check("b")] };
    const server = { ...base, updates: [note("n1"), note("teammate")] };
    const merged = mergeProject(base, local, server);
    expect(merged.checklist.find((c) => c.id === "a")?.done).toBe(true);
    expect(merged.updates.map((u) => u.id)).toEqual(["n1", "teammate"]);
  });

  it("keeps both people's ticks inside the same roadmap phase", () => {
    const local = { ...base, roadmap: [{ ...base.roadmap[0]!, items: [{ id: "i1", text: "x", done: true }, { id: "i2", text: "y", done: false }] }] };
    const server = { ...base, roadmap: [{ ...base.roadmap[0]!, items: [{ id: "i1", text: "x", done: false }, { id: "i2", text: "y", done: true }] }] };
    const merged = mergeProject(base, local, server);
    expect(merged.roadmap[0]?.items.map((i) => i.done)).toEqual([true, true]);
  });

  it("honours deletions made in this browser and additions made by the teammate", () => {
    const local = { ...base, checklist: [check("b")] };
    const server = { ...base, checklist: [check("a"), check("b"), check("c")] };
    expect(mergeProject(base, local, server).checklist.map((c) => c.id)).toEqual(["b", "c"]);
  });

  it("takes the teammate's text when I did not change that field", () => {
    const server = { ...base, concept: "teammate rewrite" };
    expect(mergeProject(base, base, server).concept).toBe("teammate rewrite");
    expect(changedFields(mergeProject(base, base, server), server)).toEqual({});
  });

  it("does not duplicate an activity entry both browsers logged", () => {
    const scanNote = { ...note("scan-1"), kind: "scan" as const };
    const local = { ...base, updates: [note("n1"), scanNote] };
    const server = { ...base, updates: [note("n1"), scanNote] };
    expect(mergeProject(base, local, server).updates.map((u) => u.id)).toEqual(["n1", "scan-1"]);
  });
});
