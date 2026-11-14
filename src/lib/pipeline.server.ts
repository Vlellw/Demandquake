// Demandquake research pipeline. Server-only.
// queued → plan → search (Context.dev web + news) → analyze (signals & clusters)
// → competitors (Context.dev) → generate startups (one per top cluster) → complete
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { webSearch, newsSearch, domainOf, ContextDevError } from "./contextdev.server";
import { generateJSON, AIError, s } from "./ai.server";
import { INDUSTRIES, GEOGRAPHIES, BUSINESS_MODELS } from "./taxonomy";
import {
  SIGNAL_TYPES,
  TIMELINE_CATEGORIES,
  DIMENSION_KEYS,
  GLYPHS,
  type ResearchPlan,
  type RunStats,
  type Signal,
  type SignalType,
  type Assessment,
  type Competitor,
  type TimelineEvent,
  type DimensionKey,
} from "./types";
import { computeEvidenceStrength, normalizeQueryKey, normalizeUrl, slugify, randomSuffix, cleanRefLabels } from "./research-utils";

const db = supabaseAdmin;
const STALE_MS = 4 * 60 * 1000;
export const MAX_STARTUPS_PER_RUN = 3;
const RUNS_PER_HOUR_LIMIT = 24;
const CACHE_HOURS = 12;

export class PipelineError extends Error {
  userMessage: string;
  constructor(userMessage: string) {
    super(userMessage);
    this.name = "PipelineError";
    this.userMessage = userMessage;
  }
}

export function userMessageOf(err: unknown): string {
  if (err instanceof ContextDevError || err instanceof AIError || err instanceof PipelineError) return err.userMessage;
  return "Something went wrong during research. Retry this step.";
}

type RunRow = {
  id: string;
  query: string;
  industry: string | null;
  geography: string | null;
  status: string;
  plan: Json;
  stats: Json;
  stage_started_at: string | null;
  created_at: string;
};

async function loadRun(runId: string): Promise<RunRow> {
  const { data, error } = await db
    .from("discovery_runs")
    .select("id, query, industry, geography, status, plan, stats, stage_started_at, created_at")
    .eq("id", runId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PipelineError("This research run no longer exists.");
  return data;
}

async function mergeStats(runId: string, patch: Partial<RunStats>) {
  const run = await loadRun(runId);
  const stats = { ...((run.stats as RunStats) ?? {}), ...patch };
  await db.from("discovery_runs").update({ stats: stats as Json }).eq("id", runId);
}

// ---------------------------------------------------------------------------
// Run creation (with caching + global rate limit)
// ---------------------------------------------------------------------------
export async function createRun(input: {
  query: string;
  industry: string | null;
  geography: string | null;
  force: boolean;
}): Promise<{ runId: string; reused: "cached" | "in_progress" | null }> {
  const key = normalizeQueryKey(input.query, input.industry, input.geography);
  const now = Date.now();

  if (!input.force) {
    const since = new Date(now - CACHE_HOURS * 3600_000).toISOString();
    const { data: recent } = await db
      .from("discovery_runs")
      .select("id, status, created_at, stage_started_at")
      .eq("query_key", key)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1);
    const hit = recent?.[0];
    if (hit) {
      if (hit.status === "complete") return { runId: hit.id, reused: "cached" };
      if (hit.status !== "failed" && now - new Date(hit.created_at).getTime() < 20 * 60_000) {
        return { runId: hit.id, reused: "in_progress" };
      }
    }
  }

  const hourAgo = new Date(now - 3600_000).toISOString();
  const { count } = await db
    .from("discovery_runs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= RUNS_PER_HOUR_LIMIT) {
    throw new PipelineError(
      "Demandquake has hit its hourly research limit to protect live-research credits. Explore existing opportunities and try again shortly.",
    );
  }

  const { data, error } = await db
    .from("discovery_runs")
    .insert({
      query: input.query.trim().slice(0, 300),
      query_key: key,
      industry: input.industry,
      geography: input.geography,
      status: "queued",
    })
    .select("id")
    .single();
  if (error) throw error;
  return { runId: data.id, reused: null };
}

// ---------------------------------------------------------------------------
// Stage machine
// ---------------------------------------------------------------------------
type Stage = { from: string; running: string; to: string; run: (run: RunRow) => Promise<void> };

const STAGES: Stage[] = [
  { from: "queued", running: "planning", to: "planned", run: stagePlan },
  { from: "planned", running: "searching", to: "searched", run: stageSearch },
  { from: "searched", running: "analyzing", to: "analyzed", run: stageAnalyze },
  { from: "analyzed", running: "investigating", to: "generating", run: stageCompetitors },
];

export type AdvanceResult = { progressed: boolean; busy: boolean; status: string };

