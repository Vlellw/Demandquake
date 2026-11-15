// Demand checks: client-safe shapes and pure rules shared by the server workers, the Evidence tab
// and tests. Every number shown in the UI is counted from Context.dev data here; nothing is estimated.

export const DEMAND_SECTIONS = ["plan", "voices", "reviews", "pricing", "funding", "videos", "why_now", "market_size", "local"] as const;
export type DemandSection = (typeof DEMAND_SECTIONS)[number];
export type DemandStatus = "pending" | "running" | "done" | "empty" | "not_applicable" | "error";

/** Sections a visitor sees (the plan is internal). */
export const VISIBLE_SECTIONS = DEMAND_SECTIONS.filter((s) => s !== "plan") as Exclude<DemandSection, "plan">[];

// ---------- Section data ----------

export type VoiceKind = "complaint" | "request" | "workaround" | "willingness_to_pay";

export interface VoicePost {
  id: string;
  title: string;
  url: string;
  community: string;
  posted_at: string | null;
  upvotes: number;
  comments: number;
  /** Verbatim excerpt from the post (checked against the post text), or null. */
  quote: string | null;
  /** AI classification of what the post shows. */
  kind: VoiceKind;
}

export interface VoicesData {
  queries: string[];
  scanned: number;
  relevant: number;
  upvotes: number;
  comments: number;
  communities: { name: string; posts: number; url: string }[];
  kinds: Record<VoiceKind, number>;
  posts: VoicePost[];
}

export type ReviewPlatform = "g2" | "google_play" | "app_store";

export interface ReviewListing {
  competitor: string;
  platform: ReviewPlatform;
  name: string;
  url: string;
  rating: number | null;
  rating_count: number | null;
  downloads: string | null;
  downloads_min: number | null;
  histogram: Record<string, number> | null;
  reviews_read: number;
  low_ratings: number;
}

export interface ReviewQuote {
  text: string;
  url: string;
  rating: number | null;
  date: string | null;
  platform: ReviewPlatform;
  product: string;
}

export interface ReviewTheme {
  title: string;
  /** AI explanation of the grouped complaints. */
  explanation: string;
  mentions: number;
  quotes: ReviewQuote[];
}

export interface ReviewsData {
  competitors_checked: string[];
  not_listed: string[];
  listings: ReviewListing[];
  reviews_read: number;
  complaints_read: number;
  themes: ReviewTheme[];
  pay_quotes: ReviewQuote[];
  segments: { company_size: LabelCount[]; industry: LabelCount[] };
}

export interface PricePlan {
  name: string;
  price: number | null;
  currency: string | null;
  period: "month" | "year" | "one_time" | "usage" | null;
  unit: string | null;
  price_text: string | null;
}

export interface CompetitorPricing {
  competitor: string;
  domain: string;
  url: string | null;
  status: "published" | "quote_only" | "not_found";
  has_free_plan: boolean | null;
  has_free_trial: boolean | null;
  plans: PricePlan[];
}

export interface PricingData {
  competitors: CompetitorPricing[];
  summary: PriceSummary;
}

export interface FundedCompany {
  name: string;
  domain: string;
  description: string | null;
  founded_year: number | null;
  team: string | null;
  hq_country: string | null;
  stage: string | null;
  total_usd: number | null;
  latest_round: { type: string | null; date: string | null; amount_usd: number | null } | null;
  crunchbase: string | null;
}

export interface Announcement {
  title: string;
  url: string;
  publisher: string | null;
  published_at: string | null;
  /** AI classification. */
  kind: "funding" | "launch" | "acquisition" | "partnership";
}

export interface FundingData {
  queries: string[];
  companies: FundedCompany[];
  announcements: Announcement[];
  summary: FundingSummary;
}

export interface VideoItem {
  title: string;
  url: string;
  channel: string | null;
  views: number | null;
  duration: string | null;
  published_at: string | null;
}

export interface VideosData {
  query: string;
  videos: VideoItem[];
  total_views: number;
}

