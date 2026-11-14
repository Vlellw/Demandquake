// Read-model mapping for public research data. Server-only.
import { publicDb } from "./public-db.server";
import type {
  ClusterDTO,
  RadarNodeDTO,
  RunDTO,
  RunDetailDTO,
  ScanDetailDTO,
  ScanSummaryDTO,
  StartupCardDTO,
  StartupDetailDTO,
} from "./dto";
import type { Assessment, Brand, Competitor, Signal, SourceRecord } from "./types";

const SOURCE_COLS =
  "id, url, domain, title, snippet, highlights, publisher, published_at, retrieved_at, origin, article_type, search_intent, search_query, relevance, signal_type, scan_id";

const CARD_COLS =
  "id, slug, name, tagline, industry, geography, business_model_type, brand, research_at, last_scanned_at, claim_count, evidence_source_ids, competitors, assessment, run_id, cluster:clusters!startups_cluster_id_fkey(title, evidence_strength), run:discovery_runs(query)";

type CardRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  industry: string | null;
  geography: string | null;
  business_model_type: string | null;
  brand: unknown;
  research_at: string;
  last_scanned_at: string | null;
  claim_count: number;
  evidence_source_ids: string[];
  competitors: unknown;
  assessment: unknown;
  cluster: { title: string; evidence_strength: string } | null;
  run: { query: string } | null;
};

function toCard(r: CardRow): StartupCardDTO {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    industry: r.industry,
    geography: r.geography,
    business_model_type: r.business_model_type,
    brand: (r.brand as Brand) ?? { hue: 40, glyph: "orbit", motto: "" },
    research_at: r.research_at,
    last_scanned_at: r.last_scanned_at,
    claim_count: r.claim_count,
    evidence_count: r.evidence_source_ids?.length ?? 0,
    competitor_count: Array.isArray(r.competitors) ? (r.competitors as unknown[]).length : 0,
    assessment: (r.assessment as Assessment) ?? null,
    evidence_strength: r.cluster?.evidence_strength ?? null,
    problem_title: r.cluster?.title ?? null,
    run_query: r.run?.query ?? null,
  };
}

function toCluster(r: Record<string, unknown>): ClusterDTO {
  return {
    id: r.id as string,
    run_id: r.run_id as string,
    rank: (r.rank as number) ?? 0,
    title: r.title as string,
    summary: r.summary as string,
    affected_users: (r.affected_users as string) ?? null,
    why_now: (r.why_now as string) ?? null,
    industry: (r.industry as string) ?? null,
    geography: (r.geography as string) ?? null,
    category: (r.category as string) ?? null,
    evidence_strength: (r.evidence_strength as string) ?? "emerging",
    strength_reason: (r.strength_reason as string) ?? null,
    source_ids: (r.source_ids as string[]) ?? [],
    competitor_source_ids: (r.competitor_source_ids as string[]) ?? [],
    signals: (r.signals as Signal[]) ?? [],
    generation_status: (r.generation_status as string) ?? "pending",
    generation_error: (r.generation_error as string) ?? null,
    startup_id: (r.startup_id as string) ?? null,
    created_at: r.created_at as string,
  };
}

function toSource(r: Record<string, unknown>): SourceRecord {
  return {
    id: r.id as string,
    url: r.url as string,
    domain: r.domain as string,
    title: r.title as string,
    snippet: (r.snippet as string) ?? null,
    highlights: (r.highlights as string[]) ?? [],
    publisher: (r.publisher as string) ?? null,
    published_at: (r.published_at as string) ?? null,
    retrieved_at: r.retrieved_at as string,
    origin: r.origin as string,
    article_type: (r.article_type as string) ?? null,
    search_intent: (r.search_intent as string) ?? null,
    search_query: (r.search_query as string) ?? null,
    relevance: (r.relevance as string) ?? null,
    signal_type: (r.signal_type as string) ?? null,
    scan_id: (r.scan_id as string) ?? null,
  };
}

function toRun(r: Record<string, unknown>): RunDTO {
  return {
    id: r.id as string,
    query: r.query as string,
    industry: (r.industry as string) ?? null,
    geography: (r.geography as string) ?? null,
    status: r.status as string,
    plan: (r.plan as RunDTO["plan"]) ?? {},
    stats: (r.stats as RunDTO["stats"]) ?? {},
    error: (r.error as string) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    completed_at: (r.completed_at as string) ?? null,
    stage_started_at: (r.stage_started_at as string) ?? null,
  };
}

