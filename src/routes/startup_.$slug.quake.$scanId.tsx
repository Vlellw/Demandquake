import { useMemo, useState } from "react";
import { TimeAgo } from "@/components/common/TimeAgo";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Loader2, Newspaper, Radar, RotateCcw, Search, TriangleAlert, Waves } from "lucide-react";
import { scanDetailQuery, startupDetailQuery } from "@/lib/queries";
import { useScanDriver } from "@/hooks/use-scan-driver";
import type { Assessment, AssessmentDimension, ScanChange } from "@/lib/types";
import type { ScanDetailDTO } from "@/lib/dto";
import { DIMENSION_KEYS } from "@/lib/types";
import { DIMENSION_META, IMPLICATION_META, LEVEL_META, TIMELINE_META } from "@/lib/taxonomy";
import { StartupMark, brandStyle } from "@/components/brand/StartupMark";
import { SeismicField } from "@/components/common/SeismicField";
import { LevelMeter } from "@/components/common/LevelMeter";
import { InferredTag, ObservedTag } from "@/components/common/Provenance";
import { SourceProvider, Cite } from "@/components/startup/SourceDrawer";
import { SourceStream } from "@/components/research/SourceStream";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/startup_/$slug/quake/$scanId")({
  loader: async ({ context, params }) => {
    const [startup, scan] = await Promise.all([
      context.queryClient.ensureQueryData(startupDetailQuery(params.slug)),
      context.queryClient.ensureQueryData(scanDetailQuery(params.scanId)),
    ]);
    if (!startup || !scan || scan.scan.startup_id !== startup.startup.id) throw notFound();
    return { name: startup.startup.name, headline: scan.scan.headline };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `Opportunity Quake: ${loaderData.name} | Demandquake` : "Opportunity Quake | Demandquake";
    const description = loaderData?.headline
      ? `${loaderData.headline} — a live market scan of ${loaderData.name}.`
      : "A live market scan comparing new web developments against a startup opportunity.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: QuakePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-display text-2xl text-foreground">Scan not found</p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/">Back to discovery</Link>
      </Button>
    </div>
  ),
});

type VerdictCopy = { label: string; tone: string; badge: "positive" | "negative" | "uncertain" | "outline" };
const UNCHANGED: VerdictCopy = { label: "No material change", tone: "text-muted-foreground", badge: "outline" };
const VERDICT_COPY: Record<string, VerdictCopy> = {
  strengthened: { label: "Opportunity strengthened", tone: "text-positive", badge: "positive" },
  weakened: { label: "Opportunity weakened", tone: "text-negative", badge: "negative" },
  mixed: { label: "Mixed signals", tone: "text-uncertain", badge: "uncertain" },
  unchanged: { label: "No material change", tone: "text-muted-foreground", badge: "outline" },
};