export interface RuleChange {
  date: string | null;
  jurisdiction: string | null;
  change: string;
  effect: string | null;
  quote: string | null;
  source_url: string;
  publisher: string | null;
}

export interface WhyNowData {
  changes: RuleChange[];
}

export interface MarketFigure {
  value: string;
  year: string | null;
  scope: string | null;
  quote: string | null;
  source_url: string;
  publisher: string | null;
}

export interface MarketSizeData {
  topic: string;
  figures: MarketFigure[];
}

export interface LocalBusiness {
  name: string;
  rating: number | null;
  reviews: number | null;
  category: string | null;
  url: string;
  website: string | null;
}

export interface LocalData {
  query: string;
  found: number;
  average_rating: number | null;
  total_reviews: number;
  businesses: LocalBusiness[];
  complaints: { text: string; rating: number | null; date: string | null; place: string; url: string }[];
}

export interface DemandPlan {
  reddit_queries: string[];
  youtube_query: string;
  company_query: string;
  press_query: string;
  market_size_topic: string;
  watch_query: string;
  local: { applicable: boolean; maps_query: string | null; reason: string };
}

export interface SectionDataMap {
  plan: DemandPlan;
  voices: VoicesData;
  reviews: ReviewsData;
  pricing: PricingData;
  funding: FundingData;
  videos: VideosData;
  why_now: WhyNowData;
  market_size: MarketSizeData;
  local: LocalData;
}

export interface DemandSectionDTO<K extends DemandSection = DemandSection> {
  status: DemandStatus;
  data: SectionDataMap[K] | null;
  retrieved_at: string | null;
  /** Friendly failure message; never a raw provider error. */
  error: string | null;
  /** Null for the plan; for other sections a plain reason when not applicable. */
  note: string | null;
  retry_allowed: boolean;
}

export interface DemandEvidenceDTO {
  startup_id: string;
  initialized: boolean;
  /** True while some section still needs fetching (the browser keeps driving the workers). */
  needs_work: boolean;
  sections: { [K in DemandSection]: DemandSectionDTO<K> };
}

// ---------- Pure rules ----------

export interface LabelCount {
  label: string;
  count: number;
}

const QUOTE_FOLD: [RegExp, string][] = [
  [/[\u2018\u2019\u201A\u2032]/g, "'"],
  [/[\u201C\u201D\u201E\u2033]/g, '"'],
  [/[\u2013\u2014\u2212]/g, "-"],
  [/\u2026/g, "..."],
  [/\u00A0/g, " "],
];

