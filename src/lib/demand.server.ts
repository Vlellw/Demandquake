// Demand checks: background workers that gather extra demand evidence for a startup from Context.dev
// (customer posts, competitor reviews and pricing, funding, how-to videos, rule changes, market size,
// local businesses). Server-only. One cached row per startup and section; the browser drives the
// workers through advanceDemandEvidence and every result is reused for a month.
import { supabaseAdmin as db } from "@/integrations/supabase/client.server";
import type { Database, Json } from "@/integrations/supabase/types";
import { AIError, generateJSON, s } from "./ai.server";
import {
  ContextDevBusy,
  ContextDevError,
  answerTask,
  companySearch,
  mapUrls,
  newsByType,
  scrapeJson,
  scrapeMarkdown,
  scrapeParsed,
  webSearch,
  type CallMeta,
  type CompanyRecord,
} from "./contextdev.server";
import { startupCompetitorBrands } from "./brands.server";
import {
  DEMAND_SECTIONS,
  classifyListingUrl,
  excerpt,
  figureOnPage,
  fundingSummary,
  g2Matches,
  hostOf,
  keepSourced,
  labelCounts,
  listingBelongsTo,
  parseYouTubeMarkdown,
  priceSummary,
  pricingUrlKind,
  teamLabel,
  unwrapMapsWebsite,
  verbatimQuote,
  voiceTotals,
  type Announcement,
  type CompetitorPricing,
  type DemandEvidenceDTO,
  type DemandPlan,
  type DemandSection,
  type DemandSectionDTO,
  type DemandStatus,
  type FundedCompany,
  type FundingData,
  type ListingUrl,
  type LocalData,
  type MarketSizeData,
  type PricePlan,
  type PricingData,
  type ReviewListing,
  type ReviewPlatform,
  type ReviewQuote,
  type ReviewsData,
  type RuleChange,
  type SectionDataMap,
  type VideoItem,
  type VideosData,
  type VoiceKind,
  type VoicePost,
  type VoicesData,
  type WhyNowData,
} from "./demand";
import type { Competitor, CustomerSegment, StartupProblem, StartupSolution } from "./types";

const MIN = 60_000;
const REFRESH_MS = 30 * 24 * 60 * MIN;
const ERROR_RETRY_MS = 6 * 60 * MIN;
const STALE_RUN_MS = 6 * MIN;
const BUSY_RETRY_MS = 20_000;
const RETRY_COOLDOWN_MS = MIN;
const BG = { background: true } as const;

type Row = Database["public"]["Tables"]["demand_evidence"]["Row"];

export class DemandError extends Error {
  userMessage: string;
  constructor(userMessage: string) {
    super(userMessage);
    this.name = "DemandError";
    this.userMessage = userMessage;
  }
}

function friendly(err: unknown): string {
  if (err instanceof ContextDevError || err instanceof AIError || err instanceof DemandError) return err.userMessage;
  return "This check could not be completed. Try again later.";
}

interface Ctx {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  industry: string | null;
  geography: string | null;
  business_model_type: string | null;
  problem: StartupProblem;
  solution: StartupSolution;
  customers: CustomerSegment[];
  competitors: Competitor[];
  monitor_queries: string[];
}

async function loadStartup(slug: string): Promise<Ctx | null> {
  const { data, error } = await db
    .from("startups")
    .select("id, slug, name, tagline, industry, geography, business_model_type, problem, solution, customers, competitors, monitor_queries")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    tagline: data.tagline,
    industry: data.industry?.trim() || null,
    geography: data.geography?.trim() || null,
    business_model_type: data.business_model_type,
    problem: (data.problem as unknown as StartupProblem) ?? { statement: "", who_is_affected: "", why_now: "", facts: [] },
    solution: (data.solution as unknown as StartupSolution) ?? { summary: "", features: [] },
    customers: (data.customers as unknown as CustomerSegment[]) ?? [],
    competitors: (data.competitors as unknown as Competitor[]) ?? [],
    monitor_queries: data.monitor_queries ?? [],
  };
}

function brief(ctx: Ctx): string {
  return [
    `Startup idea: ${ctx.name} - ${ctx.tagline}`,
    `Problem: ${ctx.problem.statement}`,
    `Who is affected: ${ctx.problem.who_is_affected}`,
    `Why now (from sources): ${ctx.problem.why_now}`,
    `Proposed solution: ${ctx.solution.summary}`,
    `Customer segments: ${ctx.customers.map((c) => `${c.segment} (buyer: ${c.buyer})`).join("; ") || "not specified"}`,
    `Industry: ${ctx.industry ?? "not specified"}. Region: ${ctx.geography ?? "not specified"}. Business model: ${ctx.business_model_type ?? "not specified"}.`,
    `Known competitors: ${ctx.competitors.map((c) => c.name + (c.domain ? ` (${c.domain})` : "")).join(", ") || "none"}`,
  ].join("\n");
}

class Credits {
  used = 0;
  add(meta: CallMeta) {
    this.used += meta.creditsUsed;
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i] as T, i);
    }
  });
  await Promise.all(workers);
  return out;
}

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const nstr = (v: unknown, max: number): string | null => str(v, max) || null;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const isoOrNull = (v: unknown): string | null => {
  if (typeof v !== "string" || !v.trim()) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};

interface Target {
  name: string;
  domain: string;
}

/** Competitors with a known website (sourced domain or verified brand match), most direct first. */
async function competitorTargets(ctx: Ctx): Promise<Target[]> {
  const brands = await startupCompetitorBrands(ctx.slug).catch(() => ({ byName: {} as Record<string, string> }));
  const rank: Record<string, number> = { direct: 0, incumbent: 1, adjacent: 2, workaround: 3 };
  const seen = new Set<string>();
  const out: Target[] = [];
  for (const c of [...ctx.competitors].sort((a, b) => (rank[a.kind] ?? 4) - (rank[b.kind] ?? 4))) {
    if (c.kind === "workaround") continue;
    const domain = hostOf(c.domain) ?? hostOf(brands.byName[c.name]);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    out.push({ name: c.name, domain });
  }
  return out;
}

