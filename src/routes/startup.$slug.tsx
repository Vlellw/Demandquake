import { useEffect, useMemo, useRef, useState } from "react";
import { TimeAgo } from "@/components/common/TimeAgo";
import { VerdictBadge } from "@/components/startup/VerdictBadge";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { toast } from "sonner";
import { CalendarClock, Flag, Loader2, Radar, Rocket, Users } from "lucide-react";
import { myProjectsQuery, startupDetailQuery } from "@/lib/queries";
import { claimStartup } from "@/lib/projects.functions";
import { startMarketScan } from "@/lib/research.functions";
import type { StartupDetailDTO } from "@/lib/dto";
import { StartupMark, brandStyle } from "@/components/brand/StartupMark";
import { PitchPlayer } from "@/components/startup/PitchPlayer";
import { SourceProvider, Cite, type Citation } from "@/components/startup/SourceDrawer";
import { EvidenceMap } from "@/components/startup/EvidenceMap";
import { MarketLandscape } from "@/components/startup/MarketLandscape";
import { AssessmentPanel } from "@/components/startup/AssessmentPanel";
import { OpportunityTimeline } from "@/components/startup/OpportunityTimeline";
import { BusinessPlanPanel } from "@/components/startup/BusinessPlanPanel";
import { SourceStream } from "@/components/research/SourceStream";
import { FreshnessBadge, AssessmentStrip } from "@/components/discovery/StartupCard";
import { ObservedTag, InferredTag } from "@/components/common/Provenance";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { StatRule } from "@/components/common/StatRule";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthUser } from "@/hooks/use-auth";
import { DIMENSION_META } from "@/lib/taxonomy";
import { formatDate } from "@/lib/format";

const TABS = ["overview", "evidence", "landscape", "assessment", "updates", "plan"] as const;
type Tab = (typeof TABS)[number];

const TAB_HINT: Record<Tab, string> = {
  overview: "The problem, the proposed solution and who would buy it, in short.",
  evidence: "Every post and article the idea is built on. Click a source to read the original.",
  landscape: "Companies already working on this problem, and where they leave gaps.",
  assessment: "How strong the opportunity looks on each dimension, with the reasoning and sources.",
  updates: "What happened in the market since the research, and how it affects the idea.",
  plan: "A first business plan and the steps to test it with real customers.",
};

interface StartupSearch {
  tab?: Tab | undefined;
  claim?: boolean | undefined;
}

