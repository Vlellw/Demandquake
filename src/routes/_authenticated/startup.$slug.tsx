import { useEffect, useMemo, useRef, useState } from "react";
import { TimeAgo } from "@/components/common/TimeAgo";
import { PageError } from "@/components/common/PageError";
import { InfoTip } from "@/components/common/InfoTip";
import { VerdictBadge } from "@/components/startup/VerdictBadge";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Flag,
  Globe,
  ListChecks,
  Loader2,
  Lock,
  NotebookPen,
  Radar,
  Rocket,
  UserPlus,
  Users,
} from "lucide-react";
import { myProjectsQuery, radarQuery, startupDetailQuery } from "@/lib/queries";
import { claimStartup } from "@/lib/projects.functions";
import { startMarketScan } from "@/lib/research.functions";
import type { StartupDetailDTO } from "@/lib/dto";
import { StartupMark, brandStyle, bannerBackground } from "@/components/brand/StartupMark";
import { useStartupBanner } from "@/hooks/use-startup-banner";
import { SourceProvider, Cite, type Citation } from "@/components/startup/SourceDrawer";
import { EvidenceMap } from "@/components/startup/EvidenceMap";
import { SourceStream } from "@/components/research/SourceStream";
import { DemandEvidence } from "@/components/startup/demand/DemandEvidence";
import { useDemandEvidence } from "@/hooks/use-demand-evidence";
import { MarketLandscape } from "@/components/startup/MarketLandscape";
import { AssessmentPanel } from "@/components/startup/AssessmentPanel";
import { OpportunityTimeline } from "@/components/startup/OpportunityTimeline";
import { BusinessPlanPanel } from "@/components/startup/BusinessPlanPanel";
import { ObservedTag, InferredTag } from "@/components/common/Provenance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthUser } from "@/hooks/use-auth";
import { DIMENSION_META } from "@/lib/taxonomy";
import { formatDate } from "@/lib/format";
import { creditAccountQuery, creditCatalogQuery } from "@/lib/credit-queries";
import { getStripeEnvironment } from "@/lib/stripe";
import { canAfford, canClaimPrivately, claimPrices, type ClaimAccess } from "@/lib/credit-rules";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { JourneySteps } from "@/components/journey/JourneySteps";
import { QuakeTrace } from "@/components/discovery/QuakeFeed";
import { OpportunityRadar } from "@/components/discovery/OpportunityRadar";
import { IMPLICATION_META } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