type Outcome<K extends DemandSection> = { status: "done" | "empty" | "not_applicable"; data: SectionDataMap[K] | null; note?: string | null };
type Runner<K extends DemandSection> = (ctx: Ctx, plan: DemandPlan | null, credits: Credits) => Promise<Outcome<K>>;

function needPlan(plan: DemandPlan | null): DemandPlan {
  if (!plan) throw new DemandError("The search plan for this startup is missing. Try again shortly.");
  return plan;
}

// ---------- plan ----------

const runPlan: Runner<"plan"> = async (ctx) => {
  const out = await generateJSON<{
    reddit_queries: string[];
    youtube_query: string;
    company_query: string;
    press_query: string;
    market_size_topic: string;
    watch_query: string;
    local: { applicable: boolean; maps_query: string | null; reason: string };
  }>({
    name: "demand_plan",
    effort: "low",
    instructions:
      "You plan web searches that test whether real people need a startup idea. Write searches in plain English. Never include the startup's own name. Only mark local as applicable when the customers are physical local businesses or consumers in a specific city or region named in the input; otherwise applicable is false and maps_query is null.",
    input: brief(ctx),
    schema: s.obj({
      reddit_queries: s.arr(s.str(), "Exactly 2 short Reddit searches (2-6 words) using the words affected people would use when complaining or asking for help. No brand names, no quotes or operators."),
      youtube_query: s.str("A short 'how to' search (4-9 words) for videos people watch to cope with this problem today."),
      company_query: s.str("Up to 30 words describing companies that sell a product or service solving this problem for these customers."),
      press_query: s.str("A news search (5-12 words) for funding rounds, product launches or acquisitions of companies solving this problem."),
      market_size_topic: s.str("The market category to size, 3-8 words, e.g. 'special education IEP software'."),
      watch_query: s.str("A web search (5-12 words) that surfaces new developments in this market: rules, launches, pricing, funding."),
      local: s.obj({
        applicable: s.bool(),
        maps_query: s.nstr("Google Maps search such as 'dog groomers in Helsinki', or null"),
        reason: s.str("One short sentence explaining why local businesses are or are not relevant."),
      }),
    }),
  });
  const reddit = (out.reddit_queries ?? []).map((q) => str(q, 80).replace(/["']/g, "")).filter((q) => q.length >= 4).slice(0, 2);
  const fallback = str(ctx.problem.statement, 60) || ctx.tagline;
  const plan: DemandPlan = {
    reddit_queries: reddit.length ? reddit : [fallback],
    youtube_query: str(out.youtube_query, 90) || `how to ${fallback}`,
    company_query: str(out.company_query, 300) || ctx.solution.summary.slice(0, 300),
    press_query: str(out.press_query, 160) || `${str(out.market_size_topic, 80)} funding`,
    market_size_topic: str(out.market_size_topic, 90) || str(ctx.industry, 60) || fallback,
    watch_query: str(out.watch_query, 160) || str(ctx.monitor_queries[0], 160) || fallback,
    local: {
      applicable: Boolean(out.local?.applicable && str(out.local.maps_query, 120)),
      maps_query: nstr(out.local?.maps_query, 120),
      reason: str(out.local?.reason, 200) || "This idea is not tied to one local area.",
    },
  };
  return { status: "done", data: plan };
};

// ---------- voices (Reddit) ----------

interface RedditPostRaw {
  id?: string;
  title?: string;
  body?: string | null;
  url?: string;
  subreddit?: string | null;
  posted_at?: string | null;
  score?: number | null;
  comment_count?: number | null;
  is_nsfw?: boolean;
  removed_by?: string | null;
  is_stickied?: boolean;
}

const VOICE_KINDS = ["complaint", "request", "workaround", "willingness_to_pay"] as const;

const runVoices: Runner<"voices"> = async (ctx, planIn, credits) => {
  const plan = needPlan(planIn);
  const yearAgo = Date.now() - 400 * 24 * 60 * MIN;
  const pages = await mapLimit(plan.reddit_queries, 2, async (q) => {
    const r = await scrapeParsed<{ posts?: RedditPostRaw[] }>(
      `https://www.reddit.com/search/?q=${encodeURIComponent(q)}&type=posts&sort=relevance&t=year`,
      "reddit-search",
      { limit: 25 },
      BG,
    );
    credits.add(r.meta);
    return r.data?.posts ?? [];
  });
  const byId = new Map<string, RedditPostRaw & { id: string; title: string; url: string }>();
  for (const p of pages.flat()) {
    if (!p.id || !p.title || !p.url || p.is_nsfw || p.removed_by || p.is_stickied) continue;
    const t = p.posted_at ? Date.parse(p.posted_at) : NaN;
    if (!Number.isNaN(t) && t < yearAgo) continue;
    if (!byId.has(p.id)) byId.set(p.id, p as RedditPostRaw & { id: string; title: string; url: string });
  }
  const posts = [...byId.values()];
  const empty: VoicesData = { queries: plan.reddit_queries, scanned: posts.length, ...voiceTotals([]), posts: [] };
  if (!posts.length) return { status: "empty", data: empty };

  const judged = await generateJSON<{ posts: { n: number; relevant: boolean; kind: VoiceKind; quote: string }[] }>({
    name: "demand_voices",
    effort: "low",
    instructions:
      "Judge Reddit posts for a startup demand check. A post is relevant only when its author describes personally experiencing this specific problem, asks for a solution, describes a workaround, or says they would pay for help. Vendor promotion, news reposts and unrelated topics are not relevant. For each relevant post copy one excerpt character-for-character from its title or body (12-220 characters) that best shows the need; never paraphrase.",
    input: [
      brief(ctx),
      "",
      "Posts:",
      ...posts.map((p, i) => `[${i + 1}] r/${p.subreddit ?? "?"} | ${p.title}\n${(p.body ?? "").replace(/\s+/g, " ").slice(0, 700)}`),
    ].join("\n"),
    schema: s.obj({
      posts: s.arr(
        s.obj({
          n: s.int("Post number"),
          relevant: s.bool(),
          kind: s.enm(VOICE_KINDS, "complaint = describes the pain; request = asks for a tool or help; workaround = describes a makeshift fix; willingness_to_pay = says they pay or would pay"),
          quote: s.str("Exact excerpt copied from the post, or empty string"),
        }),
      ),
    }),
  });
  const relevant: VoicePost[] = [];
  const seen = new Set<number>();
  for (const j of judged.posts ?? []) {
    const p = posts[j.n - 1];
    if (!p || !j.relevant || seen.has(j.n)) continue;
    seen.add(j.n);
    relevant.push({
      id: p.id,
      title: str(p.title, 300),
      url: p.url,
      community: p.subreddit ?? "reddit",
      posted_at: isoOrNull(p.posted_at),
      upvotes: Math.max(0, Number(p.score ?? 0)),
      comments: Math.max(0, Number(p.comment_count ?? 0)),
      quote: verbatimQuote(j.quote, `${p.title}\n${p.body ?? ""}`, 240),
      kind: VOICE_KINDS.includes(j.kind) ? j.kind : "complaint",
    });
  }
  relevant.sort((a, b) => b.upvotes - a.upvotes || b.comments - a.comments);
  const data: VoicesData = { queries: plan.reddit_queries, scanned: posts.length, ...voiceTotals(relevant), posts: relevant.slice(0, 12) };
  return { status: relevant.length ? "done" : "empty", data };
};

// ---------- reviews (G2, Google Play, App Store) ----------

interface G2Raw {
  product?: { name?: string; slug?: string };
  reviews?: {
    url?: string;
    title?: string;
    rating?: number | null;
    published_at?: string | null;
    reviewer?: { company_size?: string | null; industry?: string | null } | null;
    likes?: string | null;
    dislikes?: string | null;
  }[];
}
interface StoreDetailsRaw {
  name?: string;
  url?: string;
  rating?: number | null;
  rating_count?: number | null;
  rating_histogram?: Record<string, number> | null;
  downloads?: string | null;
  downloads_min?: number | null;
  developer?: { website?: string | null } | null;
}
interface StoreReviewsRaw {
  reviews?: { rating?: number | null; title?: string | null; text?: string | null; created_at?: string | null }[];
}

interface PoolItem {
  text: string;
  url: string;
  rating: number | null;
  date: string | null;
  platform: ReviewPlatform;
  product: string;
}

const PAY_WORDS = /\b(pay|paid|paying|price|pricing|priced|subscription|subscribe|cost|costs|costly|expensive|cheap|fee|fees|worth|afford|paywall|premium|license|licen[cs]e)\b/i;

const runReviews: Runner<"reviews"> = async (ctx, _plan, credits) => {
  const targets = (await competitorTargets(ctx)).slice(0, 3);
  const listings: ReviewListing[] = [];
  const complaints: PoolItem[] = [];
  const payPool: PoolItem[] = [];
  const sizes: (string | null)[] = [];
  const industries: (string | null)[] = [];
  const notListed: string[] = [];
  let reviewsRead = 0;

  for (const t of targets) {
    const search = await webSearch({
      query: `"${t.name}" reviews site:g2.com OR site:apps.apple.com OR site:play.google.com`,
      numResults: 8,
      noHighlights: true,
      background: true,
    });
    credits.add(search.meta);
    const found: { g2?: ListingUrl; play?: ListingUrl; app?: ListingUrl } = {};
    for (const r of search.results) {
      const l = classifyListingUrl(r.url);
      if (!l) continue;
      if (l.platform === "g2" && !found.g2 && g2Matches(t.name, l.slug, r.title)) found.g2 = l;
      if (l.platform === "google_play" && !found.play) found.play = l;
      if (l.platform === "app_store" && !found.app) found.app = l;
    }
    let listed = false;

    const tasks: (() => Promise<void>)[] = [];
    if (found.g2) {
      const g2 = found.g2;
      tasks.push(async () => {
        const r = await scrapeParsed<G2Raw>(g2.url, "g2-reviews", {}, BG);
        credits.add(r.meta);
        const reviews = r.data?.reviews ?? [];
        if (!reviews.length) return;
        listed = true;
        reviewsRead += reviews.length;
        const ratings = reviews.map((x) => num(x.rating)).filter((x): x is number => x !== null);
        const product = str(r.data?.product?.name, 80) || t.name;
        listings.push({
          competitor: t.name,
          platform: "g2",
          name: product,
          url: g2.url,
          rating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
          rating_count: null,
          downloads: null,
          downloads_min: null,
          histogram: null,
          reviews_read: reviews.length,
          low_ratings: ratings.filter((x) => x <= 3).length,
        });
        for (const x of reviews) {
          sizes.push(x.reviewer?.company_size ?? null);
          industries.push(x.reviewer?.industry ?? null);
          const url = typeof x.url === "string" && x.url.startsWith("http") ? x.url : g2.url;
          const base = { url, rating: num(x.rating), date: isoOrNull(x.published_at), platform: "g2" as const, product };
          if (x.dislikes && x.dislikes.trim().length >= 20) complaints.push({ ...base, text: x.dislikes });
          const all = `${x.title ?? ""}. ${x.likes ?? ""} ${x.dislikes ?? ""}`;
          if (PAY_WORDS.test(all)) payPool.push({ ...base, text: `${x.dislikes ?? ""} ${x.likes ?? ""}`.trim() || all });
        }
      });
    }
    const storeTask = (l: ListingUrl, platform: "google_play" | "app_store") => async () => {
      const d = await scrapeParsed<StoreDetailsRaw>(l.url, platform === "google_play" ? "google-play" : "app-store", {}, BG);
      credits.add(d.meta);
      if (!d.data || !listingBelongsTo(d.data.developer?.website, t.domain)) return;
      listed = true;
      const product = str(d.data.name, 80) || t.name;
      const listing: ReviewListing = {
        competitor: t.name,
        platform,
        name: product,
        url: (typeof d.data.url === "string" && d.data.url.startsWith("http") ? d.data.url : l.url),
        rating: num(d.data.rating) !== null ? Math.round((d.data.rating as number) * 10) / 10 : null,
        rating_count: num(d.data.rating_count),
        downloads: nstr(d.data.downloads, 30),
        downloads_min: num(d.data.downloads_min),
        histogram: d.data.rating_histogram && typeof d.data.rating_histogram === "object" ? d.data.rating_histogram : null,
        reviews_read: 0,
        low_ratings: 0,
      };
      const rv = await scrapeParsed<StoreReviewsRaw>(l.url, platform === "google_play" ? "google-play-reviews" : "app-store-reviews", {}, BG);
      credits.add(rv.meta);
      const reviews = rv.data?.reviews ?? [];
      listing.reviews_read = reviews.length;
      reviewsRead += reviews.length;
      for (const x of reviews) {
        const rating = num(x.rating);
        const text = `${x.title ? `${x.title}. ` : ""}${x.text ?? ""}`.trim();
        if (text.length < 20) continue;
        const base = { url: listing.url, rating, date: isoOrNull(x.created_at), platform, product, text };
        if (rating !== null && rating <= 3) {
          listing.low_ratings += 1;
          complaints.push(base);
        }
        if (PAY_WORDS.test(text)) payPool.push(base);
      }
      listings.push(listing);
    };
    if (found.play) tasks.push(storeTask(found.play, "google_play"));
    if (found.app) tasks.push(storeTask(found.app, "app_store"));
    await Promise.all(tasks.map((fn) => fn()));
    if (!listed) notListed.push(t.name);
  }

  const base: ReviewsData = {
    competitors_checked: targets.map((t) => t.name),
    not_listed: notListed,
    listings,
    reviews_read: reviewsRead,
    complaints_read: complaints.length,
    themes: [],
    pay_quotes: [],
    segments: { company_size: labelCounts(sizes, 6), industry: labelCounts(industries, 6) },
  };
  if (!listings.length) return { status: "empty", data: base };

  const pool = complaints.slice(0, 80);
  const pay = payPool.slice(0, 30);
  if (pool.length || pay.length) {
    const ai = await generateJSON<{ themes: { title: string; explanation: string; ids: number[] }[]; pay_ids: number[] }>({
      name: "demand_review_themes",
      effort: "low",
      instructions:
        "Group competitor complaints from public reviews into the main recurring themes (at most 5) that a new startup could address. Titles are 3-8 plain words. Explanations are one neutral sentence describing what reviewers report. Assign each complaint to at most one theme by its number; skip vague ones. From the second list pick reviews where the writer talks about paying: willing to pay, already paying, or finding the price too high.",
      input: [
        brief(ctx),
        "",
        "Complaints:",
        ...pool.map((c, i) => `[C${i + 1}] (${c.platform}, ${c.product}, rating ${c.rating ?? "?"}) ${excerpt(c.text, 350)}`),
        "",
        "Reviews mentioning money:",
        ...pay.map((c, i) => `[P${i + 1}] (${c.platform}, ${c.product}, rating ${c.rating ?? "?"}) ${excerpt(c.text, 350)}`),
      ].join("\n"),
      schema: s.obj({
        themes: s.arr(s.obj({ title: s.str(), explanation: s.str(), ids: s.arr(s.int(), "Complaint numbers without the C prefix") })),
        pay_ids: s.arr(s.int(), "Review numbers without the P prefix"),
      }),
    });
    const quoteOf = (c: PoolItem): ReviewQuote => ({ text: excerpt(c.text, 240), url: c.url, rating: c.rating, date: c.date, platform: c.platform, product: c.product });
    const used = new Set<number>();
    base.themes = (ai.themes ?? [])
      .map((th) => {
        const ids = [...new Set(th.ids ?? [])].filter((n) => pool[n - 1] && !used.has(n));
        ids.forEach((n) => used.add(n));
        return {
          title: str(th.title, 80),
          explanation: str(th.explanation, 260),
          mentions: ids.length,
          quotes: ids.slice(0, 2).map((n) => quoteOf(pool[n - 1] as PoolItem)),
        };
      })
      .filter((th) => th.title && th.mentions > 0)
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5);
    base.pay_quotes = [...new Set(ai.pay_ids ?? [])]
      .map((n) => pay[n - 1])
      .filter((c): c is PoolItem => Boolean(c))
      .slice(0, 4)
      .map(quoteOf);
  }
  return { status: "done", data: base };
};

// ---------- pricing ----------

const PRICE_SCHEMA = {
  type: "object",
  properties: {
    publishes_prices: { type: "boolean", description: "True if at least one concrete price is printed on the page." },
    has_free_plan: { type: ["boolean", "null"] },
    has_free_trial: { type: ["boolean", "null"] },
    sales_led: { type: ["boolean", "null"], description: "True if some plans require contacting sales for a quote." },
    plans: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          price: { type: ["number", "null"], description: "Price as printed, as a plain number. 0 for free plans." },
          currency: { type: ["string", "null"], description: "ISO 4217 code" },
          period: { type: ["string", "null"], enum: ["month", "year", "one_time", "usage", null] },
          unit: { type: ["string", "null"], description: "What the price is charged per, as printed, e.g. 'per user', 'per 1,000 invoices', 'flat'." },
          price_text: { type: ["string", "null"], description: "Price text exactly as printed." },
        },
        required: ["name", "price", "currency", "period", "unit", "price_text"],
        additionalProperties: false,
      },
    },
  },
  required: ["publishes_prices", "has_free_plan", "has_free_trial", "sales_led", "plans"],
  additionalProperties: false,
};
const PRICE_INSTRUCTIONS =
  "Extract only prices printed on this page; never estimate. Monthly prices billed annually use period 'month'. If prices are not shown (for example 'contact sales'), set publishes_prices to false and leave price fields null.";