export async function advanceRun(runId: string): Promise<AdvanceResult> {
  const run = await loadRun(runId);
  if (run.status === "complete" || run.status === "failed") {
    return { progressed: false, busy: false, status: run.status };
  }

  const stage = STAGES.find((st) => st.from === run.status || st.running === run.status);
  if (stage) {
    const staleIso = new Date(Date.now() - STALE_MS).toISOString();
    const { data: claimed } = await db
      .from("discovery_runs")
      .update({ status: stage.running, stage_started_at: new Date().toISOString(), error: null })
      .eq("id", runId)
      .or(`status.eq.${stage.from},and(status.eq.${stage.running},stage_started_at.lt.${staleIso})`)
      .select("id");
    if (!claimed || claimed.length === 0) return { progressed: false, busy: true, status: run.status };

    try {
      await stage.run(run);
      await db.from("discovery_runs").update({ status: stage.to, stage_started_at: null }).eq("id", runId);
      return { progressed: true, busy: false, status: stage.to };
    } catch (err) {
      console.error(`[pipeline] stage ${stage.running} failed for ${runId}`, err);
      await failRun(runId, stage.from, userMessageOf(err));
      return { progressed: true, busy: false, status: "failed" };
    }
  }

  if (run.status === "generating") {
    const cluster = await claimCluster(runId);
    if (!cluster) {
      const done = await maybeFinalize(runId);
      return { progressed: done, busy: !done, status: done ? "complete" : "generating" };
    }
    try {
      await generateStartup(run, cluster.id);
    } catch (err) {
      console.error(`[pipeline] startup generation failed for cluster ${cluster.id}`, err);
      await db
        .from("clusters")
        .update({ generation_status: "failed", generation_error: userMessageOf(err) })
        .eq("id", cluster.id);
    }
    await maybeFinalize(runId);
    return { progressed: true, busy: false, status: "generating" };
  }

  return { progressed: false, busy: false, status: run.status };
}

async function failRun(runId: string, failedStage: string, message: string) {
  const run = await loadRun(runId);
  const stats = { ...((run.stats as RunStats) ?? {}), failed_stage: failedStage };
  await db
    .from("discovery_runs")
    .update({ status: "failed", error: message, stage_started_at: null, stats: stats as Json })
    .eq("id", runId);
}

export async function retryRun(runId: string): Promise<void> {
  const run = await loadRun(runId);
  if (run.status !== "failed") return;
  const failed = ((run.stats as RunStats) ?? {}).failed_stage ?? "queued";
  if (failed === "generating") {
    await db
      .from("clusters")
      .update({ generation_status: "pending", generation_error: null })
      .eq("run_id", runId)
      .eq("generation_status", "failed");
  }
  await db.from("discovery_runs").update({ status: failed, error: null, stage_started_at: null }).eq("id", runId);
}

async function claimCluster(runId: string): Promise<{ id: string } | null> {
  const staleIso = new Date(Date.now() - STALE_MS * 1.5).toISOString();
  const { data: candidates } = await db
    .from("clusters")
    .select("id, generation_status, generation_started_at")
    .eq("run_id", runId)
    .in("generation_status", ["pending", "running"])
    .order("rank", { ascending: true });
  for (const c of candidates ?? []) {
    if (c.generation_status === "running" && c.generation_started_at && c.generation_started_at > staleIso) continue;
    const { data: claimed } = await db
      .from("clusters")
      .update({ generation_status: "running", generation_started_at: new Date().toISOString() })
      .eq("id", c.id)
      .eq("generation_status", c.generation_status)
      .select("id");
    if (claimed && claimed.length > 0) return { id: c.id };
  }
  return null;
}

async function maybeFinalize(runId: string): Promise<boolean> {
  const { data: clusters } = await db
    .from("clusters")
    .select("generation_status")
    .eq("run_id", runId)
    .in("generation_status", ["pending", "running", "done", "failed"]);
  const list = clusters ?? [];
  if (list.some((c) => c.generation_status === "pending" || c.generation_status === "running")) return false;
  const done = list.filter((c) => c.generation_status === "done").length;
  if (done === 0) {
    await failRun(runId, "generating", "The AI could not generate startups from this evidence. Retry generation.");
    return true;
  }
  await mergeStats(runId, { startups: done });
  await db
    .from("discovery_runs")
    .update({ status: "complete", completed_at: new Date().toISOString(), stage_started_at: null })
    .eq("id", runId)
    .eq("status", "generating");
  return true;
}

// ---------------------------------------------------------------------------
// Stage 1: research plan
// ---------------------------------------------------------------------------
const SEARCH_INTENTS = ["complaints", "regulation", "market_news", "technology", "requests"] as const;

