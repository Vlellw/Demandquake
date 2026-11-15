import { describe, expect, it } from "vitest";
import {
  classifyListingUrl,
  figureOnPage,
  formatLooseDate,
  fundingSummary,
  g2Matches,
  keepSourced,
  listingBelongsTo,
  parseYouTubeMarkdown,
  priceSummary,
  pricingUrlKind,
  unwrapMapsWebsite,
  verbatimQuote,
  voiceTotals,
  type CompetitorPricing,
} from "@/lib/demand";

describe("verbatim quotes", () => {
  const post = "I’ve tried **every** app and still spend 3 hours a week chasing late invoices — it’s exhausting.";
  it("keeps an excerpt that appears in the post, ignoring typographic quotes and markdown", () => {
    expect(verbatimQuote("I've tried every app and still spend 3 hours a week", post)).toBe("I've tried every app and still spend 3 hours a week");
  });
  it("drops a paraphrase the author never wrote", () => {
    expect(verbatimQuote("I spend hours every week chasing invoices", post)).toBeNull();
  });
  it("drops excerpts that are too short to mean anything", () => {
    expect(verbatimQuote("every app", post)).toBeNull();
  });
});

describe("customer post totals", () => {
  it("counts upvotes, comments, communities and kinds from the relevant posts only", () => {
    const t = voiceTotals([
      { upvotes: 120, comments: 30, community: "smallbusiness", kind: "complaint" },
      { upvotes: 5, comments: 2, community: "smallbusiness", kind: "request" },
      { upvotes: 40, comments: 9, community: "freelance", kind: "willingness_to_pay" },
    ]);
    expect(t.relevant).toBe(3);
    expect(t.upvotes).toBe(165);
    expect(t.comments).toBe(41);
    expect(t.communities[0]).toEqual({ name: "smallbusiness", posts: 2, url: "https://www.reddit.com/r/smallbusiness/" });
    expect(t.kinds).toEqual({ complaint: 1, request: 1, workaround: 0, willingness_to_pay: 1 });
  });
});

describe("review listings", () => {
  it("only attributes a store listing when the developer website matches the competitor domain", () => {
    expect(listingBelongsTo("https://www.notion.so/help", "notion.so")).toBe(true);
    expect(listingBelongsTo("https://app.acme.com", "acme.com")).toBe(true);
    expect(listingBelongsTo("https://acme-games.com", "acme.com")).toBe(false);
    expect(listingBelongsTo(null, "acme.com")).toBe(false);
  });
  it("matches G2 products only when every word of the competitor name appears", () => {
    expect(g2Matches("Simple Practice", "simplepractice", "SimplePractice Reviews")).toBe(true);
    expect(g2Matches("Fresh Books", "freshdesk", "Freshdesk Reviews")).toBe(false);
  });
  it("canonicalises G2, Google Play and App Store URLs and ignores others", () => {
    expect(classifyListingUrl("https://www.g2.com/products/hubspot-crm/reviews?page=2")).toEqual({ platform: "g2", slug: "hubspot-crm", url: "https://www.g2.com/products/hubspot-crm/reviews" });
    expect(classifyListingUrl("https://play.google.com/store/apps/details?id=com.duolingo&hl=de")).toMatchObject({ platform: "google_play", id: "com.duolingo" });
    expect(classifyListingUrl("https://apps.apple.com/gb/app/duolingo/id570060128")).toEqual({ platform: "app_store", id: "570060128", url: "https://apps.apple.com/gb/app/id570060128" });
    expect(classifyListingUrl("https://www.capterra.com/p/1/x")).toBeNull();
  });
});