interface PriceRaw {
  publishes_prices?: boolean;
  has_free_plan?: boolean | null;
  has_free_trial?: boolean | null;
  sales_led?: boolean | null;
  plans?: { name?: string; price?: number | null; currency?: string | null; period?: string | null; unit?: string | null; price_text?: string | null }[];
}

const PERIODS = new Set(["month", "year", "one_time", "usage"]);

const runPricing: Runner<"pricing"> = async (ctx, _plan, credits) => {
  const targets = (await competitorTargets(ctx)).slice(0, 4);
  const rows = await mapLimit(targets, 2, async (t): Promise<CompetitorPricing> => {
    const mapped = await mapUrls(t.domain, "pricing plans", { ...BG, maxLinks: 6 });
    credits.add(mapped.meta);
    const own = mapped.urls.filter((u) => listingBelongsTo(u.url, t.domain));
    const pricePage = own.find((u) => pricingUrlKind(u.url, u.title) === "price_page");
    const quotePage = own.find((u) => pricingUrlKind(u.url, u.title) === "quote_page");
    const blank: CompetitorPricing = { competitor: t.name, domain: t.domain, url: null, status: "not_found", has_free_plan: null, has_free_trial: null, plans: [] };
    if (!pricePage) return quotePage ? { ...blank, url: quotePage.url, status: "quote_only" } : blank;
    const r = await scrapeJson<PriceRaw>(pricePage.url, PRICE_SCHEMA, PRICE_INSTRUCTIONS, BG);
    credits.add(r.meta);
    if (!r.data) return quotePage ? { ...blank, url: quotePage.url, status: "quote_only" } : { ...blank, url: pricePage.url };
    const plans: PricePlan[] = (r.data.plans ?? [])
      .map((p) => {
        const price = num(p.price);
        const currency = typeof p.currency === "string" && /^[A-Za-z]{3}$/.test(p.currency.trim()) ? p.currency.trim().toUpperCase() : null;
        return {
          name: str(p.name, 60) || "Plan",
          price: price !== null && price >= 0 ? price : null,
          currency,
          period: (typeof p.period === "string" && PERIODS.has(p.period) ? p.period : null) as PricePlan["period"],
          unit: nstr(p.unit, 50),
          price_text: nstr(p.price_text, 50),
        };
      })
      .slice(0, 6);
    const anyPrice = plans.some((p) => p.price !== null);
    return {
      competitor: t.name,
      domain: t.domain,
      url: pricePage.url,
      status: r.data.publishes_prices && anyPrice ? "published" : "quote_only",
      has_free_plan: typeof r.data.has_free_plan === "boolean" ? r.data.has_free_plan : null,
      has_free_trial: typeof r.data.has_free_trial === "boolean" ? r.data.has_free_trial : null,
      plans,
    };
  });
  const data: PricingData = { competitors: rows, summary: priceSummary(rows) };
  return { status: rows.some((r) => r.status !== "not_found") ? "done" : "empty", data };
};

