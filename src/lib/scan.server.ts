// Opportunity Quake: rescan the live web for developments not in stored evidence. Server-only.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { newsSearch, webSearch, domainOf } from "./contextdev.server";
import { generateJSON, s } from "./ai.server";
import { PipelineError, userMessageOf } from "./pipeline.server";
import { normalizeUrl, cleanRefLabels } from "./research-utils";
import {
  DIMENSION_KEYS,
  TIMELINE_CATEGORIES,
  type Assessment,
  type Competitor,
  type DimensionKey,
  type ScanChange,
  type ScanVerdict,
  type TimelineEvent,
} from "./types";

const db = supabaseAdmin;
const SCAN_COOLDOWN_MS = 60_000;
const SCANS_PER_HOUR_LIMIT = 40;
const STALE_MS = 4 * 60_000;
const WINDOW_DAYS = 30;

export async function startScan(startupId: string): Promise<{ scanId: string; reused: boolean }> {
  const { data: startup } = await db.from("startups").select("id").eq("id", startupId).maybeSingle();
  if (!startup) throw new PipelineError("This startup no longer exists.");

  const { data: latest } = await db
    .from("market_scans")
    .select("id, status, created_at, stage_started_at")
    .eq("startup_id", startupId)
    .order("created_at", { ascending: false })
    .limit(1);
  const last = latest?.[0];
  const now = Date.now();
  if (last) {
    const age = now - new Date(last.created_at).getTime();
    const inProgress = last.status === "fetching" || last.status === "analyzing";
    if (inProgress && age < STALE_MS * 2) return { scanId: last.id, reused: true };
    if (age < SCAN_COOLDOWN_MS) return { scanId: last.id, reused: true };
  }

  const { count } = await db
    .from("market_scans")
    .select("id", { count: "exact", head: true })
    .gte("created_at", new Date(now - 3600_000).toISOString());
  if ((count ?? 0) >= SCANS_PER_HOUR_LIMIT) {
    throw new PipelineError("The hourly market-scan limit was reached to protect research credits. Try again shortly.");
  }

  const { data, error } = await db
    .from("market_scans")
    .insert({ startup_id: startupId, status: "fetching", window_days: WINDOW_DAYS })
    .select("id")
    .single();
  if (error) throw error;
  return { scanId: data.id, reused: false };
}

type ScanRow = {
  id: string;
  startup_id: string;
  status: string;
  stage_started_at: string | null;
  window_days: number;
};

