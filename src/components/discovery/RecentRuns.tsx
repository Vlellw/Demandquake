import { Link } from "@tanstack/react-router";
import { TimeAgo } from "@/components/common/TimeAgo";
import { CheckCircle2, CircleDashed, Loader2, TriangleAlert } from "lucide-react";
import type { RunDTO } from "@/lib/dto";


export function RecentRuns({ runs }: { runs: RunDTO[] }) {
  if (runs.length === 0) return null;
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Latest discoveries</p>
        <span className="font-mono text-[11px] text-faint">live research log</span>
      </div>
      <ul className="mt-4 divide-y divide-border">
        {runs.map((r) => {
          const status = r.status;
          const icon =
            status === "complete" ? (
              <CheckCircle2 className="size-4 text-positive" />
            ) : status === "failed" ? (
              <TriangleAlert className="size-4 text-negative" />
            ) : status === "queued" ? (
              <CircleDashed className="size-4 text-muted-foreground" />
            ) : (
              <Loader2 className="size-4 animate-spin text-primary" />
            );
          return (
            <li key={r.id}>
              <Link
                to="/research/$runId"
                params={{ runId: r.id }}
                className="group flex items-center gap-3 py-2.5 text-sm"
              >
                {icon}
                <span className="min-w-0 flex-1 truncate text-foreground/90 group-hover:text-foreground">{r.query}</span>
                <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground sm:inline">
                  {r.stats.sources ? `${r.stats.sources} src` : ""}
                  {r.stats.startups ? ` · ${r.stats.startups} startups` : ""}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-faint"><TimeAgo iso={r.created_at} /></span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