async function stagePlan(run: RunRow) {
  const constraints = [
    run.industry ? `Industry focus (required): ${run.industry}` : null,
    run.geography ? `Geography focus (required): ${run.geography}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const plan = await generateJSON<ResearchPlan & { searches: { intent: string; query: string }[] }>({
    name: "research_plan",
    instructions: `You are the research planner for Demandquake, a platform that discovers startup opportunities from live web evidence.
Turn the user's request into a web research plan that surfaces REAL, CURRENT business problems — not solutions.
Write exactly 5 web search queries, one per intent: complaints (pain points, frustrations, reviews, forum threads), regulation (new or upcoming rules and policy changes), market_news (industry developments, shortages, cost pressures), technology (shifts that create new needs or break old workflows), requests (people asking for a tool or service that does not exist yet).
Each query must be a natural-language query a search engine answers well: concrete nouns, the target customer, and the geography if one is implied. No boolean operators, no quotes, no site: filters. Today is ${new Date().toISOString().slice(0, 10)}; prefer recent framing.
Also write one news_query describing the developments to look for in news coverage.
Pick the single best-fitting industry and geography from the allowed lists.`,
    input: `User request: ${run.query}\n${constraints}`,
    schema: s.obj({
      interpretation: s.str("One sentence: what problem space will be researched and for whom."),
      industry: s.enm(INDUSTRIES),
      geography: s.enm(GEOGRAPHIES),
      searches: s.arr(s.obj({ intent: s.enm(SEARCH_INTENTS), query: s.str() })),
      news_query: s.str(),
    }),
  });

  const searches = (plan.searches ?? []).filter((q) => q.query?.trim()).slice(0, 5);
  if (searches.length === 0) throw new PipelineError("The AI could not build a research plan for this topic. Try rephrasing.");
  const cleanPlan: ResearchPlan = {
    interpretation: plan.interpretation,
    industry: run.industry ?? plan.industry,
    geography: run.geography ?? plan.geography,
    searches,
    news_query: plan.news_query || run.query,
  };
  await db.from("discovery_runs").update({ plan: cleanPlan as Json }).eq("id", run.id);
}

// ---------------------------------------------------------------------------
// Stage 2: live web + news search (Context.dev)
// ---------------------------------------------------------------------------
type SourceInsert = {
  run_id?: string | null;
  startup_id?: string | null;
  scan_id?: string | null;
  url: string;
  domain: string;
  title: string;
  snippet: string | null;
  highlights: string[];
  publisher: string | null;
  published_at: string | null;
  origin: string;
  article_type: string | null;
  search_query: string | null;
  search_intent: string | null;
  relevance: string | null;
};

const EXCLUDE_DOMAINS = ["pinterest.com", "facebook.com", "instagram.com", "tiktok.com"];

async function stageSearch(run: RunRow) {
  const fresh = await loadRun(run.id);
  const plan = (fresh.plan as ResearchPlan) ?? {};
  const searches = plan.searches ?? [];
  const yearAgo = Date.now() - 365 * 24 * 3600_000;

  const webTasks = searches.map((sq) =>
    webSearch({
      query: sq.query,
      numResults: 8,
      highlightChars: 1000,
      excludeDomains: EXCLUDE_DOMAINS,
      freshness: sq.intent === "complaints" || sq.intent === "requests" ? undefined : "last_year",
    }).then((r) => ({ sq, ...r })),
  );
  const newsTask = newsSearch({ query: plan.news_query || run.query, limit: 12, fromMs: yearAgo });

  const settled = await Promise.allSettled([...webTasks, newsTask]);
  const rows: SourceInsert[] = [];
  const seen = new Set<string>();
  let credits = 0;
  let firstError: unknown = null;
  const byIntent: Record<string, number> = {};

  settled.forEach((res, idx) => {
    if (res.status === "rejected") {
      firstError ??= res.reason;
      return;
    }
    if (idx < webTasks.length) {
      const value = res.value as Awaited<(typeof webTasks)[number]>;
      credits += value.meta.creditsUsed;
      const ranked = [...value.results].sort((a, b) => rel(b.relevance) - rel(a.relevance));
      let kept = 0;
      for (const r of ranked) {
        if (kept >= 7) break;
        const key = normalizeUrl(r.url);
        if (seen.has(key)) continue;
        if (r.relevance === "low" && kept >= 3) continue;
        seen.add(key);
        kept++;
        byIntent[value.sq.intent] = (byIntent[value.sq.intent] ?? 0) + 1;
        rows.push({
          run_id: run.id,
          url: r.url,
          domain: domainOf(r.url),
          title: r.title.slice(0, 300),
          snippet: r.description.slice(0, 1500) || null,
          highlights: r.highlights.slice(0, 4).map((h) => h.slice(0, 900)),
          publisher: null,
          published_at: null,
          origin: "web",
          article_type: null,
          search_query: value.sq.query,
          search_intent: value.sq.intent,
          relevance: r.relevance,
        });
      }
    } else {
      const value = res.value as Awaited<typeof newsTask>;
      credits += value.meta.creditsUsed;
      let kept = 0;
      for (const a of value.articles) {
        if (kept >= 10) break;
        const key = normalizeUrl(a.url);
        if (seen.has(key)) continue;
        seen.add(key);
        kept++;
        byIntent.news = (byIntent.news ?? 0) + 1;
        rows.push({
          run_id: run.id,
          url: a.url,
          domain: a.sourceDomain ?? domainOf(a.url),
          title: a.title.slice(0, 300),
          snippet: a.description.slice(0, 1500) || null,
          highlights: [],
          publisher: a.sourceName,
          published_at: a.publishedAt,
          origin: "news",
          article_type: a.type,
          search_query: plan.news_query ?? run.query,
          search_intent: "news",
          relevance: null,
        });
      }
    }
  });

  if (rows.length === 0 && firstError) throw firstError;
  if (rows.length < 4) {
    throw new PipelineError("Context.dev found too little evidence for this topic. Try a broader or differently worded search.");
  }

  // Remove anything already stored for this run (retry safety)
  const { data: existing } = await db.from("sources").select("url").eq("run_id", run.id);
  const existingUrls = new Set((existing ?? []).map((e) => e.url));
  const toInsert = rows.filter((r) => !existingUrls.has(r.url));
  if (toInsert.length) {
    const { error } = await db.from("sources").insert(toInsert);
    if (error) throw error;
  }

  const domains = new Set(rows.map((r) => r.domain));
  await mergeStats(run.id, {
    sources: rows.length,
    domains: domains.size,
    news: rows.filter((r) => r.origin === "news").length,
    by_intent: byIntent,
    credits_used: credits,
  });
}

function rel(r: string | null): number {
  return r === "high" ? 3 : r === "medium" ? 2 : r === "low" ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Stage 3: evidence extraction + problem clustering (AI)
// ---------------------------------------------------------------------------
type SourceRow = {
  id: string;
  url: string;
  domain: string;
  title: string;
  snippet: string | null;
  highlights: string[];
  published_at: string | null;
  retrieved_at: string;
  origin: string;
  search_intent: string | null;
  signal_type: string | null;
  publisher: string | null;
};

function sourceDigest(ref: string, src: SourceRow, maxChars = 700): string {
  const body = [src.snippet ?? "", ...(src.highlights ?? [])].join(" … ").replace(/\s+/g, " ").trim().slice(0, maxChars);
  const date = src.published_at ? `published ${src.published_at.slice(0, 10)}` : "publication date unknown";
  return `[${ref}] ${src.title} — ${src.domain} (${src.origin}, ${date})\n${body}`;
}

async function stageAnalyze(run: RunRow) {
  const fresh = await loadRun(run.id);
  const plan = (fresh.plan as ResearchPlan) ?? {};
  const { data: sources, error } = await db
    .from("sources")
    .select("id, url, domain, title, snippet, highlights, published_at, retrieved_at, origin, search_intent, signal_type, publisher")
    .eq("run_id", run.id)
    .in("origin", ["web", "news"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  const list = (sources ?? []) as SourceRow[];
  if (list.length < 4) throw new PipelineError("Not enough evidence was collected to identify problems.");

  const refMap = new Map<string, SourceRow>();
  const digests = list.map((src, i) => {
    const ref = `S${i + 1}`;
    refMap.set(ref, src);
    return sourceDigest(ref, src);
  });

  type ClusterOut = {
    title: string;
    summary: string;
    affected_users: string;
    why_now: string;
    industry: string;
    geography: string;
    category: string;
    keywords: string[];
    competitor_query: string;
    signals: { claim: string; ref: string; signal_type: SignalType; affected: string | null }[];
  };

  const out = await generateJSON<{
    source_types: { ref: string; signal_type: SignalType }[];
    clusters: ClusterOut[];
  }>({
    name: "problem_clusters",
    effort: "medium",
    instructions: `You are Demandquake's evidence analyst. You receive real web sources retrieved minutes ago by Context.dev.
Your job: extract factual signals from the sources and group them into recurring BUSINESS PROBLEMS that a new company could solve.
Rules:
- Only use what the sources actually say. Every signal.claim must be a faithful, specific paraphrase of its referenced source (ref like "S4"). Never invent numbers, names, dates or quotes.
- A cluster must be supported by at least 2 different sources. Prefer problems with evidence from different signal types (complaints + regulation + news...).
- Produce 3 to 5 clusters, strongest first. Each cluster: 2-7 signals. Skip sources that are off-topic or promotional fluff.
- title: 3-8 words naming the problem (not a solution). summary: 2 sentences describing the problem grounded in the evidence. affected_users: who experiences it. why_now: what recent change makes it timely, citing the evidence in plain words (no refs).
- category: a 1-3 word problem category (e.g. "Compliance burden", "Labor shortage").
- competitor_query: a natural-language web search query that would find EXISTING software/products/companies already addressing this problem (e.g. "software tools for managing supplier compliance documents for manufacturers").
- keywords: 3-6 short keywords.
- source_types: classify EVERY source ref by signal type.
- Never write ref labels (like S2 or C1) inside prose text. Put citations ONLY in the ref/refs fields; prose should read naturally (e.g. \"Reuters reports…\").`,
    input: `Research request: ${run.query}\nPlan: ${plan.interpretation ?? ""}\n\nSOURCES:\n${digests.join("\n\n")}`,
    schema: s.obj({
      source_types: s.arr(s.obj({ ref: s.str(), signal_type: s.enm(SIGNAL_TYPES) })),
      clusters: s.arr(
        s.obj({
          title: s.str(),
          summary: s.str(),
          affected_users: s.str(),
          why_now: s.str(),
          industry: s.enm(INDUSTRIES),
          geography: s.enm(GEOGRAPHIES),
          category: s.str(),
          keywords: s.arr(s.str()),
          competitor_query: s.str(),
          signals: s.arr(
            s.obj({
              claim: s.str(),
              ref: s.str(),
              signal_type: s.enm(SIGNAL_TYPES),
              affected: s.nstr(),
            }),
          ),
        }),
      ),
    }),
  });

  out.clusters = cleanRefLabels(out.clusters);
  // Persist source classifications
  const byType = new Map<string, string[]>();
  for (const st of out.source_types ?? []) {
    const src = refMap.get(st.ref?.trim());
    if (!src) continue;
    const ids = byType.get(st.signal_type) ?? [];
    ids.push(src.id);
    byType.set(st.signal_type, ids);
    src.signal_type = st.signal_type;
  }
  await Promise.all(
    [...byType.entries()].map(([type, ids]) => db.from("sources").update({ signal_type: type }).in("id", ids)),
  );

  // Validate clusters against real refs
  const clusters = (out.clusters ?? [])
    .map((c) => {
      const signals: Signal[] = [];
      for (const sig of c.signals ?? []) {
        const src = refMap.get(sig.ref?.trim());
        if (!src || !sig.claim?.trim()) continue;
        signals.push({
          claim: sig.claim.trim(),
          source_id: src.id,
          signal_type: sig.signal_type,
          affected: sig.affected,
        });
      }
      const sourceIds = [...new Set(signals.map((x) => x.source_id))];
      const types = [...new Set(signals.map((x) => x.signal_type))];
      const strength = computeEvidenceStrength(sourceIds.length, types.length);
      return { c, signals, sourceIds, types, strength };
    })
    .filter((x) => x.sourceIds.length >= 2)
    .sort((a, b) => b.sourceIds.length - a.sourceIds.length || b.types.length - a.types.length);

  if (clusters.length === 0) {
    throw new PipelineError("The evidence did not reveal a recurring problem backed by multiple sources. Try a broader topic.");
  }

  const rows = clusters.map((x, idx) => ({
    run_id: run.id,
    rank: idx,
    title: x.c.title.slice(0, 160),
    summary: x.c.summary,
    affected_users: x.c.affected_users,
    why_now: x.c.why_now,
    industry: run.industry ?? x.c.industry,
    geography: run.geography ?? x.c.geography,
    category: x.c.category,
    keywords: (x.c.keywords ?? []).slice(0, 6),
    competitor_query: x.c.competitor_query,
    evidence_strength: x.strength.level,
    strength_reason: x.strength.reason(x.types.map((t) => t)),
    source_ids: x.sourceIds,
    signals: x.signals as unknown as Json,
    generation_status: idx < MAX_STARTUPS_PER_RUN ? "pending" : "skipped",
  }));

  await db.from("clusters").delete().eq("run_id", run.id); // retry safety
  const { error: insErr } = await db.from("clusters").insert(rows);
  if (insErr) throw insErr;
  await mergeStats(run.id, { clusters: rows.length });
}

