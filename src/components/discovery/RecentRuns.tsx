import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, CircleDashed, Loader2, TriangleAlert } from "lucide-react";
import { TimeAgo } from "@/components/common/TimeAgo";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Badge } from "@/components/ui/badge";
import type { RunDTO } from "@/lib/dto";

function StatusLine({ status }: { status: string }) {
  if (status === "complete")
    return (
      <span className="inline-flex items-center gap-1.5 text-positive">
        <CheckCircle2 className="size-3.5" /> Finished
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1.5 text-negative">
        <TriangleAlert className="size-3.5" /> Stopped
      </span>
    );
  if (status === "queued")
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <CircleDashed className="size-3.5" /> Waiting to start
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-primary">
      <Loader2 className="size-3.5 animate-spin" /> Researching now
    </span>
  );
}

/** "Latest research" as Lindström news cards: status kicker, the question as title, outlined tags. */
export function RecentRuns({ runs, embedded = false }: { runs: RunDTO[]; embedded?: boolean }) {
  if (runs.length === 0) {
    return embedded ? (
      <p className="rounded-[4px] bg-surface-sunken px-6 py-12 text-center text-sm text-muted-foreground">No research has run yet.</p>
    ) : null;
  }
  const list = (
      <ul className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${embedded ? "" : "mt-12"}`}>
        {runs.slice(0, 6).map((r) => (
          <li key={r.id}>
            <Link
              to="/research/$runId"
              params={{ runId: r.id }}
              className="group flex h-full flex-col rounded-[4px] border-t-4 border-primary bg-card p-5 shadow-panel transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="flex items-center justify-between gap-3 text-[0.6875rem] font-bold uppercase tracking-[0.06em]">
                <StatusLine status={r.status} />
                <span className="font-normal normal-case tracking-normal text-muted-foreground">
                  <TimeAgo iso={r.created_at} />
                </span>
              </p>
              <h3 className="mt-3 line-clamp-3 font-display text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
                {r.query}
              </h3>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {r.stats.sources ? <Badge variant="observed">{r.stats.sources} sources</Badge> : null}
                {r.stats.startups ? <Badge variant="default">{r.stats.startups} startups</Badge> : null}
                {r.industry && <Badge variant="outline">{r.industry}</Badge>}
                {r.geography && <Badge variant="outline">{r.geography}</Badge>}
              </div>
              <span className="mt-auto inline-flex items-center gap-1 pt-5 text-xs font-bold text-primary">
                Replay this research <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
  );
  if (embedded) return list;
  return (
    <section id="latest-research" aria-labelledby="runs-heading" className="mx-auto max-w-[1400px] px-4 pt-20 sm:px-6">
      <SectionHeading
        id="runs-heading"
        eyebrow="Stay up to date"
        title="The latest research"
        description="Every research run is shared with signed-in founders. Open one to replay what was searched, which sources were read and which startups came out of it."
      />
      {list}
    </section>
  );
}
