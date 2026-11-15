import { useEffect, useState } from "react";
import { TimeAgo } from "@/components/common/TimeAgo";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { Clock3, Hourglass, Loader2, RotateCcw, TriangleAlert } from "lucide-react";
import { runDetailQuery } from "@/lib/queries";
import { getStripeEnvironment } from '@/lib/stripe';
import { useAuthUser } from '@/hooks/use-auth';
import { retryDiscovery } from "@/lib/research.functions";
import { useRunDriver } from "@/hooks/use-run-driver";
import { StageRail, stageIndex } from "@/components/research/StageRail";
import { ResearchConstellation } from "@/components/research/ResearchConstellation";
import { StartupCard } from "@/components/discovery/StartupCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatRule } from "@/components/common/StatRule";
import { ObservedTag, InferredTag } from "@/components/common/Provenance";
import { SourceFavicon } from "@/components/common/SourceFavicon";
import { industryColor } from "@/lib/taxonomy";
import { markSearchDone } from "@/lib/journey";
import { JourneySteps } from "@/components/journey/JourneySteps";

import type { RunDetailDTO } from "@/lib/dto";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/research/$runId")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(runDetailQuery(params.runId));
    if (!data) throw notFound();
    return { query: data.run.query };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Live research: ${loaderData.query} - Demandquake` : "Live research - Demandquake" },
      { name: "description", content: "Watch Demandquake research the live web and turn evidence into startup opportunities." },
      { property: "og:title", content: loaderData ? `Live research: ${loaderData.query}` : "Live research - Demandquake" },
      { property: "og:description", content: "Live web sources, problem clusters and generated startups - with provenance." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResearchPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-display text-2xl text-foreground">Research run not found</p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/discover">Back to discovery</Link>
      </Button>
    </div>
  ),
});

function useElapsed(fromIso: string, toIso: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (toIso) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [toIso]);
  const end = toIso ? new Date(toIso).getTime() : now;
  const secs = Math.max(0, Math.round((end - new Date(fromIso).getTime()) / 1000));
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

function ResearchPage() {
  const { runId } = Route.useParams();
  const initial = useSuspenseQuery(runDetailQuery(runId)).data!;
  const live = useQuery({
    ...runDetailQuery(runId),
    refetchInterval: (q) => {
      const st = q.state.data?.run.status;
      return st === "complete" || st === "failed" ? false : 2500;
    },
  });
  const detail = (live.data ?? initial) as RunDetailDTO;
  const { run } = detail;
  const { user } = useAuthUser();
  const { driverError, restart } = useRunDriver(runId, run.status, Boolean(user));
  const retry = useServerFn(retryDiscovery);
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState(false);
  const elapsed = useElapsed(run.created_at, run.completed_at ?? (run.status === "failed" ? run.updated_at : null));
  const idx = stageIndex(detail);
  const evidence = detail.sources.filter((s) => s.origin === "web" || s.origin === "news");
  const competitors = detail.sources.filter((s) => s.origin === "competitor");
  const waitingUntil = run.stats.rate_wait_until ? new Date(run.stats.rate_wait_until).getTime() : 0;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!waitingUntil || waitingUntil < Date.now()) return;
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [waitingUntil]);
  const waitSecs = Math.max(0, Math.round((waitingUntil - Date.now()) / 1000));

  async function onRetry() {
    setRetrying(true);
    try {
      await retry({ data: { runId, environment: getStripeEnvironment() } });
      await queryClient.invalidateQueries({ queryKey: ["run", runId] });
      restart();
    } finally {
      setRetrying(false);
    }
  }

  const isDone = run.status === "complete";
  const isFailed = !isDone && (run.status === "failed" || Boolean(driverError));

  // A finished search reveals ideas within Search & Discover.
  useEffect(() => {
    if (isDone) markSearchDone();
  }, [isDone]);

  return (
    <div className="relative">
      <JourneySteps
        current={1}
        renderStep={(n, content, cls) =>
          n === 1 ? (
            <Link to="/discover" className={cls + " hover:opacity-80"}>
              {content}
            </Link>
          ) : undefined
        }
      />
      <div className="relative mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              {isDone ? (
                <Badge variant="positive">Research complete</Badge>
              ) : isFailed ? (
                <Badge variant="negative">Needs attention</Badge>
              ) : (
                <Badge variant="live">
                  <span className="relative mr-1 flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                  </span>
                  Researching the live web
                </Badge>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" /> {elapsed}
              </span>
              <span className="text-xs text-muted-foreground">started <TimeAgo iso={run.created_at} /></span>
            </div>
            <h1 className="section-title mt-2 text-3xl sm:text-[2.5rem]">“{run.query}”</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {(run.plan.industry || run.industry) && (
                <Badge variant="outline">
                  <span className="size-1.5 rounded-full" style={{ background: industryColor(run.plan.industry ?? run.industry) }} />
                  {run.plan.industry ?? run.industry}
                </Badge>
              )}
              {(run.plan.geography || run.geography) && <Badge variant="outline">{run.plan.geography ?? run.geography}</Badge>}
            </div>
          </div>
          <dl className="grid w-full grid-cols-3 gap-4 sm:w-auto sm:min-w-[18rem] [&>div]:border-t [&>div]:border-border [&>div]:pt-2 [&_dd]:text-xl [&_dd]:font-semibold [&_dd]:text-muted-foreground [&_dt]:text-xs [&_dt]:text-muted-foreground">
            <StatRule label="Sources read" value={evidence.length} />
            <StatRule label="Problems found" value={detail.clusters.length} />
            <StatRule label="Startups" value={detail.startups.length} />
          </dl>
        </header>

        {waitSecs > 0 && !isDone && !isFailed && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex items-center gap-3 rounded-[4px] border border-moderate/40 bg-moderate/[0.08] px-4 py-3 text-sm text-foreground">
            <Hourglass className="size-4 text-moderate" />
            Queued behind the Context.dev request limit to protect live research - resuming in about {waitSecs}s.
          </motion.div>
        )}

        {isFailed && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[4px] border border-negative/40 bg-negative/[0.06] px-4 py-3">
            <TriangleAlert className="size-4 text-negative" />
            <p className="flex-1 text-sm text-foreground/90">{driverError ?? run.error ?? "This research step failed."} No results were invented - completed steps are kept.</p>
            <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
              {retrying ? <Loader2 className="animate-spin" /> : <RotateCcw />} Retry step
            </Button>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="panel h-fit p-5 lg:sticky lg:top-20">
            <StageRail detail={detail} />
          </aside>

          <div className="min-w-0 space-y-6">
            {isDone && detail.startups.length > 0 && (
              <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="panel-raised p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">
                      {detail.startups.length} unclaimed startup{detail.startups.length === 1 ? "" : "s"} discovered
                    </h2>
                  </div>
                  <InferredTag label="AI-generated concepts" />
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {detail.startups.map((s, i) => (
                    <StartupCard key={s.id} card={s} index={i} />
                  ))}
                </div>
              </motion.section>
            )}


            {/* Constellation */}
            {detail.clusters.length > 0 && (
              <section className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="mt-1 font-display text-lg font-semibold text-foreground">How separate sources combined into opportunities</h2>
                  </div>
                  <p className="text-xs text-muted-foreground">Hover a source or problem to trace its connections</p>
                </div>
                <div className="mt-4">
                  <ResearchConstellation sources={detail.sources} clusters={detail.clusters} startups={detail.startups} />
                </div>
              </section>
            )}

            {/* Clusters */}
            {detail.clusters.length > 0 && (
              <section className="grid gap-3 md:grid-cols-2">
                {detail.clusters.map((c) => {
                  const compSources = competitors.filter((s) => c.competitor_source_ids.includes(s.id));
                  return (
                    <motion.div key={c.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="panel p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: industryColor(c.industry) }} />
                            Problem #{c.rank + 1} · {c.category}
                          </p>
                          <h3 className="mt-1 font-display text-base font-semibold leading-snug text-foreground">{c.title}</h3>
                        </div>
                        <GenerationChip status={c.generation_status} />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{c.summary}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <ObservedTag label="Sources" count={c.source_ids.length} />
                        <Badge variant="outline" className="capitalize">{c.evidence_strength}</Badge>
                      </div>
                      {compSources.length > 0 && (
                        <div className="mt-3 border-t border-border pt-3">
                          <p className="data-label">Existing solutions checked</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {compSources.slice(0, 6).map((s) => (
                              <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground">
                                <SourceFavicon domain={s.domain} className="size-3" /> {s.domain}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {c.generation_error && <p className="mt-2 text-xs text-negative">{c.generation_error}</p>}
                    </motion.div>
                  );
                })}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GenerationChip({ status }: { status: string }) {
  if (status === "done") return <Badge variant="positive">Startup generated</Badge>;
  if (status === "running")
    return (
      <Badge variant="live">
        <Loader2 className="animate-spin" /> Generating
      </Badge>
    );
  if (status === "pending") return <Badge variant="outline">Queued</Badge>;
  if (status === "failed") return <Badge variant="negative">Failed</Badge>;
  return <Badge variant="secondary">Mapped only</Badge>;
}

function SkeletonSources({ active }: { active: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={cn("h-[86px] overflow-hidden rounded-lg border border-border bg-surface-sunken/60", active && "shimmer-line")} />
      ))}
      <p className="col-span-full pt-1 text-center text-xs text-muted-foreground">
        {active ? "Searching complaints, regulations, news and technology shifts…" : "No sources were retrieved."}
      </p>
    </div>
  );
}