// ---------------------------------------------------------------------------
// Stage 4: competitor investigation (Context.dev)
// ---------------------------------------------------------------------------
async function stageCompetitors(run: RunRow) {
  const { data: clusters, error } = await db
    .from("clusters")
    .select("id, title, competitor_query")
    .eq("run_id", run.id)
    .eq("generation_status", "pending")
    .order("rank");
  if (error) throw error;

  const { data: existing } = await db.from("sources").select("id, url").eq("run_id", run.id);
  const urlToId = new Map((existing ?? []).map((e) => [e.url, e.id]));

  let credits = 0;
  let total = 0;
  let failures = 0;
  let firstError: unknown = null;

  const results = await Promise.allSettled(
    (clusters ?? []).map((c) =>
      webSearch({
        query: c.competitor_query || `software tools for ${c.title}`,
        numResults: 7,
        highlightChars: 700,
        excludeDomains: EXCLUDE_DOMAINS,
      }).then((r) => ({ c, ...r })),
    ),
  );

  for (const res of results) {
    if (res.status === "rejected") {
      failures++;
      firstError ??= res.reason;
      continue;
    }
    const { c, results: found, meta } = res.value;
    credits += meta.creditsUsed;
    const ids: string[] = [];
    const fresh: SourceInsert[] = [];
    for (const r of found.slice(0, 7)) {
      const known = urlToId.get(r.url);
      if (known) {
        ids.push(known);
        continue;
      }
      if (fresh.some((f) => f.url === r.url)) continue;
      fresh.push({
        run_id: run.id,
        url: r.url,
        domain: domainOf(r.url),
        title: r.title.slice(0, 300),
        snippet: r.description.slice(0, 1200) || null,
        highlights: r.highlights.slice(0, 3).map((h) => h.slice(0, 700)),
        publisher: null,
        published_at: null,
        origin: "competitor",
        article_type: null,
        search_query: c.competitor_query,
        search_intent: "competitors",
        relevance: r.relevance,
      });
    }
    if (fresh.length) {
      const { data: inserted, error: insErr } = await db.from("sources").insert(fresh).select("id, url");
      if (insErr) throw insErr;
      for (const row of inserted ?? []) {
        urlToId.set(row.url, row.id);
        ids.push(row.id);
      }
    }
    total += ids.length;
    await db.from("clusters").update({ competitor_source_ids: ids }).eq("id", c.id);
  }

  if (clusters && clusters.length > 0 && failures === clusters.length && firstError) throw firstError;
  const fresh = await loadRun(run.id);
  const prevCredits = ((fresh.stats as RunStats) ?? {}).credits_used ?? 0;
  await mergeStats(run.id, { competitors: total, credits_used: prevCredits + credits });
}

