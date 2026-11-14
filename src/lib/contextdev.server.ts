// Context.dev REST client (fetch-based, Worker-safe). Server-only.
// Docs: https://docs.context.dev — search, news, answers.
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
  opts: { timeoutMs?: number; onWait?: WaitReporter } = {},
): Promise<{ data: T; meta: CallMeta }> {
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
      const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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
  freshness?: "last_24_hours" | "last_week" | "last_month" | "last_year";
  excludeDomains?: string[];
  highlightChars?: number;
  onWait?: WaitReporter;
}): Promise<{ results: WebResult[]; meta: CallMeta }> {
  const body: Record<string, unknown> = {
    query: opts.query.slice(0, 480),
    numResults: opts.numResults ?? 8,
    highlightsOptions: { enabled: true, maxCharacters: opts.highlightChars ?? 1200 },
    timeoutOpts: { milliseconds: 30_000, behavior: "return-partial" },
  };
  if (opts.freshness) body.freshness = opts.freshness;
  if (opts.excludeDomains?.length) body.excludeDomains = opts.excludeDomains;

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
  onWait?: WaitReporter;
}): Promise<{ articles: NewsArticle[]; meta: CallMeta }> {
  const body: Record<string, unknown> = {
    searchBy: { type: "natural_language", query: opts.query.slice(0, 900) },
    limit: opts.limit ?? 10,
  };
  if (opts.fromMs) body.filterBy = { date: { from: Math.floor(opts.fromMs) } };

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