const TABS = ["evidence", "landscape", "assessment", "updates", "plan", "compare"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL: Record<Tab, string> = {
  evidence: "Evidence",
  compare: "Other opportunities",
  landscape: "Competitors",
  assessment: "Assessment",
  updates: "Market changes",
  plan: "Business plan",
};


interface StartupSearch {
  tab?: Tab | undefined;
  claim?: boolean | undefined;
}

export const Route = createFileRoute("/_authenticated/startup/$slug")({
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
    const title = loaderData ? `${loaderData.name} - ${loaderData.tagline} | Demandquake` : "Startup profile | Demandquake";
    const description = loaderData
      ? `An unclaimed, evidence-backed ${loaderData.industry ?? ""} startup opportunity discovered from live web research. Explore the evidence, competitors and assessment.`
      : "An evidence-backed startup opportunity discovered by Demandquake.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: loaderData ? `${loaderData.name} - ${loaderData.tagline}` : "Startup profile" },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: StartupPage,
  errorComponent: PageError,
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="section-title mt-2 text-3xl">This startup isn’t in the catalog</h1>
      <p className="mt-3 text-sm text-muted-foreground">Another founder may have claimed it privately, or it was removed after a research refresh.</p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/discover">Browse all startups</Link>
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
  const { data: detail } = useSuspenseQuery(startupDetailQuery(slug));
  if (!detail) throw notFound();
  const st = detail.startup;
  const demandState = useDemandEvidence(st.slug);
  const [expandedEvidenceSlug, setExpandedEvidenceSlug] = useState<string | null>(null);
  const showMoreEvidence = expandedEvidenceSlug === st.slug;
  const banner = useStartupBanner(st);
  const { user, ready } = useAuthUser();
  const { data: myProjects } = useQuery({ ...myProjectsQuery, enabled: !!user });
  const claimFn = useServerFn(claimStartup);
  const scanFn = useServerFn(startMarketScan);
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);
  const [claimConfirm, setClaimConfirm] = useState(false);
  const [claimAccess, setClaimAccess] = useState<ClaimAccess>("public");
  const claimBusy = useRef(false);
  const account = useQuery({ ...creditAccountQuery(user?.id ?? ''), enabled: Boolean(user) });
  const catalog = useQuery(creditCatalogQuery());
  const wallet = account.data?.wallet;
  const prices = claimPrices(catalog.data?.settings);
  // Anyone else already building it keeps the idea public.
  const privateAvailable = canClaimPrivately(st.claim_count, false);
  const access: ClaimAccess = privateAvailable ? claimAccess : "public";
  const claimCost = prices[access];
  const affordable = wallet ? canAfford(wallet.balance, wallet.reserved, claimCost) : false;
  const [scanning, setScanning] = useState(false);
  const autoClaimed = useRef(false);
  const tab: Tab = search.tab ?? "evidence";
  function goTab(t: Tab) {
    navigate({ search: (p) => ({ ...p, tab: t === "evidence" ? undefined : t }), replace: true, resetScroll: false });
    document.getElementById("inspect")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const citations = useMemo(() => buildCitations(detail), [detail]);
  const evidence = useMemo(() => {
    const ids = new Set(st.evidence_source_ids);
    return detail.sources.filter((s) => ids.has(s.id) && s.origin !== "competitor");
  }, [detail, st.evidence_source_ids]);
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
  const claimed = Boolean(user && existing);

  async function claim() {
    if (!ready) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/startup/${slug}?claim=1` } });
      return;
    }
    setClaimAccess("public");
    setClaimConfirm(true);
  }

  async function confirmClaim() {
    if (claimBusy.current || !affordable) return;
    claimBusy.current = true;
    setClaiming(true);
    try {
      const res = await claimFn({ data: { startupId: st.id, environment: getStripeEnvironment(), access, expectedCost: claimCost } });
      setClaimConfirm(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["credit-account"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["startups"] }),
        queryClient.invalidateQueries({ queryKey: ["startup", slug] }),
      ]);
      toast.success(
        !res.created ? "Opening your workspace" : access === "private" ? `${st.name} is now private to your workspace` : `${st.name} is now in your workspace`,
      );
      navigate({ to: "/workspace/$projectId", params: { projectId: res.projectId }, search: res.created ? { welcome: true } : {} });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "";
      if (/price changed/i.test(message)) void queryClient.invalidateQueries({ queryKey: ["credit-catalog"] });
      if (/already building|claimed this startup privately|no longer available/i.test(message)) {
        void queryClient.invalidateQueries({ queryKey: ["startup", slug] });
        void queryClient.invalidateQueries({ queryKey: ["startups"] });
      }
      toast.error(message ? `${message} No credits were charged.` : "Couldn’t claim this startup. No credits were charged.");
    } finally {
      claimBusy.current = false;
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
        <JourneySteps
          current={2}
          renderStep={(n, content, cls) => {
            if (n === 1)
              return (
                <Link to="/discover" search={{ industry: st.industry ?? "all" }} className={cn(cls, "hover:opacity-80")}>
                  {content}
                </Link>
              );
            if (n === 2)
              return (
                <a href="#inspect" className={cn(cls, "hover:opacity-80")}>
                  {content}
                </a>
              );
            if (claimed && existing)
              return (
                <Link to="/workspace/$projectId" params={{ projectId: existing.id }} className={cn(cls, "hover:opacity-80")}>
                  {content}
                </Link>
              );
            return (
              <Button variant="ghost" type="button" onClick={claim} disabled={!ready} className={cn(cls, "cursor-pointer hover:opacity-80")}>
                {content}
              </Button>
            );
          }}
        />

        {/* HERO: brand-colored block with the pitch on the right */}
        <section className="brand-banner relative overflow-hidden" style={bannerBackground(st.brand, banner)}>
          <div className="relative mx-auto grid max-w-[1400px] gap-10 px-4 py-10 sm:px-6 lg:items-center lg:py-14">
            <div className="flex min-w-0 flex-col">
              <div className="mt-4 flex items-center gap-4">
                <StartupMark brand={st.brand} size="xl" className="border-transparent shadow-lift" />
                <div className="min-w-0">
                  <h1 className="font-display text-4xl font-bold leading-[1.02] tracking-[-0.02em] sm:text-6xl">{st.name}</h1>
                  {st.brand.motto && <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] opacity-85">{st.brand.motto}</p>}
                </div>
              </div>
              <p className="mt-6 max-w-xl text-lg leading-snug opacity-95 sm:text-xl">{st.tagline}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Badge variant="inferred">AI-drafted idea{st.claim_count === 0 ? " · unclaimed" : ""}</Badge>
                {st.is_private && (
                  <Badge variant="outline">
                    <Lock /> Private to your workspace
                  </Badge>
                )}
                {st.business_model_type && <Badge variant="outline">{st.business_model_type}</Badge>}
                {st.claim_count > 0 && !st.is_private && (
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
                    {claiming ? <Loader2 className="animate-spin" /> : <Flag />} Claim this startup · {privateAvailable ? "from " : ""}{prices.public} credits
                  </Button>
                )}
                <Button variant="glass" size="lg" onClick={scan} disabled={scanning}>
                  {scanning ? <Loader2 className="animate-spin" /> : <Radar />} Check for market changes
                </Button>
              </div>
            </div>

          </div>
        </section>

        <section aria-label="Startup overview" className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
          <Overview detail={detail} />
        </section>

        {/* TABS */}
        <Tabs value={tab} onValueChange={(v) => navigate({ search: (prev) => ({ ...prev, tab: v === "evidence" ? undefined : (v as Tab) }), replace: true, resetScroll: false })}>
          <div id="inspect" className="sticky top-16 z-30 scroll-mt-16 border-b border-border bg-background">
            <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 sm:px-6">
              <div className="min-w-0 flex-1 overflow-x-auto">
                <TabsList variant="line" className="h-14">
                  {TABS.map((t) => {
                    return (
                      <TabsTrigger key={t} variant="line" value={t} className="gap-1.5">
                        {TAB_LABEL[t]}
                        {t === "evidence" && (
                          <span className="rounded-[3px] bg-observed px-1.5 text-[10px] font-bold leading-4 text-observed-foreground">{evidence.length}</span>
                        )}
                        {t === "updates" && latestScan && <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
            </div>
          </div>
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pt-6 sm:px-6">
          </div>

          <div className="mx-auto max-w-[1400px] px-4 pb-8 pt-4 sm:px-6">
            <TabsContent value="evidence" className="mt-0 space-y-6">
              <section className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
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
              {st.problem.facts.length > 0 && (
                <section className="panel p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl font-semibold text-foreground">What the sources say</h2>
                    <ObservedTag count={st.problem.facts.length} label="Cited facts" />
                  </div>
                  <ul className="mt-4 space-y-2.5">
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
                </section>
              )}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  aria-expanded={showMoreEvidence}
                  aria-controls="detailed-evidence"
                  onClick={() => setExpandedEvidenceSlug(showMoreEvidence ? null : st.slug)}
                >
                  {showMoreEvidence ? "Show less evidence" : "Show more evidence"}
                  {showMoreEvidence ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </Button>
              </div>
              <div id="detailed-evidence" hidden={!showMoreEvidence} className="space-y-6">
              <DemandEvidence state={demandState} />
              <section className="panel p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-foreground">Original publications</h2>
                  <ObservedTag count={evidence.length} label="Sources" />
                </div>
                <div className="mt-4">
                  <SourceStream sources={evidence} limit={evidence.length} />
                </div>
              </section>
              </div>
            </TabsContent>

            <TabsContent value="compare" className="mt-0">
              <RelatedProblems industry={st.industry} clusterId={detail.cluster?.id ?? null} />
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
                  <p className="font-display text-xl font-bold">
                    Check for market changes{" "}
                    <InfoTip align="start" className="border-primary-foreground/60 text-primary-foreground hover:border-primary-foreground hover:bg-primary-foreground/10">
                      Searches the live web for news since the last check (about 30 seconds) and shows how each change affects the idea.
                    </InfoTip>
                  </p>
                </div>
                <Button variant="glass" onClick={scan} disabled={scanning}>
                  {scanning ? <Loader2 className="animate-spin" /> : <Radar />} Run a market scan
                </Button>
              </section>
              <LatestScan slug={slug} scans={detail.scans} />
              <section className="panel p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Click a point to open its source</span>
                </div>
                <div className="mt-4">
                  <OpportunityTimeline events={st.timeline} scans={detail.scans.filter((s) => s.status === "complete")} />
                </div>
              </section>
              <section className="panel p-5">
                {detail.scans.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No scans yet. Run the first one to check what changed since {formatDate(st.research_at)}.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-border">
                    {detail.scans.map((s) => (
                      <li key={s.id}>
                        <Link to="/startup/$slug/quake/$scanId" params={{ slug, scanId: s.id }} className="flex flex-wrap items-center gap-3 py-3 hover:text-foreground">
                          <VerdictBadge verdict={s.verdict} status={s.status} />
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">{s.headline ?? (s.status === "failed" ? "Scan failed" : "Scan in progress")}</span>
                          {s.status === "complete" && (
                            <span className="hidden w-32 shrink-0 sm:block" aria-hidden="true">
                              <QuakeTrace item={s} className="h-7" />
                            </span>
                          )}
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {s.changes.length} change{s.changes.length === 1 ? "" : "s"} · <TimeAgo iso={s.created_at} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
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
              <p className="mt-2 font-display text-3xl font-bold">Build {st.name}</p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary-foreground/85">
                {st.is_private
                  ? "You claimed this idea privately. Other founders can’t find or claim it - only you and the co-founders you invite can open it."
                  : user && existing
                    ? "Your workspace holds the idea, its sources, the open assumptions and a validation checklist. The idea stays public, so other founders can claim it too."
                    : privateAvailable
                      ? `Claiming copies the idea, its sources, the open assumptions and a validation checklist into your workspace. Claim it publicly for ${prices.public} credits and others can still find it, or privately for ${prices.private} credits to take it out of everyone else’s search.`
                      : `Claiming copies the idea, its sources, the open assumptions and a validation checklist into your workspace for ${prices.public} credits. Other founders are already building it, so it stays public.`}
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
                {claiming ? <Loader2 className="animate-spin" /> : <Rocket />} Claim and start building · {privateAvailable ? "from " : ""}{prices.public} credits
              </Button>
            )}
          </div>
        </section>
      </div>
      <Dialog open={claimConfirm} onOpenChange={(open) => { if (!claiming) setClaimConfirm(open); }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl gap-0 overflow-y-auto rounded-[4px] p-0 sm:rounded-[4px]">
          <div className="border-b border-border bg-surface-sunken px-6 pb-5 pt-6 sm:px-8">
            <DialogTitle className="section-title mt-2 text-2xl">Claim {st.name}</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Choose whether other founders can still find this idea. Your workspace is private either way.
            </DialogDescription>
          </div>
          <div className="px-6 py-6 sm:px-8">
            <ClaimOptions
              value={access}
              onChange={setClaimAccess}
              prices={prices}
              privateAvailable={privateAvailable}
              builders={st.claim_count}
              disabled={claiming}
            />
            <p className="mt-6 text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-foreground">What you get</p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { icon: ListChecks, text: "A validation checklist to test the idea with real customers" },
                { icon: FlaskConical, text: "The AI’s open assumptions, ready to mark as validated or not" },
                { icon: UserPlus, text: "Invite links for co-founders, with shared editing" },
                { icon: NotebookPen, text: "Notes, sources and market scans in one place" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-foreground">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-ink/25 text-primary" aria-hidden="true">
                    <Icon className="size-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            <dl className="mt-6 grid grid-cols-2 gap-4">
              <div className="stat-rule pt-3">
                <dt className="text-sm text-primary">Cost</dt>
                <dd className="font-display text-2xl font-bold text-primary">{claimCost} credits</dd>
              </div>
              <div className="stat-rule pt-3">
                <dt className="text-sm text-primary">You have</dt>
                <dd className="font-display text-2xl font-bold text-primary">
                  {wallet ? `${(wallet.balance - wallet.reserved).toLocaleString("en-US")} credits` : "…"}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-muted-foreground">Charged only when your workspace is created. A failed claim costs nothing.</p>
            {wallet && !affordable && (
              <p role="alert" className="mt-4 rounded-[4px] border border-negative/40 p-3 text-sm text-negative">
                You need {claimCost} available credits for a {access} claim.
              </p>
            )}
            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={claiming} onClick={() => setClaimConfirm(false)}>
                Not yet
              </Button>
              {wallet && !affordable ? (
                <Button asChild>
                  <Link to="/credits">Buy credits</Link>
                </Button>
              ) : (
                <Button disabled={claiming || !affordable} onClick={confirmClaim}>
                  {claiming ? <Loader2 className="animate-spin" /> : access === "private" ? <Lock /> : <Rocket />}{" "}
                  {access === "private" ? "Claim privately" : "Claim publicly"} · {claimCost} credits
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SourceProvider>
  );
}

const CLAIM_OPTIONS: { value: ClaimAccess; icon: typeof Globe; title: string; text: string }[] = [
  { value: "public", icon: Globe, title: "Public claim", text: "Stays in search and the catalog. Other founders can claim it too." },
  {
    value: "private",
    icon: Lock,
    title: "Private claim",
    text: "Removed from everyone else’s search and catalog. Only you and the co-founders you invite can open it.",
  },
];

function ClaimOptions({
  value,
  onChange,
  prices,
  privateAvailable,
  builders,
  disabled,
}: {
  value: ClaimAccess;
  onChange: (v: ClaimAccess) => void;
  prices: Record<ClaimAccess, number>;
  privateAvailable: boolean;
  builders: number;
  disabled: boolean;
}) {
  const refs = useRef<Record<ClaimAccess, HTMLButtonElement | null>>({ public: null, private: null });
  const enabled = CLAIM_OPTIONS.filter((o) => o.value === "public" || privateAvailable).map((o) => o.value);
  function onKeyDown(e: React.KeyboardEvent) {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key) || enabled.length < 2) return;
    e.preventDefault();
    const next = enabled[(enabled.indexOf(value) + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : enabled.length - 1)) % enabled.length]!;
    onChange(next);
    refs.current[next]?.focus();
  }
  return (
    <div role="radiogroup" aria-label="Claim type" className="grid gap-3 sm:grid-cols-2" onKeyDown={onKeyDown}>
      {CLAIM_OPTIONS.map(({ value: v, icon: Icon, title, text }) => {
        const unavailable = v === "private" && !privateAvailable;
        const selected = value === v;
        return (
          <button
            key={v}
            ref={(el) => {
              refs.current[v] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled || unavailable}
            onClick={() => onChange(v)}
            className={cn(
              "flex h-full flex-col rounded-[4px] border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/50",
              unavailable && "cursor-not-allowed border-dashed opacity-70 hover:border-border",
            )}
          >
            <span className="flex w-full items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-display text-base font-bold text-primary">
                <Icon className="size-4" aria-hidden="true" /> {title}
              </span>
              <span
                aria-hidden="true"
                className={cn("grid size-4 shrink-0 place-items-center rounded-full border-2", selected ? "border-primary" : "border-ink/40")}
              >
                {selected && <span className="size-2 rounded-full bg-primary" />}
              </span>
            </span>
            <span className="mt-2 font-display text-2xl font-bold text-foreground">{prices[v]} credits</span>
            <span className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {unavailable ? `Unavailable - ${builders} founder${builders === 1 ? " is" : "s are"} already building this idea.` : text}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Overview({ detail }: { detail: StartupDetailDTO }) {
  const st = detail.startup;
  return (
    <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
      <div className="min-w-0">
        <section className="border-t-2 border-primary pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-xl font-semibold text-primary">The problem</h3>
            <InferredTag label="AI synthesis of sources" />
          </div>
          <p className="mt-5 border-l-2 border-primary/30 bg-muted/50 px-5 py-4 text-lg leading-relaxed text-foreground">{st.problem.statement}</p>
          <dl className="mt-5 divide-y divide-border">
            <div className="pb-5">
              <dt className="flex items-center gap-2 text-sm font-semibold text-primary"><Users className="size-4 shrink-0" />Who is affected</dt>
              <dd className="mt-2 text-sm leading-relaxed text-foreground">{st.problem.who_is_affected}</dd>
            </div>
            <div className="pt-5">
              <dt className="flex items-center gap-2 text-sm font-semibold text-primary">
                <CalendarClock className="size-4 shrink-0" /> Why now
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-foreground">{st.problem.why_now}</dd>
            </div>
          </dl>
        </section>

      </div>

      <div className="min-w-0">
        <section className="border-t-2 border-primary pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-xl font-semibold text-primary">Target customers</h3>
            <InferredTag />
          </div>
          <ul className="mt-5 divide-y divide-border">
            {st.customers.map((c) => (
              <li key={c.segment} className="py-5 first:pt-0 last:pb-0">
                <p className="font-display text-base font-semibold leading-snug text-foreground">{c.segment}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.description}</p>
                <div className="mt-4 grid gap-4 bg-muted/50 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-primary">Pain</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground">{c.pain}</p>
                  </div>
                  <div className="border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                    <p className="text-xs font-semibold text-primary">Buyer</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground">{c.buyer}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}


/** Market signals in context: the latest finished scan drawn as a seismograph, one spike per change. */
function LatestScan({ slug, scans }: { slug: string; scans: StartupDetailDTO["scans"] }) {
  const latest = scans.find((s) => s.status === "complete");
  if (!latest) return null;
  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="mt-1 font-display text-lg font-bold leading-snug text-foreground">{latest.headline ?? "Market scan completed"}</p>
        </div>
        <VerdictBadge verdict={latest.verdict} status={latest.status} />
      </div>
      <div className="mt-4 border-y border-border py-3">
        <QuakeTrace item={latest} className="h-20" />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          {(["positive", "negative", "uncertain"] as const).map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className="h-[3px] w-4 rounded-full" style={{ background: IMPLICATION_META[k].color }} aria-hidden="true" />
              {IMPLICATION_META[k].label}
            </li>
          ))}
          <li>
            {latest.changes.length} change{latest.changes.length === 1 ? "" : "s"} from {latest.candidates_count} new sources ·{" "}
            <TimeAgo iso={latest.completed_at ?? latest.created_at} />
          </li>
        </ul>
        <Link
          to="/startup/$slug/quake/$scanId"
          params={{ slug, scanId: latest.id }}
          className="inline-flex items-center gap-1 text-sm font-bold text-primary underline-offset-4 hover:underline"
        >
          See what changed <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

/** Market signals in context: other problems found in the same industry, with this idea's problem ringed. */
function RelatedProblems({ industry, clusterId }: { industry: string | null; clusterId: string | null }) {
  const { data, isLoading, isError, refetch } = useQuery(radarQuery);
  const nodes = useMemo(() => (data ?? []).filter((n) => !industry || n.industry === industry), [data, industry]);
  return (
    <section aria-labelledby="related-heading" className="space-y-3">
      <div>
        <h2 id="related-heading" className="mt-1 font-display text-xl font-semibold text-foreground">
          Other problems we found{industry ? ` in ${industry}` : ""}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Compare how much evidence each problem has. Click a dot to read the posts behind it.</p>
      </div>
      {isLoading ? (
        <div className="panel grid h-[380px] place-items-center text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading the problem map…
          </span>
        </div>
      ) : isError ? (
        <div className="panel flex flex-wrap items-center justify-between gap-3 p-5 text-sm text-muted-foreground">
          The problem map couldn’t load.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <OpportunityRadar nodes={nodes} highlightId={clusterId} compact />
      )}
    </section>
  );
}