// ---------------------------------------------------------------------------
// Stage 5: startup generation (AI), one cluster at a time
// ---------------------------------------------------------------------------
const COMPETITOR_KINDS = ["direct", "adjacent", "incumbent", "workaround"] as const;
const SCOPES = ["point", "suite", "platform"] as const;
const SEGMENTS = ["smb", "mid_market", "enterprise"] as const;
const COVERAGE = ["yes", "partial", "no", "unknown"] as const;
const LEVELS = ["strong", "moderate", "weak", "unknown"] as const;
const IMPLICATIONS = ["positive", "negative", "uncertain"] as const;
const PITCH_KINDS = ["problem", "evidence", "solution", "customer", "opportunity"] as const;
const HYPOTHESIS_TYPES = ["market", "customer", "pricing", "product", "competition"] as const;

type GenOut = {
  name: string;
  tagline: string;
  business_model_type: string;
  brand: { hue: number; glyph: string; motto: string };
  problem: { statement: string; who_is_affected: string; why_now: string; facts: { claim: string; refs: string[] }[] };
  solution: { summary: string; features: { title: string; description: string; addresses: string }[] };
  customers: { segment: string; description: string; pain: string; buyer: string }[];
  business_model: { type: string; pricing_hypothesis: string; revenue_streams: string[]; unit_of_value: string };
  competitors: {
    name: string;
    ref: string;
    company_domain: string | null;
    description: string;
    kind: Competitor["kind"];
    strengths: string;
    gap: string;
    scope: Competitor["scope"];
    segment: Competitor["segment"];
    feature_coverage: { feature: string; coverage: Competitor["feature_coverage"][number]["coverage"] }[];
  }[];
  differentiation: { point: string; rationale: string }[];
  assessment: { summary: string; dimensions: { key: DimensionKey; level: (typeof LEVELS)[number]; reasoning: string; refs: string[] }[] };
  validation_steps: { title: string; description: string; method: string; success_signal: string }[];
  timeline: { ref: string; category: TimelineEvent["category"]; implication: TimelineEvent["implication"]; title: string; note: string }[];
  pitch: { slides: { kind: (typeof PITCH_KINDS)[number]; headline: string; body: string }[] };
  business_plan: { roadmap: { phase: string; horizon: string; goals: string[] }[]; go_to_market: string[]; key_risks: { risk: string; mitigation: string }[] };
  hypotheses: { statement: string; type: (typeof HYPOTHESIS_TYPES)[number]; how_to_test: string }[];
  monitor_queries: string[];
};