// ---------- funding / money in the market ----------

const ANNOUNCEMENT_KINDS = ["funding", "launch", "acquisition", "partnership", "other"] as const;

const runFunding: Runner<"funding"> = async (ctx, planIn, credits) => {
  const plan = needPlan(planIn);
  const top = (await competitorTargets(ctx))[0];
  const queries = [plan.company_query, ...(top ? [`companies like ${top.domain}`] : [])];
  const [lists, press] = await Promise.all([
    mapLimit(queries, 2, async (q) => {
      const r = await companySearch(q, BG);
      credits.add(r.meta);
      return r.companies;
    }),
    newsByType({ query: plan.press_query, types: ["press_release"], fromMs: Date.now() - 730 * 24 * 60 * MIN, limit: 15, background: true }).then((r) => {
      credits.add(r.meta);
      return r.articles;
    }),
  ]);
  const byDomain = new Map<string, CompanyRecord>();
  for (const c of lists.flat()) {
    if (c.operating_status === "closed") continue;
    if (!byDomain.has(c.domain)) byDomain.set(c.domain, c);
  }
  const companies = [...byDomain.values()].slice(0, 20);
  const empty: FundingData = { queries, companies: [], announcements: [], summary: fundingSummary([], new Date()) };
  if (!companies.length && !press.length) return { status: "empty", data: empty };

  const ai = await generateJSON<{ keep_companies: number[]; announcements: { n: number; keep: boolean; kind: (typeof ANNOUNCEMENT_KINDS)[number] }[] }>({
    name: "demand_funding_filter",
    effort: "low",
    instructions:
      "Filter search results for a market check. Keep a company only when its description shows it sells a product or service that addresses this same problem for similar customers. Keep a press release only when it announces funding, a product launch, an acquisition or a partnership by a company working on this problem.",
    input: [
      brief(ctx),
      "",
      "Companies:",
      ...companies.map((c, i) => `[${i + 1}] ${c.name} (${c.domain}): ${(c.description ?? "no description").slice(0, 300)}`),
      "",
      "Press releases:",
      ...press.map((a, i) => `[${i + 1}] ${a.title} - ${a.description.slice(0, 220)}`),
    ].join("\n"),
    schema: s.obj({
      keep_companies: s.arr(s.int(), "Company numbers to keep"),
      announcements: s.arr(s.obj({ n: s.int(), keep: s.bool(), kind: s.enm(ANNOUNCEMENT_KINDS) })),
    }),
  });
  const kept: FundedCompany[] = [...new Set(ai.keep_companies ?? [])]
    .map((n) => companies[n - 1])
    .filter((c): c is CompanyRecord => Boolean(c))
    .map((c) => ({
      name: str(c.name, 80),
      domain: c.domain,
      description: c.description ? excerpt(c.description, 220) : null,
      founded_year: c.founded_year,
      team: teamLabel(c.employees),
      hq_country: c.hq_country,
      stage: c.funding.stage && !["no_funding_yet", "undisclosed"].includes(c.funding.stage) ? c.funding.stage : null,
      total_usd: c.funding.total_usd && c.funding.total_usd > 0 ? c.funding.total_usd : null,
      latest_round: c.funding.latest_round?.date || c.funding.latest_round?.amount_usd ? c.funding.latest_round : null,
      crunchbase: c.crunchbase && c.crunchbase.startsWith("http") ? c.crunchbase : null,
    }))
    .sort((a, b) => (b.total_usd ?? 0) - (a.total_usd ?? 0) || (b.founded_year ?? 0) - (a.founded_year ?? 0))
    .slice(0, 10);
  const announcements: Announcement[] = (ai.announcements ?? [])
    .filter((a) => a.keep && a.kind !== "other" && press[a.n - 1])
    .map((a) => {
      const p = press[a.n - 1]!;
      return { title: str(p.title, 200), url: p.url, publisher: p.sourceName ?? p.sourceDomain, published_at: isoOrNull(p.publishedAt), kind: a.kind as Announcement["kind"] };
    })
    .filter((a, i, all) => all.findIndex((x) => x.url === a.url) === i)
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    .slice(0, 8);
  const data: FundingData = { queries, companies: kept, announcements, summary: fundingSummary(kept, new Date()) };
  return { status: kept.length || announcements.length ? "done" : "empty", data };
};

