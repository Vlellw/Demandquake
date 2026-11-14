import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/safe-redirect";
import { nextAssumptionStatus, projectProgress } from "@/lib/project-progress";
import { computeEvidenceStrength, freshnessOf, matchesFreshness, normalizeUrl, stripRefLabels, cleanRefLabels, replaceBrandName } from "@/lib/research-utils";
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