export const Route = createFileRoute("/startup/$slug")({
  validateSearch: (s: Record<string, unknown>): StartupSearch => ({
    tab: TABS.includes(s["tab"] as Tab) ? (s["tab"] as Tab) : undefined,
    claim: s["claim"] === true || s["claim"] === "1" || s["claim"] === 1 ? true : undefined,
  }),
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(startupDetailQuery(params.slug));
    if (!data) throw notFound();
    return { name: data.startup.name, tagline: data.startup.tagline, industry: data.startup.industry };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} — ${loaderData.tagline} | Demandquake` : "Startup profile | Demandquake";
    const description = loaderData
      ? `An unclaimed, evidence-backed ${loaderData.industry ?? ""} startup opportunity discovered from live web research. Explore the evidence, competitors and assessment.`
      : "An evidence-backed startup opportunity discovered by Demandquake.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: loaderData ? `${loaderData.name} — ${loaderData.tagline}` : "Startup profile" },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: StartupPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="eyebrow">Startup not found</p>
      <h1 className="section-title mt-2 text-3xl">This startup isn’t in the catalog</h1>
      <p className="mt-3 text-sm text-muted-foreground">It may have been removed after a research refresh.</p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/" hash="startups">Browse all startups</Link>
      </Button>
    </div>
  ),
});

function buildCitations(d: StartupDetailDTO) {
  const map = new Map<string, Citation[]>();
  const add = (id: string | null | undefined, c: Citation) => {
    if (!id) return;
    map.set(id, [...(map.get(id) ?? []), c]);
  };
  const st = d.startup;
  st.problem.facts.forEach((f) => f.source_ids.forEach((id) => add(id, { context: "Problem fact", text: f.claim })));
  st.assessment.dimensions.forEach((dim) =>
    dim.source_ids.forEach((id) => add(id, { context: `Assessment · ${DIMENSION_META[dim.key]?.label ?? dim.key}`, text: dim.reasoning })),
  );
  st.timeline.forEach((e) => add(e.source_id, { context: "Timeline event", text: e.title }));
  st.competitors.forEach((c) => add(c.source_id, { context: `Competitor · ${c.name}`, text: c.description }));
  d.cluster?.signals.forEach((s) => add(s.source_id, { context: "Signal in problem cluster", text: s.claim }));
  return (id: string) => map.get(id) ?? [];
}

function StartupPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/startup/$slug" });
  const detail = useSuspenseQuery(startupDetailQuery(slug)).data!;
  const st = detail.startup;
  const { user, ready } = useAuthUser();
  const { data: myProjects } = useQuery({ ...myProjectsQuery, enabled: !!user });
  const claimFn = useServerFn(claimStartup);
  const scanFn = useServerFn(startMarketScan);
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);
  const [scanning, setScanning] = useState(false);
  const autoClaimed = useRef(false);
  const tab: Tab = search.tab ?? "overview";

  const citations = useMemo(() => buildCitations(detail), [detail]);
  const evidence = useMemo(() => {
    const ids = new Set(st.evidence_source_ids);
    return detail.sources.filter((s) => ids.has(s.id) && s.origin !== "competitor");
  }, [detail, st.evidence_source_ids]);
  const domains = useMemo(() => [...new Set(evidence.map((s) => s.domain))], [evidence]);
  // Evidence first so citation numbers read 1…n for the core sources.
  const orderedSources = useMemo(() => {
    const ids = new Set(evidence.map((s) => s.id));
    return [...evidence, ...detail.sources.filter((s) => !ids.has(s.id))];
  }, [evidence, detail.sources]);
  const latestScan = detail.scans[0];
  // Prefer a workspace the founder owns; otherwise one a co-founder shared with them.
  const existing = useMemo(() => {
    const mine = (myProjects ?? []).filter((p) => p.startup_id === st.id);
    return mine.find((p) => p.is_owner) ?? mine[0] ?? null;
  }, [myProjects, st.id]);

  async function claim() {
    if (!ready) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/startup/${slug}?claim=1` } });
      return;
    }
    setClaiming(true);
    try {
      const res = await claimFn({ data: { startupId: st.id } });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(res.created ? `${st.name} is now in your workspace` : "Opening your workspace");
      navigate({ to: "/workspace/$projectId", params: { projectId: res.projectId } });
    } catch (err) {
      console.error(err);
      toast.error("Couldn’t claim this startup. Please try again.");
      setClaiming(false);
    }
  }

  useEffect(() => {
    if (search.claim && ready && user && !autoClaimed.current) {
      autoClaimed.current = true;
      void claim();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.claim, ready, user]);

  async function scan() {
    setScanning(true);
    try {
      const res = await scanFn({ data: { startupId: st.id } });
      if (!res.ok) {
        toast.error(res.error);
        setScanning(false);
        return;
      }
      navigate({ to: "/startup/$slug/quake/$scanId", params: { slug, scanId: res.scanId } });
    } catch (err) {
      console.error(err);
      toast.error("Couldn’t start the market scan. Please try again.");
      setScanning(false);
    }
  }

  return (
    <SourceProvider sources={orderedSources} citations={citations}>
      <div style={brandStyle(st.brand)}>
        <Breadcrumbs
          trail={[
            <Link key="d" to="/" hash="startups">
              Discover startups
            </Link>,
            ...(st.industry ? [st.industry] : []),
          ]}
          current={st.name}
        />

        {/* HERO: brand-colored block with the pitch on the right */}
        <section className="brand-banner relative overflow-hidden">
          <div className="relative mx-auto grid max-w-[1400px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:py-14">
            <div className="flex min-w-0 flex-col">
              <p className="eyebrow text-current">
                {[st.industry, st.geography].filter(Boolean).join(" · ") || "Startup idea"}
              </p>
              <div className="mt-4 flex items-center gap-4">
                <StartupMark brand={st.brand} size="xl" className="border-transparent shadow-lift" />
                <div className="min-w-0">
                  <h1 className="font-display text-4xl font-bold leading-[1.02] tracking-[-0.02em] sm:text-6xl">{st.name}</h1>
                  {st.brand.motto && <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] opacity-85">{st.brand.motto}</p>}
                </div>
              </div>
              <p className="mt-6 max-w-xl text-lg leading-snug opacity-95 sm:text-xl">{st.tagline}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Badge variant="inferred">AI-drafted idea · unclaimed</Badge>
                {st.business_model_type && <Badge variant="outline">{st.business_model_type}</Badge>}
                {st.claim_count > 0 && (
                  <Badge variant="outline">
                    <Users /> {st.claim_count} founder{st.claim_count === 1 ? "" : "s"} building
                  </Badge>
                )}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {user && existing ? (
                  <Button asChild size="lg" className="bg-background font-bold text-foreground hover:bg-accent">
                    <Link to="/workspace/$projectId" params={{ projectId: existing.id }}>
                      <Flag /> {existing.is_owner ? "Open your workspace" : "Open shared workspace"}
                    </Link>
                  </Button>
                ) : (
                  <Button size="lg" onClick={claim} disabled={claiming || !ready} className="bg-background font-bold text-foreground hover:bg-accent">
                    {claiming ? <Loader2 className="animate-spin" /> : <Flag />} Claim this startup
                  </Button>
                )}
                <Button variant="glass" size="lg" onClick={scan} disabled={scanning}>
                  {scanning ? <Loader2 className="animate-spin" /> : <Radar />} Check for market changes
                </Button>
              </div>
              <p className="mt-3 max-w-md text-xs leading-relaxed opacity-85">
                {user && existing
                  ? "You already work on this idea. Your notes and checklist are in the workspace."
                  : "Claiming gives you a private workspace with a checklist and notes. The idea stays public, so others can claim it too."}
              </p>
            </div>

            <div className="min-w-0">
              <PitchPlayer
                slides={st.pitch.slides}
                ctx={{
                  name: st.name,
                  tagline: st.tagline,
                  brand: st.brand,
                  evidenceCount: evidence.length,
                  domains,
                  features: st.solution.features.map((f) => f.title),
                  customers: st.customers.map((c) => c.segment),
                  businessModel: st.business_model_type,
                }}
              />
            </div>
          </div>
        </section>

        {/* KEY NUMBERS */}
        <section aria-label="Key numbers" className="bg-surface-sunken">
          <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
            <dl className="mx-auto grid max-w-4xl grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 sm:gap-x-10">
              <StatRule label="Live sources" value={evidence.length} />
              <StatRule label="Competitors" value={st.competitors.length} />
              <StatRule label="Market scans" value={detail.scans.length} />
              <StatRule label="Founders building" value={st.claim_count} />
            </dl>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-center">
              <FreshnessBadge iso={st.research_at} />
              {st.last_scanned_at && <FreshnessBadge iso={st.last_scanned_at} prefix="Last scanned" />}
              {detail.run && (
                <Link to="/research/$runId" params={{ runId: detail.run.id }} className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
                  Found by the research “{detail.run.query}”
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* TABS */}
        <Tabs value={tab} onValueChange={(v) => navigate({ search: (prev) => ({ ...prev, tab: v === "overview" ? undefined : (v as Tab) }), replace: true, resetScroll: false })}>
          <div className="sticky top-16 z-30 border-b border-border bg-background">
            <div className="mx-auto max-w-[1400px] overflow-x-auto px-4 sm:px-6">
              <TabsList variant="line" className="h-14">
                <TabsTrigger variant="line" value="overview">Overview</TabsTrigger>
                <TabsTrigger variant="line" value="evidence">
                  Evidence <span className="ml-1.5 rounded-[3px] bg-observed px-1.5 text-[10px] font-bold leading-4 text-observed-foreground">{evidence.length}</span>
                </TabsTrigger>
                <TabsTrigger variant="line" value="landscape">Competitors</TabsTrigger>
                <TabsTrigger variant="line" value="assessment">Assessment</TabsTrigger>
                <TabsTrigger variant="line" value="updates">
                  Market changes {latestScan && <span className="ml-1.5 size-1.5 rounded-full bg-primary" aria-hidden="true" />}
                </TabsTrigger>
                <TabsTrigger variant="line" value="plan">Business plan</TabsTrigger>
              </TabsList>
            </div>
          </div>
          <p className="mx-auto max-w-[1400px] px-4 pt-6 text-sm text-muted-foreground sm:px-6">{TAB_HINT[tab]}</p>

          <div className="mx-auto max-w-[1400px] px-4 pb-8 pt-4 sm:px-6">
            <TabsContent value="overview" className="mt-0">
              <Overview detail={detail} onTab={(t) => navigate({ search: (p) => ({ ...p, tab: t }), resetScroll: false })} />
            </TabsContent>

            <TabsContent value="evidence" className="mt-0 space-y-6">
              <section className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">Evidence map</p>
                    <h2 className="mt-1 font-display text-xl font-semibold text-foreground">How the problem and startup were derived</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Click any source to inspect the original publication.</p>
                  </div>
                  <div className="flex gap-2">
                    <ObservedTag label="Observed" />
                    <InferredTag label="AI synthesis" />
                  </div>
                </div>
                <div className="mt-5">
                  <EvidenceMap cluster={detail.cluster} competitors={st.competitors} startup={{ name: st.name, tagline: st.tagline, brand: st.brand }} />
                </div>
              </section>
              {detail.cluster && detail.cluster.signals.length > 0 && (
                <section className="panel p-5">
                  <div className="flex items-center justify-between">
                    <p className="eyebrow">Signals extracted from sources</p>
                    <ObservedTag count={detail.cluster.signals.length} />
                  </div>
                  <ul className="mt-4 grid gap-2 md:grid-cols-2">
                    {detail.cluster.signals.map((s, i) => (
                      <li key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                        <p className="flex-1 text-sm text-foreground/90">{s.claim}</p>
                        <Cite ids={[s.source_id]} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="panel p-5">
                <p className="eyebrow">All evidence sources</p>
                <div className="mt-4">
                  <SourceStream sources={evidence} limit={40} />
                </div>
              </section>
            </TabsContent>

            <TabsContent value="landscape" className="mt-0">
              <MarketLandscape
                slug={st.slug}
                startup={{ name: st.name, brand: st.brand }}
                competitors={st.competitors}
                features={st.solution.features}
                differentiation={st.differentiation}
                businessModel={st.business_model}
              />
            </TabsContent>

            <TabsContent value="assessment" className="mt-0">
              <AssessmentPanel assessment={st.assessment} hypotheses={st.hypotheses} evidence={evidence} />
            </TabsContent>

            <TabsContent value="updates" className="mt-0 space-y-6">
              <section className="flex flex-wrap items-center gap-4 rounded-[4px] bg-primary p-6 text-primary-foreground">
                <div className="grid size-12 place-items-center rounded-full border-2 border-primary-foreground">
                  <Radar className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl font-bold">Check for market changes</p>
                  <p className="mt-1 text-sm text-primary-foreground/85">
                    Searches the live web for news since the last check (about 30 seconds) and shows how each change affects the idea.
                  </p>
                </div>
                <Button variant="glass" onClick={scan} disabled={scanning}>
                  {scanning ? <Loader2 className="animate-spin" /> : <Radar />} Run a market scan
                </Button>
              </section>
              <section className="panel p-5">
                <div className="flex items-center justify-between">
                  <p className="eyebrow">Market timeline</p>
                  <span className="text-xs text-muted-foreground">Click a point to open its source</span>
                </div>
                <div className="mt-4">
                  <OpportunityTimeline events={st.timeline} scans={detail.scans.filter((s) => s.status === "complete")} />
                </div>
              </section>
              <section className="panel p-5">
                <p className="eyebrow">Past market scans</p>
                {detail.scans.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No scans yet. Run the first one to check what changed since {formatDate(st.research_at)}.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-border">
                    {detail.scans.map((s) => (
                      <li key={s.id}>
                        <Link to="/startup/$slug/quake/$scanId" params={{ slug, scanId: s.id }} className="flex flex-wrap items-center gap-3 py-3 hover:text-foreground">
                          <VerdictBadge verdict={s.verdict} status={s.status} />
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">{s.headline ?? (s.status === "failed" ? "Scan failed" : "Scan in progress")}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {s.changes.length} change{s.changes.length === 1 ? "" : "s"} · <TimeAgo iso={s.created_at} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {st.monitor_queries.length > 0 && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="data-label">What scans watch for</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {st.monitor_queries.map((q) => (
                        <span key={q} className="rounded-full border border-ink/30 px-3 py-1 text-xs text-foreground">
                          {q}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </TabsContent>

            <TabsContent value="plan" className="mt-0">
              <BusinessPlanPanel model={st.business_model} plan={st.business_plan} validation={st.validation_steps} customers={st.customers} />
            </TabsContent>
          </div>
        </Tabs>

        {/* CLAIM CTA: navy band */}
        <section className="mt-12 bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-[1400px] flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
            <StartupMark brand={st.brand} size="lg" className="border-transparent" />
            <div className="min-w-0 flex-1">
              <p className="eyebrow text-primary-foreground">Ready to build?</p>
              <p className="mt-2 font-display text-3xl font-bold">Build {st.name}</p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary-foreground/85">
                Claiming copies the idea, its sources, the open assumptions and a validation checklist into your private
                workspace. Other founders can claim it too, because the idea stays public.
              </p>
            </div>
            {user && existing ? (
              <Button asChild variant="glass" size="lg">
                <Link to="/workspace/$projectId" params={{ projectId: existing.id }}>
                  <Rocket /> {existing.is_owner ? "Open your workspace" : "Open shared workspace"}
                </Link>
              </Button>
            ) : (
              <Button variant="glass" size="lg" onClick={claim} disabled={claiming || !ready}>
                {claiming ? <Loader2 className="animate-spin" /> : <Rocket />} Claim and start building
              </Button>
            )}
          </div>
        </section>
      </div>
    </SourceProvider>
  );
}

function Overview({ detail, onTab }: { detail: StartupDetailDTO; onTab: (t: Tab) => void }) {
  const st = detail.startup;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="space-y-6">
        <section className="panel p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">The problem</p>
            <InferredTag label="AI synthesis of sources" />
          </div>
          <p className="mt-3 font-display text-xl leading-snug text-foreground">{st.problem.statement}</p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="data-label">Who is affected</dt>
              <dd className="mt-1 text-sm text-foreground/85">{st.problem.who_is_affected}</dd>
            </div>
            <div>
              <dt className="data-label flex items-center gap-1">
                <CalendarClock className="size-3" /> Why now
              </dt>
              <dd className="mt-1 text-sm text-foreground/85">{st.problem.why_now}</dd>
            </div>
          </dl>
          {st.problem.facts.length > 0 && (
            <div className="mt-6 border-t border-border pt-5">
              <div className="flex items-center justify-between">
                <p className="data-label">What the sources say</p>
                <ObservedTag count={st.problem.facts.length} label="Cited facts" />
              </div>
              <ul className="mt-3 space-y-2.5">
                {st.problem.facts.map((f, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="prov-observed flex items-start gap-3 rounded-lg p-3"
                  >
                    <p className="flex-1 text-sm leading-relaxed text-foreground/90">{f.claim}</p>
                    <Cite ids={f.source_ids} />
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="panel p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">The proposed solution</p>
            <InferredTag />
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">{st.solution.summary}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {st.solution.features.map((f, i) => (
              <div key={f.title} className="brand-border rounded-xl border bg-surface-sunken/60 p-4">
                <p className="brand-text font-mono text-[10px] uppercase tracking-wider">Feature {i + 1}</p>
                <p className="mt-1 font-display text-base font-semibold text-foreground">{f.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                <p className="mt-2 border-t border-border pt-2 text-xs text-foreground/70">
                  <span className="text-muted-foreground">Addresses:</span> {f.addresses}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="panel p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">Target customers</p>
            <InferredTag />
          </div>
          <ul className="mt-4 space-y-3">
            {st.customers.map((c) => (
              <li key={c.segment} className="rounded-xl border border-border p-4">
                <p className="font-display text-base font-semibold text-foreground">{c.segment}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="data-label">Pain</p>
                    <p className="mt-0.5 text-foreground/85">{c.pain}</p>
                  </div>
                  <div>
                    <p className="data-label">Buyer</p>
                    <p className="mt-0.5 text-foreground/85">{c.buyer}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <button onClick={() => onTab("assessment")} className="panel block w-full p-6 text-left transition-colors hover:border-border-strong">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Assessment at a glance</p>
            <span className="text-xs text-muted-foreground">Details →</span>
          </div>
          <div className="mt-4">
            <AssessmentStrip card={{ assessment: st.assessment }} />
          </div>
          <p className="mt-4 line-clamp-4 text-sm text-muted-foreground">{st.assessment.summary}</p>
        </button>

        <button onClick={() => onTab("landscape")} className="panel block w-full p-6 text-left transition-colors hover:border-border-strong">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Existing solutions</p>
            <span className="text-xs text-muted-foreground">Landscape →</span>
          </div>
          {st.competitors.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No named competitors surfaced in live sources — validate with buyers.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {st.competitors.slice(0, 4).map((c) => (
                <li key={c.name} className="text-sm">
                  <span className="font-medium text-foreground">{c.name}</span>
                  <span className="text-muted-foreground"> — gap: {c.gap}</span>
                </li>
              ))}
            </ul>
          )}
        </button>

        {st.timeline.length > 0 && (
          <button onClick={() => onTab("updates")} className="panel block w-full p-6 text-left transition-colors hover:border-border-strong">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Latest market events</p>
              <span className="text-xs text-muted-foreground">Timeline →</span>
            </div>
            <ul className="mt-3 space-y-2.5">
              {[...st.timeline]
                .sort((a, b) => new Date(b.date ?? b.discovered_at).getTime() - new Date(a.date ?? a.discovered_at).getTime())
                .slice(0, 3)
                .map((e) => (
                  <li key={e.id} className="flex gap-3 text-sm">
                    <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">{e.date ? formatDate(e.date, { month: "short", year: "numeric" }) : "Undated"}</span>
                    <span className="text-foreground/90">{e.title}</span>
                  </li>
                ))}
            </ul>
          </button>
        )}
      </div>
    </div>
  );
}
