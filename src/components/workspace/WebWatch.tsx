import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Eye, EyeOff, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/common/InfoTip";
import { InferredTag } from "@/components/common/Provenance";
import { TimeAgo } from "@/components/common/TimeAgo";
import { formatDate } from "@/lib/format";
import { getWebWatch, startWebWatch, stopWebWatch, syncWebWatch } from "@/lib/watch.functions";
import { changeLink, type WebWatchDTO } from "@/lib/watch";
import { cn } from "@/lib/utils";

const domainOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

/** Weekly Context.dev web watch for a claimed startup: findings arrive on their own schedule. */
export function WebWatch({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const key = ["web-watch", projectId] as const;
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: key, queryFn: () => getWebWatch({ data: { projectId } }), staleTime: 60_000 });
  const startFn = useServerFn(startWebWatch);
  const syncFn = useServerFn(syncWebWatch);
  const stopFn = useServerFn(stopWebWatch);
  const [busy, setBusy] = useState<"start" | "stop" | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const synced = useRef(false);
  const set = (w: WebWatchDTO) => qc.setQueryData(key, w);

  async function sync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await syncFn({ data: { projectId } });
      if (res.ok) set(res.watch);
      else setSyncError(res.error);
    } catch {
      setSyncError("Couldn't check for new findings. Your saved findings are unchanged.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    if (!data?.stale || synced.current) return;
    synced.current = true;
    void sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.stale, projectId]);

  async function start() {
    setBusy("start");
    try {
      const res = await startFn({ data: { projectId } });
      if (res.ok) set(res.watch);
      else toast.error(res.error);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't start the weekly watch. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function stop() {
    setBusy("stop");
    try {
      const res = await stopFn({ data: { projectId } });
      if (res.ok) set(res.watch);
      else toast.error(res.error);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't stop the weekly watch. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (data && !data.supported) return null;
  const failed = data?.watches.filter((w) => w.status === "error") ?? [];
  const nextRun = data?.watches
    .map((w) => w.next_run_at)
    .filter((x): x is string => Boolean(x))
    .sort()[0];

  return (
    <section className="panel p-5" aria-labelledby="web-watch-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="web-watch-title" className="flex items-center gap-1.5 font-display text-lg font-semibold text-foreground">
          Weekly web watch
          <InfoTip align="start">
            Context.dev checks the web every week for new articles, rule changes, launches and funding news about this problem, and watches a
            competitor's pricing page when one is known. New findings appear here when you open the workspace. Included with your workspace.
          </InfoTip>
        </h2>
        <Eye className={cn("size-5 shrink-0 text-observed", syncing && "animate-pulse")} aria-hidden="true" />
      </div>

      {isLoading && (
        <div className="mt-4 space-y-2" aria-label="Loading weekly watch">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-foreground/[0.05]" />
          ))}
        </div>
      )}
      {isError && (
        <p className="mt-4 text-sm text-negative">
          Couldn't load the weekly watch.{" "}
          <button className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </p>
      )}
      {syncError && (
        <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-negative">
          <p>{syncError}</p>
          <Button variant="outline" size="sm" onClick={sync} disabled={syncing}>
            <RotateCw className={cn("size-4", syncing && "animate-spin")} /> Try again
          </Button>
        </div>
      )}

      {data && !data.subscribed && (
        <Button onClick={start} disabled={busy !== null} variant="outline" className="mt-4 w-full">
          {busy === "start" ? <Loader2 className="animate-spin" /> : <Eye />} Start weekly watch
        </Button>
      )}

      {data?.subscribed && (
        <div className="mt-4 space-y-4">
          <ul className="space-y-2">
            {data.watches.map((w) => (
              <li key={w.kind} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{w.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{w.kind === "pricing" ? domainOf(w.target) : `"${w.target}"`}</p>
                </div>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  {w.status === "active" ? (
                    w.next_run_at ? (
                      <>Next check {formatDate(w.next_run_at, { day: "numeric", month: "short" })}</>
                    ) : (
                      "Active"
                    )
                  ) : w.status === "creating" ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Setting up
                    </span>
                  ) : (
                    <span className="text-negative">Not running</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {failed.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="flex items-start gap-2 text-sm text-foreground/90">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                {failed[0]?.error}
              </p>
              <Button size="sm" variant="outline" onClick={start} disabled={busy !== null}>
                <RotateCw className={cn("size-3.5", busy === "start" && "animate-spin")} aria-hidden="true" /> Try again
              </Button>
            </div>
          )}

          {data.changes.length > 0 ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-primary">New findings</h3>
                <InferredTag label="AI summaries" />
              </div>
              <ul className="space-y-2.5">
                {data.changes.map((c) => {
                  const link = changeLink(c);
                  return (
                    <li key={c.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">{c.title}</p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          <TimeAgo iso={c.detected_at} />
                        </span>
                      </div>
                      {c.summary && <p className="prov-inferred mt-2 rounded-md px-2.5 py-1.5 text-sm text-foreground/80">{c.summary}</p>}
                      {c.matched.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {c.matched.slice(0, 3).map((m) => (
                            <li key={m.url}>
                              <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-xs text-observed underline-offset-4 hover:underline">
                                {m.title ?? domainOf(m.url)}
                                <span className="text-muted-foreground"> · {domainOf(m.url)}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        link && (
                          <a href={link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-observed underline-offset-4 hover:underline">
                            {domainOf(link)}
                          </a>
                        )
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              {syncing
                ? "Checking for new findings…"
                : nextRun
                  ? `No new findings yet. The next weekly check runs on ${formatDate(nextRun, { day: "numeric", month: "short" })}.`
                  : "No new findings yet. Findings appear here after the first weekly check."}
            </p>
          )}

          <Button variant="ghost" size="sm" onClick={stop} disabled={busy !== null} className="text-muted-foreground">
            {busy === "stop" ? <Loader2 className="animate-spin" /> : <EyeOff />} Stop watching
          </Button>
        </div>
      )}
    </section>
  );
}
