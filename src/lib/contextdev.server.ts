// Context.dev REST client (fetch-based, Worker-safe). Server-only.
// Docs: https://docs.context.dev - search, news, answers.
// Requests pass a shared database rate gate so concurrent research runs stay under the
// organization's per-minute limit (CONTEXT_DEV_RPM, default 10), and 429s are retried
// after the server-provided delay.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE_URL = "https://api.context.dev/v1";
const MAX_GATE_WAIT_MS = 110_000;

export type WaitReporter = (waitMs: number) => void | Promise<void>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function reserveSlot(onWait?: WaitReporter, maxWaitMs = MAX_GATE_WAIT_MS): Promise<void> {
  const rpm = Math.max(1, Number(process.env["CONTEXT_DEV_RPM"] ?? 10) - 1);
  const started = Date.now();
  for (;;) {
    const { data, error } = await supabaseAdmin.rpc("reserve_rate_slot", {
      p_provider: "context.dev",
      p_limit: rpm,
      p_window_ms: 61_000,
    });
    if (error) {
      console.error("[context.dev] rate gate unavailable", error);
      return; // fail open: Context.dev still enforces its own limit (handled via 429 retry)
    }
    const wait = Number(data ?? 0);
    if (wait <= 0) return;
    if (Date.now() - started + wait > maxWaitMs) {
      if (maxWaitMs < MAX_GATE_WAIT_MS) throw new ContextDevBusy();
      throw new ContextDevError("Rate gate wait budget exceeded", 429, friendlyMessage(429));
    }
    await onWait?.(wait);
    await sleep(Math.min(wait + Math.random() * 400, 20_000));
  }
}