function QuakePage() {
  const { slug, scanId } = Route.useParams();
  const startupDetail = useSuspenseQuery(startupDetailQuery(slug)).data!;
  const initial = useSuspenseQuery(scanDetailQuery(scanId)).data!;
  const live = useQuery({
    ...scanDetailQuery(scanId),
    refetchInterval: (q) => {
      const st = q.state.data?.scan.status;
      return st === "complete" || st === "failed" ? false : 2500;
    },
  });
  const detail = (live.data ?? initial) as ScanDetailDTO;
  const { scan } = detail;
  const st = startupDetail.startup;
  const { driverError, restart } = useScanDriver(scanId, slug, scan.status);
  const done = scan.status === "complete";
  const failed = scan.status === "failed" || Boolean(driverError);

  const allSources = useMemo(() => {
    const m = new Map(startupDetail.sources.map((s) => [s.id, s]));
    for (const s of detail.sources) m.set(s.id, s);
    return [...m.values()];
  }, [startupDetail.sources, detail.sources]);

  const changeCitations = useMemo(() => {
    const map = new Map<string, { context: string; text: string }[]>();
    for (const c of scan.changes) map.set(c.source_id, [...(map.get(c.source_id) ?? []), { context: `Scan change · ${TIMELINE_META[c.category].label}`, text: c.explanation }]);
    return (id: string) => map.get(id) ?? [];
  }, [scan.changes]);

  const relevantIds = new Set(scan.changes.map((c) => c.source_id));
  const scanSources = detail.sources;
  const verdict = VERDICT_COPY[scan.verdict ?? "unchanged"] ?? UNCHANGED;
  const intensity = done ? Math.min(1, scan.changes.length / 4) : 0.8;

  return (
    <SourceProvider sources={allSources} citations={changeCitations}>
      <div style={brandStyle(st.brand)}>
        <section className="relative overflow-hidden border-b border-border">
          <div className="bg-hero pointer-events-none absolute inset-0" />
          <SeismicField className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full opacity-60" intensity={intensity} />
          <div className="relative mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:py-12">
            <Link to="/startup/$slug" params={{ slug }} search={{ tab: "updates" }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> {st.name}
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <StartupMark brand={st.brand} size="md" />
              <div>
                <p className="eyebrow flex items-center gap-1.5 text-primary">
                  <Radar className="size-3.5" /> Opportunity Quake
                </p>
                <p className="font-display text-lg font-semibold text-foreground">{st.name}</p>
              </div>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                Scan started {formatDateTime(scan.created_at)} · window {scan.window_days} days
              </span>
            </div>

            {!done && !failed && (
              <div className="mt-10 max-w-2xl">
                <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">Listening for tremors in the market…</h1>
                <ol className="mt-6 space-y-3">
                  <ScanStep active={scan.status === "fetching"} done={scan.status !== "fetching"} icon={<Search className="size-4" />}>
                    Searching Context.dev news and web for developments in the last {scan.window_days} days
                  </ScanStep>
                  <ScanStep active={scan.status === "analyzing"} done={false} icon={<Waves className="size-4" />}>
                    {scan.status === "analyzing"
                      ? `Comparing ${scan.candidates_count} new publication${scan.candidates_count === 1 ? "" : "s"} against the current assessment`
                      : "Comparing new findings against the current assessment"}
                  </ScanStep>
                </ol>
              </div>
            )}

            {failed && (
              <div className="mt-10 max-w-2xl rounded-xl border border-negative/30 bg-negative/[0.07] p-5">
                <p className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
                  <TriangleAlert className="size-5 text-negative" /> The scan couldn’t finish
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{driverError ?? detail.scan.error ?? "Something went wrong during the scan."} Nothing about this startup was changed.</p>
                {driverError && scan.status !== "failed" && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={restart}>
                    <RotateCcw /> Retry
                  </Button>
                )}
              </div>
            )}

            {done && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-10 max-w-3xl">
                <Badge variant={verdict.badge}>{verdict.label}</Badge>
                <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-foreground sm:text-[2.6rem]">{scan.headline}</h1>
                {scan.summary && <p className="mt-4 text-[15px] leading-relaxed text-foreground/85">{scan.summary}</p>}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Magnitude label="New publications reviewed" value={scan.candidates_count} />
                  <Magnitude label="Relevant changes" value={scan.changes.length} />
                  <Magnitude label="Dimensions affected" value={changedDimensions(scan.assessment_before, scan.assessment_after).length} />
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {done && (
          <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-10 sm:px-6">
            {scan.changes.length > 0 && (
              <section>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-foreground">What changed</h2>
                  <InferredTag label="AI-interpreted impact" />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {scan.changes.map((c, i) => (
                    <ChangeCard key={i} change={c} index={i} />
                  ))}
                </div>
              </section>
            )}

            {scan.assessment_before && scan.assessment_after && (
              <section className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="eyebrow">Assessment before → after</p>
                    <h2 className="mt-1 font-display text-xl font-semibold text-foreground">How the opportunity moved</h2>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">Qualitative levels — no scores</span>
                </div>
                <AssessmentDiff before={scan.assessment_before} after={scan.assessment_after} />
              </section>
            )}

            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="eyebrow">Publications reviewed in this scan</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {relevantIds.size} of {scanSources.length} affected the assessment. Every publication was retrieved live from Context.dev.
                  </p>
                </div>
                <ObservedTag count={scanSources.length} />
              </div>
              <div className="mt-4">
                {scanSources.length ? (
                  <SourceStream sources={[...scanSources].sort((a, b) => Number(relevantIds.has(b.id)) - Number(relevantIds.has(a.id)))} limit={24} />
                ) : (
                  <p className="text-sm text-muted-foreground">No new publications outside the existing evidence were found in this window.</p>
                )}
              </div>
              {scan.queries.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-4">
                  <span className="data-label mr-1">Queries</span>
                  {scan.queries.map((q) => (
                    <span key={q} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      <Newspaper className="size-3" /> {q}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-5">
              <p className="text-sm text-muted-foreground">The startup profile, timeline and assessment now reflect this scan. Completed <TimeAgo iso={scan.completed_at} />.</p>
              <Button asChild variant="hero">
                <Link to="/startup/$slug" params={{ slug }} search={{ tab: "updates" }}>
                  View updated timeline <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </SourceProvider>
  );
}

function ScanStep({ active, done, icon, children }: { active: boolean; done: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-center gap-3 rounded-xl border p-4 transition-colors", active ? "border-primary/40 bg-primary/[0.06]" : "border-border")}>
      <span className={cn("flex size-8 items-center justify-center rounded-lg", done ? "bg-positive/15 text-positive" : active ? "bg-primary/15 text-primary" : "bg-foreground/5 text-muted-foreground")}>
        {done ? <Check className="size-4" /> : active ? <Loader2 className="size-4 animate-spin" /> : icon}
      </span>
      <span className={cn("text-sm", active || done ? "text-foreground" : "text-muted-foreground")}>{children}</span>
    </li>
  );
}

function Magnitude({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface/70 px-4 py-3 backdrop-blur">
      <p className="data-label">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ChangeCard({ change, index }: { change: ScanChange; index: number }) {
  const color = IMPLICATION_META[change.implication].color;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="panel relative overflow-hidden p-5"
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{TIMELINE_META[change.category].label}</Badge>
        <Badge variant={change.implication}>{IMPLICATION_META[change.implication].label}</Badge>
        <Cite ids={[change.source_id]} className="ml-auto" />
      </div>
      <p className="mt-3 font-display text-base font-semibold text-foreground">{change.title}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{change.explanation}</p>
      {change.affected_dimensions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {change.affected_dimensions.map((d) => (
            <span key={d} className="rounded-md bg-foreground/[0.05] px-2 py-0.5 text-[11px] text-foreground/80">
              {DIMENSION_META[d]?.label ?? d}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function changedDimensions(before: Assessment | null, after: Assessment | null): string[] {
  if (!before || !after) return [];
  return DIMENSION_KEYS.filter((k) => {
    const b = before.dimensions.find((d) => d.key === k);
    const a = after.dimensions.find((d) => d.key === k);
    return b && a && (b.level !== a.level || b.reasoning !== a.reasoning);
  });
}

function AssessmentDiff({ before, after }: { before: Assessment; after: Assessment }) {
  const [showAll, setShowAll] = useState(false);
  const changed = new Set(changedDimensions(before, after));
  const rows = DIMENSION_KEYS.map((k) => ({
    key: k,
    b: before.dimensions.find((d) => d.key === k),
    a: after.dimensions.find((d) => d.key === k),
  })).filter((r): r is { key: typeof r.key; b: AssessmentDimension; a: AssessmentDimension } => Boolean(r.a && r.b));
  const visible = showAll ? rows : rows.filter((r) => changed.has(r.key));

  return (
    <div className="mt-5">
      {visible.length === 0 && <p className="text-sm text-muted-foreground">No dimension changed — the assessment holds.</p>}
      <div className="space-y-3">
        {visible.map(({ key, b, a }) => {
          const levelMoved = a.level !== b.level;
          const up = LEVEL_META[a.level].rank > LEVEL_META[b.level].rank;
          return (
            <div key={key} className={cn("rounded-xl border p-4", changed.has(key) ? "border-border-strong" : "border-border opacity-75")}>
              <div className="flex flex-wrap items-center gap-3">
                <p className="min-w-40 font-display text-sm font-semibold text-foreground">{DIMENSION_META[key].label}</p>
                <LevelMeter level={b.level} />
                <ArrowRight className={cn("size-4", levelMoved ? (up ? "text-positive" : "text-negative") : "text-faint")} />
                <LevelMeter level={a.level} />
                {!levelMoved && changed.has(key) && <span className="text-[11px] text-muted-foreground">Reasoning updated</span>}
                {a.source_ids.length > 0 && <Cite ids={a.source_ids} className="ml-auto" />}
              </div>
              {changed.has(key) && <p className="mt-2 text-sm text-foreground/85">{a.reasoning}</p>}
            </div>
          );
        })}
      </div>
      <button onClick={() => setShowAll((s) => !s)} className="mt-3 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        {showAll ? "Show changed dimensions only" : `Show all ${rows.length} dimensions`}
      </button>
      <p className="mt-2 font-mono text-[10px] text-faint">Before: {formatDate(before.updated_at)} · After: {formatDate(after.updated_at)}</p>
    </div>
  );
}