async function loadScan(scanId: string): Promise<ScanRow> {
  const { data, error } = await db
    .from("market_scans")
    .select("id, startup_id, status, stage_started_at, window_days")
    .eq("id", scanId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PipelineError("This market scan no longer exists.");
  return data;
}

async function claim(scan: ScanRow, status: string): Promise<boolean> {
  const staleIso = new Date(Date.now() - STALE_MS).toISOString();
  const { data } = await db
    .from("market_scans")
    .update({ stage_started_at: new Date().toISOString() })
    .eq("id", scan.id)
    .eq("status", status)
    .or(`stage_started_at.is.null,stage_started_at.lt.${staleIso}`)
    .select("id");
  return Boolean(data && data.length > 0);
}

export async function advanceScan(scanId: string): Promise<{ status: string; busy: boolean }> {
  const scan = await loadScan(scanId);
  if (scan.status === "complete" || scan.status === "failed") return { status: scan.status, busy: false };
  if (!(await claim(scan, scan.status))) return { status: scan.status, busy: true };

  try {
    if (scan.status === "fetching") {
      const next = await fetchStage(scan);
      return { status: next, busy: false };
    }
    if (scan.status === "analyzing") {
      await analyzeStage(scan);
      return { status: "complete", busy: false };
    }
  } catch (err) {
    console.error(`[scan] ${scan.status} failed for ${scanId}`, err);
    await db
      .from("market_scans")
      .update({ status: "failed", error: userMessageOf(err), stage_started_at: null, completed_at: new Date().toISOString() })
      .eq("id", scanId);
    return { status: "failed", busy: false };
  }
  return { status: scan.status, busy: false };
}

async function knownUrls(startup: { id: string; run_id: string | null }): Promise<Set<string>> {
  const urls = new Set<string>();
  if (startup.run_id) {
    const { data } = await db.from("sources").select("url").eq("run_id", startup.run_id);
    for (const r of data ?? []) urls.add(normalizeUrl(r.url));
  }
  const { data: own } = await db.from("sources").select("url").eq("startup_id", startup.id);
  for (const r of own ?? []) urls.add(normalizeUrl(r.url));
  return urls;
}

async function fetchStage(scan: ScanRow): Promise<string> {
  const { data: startup, error } = await db
    .from("startups")
    .select("id, run_id, name, monitor_queries, problem, industry, geography")
    .eq("id", scan.startup_id)
    .single();
  if (error) throw error;

  const problem = (startup.problem as { statement?: string }) ?? {};
  const queries = (startup.monitor_queries?.length ? startup.monitor_queries : [problem.statement ?? startup.name]).slice(0, 2);
  const fromMs = Date.now() - scan.window_days * 24 * 3600_000;

  const tasks = [
    ...queries.map((q) => newsSearch({ query: q, limit: 10, fromMs }).then((r) => ({ kind: "news" as const, q, r }))),
    webSearch({ query: queries[0], numResults: 8, freshness: "last_month", highlightChars: 800 }).then((r) => ({
      kind: "web" as const,
      q: queries[0],
      r,
    })),
  ];
  const settled = await Promise.allSettled(tasks);
  const known = await knownUrls(startup);
  const seen = new Set<string>();
  const rows: {
    startup_id: string;
    scan_id: string;
    url: string;
    domain: string;
    title: string;
    snippet: string | null;
    highlights: string[];
    publisher: string | null;
    published_at: string | null;
    origin: string;
    article_type: string | null;
    search_query: string;
    search_intent: string;
    relevance: string | null;
  }[] = [];
  let firstError: unknown = null;
  let okCount = 0;

  for (const res of settled) {
    if (res.status === "rejected") {
      firstError ??= res.reason;
      continue;
    }
    okCount++;
    const v = res.value;
    if (v.kind === "news") {
      for (const a of v.r.articles) {
        const key = normalizeUrl(a.url);
        if (known.has(key) || seen.has(key)) continue;
        seen.add(key);
        rows.push({
          startup_id: startup.id,
          scan_id: scan.id,
          url: a.url,
          domain: a.sourceDomain ?? domainOf(a.url),
          title: a.title.slice(0, 300),
          snippet: a.description.slice(0, 1500) || null,
          highlights: [],
          publisher: a.sourceName,
          published_at: a.publishedAt,
          origin: "scan",
          article_type: a.type,
          search_query: v.q,
          search_intent: "monitor_news",
          relevance: null,
        });
      }
    } else {
      for (const w of v.r.results) {
        const key = normalizeUrl(w.url);
        if (known.has(key) || seen.has(key)) continue;
        seen.add(key);
        rows.push({
          startup_id: startup.id,
          scan_id: scan.id,
          url: w.url,
          domain: domainOf(w.url),
          title: w.title.slice(0, 300),
          snippet: w.description.slice(0, 1500) || null,
          highlights: w.highlights.slice(0, 3).map((h) => h.slice(0, 800)),
          publisher: null,
          published_at: null,
          origin: "scan",
          article_type: null,
          search_query: v.q,
          search_intent: "monitor_web",
          relevance: w.relevance,
        });
      }
    }
  }
  if (okCount === 0 && firstError) throw firstError;

  const capped = rows.slice(0, 18);
  let ids: string[] = [];
  if (capped.length) {
    const { data: inserted, error: insErr } = await db.from("sources").insert(capped).select("id");
    if (insErr) throw insErr;
    ids = (inserted ?? []).map((r) => r.id);
  }

  if (ids.length === 0) {
    const { data: st } = await db.from("startups").select("assessment").eq("id", startup.id).single();
    await db
      .from("market_scans")
      .update({
        status: "complete",
        queries,
        candidates_count: 0,
        verdict: "unchanged",
        headline: "No new developments found",
        summary: `Context.dev returned no publications from the last ${scan.window_days} days that are not already part of this opportunity's evidence. The assessment is unchanged.`,
        assessment_before: st?.assessment ?? null,
        assessment_after: st?.assessment ?? null,
        stage_started_at: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", scan.id);
    await db.from("startups").update({ last_scanned_at: new Date().toISOString() }).eq("id", startup.id);
    return "complete";
  }

  await db
    .from("market_scans")
    .update({ status: "analyzing", queries, candidates_count: ids.length, new_source_ids: ids, stage_started_at: null })
    .eq("id", scan.id);
  return "analyzing";
}

const LEVELS = ["strong", "moderate", "weak", "unknown"] as const;
const IMPLICATIONS = ["positive", "negative", "uncertain"] as const;
const VERDICTS = ["strengthened", "weakened", "mixed", "unchanged"] as const;

async function analyzeStage(scan: ScanRow) {
  const { data: full } = await db.from("market_scans").select("new_source_ids").eq("id", scan.id).single();
  const { data: startup, error } = await db.from("startups").select("*").eq("id", scan.startup_id).single();
  if (error) throw error;
  const candidateIds = full?.new_source_ids ?? [];
  const { data: candidates } = await db
    .from("sources")
    .select("id, url, domain, title, snippet, highlights, published_at, retrieved_at, publisher")
    .in("id", candidateIds);
  const list = candidates ?? [];

  const before = startup.assessment as unknown as Assessment;
  const competitors = (startup.competitors as unknown as Competitor[]) ?? [];
  const problem = startup.problem as { statement?: string; why_now?: string };
  const solution = startup.solution as { summary?: string };

  const refMap = new Map<string, (typeof list)[number]>();
  const digests = list.map((src, i) => {
    const ref = `N${i + 1}`;
    refMap.set(ref, src);
    const body = [src.snippet ?? "", ...(src.highlights ?? [])].join(" … ").replace(/\s+/g, " ").slice(0, 650);
    const date = src.published_at ? `published ${src.published_at.slice(0, 10)}` : "date unknown";
    return `[${ref}] ${src.title} — ${src.domain} (${date})\n${body}`;
  });

  type Out = {
    relevant_changes: {
      ref: string;
      category: ScanChange["category"];
      implication: ScanChange["implication"];
      title: string;
      explanation: string;
      affected_dimensions: DimensionKey[];
    }[];
    updated_dimensions: { key: DimensionKey; level: (typeof LEVELS)[number]; reasoning: string; refs: string[] }[];
    new_competitors: { name: string; ref: string; description: string }[];
    verdict: ScanVerdict;
    headline: string;
    summary: string;
  };

  const out = await generateJSON<Out>({
    name: "market_change_analysis",
    effort: "medium",
    instructions: `You are Demandquake's market monitor. An unclaimed startup opportunity was generated earlier from web evidence. Context.dev just retrieved NEW publications that are not part of its stored evidence.
Decide which new publications materially change the opportunity. Be strict: generic, tangential, duplicate or promotional articles are NOT relevant. It is completely fine to report zero relevant changes.
For each relevant change: cite exactly one ref (N1, N2...), categorize it, state whether it strengthens (positive), weakens (negative) or adds uncertainty (uncertain), and explain the business implication in 1-2 sentences grounded in what the article says.
updated_dimensions: include ONLY assessment dimensions whose level or reasoning should change because of the relevant changes; give the new qualitative level and the full updated reasoning (cite refs). validation_status must remain "unknown". No percentages.
new_competitors: only companies explicitly named in a relevant new publication that offer a competing solution.
verdict: strengthened / weakened / mixed / unchanged. headline: ≤ 10 words. summary: 2-3 sentences explaining what changed and why it matters (or clearly that nothing meaningful changed).
- Never write ref labels (like S2 or C1) inside prose text. Put citations ONLY in the ref/refs fields; prose should read naturally (e.g. \"Reuters reports…\").`,
    input: `STARTUP: ${startup.name} — ${startup.tagline}
Problem: ${problem?.statement ?? ""}
Why now (at generation): ${problem?.why_now ?? ""}
Solution: ${solution?.summary ?? ""}
Known competitors: ${competitors.map((c) => c.name).join(", ") || "none identified"}
CURRENT ASSESSMENT:
${(before?.dimensions ?? []).map((d) => `- ${d.key}: ${d.level} — ${d.reasoning}`).join("\n")}

NEW PUBLICATIONS (last ${scan.window_days} days, not previously stored):
${digests.join("\n\n")}`,
    schema: s.obj({
      relevant_changes: s.arr(
        s.obj({
          ref: s.str(),
          category: s.enm(TIMELINE_CATEGORIES),
          implication: s.enm(IMPLICATIONS),
          title: s.str(),
          explanation: s.str(),
          affected_dimensions: s.arr(s.enm(DIMENSION_KEYS)),
        }),
      ),
      updated_dimensions: s.arr(
        s.obj({ key: s.enm(DIMENSION_KEYS), level: s.enm(LEVELS), reasoning: s.str(), refs: s.arr(s.str()) }),
      ),
      new_competitors: s.arr(s.obj({ name: s.str(), ref: s.str(), description: s.str() })),
      verdict: s.enm(VERDICTS),
      headline: s.str(),
      summary: s.str(),
    }),
  });

  Object.assign(out, cleanRefLabels(out));
  const nowIso = new Date().toISOString();
  const changes: ScanChange[] = [];
  for (const c of out.relevant_changes ?? []) {
    const src = refMap.get(c.ref?.trim());
    if (!src) continue;
    if (changes.some((x) => x.source_id === src.id)) continue;
    changes.push({
      source_id: src.id,
      category: c.category,
      implication: c.implication,
      title: c.title,
      explanation: c.explanation,
      affected_dimensions: c.affected_dimensions ?? [],
    });
  }

  const after: Assessment = {
    summary: before?.summary ?? "",
    updated_at: changes.length ? nowIso : (before?.updated_at ?? nowIso),
    dimensions: (before?.dimensions ?? []).map((d) => {
      if (changes.length === 0) return d;
      const upd = (out.updated_dimensions ?? []).find((u) => u.key === d.key);
      if (!upd || d.key === "validation_status") return d;
      const newIds = (upd.refs ?? []).map((r) => refMap.get(r.trim())?.id).filter((x): x is string => Boolean(x));
      return {
        key: d.key,
        level: upd.level,
        reasoning: upd.reasoning,
        source_ids: [...new Set([...(d.source_ids ?? []), ...newIds])],
      };
    }),
  };

  const verdict: ScanVerdict = changes.length === 0 ? "unchanged" : out.verdict;
  const relevantIds = changes.map((c) => c.source_id);

  // Update startup: timeline, assessment, competitors, evidence
  const timeline = ((startup.timeline as unknown as TimelineEvent[]) ?? []).slice();
  for (const c of changes) {
    const src = list.find((x) => x.id === c.source_id)!;
    timeline.push({
      id: `scan-${scan.id.slice(0, 6)}-${c.source_id.slice(0, 6)}`,
      source_id: c.source_id,
      date: src.published_at,
      discovered_at: src.retrieved_at,
      category: c.category,
      implication: c.implication,
      title: c.title,
      note: c.explanation,
      scan_id: scan.id,
    });
  }
  const newCompetitors: Competitor[] = [];
  for (const nc of out.new_competitors ?? []) {
    const src = refMap.get(nc.ref?.trim());
    if (!src || !relevantIds.includes(src.id)) continue;
    if (competitors.some((c) => c.name.toLowerCase() === nc.name.toLowerCase())) continue;
    newCompetitors.push({
      name: nc.name,
      domain: null,
      url: src.url,
      source_id: src.id,
      description: nc.description,
      kind: "direct",
      strengths: "Newly detected in a market scan — not yet analyzed in depth.",
      gap: "Unknown — investigate before positioning against it.",
      scope: "point",
      segment: "mid_market",
      feature_coverage: [],
      detected_in_scan: scan.id,
    });
  }

  await db
    .from("startups")
    .update({
      assessment: after as unknown as Json,
      timeline: timeline as unknown as Json,
      competitors: [...competitors, ...newCompetitors] as unknown as Json,
      evidence_source_ids: [...new Set([...(startup.evidence_source_ids ?? []), ...relevantIds])],
      last_scanned_at: nowIso,
    })
    .eq("id", startup.id);

  await db
    .from("market_scans")
    .update({
      status: "complete",
      verdict,
      headline: changes.length ? out.headline : "No meaningful changes",
      summary:
        changes.length > 0
          ? out.summary
          : `Context.dev surfaced ${list.length} new publication${list.length === 1 ? "" : "s"}, but none materially changes this opportunity. The assessment is unchanged.`,
      changes: changes as unknown as Json,
      assessment_before: before as unknown as Json,
      assessment_after: after as unknown as Json,
      stage_started_at: null,
      completed_at: nowIso,
    })
    .eq("id", scan.id);
}