function toScanSummary(r: Record<string, unknown>): ScanSummaryDTO {
  return {
    id: r.id as string,
    status: r.status as string,
    verdict: (r.verdict as string) ?? null,
    headline: (r.headline as string) ?? null,
    summary: (r.summary as string) ?? null,
    candidates_count: (r.candidates_count as number) ?? 0,
    changes: (r.changes as ScanSummaryDTO["changes"]) ?? [],
    created_at: r.created_at as string,
    completed_at: (r.completed_at as string) ?? null,
  };
}

export async function listStartupCards(limit = 120): Promise<StartupCardDTO[]> {
  const { data, error } = await publicDb()
    .from("startups")
    .select(CARD_COLS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as CardRow[]).map(toCard);
}

export async function radarNodes(limit = 160): Promise<RadarNodeDTO[]> {
  const db = publicDb();
  const { data, error } = await db
    .from("clusters")
    .select(
      "id, title, summary, industry, geography, category, evidence_strength, strength_reason, source_ids, signals, run_id, created_at, run:discovery_runs(query), startup:startups!clusters_startup_fk(slug, name, tagline, brand)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => {
    const signals = (r.signals as Signal[]) ?? [];
    const st = r.startup as { slug: string; name: string; tagline: string; brand: Brand } | null;
    return {
      id: r.id as string,
      title: r.title as string,
      summary: r.summary as string,
      industry: (r.industry as string) ?? null,
      geography: (r.geography as string) ?? null,
      category: (r.category as string) ?? null,
      evidence_strength: (r.evidence_strength as string) ?? "emerging",
      strength_reason: (r.strength_reason as string) ?? null,
      signal_count: ((r.source_ids as string[]) ?? []).length,
      signal_types: [...new Set(signals.map((x) => x.signal_type))],
      run_id: r.run_id as string,
      run_query: (r.run as { query: string } | null)?.query ?? null,
      created_at: r.created_at as string,
      startup: st ? { slug: st.slug, name: st.name, tagline: st.tagline, brand: st.brand } : null,
    };
  });
}

