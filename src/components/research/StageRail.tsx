import { motion } from "motion/react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import type { RunDetailDTO } from "@/lib/dto";
import { cn } from "@/lib/utils";

export const STAGE_ORDER = [
  { key: "plan", label: "Research plan", running: ["queued", "planning"], done: "planned" },
  { key: "search", label: "Live web scan", running: ["planned", "searching"], done: "searched" },
  { key: "analyze", label: "Signals & problem clusters", running: ["searched", "analyzing"], done: "analyzed" },
  { key: "competitors", label: "Competitor investigation", running: ["analyzed", "investigating"], done: "generating" },
  { key: "generate", label: "Startup generation", running: ["generating"], done: "complete" },
] as const;

const STATUS_INDEX: Record<string, number> = {
  queued: 0,
  planning: 0,
  planned: 1,
  searching: 1,
  searched: 2,
  analyzing: 2,
  analyzed: 3,
  investigating: 3,
  generating: 4,
  complete: 5,
};

export function stageIndex(detail: RunDetailDTO): number {
  const { run } = detail;
  if (run.status === "failed") {
    const failed = run.stats.failed_stage ?? "queued";
    return STATUS_INDEX[failed] ?? 0;
  }
  return STATUS_INDEX[run.status] ?? 0;
}

function stageDetail(key: string, d: RunDetailDTO): string | null {
  const st = d.run.stats;
  switch (key) {
    case "plan":
      return d.run.plan.searches?.length ? `${d.run.plan.searches.length} web queries + news` : null;
    case "search":
      return st.sources ? `${st.sources} sources · ${st.domains ?? 0} domains` : null;
    case "analyze":
      return d.clusters.length ? `${d.clusters.length} problems from ${new Set(d.clusters.flatMap((c) => c.signals.map((s) => s.source_id))).size} sources` : null;
    case "competitors":
      return st.competitors != null ? `${st.competitors} product pages found` : null;
    case "generate": {
      const target = d.clusters.filter((c) => c.generation_status !== "skipped").length;
      return target ? `${d.startups.length} of ${target} startups` : null;
    }
  }
  return null;
}

export function StageRail({ detail }: { detail: RunDetailDTO }) {
  const current = stageIndex(detail);
  const failed = detail.run.status === "failed";
  return (
    <ol className="relative space-y-1">
      {STAGE_ORDER.map((stage, i) => {
        const state = i < current ? "done" : i === current ? (failed ? "failed" : detail.run.status === "complete" ? "done" : "active") : "pending";
        const info = stageDetail(stage.key, detail);
        return (
          <li key={stage.key} className="relative flex gap-3 pb-5 last:pb-0">
            {i < STAGE_ORDER.length - 1 && (
              <span className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-px bg-border">
                <motion.span
                  className="absolute inset-x-0 top-0 bg-primary"
                  initial={false}
                  animate={{ height: state === "done" ? "100%" : "0%" }}
                  transition={{ duration: 0.6 }}
                />
              </span>
            )}
            <span
              className={cn(
                "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors",
                state === "done" && "border-primary/60 bg-primary/15 text-primary",
                state === "active" && "border-primary bg-primary text-primary-foreground shadow-glow",
                state === "failed" && "border-negative bg-negative/15 text-negative",
                state === "pending" && "border-border-strong bg-surface text-faint",
              )}
            >
              {state === "done" ? (
                <Check className="size-3.5" />
              ) : state === "active" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : state === "failed" ? (
                <TriangleAlert className="size-3.5" />
              ) : (
                i + 1
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={cn("text-sm font-medium", state === "pending" ? "text-faint" : "text-foreground")}>{stage.label}</p>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {info ?? (state === "active" ? "working…" : state === "pending" ? "waiting" : "")}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