// ---------- videos ----------

const youtubeId = (url: string): string | null => {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtube.com" && u.pathname === "/watch") return u.searchParams.get("v");
    if (host === "youtu.be") return u.pathname.slice(1) || null;
  } catch {
    /* not a URL */
  }
  return null;
};

const runVideos: Runner<"videos"> = async (_ctx, planIn, credits) => {
  const plan = needPlan(planIn);
  const search = await webSearch({ query: `site:youtube.com ${plan.youtube_query}`, numResults: 8, noHighlights: true, background: true });
  credits.add(search.meta);
  const seen = new Set<string>();
  const hits = search.results.filter((r) => {
    const id = youtubeId(r.url);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  const top = hits.slice(0, 4);
  const empty: VideosData = { query: plan.youtube_query, videos: [], total_views: 0 };
  if (!top.length) return { status: "empty", data: empty };
  const videos = await mapLimit(top, 3, async (r): Promise<VideoItem> => {
    const id = youtubeId(r.url)!;
    const url = `https://www.youtube.com/watch?v=${id}`;
    const page = await scrapeMarkdown(url, BG);
    credits.add(page.meta);
    const facts = page.markdown ? parseYouTubeMarkdown(page.markdown) : { title: null, channel: null, views: null, duration: null };
    return {
      title: str(facts.title ?? r.title.replace(/\s*-\s*YouTube\s*$/i, ""), 200),
      url,
      channel: nstr(facts.channel, 80),
      views: facts.views,
      duration: nstr(facts.duration, 12),
      published_at: isoOrNull(page.publishedTime),
    };
  });
  const withViews = videos.filter((v) => v.title).sort((a, b) => (b.views ?? -1) - (a.views ?? -1));
  return {
    status: withViews.length ? "done" : "empty",
    data: { query: plan.youtube_query, videos: withViews, total_views: withViews.reduce((n, v) => n + (v.views ?? 0), 0) },
  };
};

// ---------- page re-checks for research-assistant answers ----------

/** Re-opens cited pages (1 credit each) so quotes and figures are only shown when the page really says them. */
async function readPages(urls: string[], credits: Credits): Promise<Map<string, string | null>> {
  const unique = [...new Set(urls)].slice(0, 8);
  const texts = await mapLimit(unique, 3, async (u) => {
    try {
      const r = await scrapeMarkdown(u, { background: true, timeoutMs: 25_000 });
      credits.add(r.meta);
      return r.markdown;
    } catch (err) {
      if (err instanceof ContextDevBusy) throw err;
      return null;
    }
  });
  return new Map(unique.map((u, i) => [u, texts[i] ?? null]));
}

// ---------- why now (rule changes) ----------

const runWhyNow: Runner<"why_now"> = async (ctx, _plan, credits) => {
  const who = ctx.problem.who_is_affected || ctx.customers.map((c) => c.segment).join(", ") || "the affected customers";
  const task = [
    `List dated laws, regulations, official deadlines, standards or public-policy changes from the last 24 months, or already scheduled for the future, that change what ${who} must do about this problem: ${ctx.problem.statement}`,
    ctx.geography ? `Focus on ${ctx.geography}.` : "",
    "Only include changes stated on an official or reputable page you read. For each give the date it takes effect or was announced, the jurisdiction, what changes, how it affects these people, an exact sentence quoted from the page, the page URL and the publisher. Ignore company news, product marketing and opinion.",
  ]
    .filter(Boolean)
    .join(" ");
  const r = await answerTask<{ changes?: Partial<RuleChange>[] }>(
    task,
    { changes: [{ date: "2026-09-01", jurisdiction: "France", change: "What the rule changes", effect: "How this affects the people with the problem", quote: "Exact sentence from the page", source_url: "https://example.gov/page", publisher: "Publisher name" }] },
    BG,
  );
  credits.add(r.meta);
  const changes: RuleChange[] = keepSourced(r.answer?.changes, r.sources)
    .map((c) => ({
      date: nstr(c.date, 20),
      jurisdiction: nstr(c.jurisdiction, 60),
      change: str(c.change, 300),
      effect: nstr(c.effect, 300),
      quote: nstr(c.quote, 320),
      source_url: c.source_url,
      publisher: nstr(c.publisher, 80),
    }))
    .filter((c) => c.change)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 6);
  const pages = await readPages(changes.filter((c) => c.quote).map((c) => c.source_url), credits);
  for (const c of changes) {
    const page = pages.get(c.source_url);
    c.quote = page ? verbatimQuote(c.quote, page, 320) : null;
  }
  const data: WhyNowData = { changes };
  return { status: changes.length ? "done" : "empty", data };
};

// ---------- market size ----------

const runMarketSize: Runner<"market_size"> = async (ctx, planIn, credits) => {
  const plan = needPlan(planIn);
  const region = ctx.geography ? ` in ${ctx.geography} or globally` : "";
  const r = await answerTask<{ figures?: Partial<SectionDataMap["market_size"]["figures"][number]>[] }>(
    `Find published market-size figures for ${plan.market_size_topic}${region}. Return only figures printed on a page you read, with the exact sentence quoted, the page URL, the publisher and the year the figure refers to. Do not calculate or estimate figures yourself.`,
    { figures: [{ value: "USD 1.2 billion", year: "2025", scope: "What market and region the figure covers", quote: "Exact sentence from the page", source_url: "https://example.com/report", publisher: "Publisher name" }] },
    BG,
  );
  credits.add(r.meta);
  const candidates = keepSourced(r.answer?.figures, r.sources)
    .map((f) => ({ value: str(f.value, 40), year: nstr(f.year, 12), scope: nstr(f.scope, 160), quote: nstr(f.quote, 320), source_url: f.source_url, publisher: nstr(f.publisher, 80) }))
    .filter((f) => f.value)
    .slice(0, 6);
  const pages = await readPages(candidates.map((f) => f.source_url), credits);
  const figures = candidates
    .filter((f) => {
      const page = pages.get(f.source_url);
      return Boolean(page && figureOnPage(f.value, f.quote, page));
    })
    .map((f) => {
      const page = pages.get(f.source_url) as string;
      return { ...f, quote: verbatimQuote(f.quote, page, 320) };
    })
    .slice(0, 4);
  const data: MarketSizeData = { topic: plan.market_size_topic, figures };
  return { status: figures.length ? "done" : "empty", data };
};

// ---------- local demand ----------

interface MapsBusinessRaw {
  name?: string;
  rating?: number | null;
  number_of_reviews?: number | null;
  website?: string | null;
  google_maps_url?: string | null;
  google_reviews_url?: string | null;
  google_category?: string[] | null;
}

const runLocal: Runner<"local"> = async (_ctx, planIn, credits) => {
  const plan = needPlan(planIn);
  if (!plan.local.applicable || !plan.local.maps_query) return { status: "not_applicable", data: null, note: plan.local.reason };
  const q = plan.local.maps_query;
  const search = await scrapeParsed<{ results?: MapsBusinessRaw[] }>(`https://www.google.com/maps/search/${encodeURIComponent(q).replace(/%20/g, "+")}/`, "google-maps", {}, BG);
  credits.add(search.meta);
  const raw = (search.data?.results ?? []).filter((b): b is MapsBusinessRaw & { name: string; google_maps_url: string } => Boolean(b.name && b.google_maps_url));
  const empty: LocalData = { query: q, found: 0, average_rating: null, total_reviews: 0, businesses: [], complaints: [] };
  if (!raw.length) return { status: "empty", data: empty };
  const rated = raw.filter((b) => typeof b.rating === "number");
  const byReviews = [...raw].sort((a, b) => (b.number_of_reviews ?? 0) - (a.number_of_reviews ?? 0));
  const complaints = (
    await mapLimit(byReviews.slice(0, 2), 2, async (b) => {
      const r = await scrapeParsed<{ reviews?: { rating?: number | null; isoDate?: string | null; snippet?: string }[] }>(b.google_reviews_url ?? b.google_maps_url, "google-maps-reviews", { limit: 20, sort: "lowest" }, BG);
      credits.add(r.meta);
      return (r.data?.reviews ?? [])
        .filter((x) => typeof x.rating === "number" && x.rating <= 2 && (x.snippet ?? "").trim().length >= 20)
        .slice(0, 3)
        .map((x) => ({ text: excerpt(x.snippet ?? "", 240), rating: num(x.rating), date: isoOrNull(x.isoDate), place: str(b.name, 80), url: b.google_maps_url }));
    })
  ).flat();
  const data: LocalData = {
    query: q,
    found: raw.length,
    average_rating: rated.length ? Math.round((rated.reduce((n, b) => n + (b.rating as number), 0) / rated.length) * 10) / 10 : null,
    total_reviews: raw.reduce((n, b) => n + Math.max(0, b.number_of_reviews ?? 0), 0),
    businesses: byReviews.slice(0, 8).map((b) => ({
      name: str(b.name, 80),
      rating: num(b.rating),
      reviews: num(b.number_of_reviews),
      category: nstr(b.google_category?.[0], 60),
      url: b.google_maps_url,
      website: unwrapMapsWebsite(b.website),
    })),
    complaints: complaints.slice(0, 6),
  };
  return { status: "done", data };
};

const RUNNERS: { [K in DemandSection]: Runner<K> } = {
  plan: runPlan,
  voices: runVoices,
  reviews: runReviews,
  pricing: runPricing,
  funding: runFunding,
  videos: runVideos,
  why_now: runWhyNow,
  market_size: runMarketSize,
  local: runLocal,
};

// ---------- orchestration ----------

function isClaimable(r: Row, now: number): boolean {
  if (r.status === "pending") return true;
  if (r.status === "running") return !r.started_at || now - Date.parse(r.started_at) > STALE_RUN_MS;
  return Date.parse(r.attempt_after) <= now;
}

const isActive = (r: Row, now: number) => r.status === "running" && Boolean(r.started_at) && now - Date.parse(r.started_at as string) <= STALE_RUN_MS;

async function readRows(startupId: string): Promise<Row[]> {
  const { data, error } = await db.from("demand_evidence").select("*").eq("startup_id", startupId);
  if (error) throw error;
  return data ?? [];
}

function toDTO(startupId: string, rows: Row[]): DemandEvidenceDTO {
  const now = Date.now();
  const byKey = new Map(rows.map((r) => [r.section as DemandSection, r]));
  const plan = byKey.get("plan");
  const planBlocked = Boolean(plan && plan.status === "error" && !isClaimable(plan, now));
  const sections = {} as DemandEvidenceDTO["sections"];
  for (const key of DEMAND_SECTIONS) {
    const r = byKey.get(key);
    const status = (r?.status ?? "pending") as DemandStatus;
    const dto: DemandSectionDTO = {
      status,
      data: key === "plan" ? null : ((r?.data as unknown as DemandSectionDTO["data"]) ?? null),
      retrieved_at: r?.retrieved_at ?? null,
      error: status === "error" ? (r?.error ?? "This check could not be completed.") : null,
      note: status === "not_applicable" ? (r?.error ?? null) : null,
      retry_allowed: status === "error" && Boolean(r) && now - Date.parse((r as Row).updated_at) > RETRY_COOLDOWN_MS,
    };
    (sections as Record<string, DemandSectionDTO>)[key] = dto;
  }
  return {
    startup_id: startupId,
    initialized: rows.length >= DEMAND_SECTIONS.length,
    needs_work: rows.length < DEMAND_SECTIONS.length || rows.some((r) => isActive(r, now)) || (!planBlocked && rows.some((r) => isClaimable(r, now))),
    sections,
  };
}

export async function readDemandEvidence(slug: string): Promise<DemandEvidenceDTO | null> {
  const ctx = await loadStartup(slug);
  if (!ctx) return null;
  return toDTO(ctx.id, await readRows(ctx.id));
}

async function ensureRows(startupId: string): Promise<void> {
  const { error } = await db
    .from("demand_evidence")
    .upsert(DEMAND_SECTIONS.map((section) => ({ startup_id: startupId, section })), { onConflict: "startup_id,section", ignoreDuplicates: true });
  if (error) throw error;
}

async function claim(startupId: string, section: DemandSection): Promise<Row | null> {
  const nowIso = new Date().toISOString();
  const staleIso = new Date(Date.now() - STALE_RUN_MS).toISOString();
  const { data: before } = await db.from("demand_evidence").select("*").eq("startup_id", startupId).eq("section", section).maybeSingle();
  if (!before) return null;
  const { data, error } = await db
    .from("demand_evidence")
    .update({ status: "running", started_at: nowIso, updated_at: nowIso })
    .eq("startup_id", startupId)
    .eq("section", section)
    .or(`status.eq.pending,and(status.eq.running,started_at.lt."${staleIso}"),and(status.in.(done,empty,error,not_applicable),attempt_after.lte."${nowIso}")`)
    .select("startup_id");
  if (error) throw error;
  return data && data.length ? before : null;
}

async function runSection(ctx: Ctx, section: DemandSection, before: Row, plan: DemandPlan | null): Promise<"done" | "busy" | "failed"> {
  const credits = new Credits();
  const at = (ms: number) => new Date(Date.now() + ms).toISOString();
  try {
    const out = await (RUNNERS[section] as Runner<DemandSection>)(ctx, plan, credits);
    const now = new Date().toISOString();
    await db
      .from("demand_evidence")
      .update({
        status: out.status,
        data: (out.data ?? null) as unknown as Json,
        error: out.status === "not_applicable" ? (out.note ?? null) : null,
        credits_used: credits.used,
        retrieved_at: now,
        attempt_after: at(REFRESH_MS),
        started_at: null,
        updated_at: now,
      })
      .eq("startup_id", ctx.id)
      .eq("section", section);
    return "done";
  } catch (err) {
    const hasData = before.data !== null && before.status !== "error";
    const now = new Date().toISOString();
    if (err instanceof ContextDevBusy) {
      await db
        .from("demand_evidence")
        .update({ status: hasData ? before.status : "pending", started_at: null, attempt_after: at(hasData ? BUSY_RETRY_MS : 0), updated_at: now })
        .eq("startup_id", ctx.id)
        .eq("section", section);
      return "busy";
    }
    console.error(`[demand] ${section} failed for ${ctx.slug}`, err);
    await db
      .from("demand_evidence")
      .update({
        status: hasData ? before.status : "error",
        error: friendly(err),
        credits_used: before.credits_used + credits.used,
        started_at: null,
        attempt_after: at(ERROR_RETRY_MS),
        updated_at: now,
      })
      .eq("startup_id", ctx.id)
      .eq("section", section);
    return "failed";
  }
}

/** Claims and runs one due section for this startup. Safe to call from several browsers at once. */
export async function advanceDemandEvidence(slug: string): Promise<{ evidence: DemandEvidenceDTO; progressed: boolean; busy: boolean }> {
  const ctx = await loadStartup(slug);
  if (!ctx) throw new DemandError("This startup no longer exists.");
  let rows = await readRows(ctx.id);
  if (rows.length < DEMAND_SECTIONS.length) {
    await ensureRows(ctx.id);
    rows = await readRows(ctx.id);
  }
  const now = Date.now();
  const byKey = new Map(rows.map((r) => [r.section as DemandSection, r]));
  const planRow = byKey.get("plan");
  let candidates: DemandSection[] = [];
  if (planRow && isClaimable(planRow, now)) candidates = ["plan"];
  else if (planRow && (planRow.status === "done" || (planRow.data && planRow.status !== "error"))) {
    candidates = DEMAND_SECTIONS.filter((k) => k !== "plan" && byKey.get(k) && isClaimable(byKey.get(k) as Row, now));
  }

  for (const section of candidates) {
    const before = await claim(ctx.id, section);
    if (!before) continue;
    const plan = section === "plan" ? null : ((planRow?.data as unknown as DemandPlan | null) ?? null);
    const result = await runSection(ctx, section, before, plan);
    return { evidence: toDTO(ctx.id, await readRows(ctx.id)), progressed: result !== "busy", busy: result === "busy" };
  }
  const evidence = toDTO(ctx.id, rows);
  return { evidence, progressed: false, busy: evidence.needs_work };
}

/** Lets a visitor retry failed checks (after a short cooldown) instead of waiting for the automatic retry. */
export async function retryDemandEvidence(slug: string): Promise<DemandEvidenceDTO> {
  const ctx = await loadStartup(slug);
  if (!ctx) throw new DemandError("This startup no longer exists.");
  const nowIso = new Date().toISOString();
  const cooled = new Date(Date.now() - RETRY_COOLDOWN_MS).toISOString();
  const { error } = await db
    .from("demand_evidence")
    .update({ attempt_after: nowIso })
    .eq("startup_id", ctx.id)
    .eq("status", "error")
    .lt("updated_at", cooled);
  if (error) throw error;
  return toDTO(ctx.id, await readRows(ctx.id));
}

/** Search topic and competitor pricing page for the weekly web watch (from cached checks). */
export async function watchTargetsFor(startupId: string): Promise<{ query: string | null; pricing: { url: string; competitor: string } | null }> {
  const { data } = await db.from("demand_evidence").select("section, status, data").eq("startup_id", startupId).in("section", ["plan", "pricing"]);
  const plan = data?.find((r) => r.section === "plan" && r.data)?.data as unknown as DemandPlan | undefined;
  const pricing = data?.find((r) => r.section === "pricing" && r.data)?.data as unknown as PricingData | undefined;
  const page = pricing?.competitors.find((c) => c.status === "published" && c.url) ?? pricing?.competitors.find((c) => c.url);
  return { query: plan?.watch_query ?? null, pricing: page?.url ? { url: page.url, competitor: page.competitor } : null };
}
