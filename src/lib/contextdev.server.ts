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

async function reserveSlot(onWait?: WaitReporter): Promise<void> {
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
    if (Date.now() - started + wait > MAX_GATE_WAIT_MS) {
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
  opts: { timeoutMs?: number; onWait?: WaitReporter | undefined; method?: "GET" | "POST" } = {},
): Promise<{ data: T; meta: CallMeta }> {
  const isGet = opts.method === "GET";
  const timeoutMs = opts.timeoutMs ?? 45_000;
  const apiKey = process.env["CONTEXT_DEV_API_KEY"];
  if (!apiKey) {
    throw new ContextDevError("CONTEXT_DEV_API_KEY missing", 500, "Live research is not configured yet (missing Context.dev key).");
  }

  let lastError: ContextDevError | null = null;
  let rateRetries = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    await reserveSlot(opts.onWait);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = isGet
        ? `${BASE_URL}${path}?${new URLSearchParams(body as Record<string, string>).toString()}`
        : `${BASE_URL}${path}`;
      const res = await fetch(url, {
        method: isGet ? "GET" : "POST",
        headers: isGet
          ? { Authorization: `Bearer ${apiKey}` }
          : { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        ...(isGet ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`[context.dev] ${path} -> ${res.status}: ${text.slice(0, 400)}`);
        lastError = new ContextDevError(`Context.dev ${path} failed: ${res.status}`, res.status, friendlyMessage(res.status));
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
}): Promise<{ results: WebResult[]; meta: CallMeta }> {
  const body: Record<string, unknown> = {
    query: opts.query.slice(0, 480),
    numResults: opts.numResults ?? 8,
    highlightsOptions: { enabled: true, maxCharacters: opts.highlightChars ?? 1200 },
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
  }>("/web/search", body, { onWait: opts.onWait });

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