export async function clusterSignals(clusterId: string): Promise<{ cluster: ClusterDTO; sources: SourceRecord[] } | null> {
  const db = publicDb();
  const { data, error } = await db.from("clusters").select("*").eq("id", clusterId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const cluster = toCluster(data as unknown as Record<string, unknown>);
  const { data: src } = await db.from("sources").select(SOURCE_COLS).in("id", cluster.source_ids);
  return { cluster, sources: ((src ?? []) as unknown as Record<string, unknown>[]).map(toSource) };
}

export async function dashboardStats() {
  const db = publicDb();
  const [startups, sources, runs, latest] = await Promise.all([
    db.from("startups").select("id", { count: "exact", head: true }),
    db.from("sources").select("id", { count: "exact", head: true }),
    db.from("discovery_runs").select("id", { count: "exact", head: true }).eq("status", "complete"),
    db.from("sources").select("retrieved_at").order("retrieved_at", { ascending: false }).limit(1),
  ]);
  const { data: domainsRows } = await db.from("sources").select("domain").limit(2000);
  return {
    startups: startups.count ?? 0,
    sources: sources.count ?? 0,
    runs: runs.count ?? 0,
    domains: new Set((domainsRows ?? []).map((d) => d.domain)).size,
    lastResearchAt: latest.data?.[0]?.retrieved_at ?? null,
  };
}

export async function recentRuns(limit = 8): Promise<RunDTO[]> {
  const { data, error } = await publicDb()
    .from("discovery_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(toRun);
}

export async function runDetail(runId: string): Promise<RunDetailDTO | null> {
  const db = publicDb();
  const { data: run, error } = await db.from("discovery_runs").select("*").eq("id", runId).maybeSingle();
  if (error) throw error;
  if (!run) return null;
  const [sources, clusters, startups] = await Promise.all([
    db.from("sources").select(SOURCE_COLS).eq("run_id", runId).order("created_at", { ascending: true }),
    db.from("clusters").select("*").eq("run_id", runId).order("rank", { ascending: true }),
    db.from("startups").select(CARD_COLS).eq("run_id", runId).order("created_at", { ascending: true }),
  ]);
  return {
    run: toRun(run as unknown as Record<string, unknown>),
    sources: ((sources.data ?? []) as unknown as Record<string, unknown>[]).map(toSource),
    clusters: ((clusters.data ?? []) as unknown as Record<string, unknown>[]).map(toCluster),
    startups: ((startups.data ?? []) as unknown as CardRow[]).map(toCard),
  };
}

export async function startupDetail(slug: string): Promise<StartupDetailDTO | null> {
  const db = publicDb();
  const { data: st, error } = await db.from("startups").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!st) return null;

  const [clusterRes, runRes, scansRes] = await Promise.all([
    st.cluster_id ? db.from("clusters").select("*").eq("id", st.cluster_id).maybeSingle() : Promise.resolve({ data: null }),
    st.run_id
      ? db.from("discovery_runs").select("id, query, created_at, plan").eq("id", st.run_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from("market_scans")
      .select("id, status, verdict, headline, summary, candidates_count, changes, created_at, completed_at")
      .eq("startup_id", st.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const cluster = clusterRes.data ? toCluster(clusterRes.data as unknown as Record<string, unknown>) : null;
  const ids = [
    ...new Set([
      ...(st.evidence_source_ids ?? []),
      ...(cluster?.source_ids ?? []),
      ...(cluster?.competitor_source_ids ?? []),
    ]),
  ];
  const { data: srcRows } = ids.length
    ? await db.from("sources").select(SOURCE_COLS).in("id", ids)
    : { data: [] as unknown[] };

  const run = runRes.data as { id: string; query: string; created_at: string; plan: unknown } | null;

  return {
    startup: {
      id: st.id,
      slug: st.slug,
      name: st.name,
      tagline: st.tagline,
      industry: st.industry,
      geography: st.geography,
      business_model_type: st.business_model_type,
      brand: st.brand as unknown as StartupDetailDTO["startup"]["brand"],
      problem: st.problem as unknown as StartupDetailDTO["startup"]["problem"],
      solution: st.solution as unknown as StartupDetailDTO["startup"]["solution"],
      customers: (st.customers as unknown as StartupDetailDTO["startup"]["customers"]) ?? [],
      business_model: st.business_model as unknown as StartupDetailDTO["startup"]["business_model"],
      competitors: (st.competitors as unknown as Competitor[]) ?? [],
      differentiation: (st.differentiation as unknown as StartupDetailDTO["startup"]["differentiation"]) ?? [],
      assessment: st.assessment as unknown as Assessment,
      validation_steps: (st.validation_steps as unknown as StartupDetailDTO["startup"]["validation_steps"]) ?? [],
      timeline: (st.timeline as unknown as StartupDetailDTO["startup"]["timeline"]) ?? [],
      pitch: (st.pitch as unknown as StartupDetailDTO["startup"]["pitch"]) ?? { slides: [] },
      business_plan: st.business_plan as unknown as StartupDetailDTO["startup"]["business_plan"],
      hypotheses: (st.hypotheses as unknown as StartupDetailDTO["startup"]["hypotheses"]) ?? [],
      monitor_queries: st.monitor_queries ?? [],
      evidence_source_ids: st.evidence_source_ids ?? [],
      claim_count: st.claim_count,
      research_at: st.research_at,
      last_scanned_at: st.last_scanned_at,
      created_at: st.created_at,
    },
    cluster,
    run: run ? { id: run.id, query: run.query, created_at: run.created_at, plan: (run.plan as RunDTO["plan"]) ?? {} } : null,
    sources: ((srcRows ?? []) as unknown as Record<string, unknown>[]).map(toSource),
    scans: ((scansRes.data ?? []) as unknown as Record<string, unknown>[]).map(toScanSummary),
  };
}

export async function scanDetail(scanId: string): Promise<ScanDetailDTO | null> {
  const db = publicDb();
  const { data, error } = await db.from("market_scans").select("*").eq("id", scanId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: src } = await db.from("sources").select(SOURCE_COLS).eq("scan_id", scanId);
  return {
    scan: {
      ...toScanSummary(data as unknown as Record<string, unknown>),
      startup_id: data.startup_id,
      window_days: data.window_days,
      queries: data.queries ?? [],
      new_source_ids: data.new_source_ids ?? [],
      assessment_before: (data.assessment_before as unknown as Assessment) ?? null,
      assessment_after: (data.assessment_after as unknown as Assessment) ?? null,
      error: data.error,
    },
    sources: ((src ?? []) as unknown as Record<string, unknown>[]).map(toSource),
  };
}