/** Lowercases, folds typographic punctuation, strips markdown emphasis and collapses whitespace. */
export function foldText(t: string): string {
  let out = t;
  for (const [re, rep] of QUOTE_FOLD) out = out.replace(re, rep);
  return out.replace(/[*_`#>]+/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Returns the candidate quote (cleaned of markdown) only when it appears verbatim in the source text,
 * so AI-picked excerpts can never put words in a customer's mouth.
 */
export function verbatimQuote(candidate: string | null | undefined, source: string, maxLen = 280): string | null {
  if (!candidate) return null;
  const clean = candidate.replace(/[*_`#>]+/g, "").replace(/\s+/g, " ").trim().replace(/^["'\u201C\u2018]+|["'\u201D\u2019]+$/g, "").trim();
  if (clean.length < 12 || clean.length > maxLen) return null;
  return foldText(source).includes(foldText(clean)) ? clean : null;
}

/** Shortens review text at a word boundary without changing the words that remain. */
export function excerpt(text: string, max = 240): string {
  const t = text.replace(/[*_`#>]+/g, "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[,;:.-]+$/, "")}…`;
}

/** Counts labels, most frequent first (ties alphabetical), ignoring blanks. */
export function labelCounts(values: (string | null | undefined)[], limit = 6): LabelCount[] {
  const m = new Map<string, number>();
  for (const v of values) {
    const k = v?.trim();
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function voiceTotals(posts: Pick<VoicePost, "upvotes" | "comments" | "community" | "kind">[]): Pick<VoicesData, "relevant" | "upvotes" | "comments" | "communities" | "kinds"> {
  const kinds: Record<VoiceKind, number> = { complaint: 0, request: 0, workaround: 0, willingness_to_pay: 0 };
  for (const p of posts) kinds[p.kind] += 1;
  return {
    relevant: posts.length,
    upvotes: posts.reduce((n, p) => n + Math.max(0, p.upvotes), 0),
    comments: posts.reduce((n, p) => n + Math.max(0, p.comments), 0),
    communities: labelCounts(posts.map((p) => p.community), 8).map((c) => ({
      name: c.label,
      posts: c.count,
      url: `https://www.reddit.com/r/${encodeURIComponent(c.label)}/`,
    })),
    kinds,
  };
}

/** Registrable-ish host: lowercase, no scheme, no www, no path. */
export function hostOf(urlOrDomain: string | null | undefined): string | null {
  if (!urlOrDomain) return null;
  let v = urlOrDomain.trim().toLowerCase();
  if (!v) return null;
  try {
    if (/^https?:\/\//.test(v)) v = new URL(v).hostname;
  } catch {
    return null;
  }
  v = v.replace(/^www\./, "").replace(/\/.*$/, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(v) ? v : null;
}

/**
 * True when an app-store developer website belongs to the competitor (same host, or one is a
 * subdomain of the other), so a same-named app from another company is never attributed to it.
 */
export function listingBelongsTo(listingWebsite: string | null | undefined, competitorDomain: string | null | undefined): boolean {
  const a = hostOf(listingWebsite);
  const b = hostOf(competitorDomain);
  if (!a || !b) return false;
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

const nameTokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 1 && !["inc", "llc", "ltd", "the", "app", "software", "corp", "co", "gmbh"].includes(t));

/** G2 product pages are matched by name: every significant word of the competitor name must appear in the slug or title. */
export function g2Matches(competitor: string, slug: string, title: string): boolean {
  const tokens = nameTokens(competitor);
  if (!tokens.length) return false;
  const hay = `${slug.replace(/-/g, " ")} ${title}`.toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

export type ListingUrl =
  | { platform: "g2"; slug: string; url: string }
  | { platform: "google_play"; id: string; url: string }
  | { platform: "app_store"; id: string; url: string };

/** Recognises G2 product, Google Play and App Store listing URLs and canonicalises them. */
export function classifyListingUrl(raw: string): ListingUrl | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  if (host === "g2.com") {
    const m = u.pathname.match(/^\/products\/([a-z0-9-]+)(?:\/|$)/i);
    if (m?.[1]) return { platform: "g2", slug: m[1].toLowerCase(), url: `https://www.g2.com/products/${m[1].toLowerCase()}/reviews` };
  }
  if (host === "play.google.com" && u.pathname.startsWith("/store/apps/details")) {
    const id = u.searchParams.get("id");
    if (id && /^[\w.]+$/.test(id)) return { platform: "google_play", id, url: `https://play.google.com/store/apps/details?id=${id}&hl=en_US` };
  }
  if (host === "apps.apple.com") {
    const m = u.pathname.match(/\/id(\d{5,})/);
    if (m?.[1]) {
      const country = u.pathname.match(/^\/([a-z]{2})\//)?.[1] ?? "us";
      return { platform: "app_store", id: m[1], url: `https://apps.apple.com/${country}/app/id${m[1]}` };
    }
  }
  return null;
}

/** Reads channel, views and duration from Context.dev's YouTube Markdown document. */
export function parseYouTubeMarkdown(md: string): { title: string | null; channel: string | null; views: number | null; duration: string | null } {
  const field = (name: string) => md.match(new RegExp(`\\*\\*${name}\\*\\*:\\s*([^\\n]+)`, "i"))?.[1]?.trim() ?? null;
  const viewsRaw = field("Views");
  const digits = viewsRaw?.replace(/[^\d]/g, "") ?? "";
  return {
    title: md.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? null,
    channel: field("Channel"),
    views: digits ? Number(digits) : null,
    duration: field("Duration"),
  };
}

const normUrl = (u: string) => {
  try {
    const x = new URL(u);
    return `${x.hostname.replace(/^www\./, "")}${x.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return u.trim().toLowerCase();
  }
};

/** Keeps research-assistant items only when their source URL is one of the pages it actually read. */
export function keepSourced<T extends { source_url?: string | null }>(items: T[] | null | undefined, sources: string[]): (T & { source_url: string })[] {
  const read = new Set(sources.map(normUrl));
  return (items ?? []).filter((i): i is T & { source_url: string } => typeof i.source_url === "string" && /^https?:\/\//.test(i.source_url) && read.has(normUrl(i.source_url)));
}

export interface PriceRange {
  currency: string;
  period: "month" | "year";
  min: number;
  max: number;
  plans: number;
}

export interface PriceSummary {
  checked: number;
  published: number;
  quote_only: number;
  not_found: number;
  free_plans: number;
  free_trials: number;
  /** Lowest to highest printed paid price for the most common currency and billing period. */
  range: PriceRange | null;
}

/** Summarises printed competitor prices; free (0) plans are counted separately, never as a price. */
export function priceSummary(rows: CompetitorPricing[]): PriceSummary {
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    if (r.status !== "published") continue;
    for (const p of r.plans) {
      if (typeof p.price !== "number" || !Number.isFinite(p.price) || p.price <= 0) continue;
      if (!p.currency || (p.period !== "month" && p.period !== "year")) continue;
      const key = `${p.currency.toUpperCase()}|${p.period}`;
      groups.set(key, [...(groups.get(key) ?? []), p.price]);
    }
  }
  let best: PriceRange | null = null;
  for (const [key, prices] of groups) {
    const [currency, period] = key.split("|") as [string, "month" | "year"];
    const cand: PriceRange = { currency, period, min: Math.min(...prices), max: Math.max(...prices), plans: prices.length };
    if (!best || cand.plans > best.plans || (cand.plans === best.plans && cand.period === "month" && best.period !== "month")) best = cand;
  }
  return {
    checked: rows.length,
    published: rows.filter((r) => r.status === "published").length,
    quote_only: rows.filter((r) => r.status === "quote_only").length,
    not_found: rows.filter((r) => r.status === "not_found").length,
    free_plans: rows.filter((r) => r.has_free_plan === true || r.plans.some((p) => p.price === 0)).length,
    free_trials: rows.filter((r) => r.has_free_trial === true).length,
    range: best,
  };
}

/** Classifies a mapped pricing URL: a real price page, a contact-sales page, or nothing useful. */
export function pricingUrlKind(url: string, title: string | null): "price_page" | "quote_page" | null {
  const t = `${url} ${title ?? ""}`.toLowerCase();
  if (/(request|get|contact)[-_ ]?(a[-_ ])?(pricing|quote)|contact[-_ ]sales|\/quote\b|demo/.test(t)) return "quote_page";
  if (/\/(pricing|plans|prices|price)(\/|$|\?|#|\.)|pricing|plans/.test(t)) return "price_page";
  return null;
}

export interface FundingSummary {
  companies: number;
  with_funding: number;
  total_usd: number;
  recent_rounds: number;
  new_entrants: number;
}

/** Counts funding facts from company data: rounds in the last 24 months and companies founded in the last 3 years. */
export function fundingSummary(companies: Pick<FundedCompany, "total_usd" | "latest_round" | "founded_year" | "stage">[], now: Date): FundingSummary {
  const cutoff = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
  const year = now.getUTCFullYear();
  const funded = (c: (typeof companies)[number]) =>
    (c.total_usd ?? 0) > 0 || Boolean(c.latest_round) || ["pre_seed", "seed", "series_a", "series_b", "series_c", "series_d", "series_e", "growth", "late_stage"].includes(c.stage ?? "");
  return {
    companies: companies.length,
    with_funding: companies.filter(funded).length,
    total_usd: companies.reduce((n, c) => n + Math.max(0, c.total_usd ?? 0), 0),
    recent_rounds: companies.filter((c) => c.latest_round?.date && new Date(c.latest_round.date) >= cutoff).length,
    new_entrants: companies.filter((c) => typeof c.founded_year === "number" && c.founded_year >= year - 3).length,
  };
}

export function teamLabel(e: { count: number | null; min: number | null; max: number | null } | null | undefined): string | null {
  if (!e) return null;
  if (typeof e.count === "number" && e.count > 0) return `${e.count} people`;
  if (typeof e.min === "number" && typeof e.max === "number" && e.max > 0) return e.min === e.max ? `${e.min} people` : `${e.min}-${e.max} people`;
  return null;
}

/** Google Maps result links arrive wrapped as /url?q=…; unwrap to the business website. */
export function unwrapMapsWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (/^https?:\/\//.test(raw)) return raw;
  const m = raw.match(/[?&]q=([^&]+)/);
  if (!m?.[1]) return null;
  try {
    const u = decodeURIComponent(m[1]);
    return /^https?:\/\//.test(u) ? u : null;
  } catch {
    return null;
  }
}

/** Compact money label for counted funding, e.g. 4323696 → "$4.3M". */
export function formatUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

/** Compact count, e.g. 156295 → "156K". */
export function formatCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e4) return `${Math.round(n / 1e3)}K`;
  return n.toLocaleString("en-US");
}

const CURRENCY_SIGN: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹" };

export function formatPrice(amount: number, currency: string | null): string {
  const c = (currency ?? "").toUpperCase();
  const v = amount % 1 === 0 ? amount.toLocaleString("en-US") : amount.toFixed(2);
  return CURRENCY_SIGN[c] ? `${CURRENCY_SIGN[c]}${v}` : `${v} ${c}`.trim();
}

const normNum = (raw: string): string => {
  let t = raw.trim().replace(/[.,\s]+$/, "");
  if (/^\d{1,3}([,\s.]\d{3})+$/.test(t)) t = t.replace(/[,\s.]/g, "");
  else t = t.replace(/\s/g, "").replace(/,(\d{1,2})$/, ".$1").replace(/,/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? String(n) : t;
};

/** Numbers written in a text, normalised so "4,300", "4 300" and "4300" compare equal. */
export function numbersIn(text: string): string[] {
  return (text.match(/\d[\d,.\s]*\d|\d/g) ?? []).map(normNum).filter(Boolean);
}

/**
 * True when a reported figure can be confirmed on the page it cites: its quote appears verbatim, or
 * every number in the figure appears in the page text.
 */
export function figureOnPage(value: string, quote: string | null, page: string): boolean {
  if (quote && verbatimQuote(quote, page, 400)) return true;
  const wanted = numbersIn(value).filter((n) => n !== "0");
  if (!wanted.length) return false;
  const have = new Set(numbersIn(page));
  return wanted.every((n) => have.has(n));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats partial dates as written: "2026-09-01" → "1 Sep 2026", "2026-09" → "Sep 2026", "2026" → "2026". */
export function formatLooseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const month = MONTHS[Number(m[2]) - 1];
    return month ? `${Number(m[3])} ${month} ${m[1]}` : t;
  }
  m = t.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const month = MONTHS[Number(m[2]) - 1];
    return month ? `${month} ${m[1]}` : t;
  }
  return t;
}

export const PLATFORM_LABEL: Record<ReviewPlatform, string> = { g2: "G2", google_play: "Google Play", app_store: "App Store" };

export const VOICE_KIND_LABEL: Record<VoiceKind, string> = {
  complaint: "Describes the pain",
  request: "Asks for a solution",
  workaround: "Uses a workaround",
  willingness_to_pay: "Would pay",
};

export const PERIOD_LABEL: Record<string, string> = { month: "month", year: "year", one_time: "one-time", usage: "usage" };