describe("competitor pricing", () => {
  const row = (over: Partial<CompetitorPricing>): CompetitorPricing => ({ competitor: "X", domain: "x.com", url: null, status: "published", has_free_plan: null, has_free_trial: null, plans: [], ...over });
  it("reports the lowest to highest printed paid price and never counts a free plan as a price", () => {
    const s = priceSummary([
      row({ plans: [{ name: "Free", price: 0, currency: "USD", period: "month", unit: null, price_text: "$0" }, { name: "Pro", price: 29, currency: "USD", period: "month", unit: "per user", price_text: "$29" }] }),
      row({ domain: "y.com", has_free_trial: true, plans: [{ name: "Team", price: 99, currency: "usd", period: "month", unit: null, price_text: "$99" }] }),
      row({ domain: "z.com", status: "quote_only" }),
      row({ domain: "w.com", status: "not_found" }),
    ]);
    expect(s.range).toEqual({ currency: "USD", period: "month", min: 29, max: 99, plans: 2 });
    expect(s).toMatchObject({ checked: 4, published: 2, quote_only: 1, not_found: 1, free_plans: 1, free_trials: 1 });
  });
  it("shows no range when no competitor prints a monthly or yearly price", () => {
    expect(priceSummary([row({ plans: [{ name: "Usage", price: 0.02, currency: "USD", period: "usage", unit: "per call", price_text: "$0.02" }] })]).range).toBeNull();
  });
  it("tells price pages apart from contact-sales pages", () => {
    expect(pricingUrlKind("https://acme.com/pricing", "Pricing")).toBe("price_page");
    expect(pricingUrlKind("https://acme.com/contact-sales", "Talk to sales")).toBe("quote_page");
    expect(pricingUrlKind("https://acme.com/blog/post", "Our story")).toBeNull();
  });
});

describe("money in the market", () => {
  it("counts rounds in the last 24 months and companies founded in the last 3 years", () => {
    const s = fundingSummary(
      [
        { total_usd: 4_000_000, latest_round: { type: "seed", date: "2025-06-01", amount_usd: 4_000_000 }, founded_year: 2023, stage: "seed" },
        { total_usd: null, latest_round: { type: "series_a", date: "2021-01-01", amount_usd: null }, founded_year: 2015, stage: "series_a" },
        { total_usd: null, latest_round: null, founded_year: 2010, stage: null },
      ],
      new Date("2026-11-15T00:00:00Z"),
    );
    expect(s).toEqual({ companies: 3, with_funding: 2, total_usd: 4_000_000, recent_rounds: 1, new_entrants: 1 });
  });
});

describe("research assistant answers", () => {
  it("keeps only items whose source is a page the assistant actually read", () => {
    const kept = keepSourced(
      [{ source_url: "https://www.example.gov/rule/" }, { source_url: "https://made-up.example.com/x" }, { source_url: null }],
      ["https://example.gov/rule"],
    );
    expect(kept.map((k) => k.source_url)).toEqual(["https://www.example.gov/rule/"]);
  });
  it("confirms a market figure only when its numbers appear on the cited page", () => {
    const page = "The global market was valued at USD 4,300 million in 2024 and is projected to grow.";
    expect(figureOnPage("USD 4,300 million", null, page)).toBe(true);
    expect(figureOnPage("USD 5.1 billion", null, page)).toBe(false);
    expect(figureOnPage("about four billion", null, page)).toBe(false);
  });
});

describe("page parsing", () => {
  it("reads views, channel and duration from a YouTube page", () => {
    const md = "# How to chase late invoices\n\n**Channel**: Small Biz Tips\n**Views**: 156,295\n**Duration**: 12:04\n";
    expect(parseYouTubeMarkdown(md)).toEqual({ title: "How to chase late invoices", channel: "Small Biz Tips", views: 156295, duration: "12:04" });
  });
  it("unwraps Google Maps website links", () => {
    expect(unwrapMapsWebsite("/url?q=https://groomer.fi/&opi=1")).toBe("https://groomer.fi/");
    expect(unwrapMapsWebsite("https://direct.fi")).toBe("https://direct.fi");
    expect(unwrapMapsWebsite("/url?q=javascript:alert(1)")).toBeNull();
  });
  it("formats partial dates without inventing a day or month", () => {
    expect(formatLooseDate("2026-09-01")).toBe("1 Sep 2026");
    expect(formatLooseDate("2026-09")).toBe("Sep 2026");
    expect(formatLooseDate("2026")).toBe("2026");
  });
});