function retryDelayMs(res: Response, body: string): number {
  const header = Number(res.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return header * 1000;
  const m = body.match(/Retry in (\d+) seconds?/i);
  if (m) return Number(m[1]) * 1000;
  return 15_000;
}

export class ContextDevError extends Error {
  status: number;
  userMessage: string;
  constructor(message: string, status: number, userMessage: string) {
    super(message);
    this.name = "ContextDevError";
    this.status = status;
    this.userMessage = userMessage;
  }
}

/**
 * Thrown by background requests (demand checks) instead of waiting for a busy rate gate, so
 * cached background work always yields to paid research runs. The caller retries later.
 */
export class ContextDevBusy extends ContextDevError {
  constructor() {
    super("Context.dev capacity is busy; background request yielded", 429, friendlyMessage(429));
    this.name = "ContextDevBusy";
  }
}

const BACKGROUND_GATE_WAIT_MS = 25_000;

function friendlyMessage(status: number): string {
  if (status === 401 || status === 403) return "Context.dev rejected the API key. Check the key in project secrets.";
  if (status === 402) return "The Context.dev account is out of credits.";
  if (status === 429) return "Live research capacity is busy (Context.dev rate limit). Retry in a minute.";
  if (status === 408 || status === 504) return "Context.dev research timed out. Retry with a narrower topic.";
  if (status === 400 || status === 422) return "Context.dev could not process this research request.";
  return "Context.dev is temporarily unavailable. Retry in a moment.";
}

export interface CallMeta {
  creditsUsed: number;
  cacheStatus: string | null;
}

async function call<T>(
  path: string,
  body: unknown,
  opts: {
    timeoutMs?: number | undefined;
    onWait?: WaitReporter | undefined;
    method?: "GET" | "POST" | "DELETE";
    /** Yield (throw ContextDevBusy) instead of waiting long for the shared rate gate. */
    background?: boolean | undefined;
    /** Management endpoints (watchers) have their own limits and skip the research rate gate. */
    ungated?: boolean;
  } = {},
): Promise<{ data: T; meta: CallMeta }> {
  const isGet = opts.method === "GET";
  const isDelete = opts.method === "DELETE";
  const hasQuery = isGet || isDelete;
  const timeoutMs = opts.timeoutMs ?? 45_000;
  const apiKey = process.env["CONTEXT_DEV_API_KEY"];
  if (!apiKey) {
    throw new ContextDevError("CONTEXT_DEV_API_KEY missing", 500, "Live research is not configured yet (missing Context.dev key).");
  }

  let lastError: ContextDevError | null = null;
  let rateRetries = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (!opts.ungated) await reserveSlot(opts.onWait, opts.background ? BACKGROUND_GATE_WAIT_MS : MAX_GATE_WAIT_MS);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const qs = hasQuery && body ? new URLSearchParams(body as Record<string, string>).toString() : "";
      const url = qs ? `${BASE_URL}${path}?${qs}` : `${BASE_URL}${path}`;
      const res = await fetch(url, {
        method: opts.method ?? "POST",
        headers: hasQuery
          ? { Authorization: `Bearer ${apiKey}` }
          : { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        ...(hasQuery ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`[context.dev] ${path} -> ${res.status}: ${text.slice(0, 400)}`);
        lastError = new ContextDevError(`Context.dev ${path} failed: ${res.status}`, res.status, friendlyMessage(res.status));
        if (res.status === 429 && opts.background) throw new ContextDevBusy();
        if (res.status === 429 && rateRetries < 2) {
          rateRetries++;
          const wait = Math.min(retryDelayMs(res, text) + 500 + Math.random() * 1500, 62_000);
          await opts.onWait?.(wait);
          await sleep(wait);
          continue;
        }
        if ([500, 502, 503].includes(res.status) && attempt === 0) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        throw lastError;
      }
      const json = (await res.json()) as T & {
        key_metadata?: { credits_consumed?: number };
        cache_metadata?: { status?: string };
      };
      return {
        data: json,
        meta: {
          creditsUsed: Number(json.key_metadata?.credits_consumed ?? 0),
          cacheStatus: json.cache_metadata?.status ?? null,
        },
      };
    } catch (err) {
      if (err instanceof ContextDevError) throw err;
      const aborted = err instanceof Error && err.name === "AbortError";
      console.error(`[context.dev] ${path} network error`, err);
      lastError = new ContextDevError(
        aborted ? "Context.dev request timed out" : "Context.dev network error",
        aborted ? 408 : 503,
        aborted ? friendlyMessage(408) : friendlyMessage(503),
      );
      if (!aborted && attempt === 0) continue;
      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new ContextDevError("Context.dev failed", 500, friendlyMessage(500));
}

export interface WebResult {
  url: string;
  title: string;
  description: string;
  relevance: string | null;
  highlights: string[];
}

export async function webSearch(opts: {
  query: string;
  numResults?: number;
  freshness?: "last_24_hours" | "last_week" | "last_month" | "last_year" | undefined;
  excludeDomains?: string[];
  highlightChars?: number;
  onWait?: WaitReporter | undefined;
  /** Skip highlight extraction (cheaper) when only titles and URLs are needed. */
  noHighlights?: boolean | undefined;
  background?: boolean | undefined;
}): Promise<{ results: WebResult[]; meta: CallMeta }> {
  const body: Record<string, unknown> = {
    query: opts.query.slice(0, 480),
    numResults: opts.numResults ?? 8,
    ...(opts.noHighlights ? {} : { highlightsOptions: { enabled: true, maxCharacters: opts.highlightChars ?? 1200 } }),
    timeoutOpts: { milliseconds: 30_000, behavior: "return-partial" },
  };
  if (opts.freshness) body["freshness"] = opts.freshness;
  if (opts.excludeDomains?.length) body["excludeDomains"] = opts.excludeDomains;

  const { data, meta } = await call<{
    results?: Array<{
      url: string;
      title?: string;
      description?: string;
      relevance?: string;
      highlights?: { highlights?: string[]; code?: string };
    }>;
  }>("/web/search", body, { onWait: opts.onWait, background: opts.background });

  const results: WebResult[] = (data.results ?? [])
    .filter((r) => typeof r.url === "string" && r.url.startsWith("http"))
    .map((r) => ({
      url: r.url,
      title: (r.title ?? r.url).trim(),
      description: (r.description ?? "").trim(),
      relevance: r.relevance ?? null,
      highlights:
        r.highlights?.code === "SUCCESS" && Array.isArray(r.highlights.highlights)
          ? r.highlights.highlights.filter((h) => typeof h === "string" && h.trim().length > 0)
          : [],
    }));
  return { results, meta };
}

export interface NewsArticle {
  id: string;
  storyId: string | null;
  url: string;
  title: string;
  description: string;
  publishedAt: string | null;
  type: string | null;
  sourceName: string | null;
  sourceDomain: string | null;
}

export async function newsSearch(opts: {
  query: string;
  limit?: number;
  fromMs?: number;
  onWait?: WaitReporter | undefined;
}): Promise<{ articles: NewsArticle[]; meta: CallMeta }> {
  const body: Record<string, unknown> = {
    searchBy: { type: "natural_language", query: opts.query.slice(0, 900) },
    limit: opts.limit ?? 10,
  };
  if (opts.fromMs) body["filterBy"] = { date: { from: Math.floor(opts.fromMs) } };

  const { data, meta } = await call<{
    data?: Array<{
      id: string;
      story_id?: string | null;
      url: string;
      title?: string;
      description?: string;
      published_at?: string | null;
      type?: string | null;
      source?: { name?: string | null; domain?: string | null };
    }>;
  }>("/news/search", body, { onWait: opts.onWait });

  const seenStories = new Set<string>();
  const articles: NewsArticle[] = [];
  for (const a of data.data ?? []) {
    if (!a.url) continue;
    if (a.story_id) {
      if (seenStories.has(a.story_id)) continue;
      seenStories.add(a.story_id);
    }
    articles.push({
      id: a.id,
      storyId: a.story_id ?? null,
      url: a.url,
      title: (a.title ?? a.url).trim(),
      description: (a.description ?? "").trim(),
      publishedAt: a.published_at ?? null,
      type: a.type ?? null,
      sourceName: a.source?.name ?? null,
      sourceDomain: a.source?.domain ?? null,
    });
  }
  return { articles, meta };
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export interface BrandInfo {
  domain: string;
  title: string | null;
  description: string | null;
  slogan: string | null;
  logoUrl: string | null;
  iconUrl: string | null;
  colors: { hex: string; name: string | null }[];
  employees: string | null;
  hqCountry: string | null;
  /** Context.dev industry classification (EIC top-level industries). */
  industries: string[];
}

type RawLogo = { url?: string; type?: "icon" | "logo"; mode?: "light" | "dark" | "has_opaque_background" };

/** Pick a logo that reads well on the app's dark surfaces: prefer dark-mode or opaque marks. */
function pickLogo(logos: RawLogo[], type: "icon" | "logo"): string | null {
  const ofType = logos.filter((l) => l.type === type && typeof l.url === "string" && l.url.startsWith("http"));
  const rank = (l: RawLogo) => (l.mode === "dark" ? 0 : l.mode === "has_opaque_background" ? 1 : 2);
  return ofType.sort((a, b) => rank(a) - rank(b))[0]?.url ?? null;
}

/**
 * Brand lookup by domain (logos, colors, description). Returns null when Context.dev has no
 * brand for the domain; throws ContextDevError for transport, credit or rate problems.
 */
export async function brandRetrieve(
  target: { domain: string } | { name: string },
  opts: { onWait?: WaitReporter } = {},
): Promise<{ brand: BrandInfo | null; meta: CallMeta }> {
  const request =
    "domain" in target
      ? { type: "by_domain", domain: target.domain }
      : { type: "by_name", name: target.name.slice(0, 120) };
  try {
    const { data, meta } = await call<{
      brand?: {
        title?: string;
        description?: string;
        slogan?: string;
        domain?: string;
        logos?: RawLogo[];
        colors?: { hex?: string; name?: string }[];
        employees?: { range?: string; exact?: number };
        address?: { country?: string };
        industries?: { eic?: { industry?: string }[] };
      };
    }>(
      "/brand/retrieve",
      { ...request, maxSpeed: true, maxAgeMs: 30 * 24 * 60 * 60 * 1000, timeoutOpts: { milliseconds: 20_000 } },
      { timeoutMs: 30_000, onWait: opts.onWait },
    );
    const b = data.brand;
    if (!b || (!b.title && !b.logos?.length)) return { brand: null, meta };
    const logos = b.logos ?? [];
    const domain = (b.domain ?? ("domain" in target ? target.domain : "")).toLowerCase().replace(/^www\./, "");
    if (!domain) return { brand: null, meta };
    return {
      brand: {
        domain,
        title: b.title?.trim() || null,
        description: b.description?.trim() || null,
        slogan: b.slogan?.trim() || null,
        logoUrl: pickLogo(logos, "logo"),
        iconUrl: pickLogo(logos, "icon"),
        colors: (b.colors ?? [])
          .filter((c): c is { hex: string; name?: string } => typeof c.hex === "string" && /^#[0-9a-f]{3,8}$/i.test(c.hex))
          .slice(0, 5)
          .map((c) => ({ hex: c.hex, name: c.name ?? null })),
        employees: b.employees?.range ?? (b.employees?.exact ? String(b.employees.exact) : null),
        hqCountry: b.address?.country ?? null,
        industries: [...new Set((b.industries?.eic ?? []).map((e) => e.industry).filter((x): x is string => !!x))],
      },
      meta,
    };
  } catch (err) {
    if (err instanceof ContextDevError && [400, 404, 422].includes(err.status)) {
      return { brand: null, meta: { creditsUsed: 0, cacheStatus: null } };
    }
    throw err;
  }
}

export interface BrandCandidate {
  domain: string;
  name: string;
  description: string | null;
}

/** Brand directory search by company name (cheap); candidates still need verification. */
export async function brandSearch(name: string, opts: { onWait?: WaitReporter } = {}): Promise<BrandCandidate[]> {
  const { data } = await call<{ results?: { domain?: string; name?: string; description?: string }[] }>(
    "/brand/search",
    { query: name.slice(0, 100), queryBy: "name", autocomplete: "false" },
    { method: "GET", timeoutMs: 20_000, onWait: opts.onWait },
  );
  return (data.results ?? [])
    .filter((r): r is { domain: string; name: string; description?: string } => typeof r.domain === "string" && typeof r.name === "string")
    .map((r) => ({ domain: r.domain.toLowerCase().replace(/^www\./, ""), name: r.name, description: r.description ?? null }));
}

// ---------------------------------------------------------------------------
// Demand checks: page readers, company data, sourced answers (background requests)
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
type BgOpts = { background?: boolean | undefined; timeoutMs?: number | undefined };

interface ScrapeEnvelope {
  parsed?: { success?: boolean | null; data?: unknown; message?: unknown };
  json?: { success?: boolean | null; data?: unknown };
  markdown?: { success?: boolean | null; data?: string | null };
  metadata?: { publishedTime?: string | null; title?: string | null } | null;
}

/** Runs a Context.dev prebuilt parser (Reddit, G2, app stores, Google Maps). Null when the page could not be parsed. */
export async function scrapeParsed<T>(
  url: string,
  parser: string,
  extra: { limit?: number; sort?: string } = {},
  opts: BgOpts = {},
): Promise<{ data: T | null; meta: CallMeta }> {
  const parseParams: Record<string, unknown> = { type: "prebuilt", parser };
  if (extra.limit) parseParams["limit"] = extra.limit;
  if (extra.sort) parseParams["sort"] = extra.sort;
  try {
    const { data, meta } = await call<ScrapeEnvelope>(
      "/web/scrape",
      { url, formats: { parse: true }, parseParams, maxAgeMs: 3 * DAY_MS, timeoutOpts: { milliseconds: 40_000, behavior: "return-partial" } },
      { timeoutMs: opts.timeoutMs ?? 50_000, background: opts.background },
    );
    return { data: data.parsed?.success ? ((data.parsed.data as T) ?? null) : null, meta };
  } catch (err) {
    if (err instanceof ContextDevError && [400, 404, 422].includes(err.status)) return { data: null, meta: { creditsUsed: 0, cacheStatus: null } };
    throw err;
  }
}

/** Extracts page facts into a JSON Schema shape (5 credits). Null when extraction failed. */
export async function scrapeJson<T>(
  url: string,
  schema: Record<string, unknown>,
  instructions: string,
  opts: BgOpts = {},
): Promise<{ data: T | null; meta: CallMeta }> {
  try {
    const { data, meta } = await call<ScrapeEnvelope>(
      "/web/scrape",
      { url, formats: { json: true }, jsonParams: { schema, instructions }, maxAgeMs: 3 * DAY_MS, timeoutOpts: { milliseconds: 40_000, behavior: "return-partial" } },
      { timeoutMs: opts.timeoutMs ?? 50_000, background: opts.background },
    );
    return { data: data.json?.success ? ((data.json.data as T) ?? null) : null, meta };
  } catch (err) {
    if (err instanceof ContextDevError && [400, 404, 422].includes(err.status)) return { data: null, meta: { creditsUsed: 0, cacheStatus: null } };
    throw err;
  }
}

/** Reads a page as Markdown plus its metadata (used for YouTube video facts). */
export async function scrapeMarkdown(
  url: string,
  opts: BgOpts = {},
): Promise<{ markdown: string | null; publishedTime: string | null; meta: CallMeta }> {
  try {
    const { data, meta } = await call<ScrapeEnvelope>(
      "/web/scrape",
      { url, formats: { markdown: true }, maxAgeMs: 3 * DAY_MS, timeoutOpts: { milliseconds: 30_000, behavior: "return-partial" } },
      { timeoutMs: opts.timeoutMs ?? 40_000, background: opts.background },
    );
    return {
      markdown: data.markdown?.success ? (data.markdown.data ?? null) : null,
      publishedTime: data.metadata?.publishedTime ?? null,
      meta,
    };
  } catch (err) {
    if (err instanceof ContextDevError && [400, 404, 422].includes(err.status)) return { markdown: null, publishedTime: null, meta: { creditsUsed: 0, cacheStatus: null } };
    throw err;
  }
}

export interface MappedUrl {
  url: string;
  title: string | null;
  description: string | null;
}

/** Lists a site's URLs most relevant to a topic (2 credits with search). */
export async function mapUrls(domain: string, search: string, opts: BgOpts & { maxLinks?: number } = {}): Promise<{ urls: MappedUrl[]; meta: CallMeta }> {
  try {
    const { data, meta } = await call<{ urls?: { url?: string; title?: string | null; description?: string | null }[] }>(
      "/web/urls",
      { domain, search, maxLinks: String(opts.maxLinks ?? 6) },
      { method: "GET", timeoutMs: opts.timeoutMs ?? 40_000, background: opts.background },
    );
    return {
      urls: (data.urls ?? [])
        .filter((u): u is { url: string; title?: string | null; description?: string | null } => typeof u.url === "string" && u.url.startsWith("http"))
        .map((u) => ({ url: u.url, title: u.title ?? null, description: u.description ?? null })),
      meta,
    };
  } catch (err) {
    if (err instanceof ContextDevError && [400, 404, 422].includes(err.status)) return { urls: [], meta: { creditsUsed: 0, cacheStatus: null } };
    throw err;
  }
}

export interface CompanyRecord {
  name: string;
  domain: string;
  description: string | null;
  founded_year: number | null;
  employees: { count: number | null; min: number | null; max: number | null } | null;
  hq_country: string | null;
  operating_status: string | null;
  funding: {
    total_usd: number | null;
    round_count: number;
    stage: string | null;
    latest_round: { type: string | null; date: string | null; amount_usd: number | null } | null;
  };
  crunchbase: string | null;
  linkedin: string | null;
}

/** Company directory search with headcount, founding year and funding (2 credits per page). */
export async function companySearch(query: string, opts: BgOpts = {}): Promise<{ companies: CompanyRecord[]; meta: CallMeta }> {
  type Raw = {
    name?: string;
    domain?: string;
    description?: string | null;
    founded_year?: number | null;
    operating_status?: string | null;
    employees?: { count?: number | null; min?: number | null; max?: number | null } | null;
    headquarters?: { country_code?: string | null } | null;
    socials?: { crunchbase?: string | null; linkedin?: string | null } | null;
    funding?: {
      total_usd?: number | null;
      round_count?: number | null;
      stage?: string | null;
      latest_round?: { type?: string | null; date?: string | null; amount_usd?: number | null } | null;
    } | null;
  };
  try {
    const { data, meta } = await call<{ results?: Raw[] }>("/company/search", { query: query.slice(0, 480) }, { timeoutMs: opts.timeoutMs ?? 45_000, background: opts.background });
    const companies: CompanyRecord[] = (data.results ?? [])
      .filter((c): c is Raw & { name: string; domain: string } => typeof c.name === "string" && typeof c.domain === "string")
      .map((c) => ({
        name: c.name,
        domain: c.domain.toLowerCase().replace(/^www\./, ""),
        description: c.description ?? null,
        founded_year: typeof c.founded_year === "number" ? c.founded_year : null,
        employees: c.employees ? { count: c.employees.count ?? null, min: c.employees.min ?? null, max: c.employees.max ?? null } : null,
        hq_country: c.headquarters?.country_code ?? null,
        operating_status: c.operating_status ?? null,
        funding: {
          total_usd: typeof c.funding?.total_usd === "number" ? c.funding.total_usd : null,
          round_count: Number(c.funding?.round_count ?? 0),
          stage: c.funding?.stage ?? null,
          latest_round: c.funding?.latest_round
            ? { type: c.funding.latest_round.type ?? null, date: c.funding.latest_round.date ?? null, amount_usd: c.funding.latest_round.amount_usd ?? null }
            : null,
        },
        crunchbase: c.socials?.crunchbase ?? null,
        linkedin: c.socials?.linkedin ?? null,
      }));
    return { companies, meta };
  } catch (err) {
    if (err instanceof ContextDevError && [400, 404, 422].includes(err.status)) return { companies: [], meta: { creditsUsed: 0, cacheStatus: null } };
    throw err;
  }
}

/** News search restricted to article types such as press releases. */
export async function newsByType(opts: {
  query: string;
  types: ("editorial" | "press_release" | "regulatory_filing" | "advisory")[];
  fromMs?: number;
  limit?: number;
  background?: boolean;
}): Promise<{ articles: NewsArticle[]; meta: CallMeta }> {
  const filterBy: Record<string, unknown> = { articleType: opts.types };
  if (opts.fromMs) filterBy["date"] = { from: Math.floor(opts.fromMs) };
  const { data, meta } = await call<{
    data?: Array<{ id: string; story_id?: string | null; url: string; title?: string; description?: string; published_at?: string | null; type?: string | null; source?: { name?: string | null; domain?: string | null } }>;
  }>("/news/search", { searchBy: { type: "natural_language", query: opts.query.slice(0, 900) }, filterBy, limit: opts.limit ?? 12 }, { background: opts.background });
  const seen = new Set<string>();
  const articles: NewsArticle[] = [];
  for (const a of data.data ?? []) {
    if (!a.url) continue;
    const key = a.story_id ?? a.title ?? a.url;
    if (seen.has(key)) continue;
    seen.add(key);
    articles.push({
      id: a.id,
      storyId: a.story_id ?? null,
      url: a.url,
      title: (a.title ?? a.url).trim(),
      description: (a.description ?? "").trim(),
      publishedAt: a.published_at ?? null,
      type: a.type ?? null,
      sourceName: a.source?.name ?? null,
      sourceDomain: a.source?.domain ?? null,
    });
  }
  return { articles, meta };
}

/** Context.dev research assistant: a sourced answer in the given example shape (10 credits in fast mode). */
export async function answerTask<T>(task: string, example: Record<string, unknown>, opts: BgOpts = {}): Promise<{ answer: T | null; sources: string[]; partial: boolean; meta: CallMeta }> {
  const { data, meta } = await call<{ json_content?: T | null; sources?: string[]; partial?: boolean }>(
    "/web/answers",
    { mode: "fast", task: task.slice(0, 1990), json_format: example, timeoutOpts: { milliseconds: 38_000, behavior: "return-partial" } },
    { timeoutMs: opts.timeoutMs ?? 48_000, background: opts.background },
  );
  return {
    answer: data.json_content ?? null,
    sources: (data.sources ?? []).filter((u) => typeof u === "string" && u.startsWith("http")),
    partial: Boolean(data.partial),
    meta,
  };
}

// ---------------------------------------------------------------------------
// Weekly web watch (Context.dev monitors). Management calls skip the research rate gate.
// ---------------------------------------------------------------------------

export interface MonitorInfo {
  id: string;
  status: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastError: string | null;
}

export interface MonitorChange {
  id: string;
  title: string;
  summary: string | null;
  url: string | null;
  importance: string | null;
  detectedAt: string;
  matched: { url: string; title: string | null; snippet: string | null }[];
}

function toMonitorInfo(m: { id?: string; status?: string; last_run_at?: string | null; next_run_at?: string | null; last_error?: unknown }): MonitorInfo {
  const err = m.last_error;
  return {
    id: String(m.id ?? ""),
    status: m.status ?? "unknown",
    lastRunAt: m.last_run_at ?? null,
    nextRunAt: m.next_run_at ?? null,
    lastError: typeof err === "string" ? err : err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : null,
  };
}

export async function monitorLimits(): Promise<{ used: number; limit: number }> {
  const { data } = await call<{ monitors_used?: number; monitors_limit?: number }>("/monitors/limits", null, { method: "GET", ungated: true, timeoutMs: 15_000 });
  return { used: Number(data.monitors_used ?? 0), limit: Number(data.monitors_limit ?? 0) };
}

export async function createMonitor(input: {
  name: string;
  target: { type: "search"; query: string; instructions: string } | { type: "page"; url: string; instructions: string };
  everyDays: number;
}): Promise<MonitorInfo> {
  const { data } = await call<{ id?: string; status?: string; last_run_at?: string | null; next_run_at?: string | null; last_error?: unknown }>(
    "/monitors",
    {
      name: input.name.slice(0, 120),
      target: input.target,
      change_detection: { type: "semantic", confidence_threshold: 0.75 },
      schedule: { type: "interval", frequency: input.everyDays, unit: "days" },
    },
    { ungated: true, timeoutMs: 20_000 },
  );
  if (!data.id) throw new ContextDevError("Monitor create returned no id", 502, friendlyMessage(502));
  return toMonitorInfo(data);
}

export async function getMonitor(id: string): Promise<MonitorInfo | null> {
  try {
    const { data } = await call<{ id?: string; status?: string; last_run_at?: string | null; next_run_at?: string | null; last_error?: unknown }>(
      `/monitors/${encodeURIComponent(id)}`,
      null,
      { method: "GET", ungated: true, timeoutMs: 15_000 },
    );
    return toMonitorInfo(data);
  } catch (err) {
    if (err instanceof ContextDevError && err.status === 404) return null;
    throw err;
  }
}

export async function deleteMonitor(id: string): Promise<void> {
  try {
    await call<unknown>(`/monitors/${encodeURIComponent(id)}`, null, { method: "DELETE", ungated: true, timeoutMs: 15_000 });
  } catch (err) {
    if (err instanceof ContextDevError && err.status === 404) return;
    throw err;
  }
}

export async function listMonitorChanges(id: string, sinceIso: string | null): Promise<MonitorChange[]> {
  type RawEvidence = { url?: string | null; after?: unknown };
  type RawChange = {
    id?: string;
    title?: string;
    summary?: string | null;
    url?: string | null;
    importance?: string | null;
    detected_at?: string;
    matched_urls?: string[] | null;
    evidence?: RawEvidence[] | null;
  };
  const params: Record<string, string> = { limit: "25" };
  if (sinceIso) params["since"] = sinceIso;
  const { data } = await call<{ data?: RawChange[] }>(`/monitors/${encodeURIComponent(id)}/changes`, params, { method: "GET", ungated: true, timeoutMs: 15_000 });
  const textOf = (v: unknown, key: string): string | null => {
    if (v && typeof v === "object" && key in v) {
      const x = (v as Record<string, unknown>)[key];
      return typeof x === "string" && x.trim() ? x.trim() : null;
    }
    return null;
  };
  return (data.data ?? [])
    .filter((c): c is RawChange & { id: string; title: string; detected_at: string } => typeof c.id === "string" && typeof c.title === "string" && typeof c.detected_at === "string")
    .map((c) => {
      const byUrl = new Map<string, { url: string; title: string | null; snippet: string | null }>();
      for (const e of c.evidence ?? []) {
        if (typeof e.url !== "string" || !e.url.startsWith("http")) continue;
        byUrl.set(e.url, { url: e.url, title: textOf(e.after, "title"), snippet: textOf(e.after, "snippet") ?? textOf(e.after, "description") });
      }
      for (const u of c.matched_urls ?? []) {
        if (typeof u === "string" && u.startsWith("http") && !byUrl.has(u)) byUrl.set(u, { url: u, title: null, snippet: null });
      }
      return {
        id: c.id,
        title: c.title.trim(),
        summary: c.summary?.trim() || null,
        url: c.url && c.url.startsWith("http") ? c.url : null,
        importance: c.importance ?? null,
        detectedAt: c.detected_at,
        matched: [...byUrl.values()].slice(0, 6),
      };
    });
}