export async function generateStartup(run: RunRow, clusterId: string) {
  const { data: cluster, error } = await db.from("clusters").select("*").eq("id", clusterId).single();
  if (error) throw error;
  const signals = (cluster.signals as unknown as Signal[]) ?? [];
  const evidenceIds = cluster.source_ids ?? [];
  const competitorIds = cluster.competitor_source_ids ?? [];

  const { data: srcRows } = await db
    .from("sources")
    .select("id, url, domain, title, snippet, highlights, published_at, retrieved_at, origin, search_intent, signal_type, publisher")
    .in("id", [...new Set([...evidenceIds, ...competitorIds])]);
  const byId = new Map(((srcRows ?? []) as SourceRow[]).map((r) => [r.id, r]));

  // Also offer other dated news from the run for the timeline
  const { data: datedRows } = await db
    .from("sources")
    .select("id, url, domain, title, snippet, highlights, published_at, retrieved_at, origin, search_intent, signal_type, publisher")
    .eq("run_id", run.id)
    .not("published_at", "is", null)
    .limit(12);
  for (const r of (datedRows ?? []) as SourceRow[]) if (!byId.has(r.id)) byId.set(r.id, r);

  const refToId = new Map<string, string>();
  const evidenceBlock: string[] = [];
  let i = 1;
  for (const id of evidenceIds) {
    const src = byId.get(id);
    if (!src) continue;
    const ref = `S${i++}`;
    refToId.set(ref, id);
    const sigs = signals.filter((x) => x.source_id === id).map((x) => `  • ${x.claim}`).join("\n");
    evidenceBlock.push(`${sourceDigest(ref, src, 600)}\n  Extracted signals:\n${sigs || "  • (context source)"}`);
  }
  for (const r of (datedRows ?? []) as SourceRow[]) {
    if (evidenceIds.includes(r.id)) continue;
    const ref = `S${i++}`;
    refToId.set(ref, r.id);
    evidenceBlock.push(sourceDigest(ref, r, 350));
  }
  const competitorBlock: string[] = [];
  let j = 1;
  for (const id of competitorIds) {
    const src = byId.get(id);
    if (!src) continue;
    const ref = `C${j++}`;
    refToId.set(ref, id);
    competitorBlock.push(sourceDigest(ref, src, 600));
  }

  const out = await generateJSON<GenOut>({
    name: "startup_profile",
    effort: "medium",
    instructions: `You are Demandquake's venture architect. You turn ONE evidence-backed problem cluster into a commercially plausible, unclaimed startup concept.
Hard rules on provenance:
- Facts must come from the sources. Any factual claim (problem.facts, assessment reasoning, timeline notes) must cite refs like "S2" or "C1" that actually support it. Never invent statistics, customer quotes, company names, funding, or dates.
- Everything else (name, solution, pricing, customers, roadmap, differentiation, pitch) is an AI hypothesis — write it confidently but do not present it as verified.
- competitors: only companies/products that are explicitly named in the C-ref (or S-ref) source text. ref = the source that mentions it. company_domain = the company's own website domain only if it is evident from the source URL or text, otherwise null. description = what the source says about it. strengths/gap/scope/segment/feature_coverage are your interpretation. If no real competitor is named, return an empty list rather than guessing. 2-5 competitors max. feature_coverage must use exactly the solution feature titles.
- assessment: exactly 6 dimensions with keys problem_evidence, market_timing, customer_clarity, differentiation, monetization, validation_status. Use qualitative levels only (strong / moderate / weak / unknown) and explain the reasoning explicitly, citing refs where facts are used. validation_status MUST be "unknown": no customer conversations have happened yet. No percentages or success probabilities anywhere.
- timeline: 3-8 events, each tied to ONE ref (prefer sources with a publication date). Categories: demand_signal, market_development, competitor_activity, regulatory_change, tech_breakthrough, potential_threat. implication = how it affects this opportunity (positive / negative / uncertain).
- pitch: exactly 5 slides in this order: problem, evidence, solution, customer, opportunity. Headlines ≤ 9 words; body ≤ 32 words. Punchy, concrete, readable in 6-10 seconds.
- name: a fresh, brandable startup name (one or two words, no generic "AI"-suffix clichés). tagline: one sentence pitch ≤ 14 words.
- brand.hue: integer 0-359 that fits the brand mood. brand.glyph: one of the allowed logomark shapes. brand.motto: 2-5 words.
- features: 3-4. customers: 2-3 segments. validation_steps: 4 concrete experiments. hypotheses: 4-6 key assumptions that must be tested. business_plan.roadmap: 3 phases. monitor_queries: 2 natural-language news queries to watch for future developments affecting this opportunity.
- Never write ref labels (like S2 or C1) inside prose text. Put citations ONLY in the ref/refs fields; prose should read naturally (e.g. \"Reuters reports…\").`,
    input: `Original research request: ${run.query}
Industry: ${cluster.industry}; Geography: ${cluster.geography}

PROBLEM CLUSTER
Title: ${cluster.title}
Summary: ${cluster.summary}
Affected users: ${cluster.affected_users}
Why now: ${cluster.why_now}
Evidence strength: ${cluster.evidence_strength} (${cluster.strength_reason})

EVIDENCE SOURCES
${evidenceBlock.join("\n\n")}

EXISTING SOLUTIONS FOUND BY COMPETITOR SEARCH
${competitorBlock.length ? competitorBlock.join("\n\n") : "(competitor search returned nothing)"}`,
    schema: s.obj({
      name: s.str(),
      tagline: s.str(),
      business_model_type: s.enm(BUSINESS_MODELS),
      brand: s.obj({ hue: s.int(), glyph: s.enm(GLYPHS), motto: s.str() }),
      problem: s.obj({
        statement: s.str(),
        who_is_affected: s.str(),
        why_now: s.str(),
        facts: s.arr(s.obj({ claim: s.str(), refs: s.arr(s.str()) })),
      }),
      solution: s.obj({
        summary: s.str(),
        features: s.arr(s.obj({ title: s.str(), description: s.str(), addresses: s.str() })),
      }),
      customers: s.arr(s.obj({ segment: s.str(), description: s.str(), pain: s.str(), buyer: s.str() })),
      business_model: s.obj({
        type: s.str(),
        pricing_hypothesis: s.str(),
        revenue_streams: s.arr(s.str()),
        unit_of_value: s.str(),
      }),
      competitors: s.arr(
        s.obj({
          name: s.str(),
          ref: s.str(),
          company_domain: s.nstr(),
          description: s.str(),
          kind: s.enm(COMPETITOR_KINDS),
          strengths: s.str(),
          gap: s.str(),
          scope: s.enm(SCOPES),
          segment: s.enm(SEGMENTS),
          feature_coverage: s.arr(s.obj({ feature: s.str(), coverage: s.enm(COVERAGE) })),
        }),
      ),
      differentiation: s.arr(s.obj({ point: s.str(), rationale: s.str() })),
      assessment: s.obj({
        summary: s.str(),
        dimensions: s.arr(
          s.obj({ key: s.enm(DIMENSION_KEYS), level: s.enm(LEVELS), reasoning: s.str(), refs: s.arr(s.str()) }),
        ),
      }),
      validation_steps: s.arr(
        s.obj({ title: s.str(), description: s.str(), method: s.str(), success_signal: s.str() }),
      ),
      timeline: s.arr(
        s.obj({
          ref: s.str(),
          category: s.enm(TIMELINE_CATEGORIES),
          implication: s.enm(IMPLICATIONS),
          title: s.str(),
          note: s.str(),
        }),
      ),
      pitch: s.obj({ slides: s.arr(s.obj({ kind: s.enm(PITCH_KINDS), headline: s.str(), body: s.str() })) }),
      business_plan: s.obj({
        roadmap: s.arr(s.obj({ phase: s.str(), horizon: s.str(), goals: s.arr(s.str()) })),
        go_to_market: s.arr(s.str()),
        key_risks: s.arr(s.obj({ risk: s.str(), mitigation: s.str() })),
      }),
      hypotheses: s.arr(s.obj({ statement: s.str(), type: s.enm(HYPOTHESIS_TYPES), how_to_test: s.str() })),
      monitor_queries: s.arr(s.str()),
    }),
  });

  Object.assign(out, cleanRefLabels(out));
  const resolve = (refs: string[] | undefined) =>
    [...new Set((refs ?? []).map((r) => refToId.get(r.trim())).filter((x): x is string => Boolean(x)))];
  const nowIso = new Date().toISOString();

  const competitors: Competitor[] = (out.competitors ?? [])
    .map((c) => {
      const sid = refToId.get(c.ref?.trim()) ?? null;
      const src = sid ? byId.get(sid) : undefined;
      if (!src) return null; // must be traceable to a real source
      const domain = c.company_domain?.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "") || null;
      return {
        name: c.name.trim(),
        domain,
        url: domain ? `https://${domain}` : src.url,
        source_id: sid,
        description: c.description,
        kind: c.kind,
        strengths: c.strengths,
        gap: c.gap,
        scope: c.scope,
        segment: c.segment,
        feature_coverage: c.feature_coverage ?? [],
      } satisfies Competitor;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .slice(0, 5);

  const dims = DIMENSION_KEYS.map((key) => {
    const d = (out.assessment?.dimensions ?? []).find((x) => x.key === key);
    return {
      key,
      level: key === "validation_status" ? "unknown" : (d?.level ?? "unknown"),
      reasoning: d?.reasoning ?? "Not enough information to assess this dimension yet.",
      source_ids: resolve(d?.refs),
    };
  });
  const assessment: Assessment = { summary: out.assessment?.summary ?? "", dimensions: dims as Assessment["dimensions"], updated_at: nowIso };

  const timeline: TimelineEvent[] = (out.timeline ?? [])
    .map((t, idx) => {
      const sid = refToId.get(t.ref?.trim());
      const src = sid ? byId.get(sid) : undefined;
      if (!src || !sid) return null;
      return {
        id: `t${idx}-${sid.slice(0, 6)}`,
        source_id: sid,
        date: src.published_at,
        discovered_at: src.retrieved_at,
        category: t.category,
        implication: t.implication,
        title: t.title,
        note: t.note,
        scan_id: null,
      } satisfies TimelineEvent;
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  const facts = (out.problem?.facts ?? [])
    .map((f) => ({ claim: f.claim, source_ids: resolve(f.refs) }))
    .filter((f) => f.source_ids.length > 0);

  const usedIds = new Set<string>([
    ...evidenceIds,
    ...facts.flatMap((f) => f.source_ids),
    ...dims.flatMap((d) => d.source_ids),
    ...timeline.map((t) => t.source_id!).filter(Boolean),
    ...competitors.map((c) => c.source_id!).filter(Boolean),
  ]);

  const name = out.name.trim().slice(0, 60) || cluster.title;
  const slug = `${slugify(name)}-${randomSuffix()}`;
  const hue = Math.max(0, Math.min(359, Math.round(Number(out.brand?.hue ?? 30))));

  const { data: startup, error: insErr } = await db
    .from("startups")
    .insert({
      slug,
      run_id: run.id,
      cluster_id: cluster.id,
      name,
      tagline: out.tagline,
      industry: cluster.industry,
      geography: cluster.geography,
      business_model_type: out.business_model_type,
      brand: { hue, glyph: out.brand?.glyph ?? "orbit", motto: out.brand?.motto ?? "" } as Json,
      problem: { ...out.problem, facts } as unknown as Json,
      solution: out.solution as unknown as Json,
      customers: out.customers as unknown as Json,
      business_model: out.business_model as unknown as Json,
      competitors: competitors as unknown as Json,
      differentiation: out.differentiation as unknown as Json,
      assessment: assessment as unknown as Json,
      validation_steps: out.validation_steps as unknown as Json,
      timeline: timeline as unknown as Json,
      pitch: out.pitch as unknown as Json,
      business_plan: out.business_plan as unknown as Json,
      hypotheses: out.hypotheses as unknown as Json,
      monitor_queries: (out.monitor_queries ?? []).slice(0, 3),
      evidence_source_ids: [...usedIds],
      research_at: nowIso,
    })
    .select("id")
    .single();
  if (insErr) throw insErr;

  await db
    .from("clusters")
    .update({ generation_status: "done", startup_id: startup.id, generation_error: null })
    .eq("id", cluster.id);
}
