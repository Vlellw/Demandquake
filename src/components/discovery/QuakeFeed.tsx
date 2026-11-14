import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Activity } from "lucide-react";
import { StartupMark } from "@/components/brand/StartupMark";
import { TimeAgo } from "@/components/common/TimeAgo";
import { VerdictBadge } from "@/components/startup/VerdictBadge";
import { IMPLICATION_META } from "@/lib/taxonomy";
import type { QuakeFeedItemDTO } from "@/lib/dto";
import type { ScanChange } from "@/lib/types";

const W = 320;
const H = 56;
const MID = H / 2;

function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (Math.abs(h) % 2147483646) + 1;
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Quiet baseline plus one damped burst per relevant change, positioned in order of the change list. */
function buildTrace(id: string, changes: ScanChange[]) {
  const rnd = rng(hashSeed(id));
  const base: string[] = [`M0 ${MID}`];
  for (let x = 4; x <= W; x += 4) base.push(`L${x} ${(MID + (rnd() - 0.5) * 2.2).toFixed(1)}`);
  const bursts = changes.slice(0, 8).map((c, i, arr) => {
    const cx = ((i + 1) / (arr.length + 1)) * W;
    const pts: string[] = [];
    for (let dx = -30; dx <= 30; dx += 3) {
      const decay = 1 - Math.abs(dx) / 30;
      const amp = (dx % 6 === 0 ? -1 : 1) * decay * decay * (MID - 4) * (0.7 + rnd() * 0.3);
      pts.push(`${pts.length ? "L" : "M"}${(cx + dx).toFixed(1)} ${(MID + amp).toFixed(1)}`);
    }
    return { d: pts.join(" "), cx, change: c };
  });
  return { base: base.join(" "), bursts };
}

function QuakeTrace({ item }: { item: QuakeFeedItemDTO }) {
  const { base, bursts } = useMemo(() => buildTrace(item.id, item.changes), [item.id, item.changes]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-14 w-full" role="img" aria-label={`${item.changes.length} relevant changes`}>
      <path d={base} fill="none" stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {bursts.map((b, i) => (
        <g key={i}>
          <title>{`${IMPLICATION_META[b.change.implication]?.label ?? "Change"}: ${b.change.title}`}</title>
          <path
            d={b.d}
            fill="none"
            stroke={IMPLICATION_META[b.change.implication]?.color ?? "var(--uncertain)"}
            strokeWidth={1.6}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="quake-burst"
            style={{ animationDelay: `${i * 140}ms` }}
          />
        </g>
      ))}
    </svg>
  );
}

export function QuakeFeed({ items }: { items: QuakeFeedItemDTO[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            <Activity className="size-3.5" /> Opportunity quakes
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">How live news moved these opportunities</h2>
        </div>
        <div className="max-w-md text-sm text-muted-foreground">
          <p>Each spike is one relevant change a market scan found in newly published sources.</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
            {(["positive", "negative", "uncertain"] as const).map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded-full" style={{ background: IMPLICATION_META[k].color }} />
                {IMPLICATION_META[k].label}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((q) => (
          <Link
            key={q.id}
            to="/startup/$slug/quake/$scanId"
            params={{ slug: q.startup.slug, scanId: q.id }}
            className="panel group flex min-w-0 flex-col p-4 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-3">
              <StartupMark brand={q.startup.brand} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold text-foreground">{q.startup.name}</p>
                {q.startup.industry && <p className="truncate text-[11px] text-muted-foreground">{q.startup.industry}</p>}
              </div>
              <VerdictBadge verdict={q.verdict} status={q.status} />
            </div>
            <div className="mt-3 rounded-lg border border-border bg-background/40 px-2">
              <QuakeTrace item={q} />
            </div>
            <p className="mt-3 line-clamp-2 min-h-10 text-sm text-foreground/90">{q.headline ?? "Market scan completed"}</p>
            <div className="mt-auto flex items-center justify-between gap-2 pt-3 font-mono text-[10px] text-muted-foreground">
              <span className="truncate">
                {q.changes.length} change{q.changes.length === 1 ? "" : "s"} · {q.candidates_count} new sources checked ·{" "}
                <TimeAgo iso={q.completed_at ?? q.created_at} />
              </span>
              <ArrowRight className="size-3.5 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
