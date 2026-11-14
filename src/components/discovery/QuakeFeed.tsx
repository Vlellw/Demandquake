import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { StartupMark } from "@/components/brand/StartupMark";
import { TimeAgo } from "@/components/common/TimeAgo";
import { SectionHeading } from "@/components/common/SectionHeading";
import { VerdictBadge } from "@/components/startup/VerdictBadge";
import { Button } from "@/components/ui/button";
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

/** Seismograph of one market scan: one spike per relevant change, colored by what it means for the idea. */
export function QuakeTrace({ item, className = "h-14" }: { item: Pick<QuakeFeedItemDTO, "id" | "changes">; className?: string }) {
  const { base, bursts } = useMemo(() => buildTrace(item.id, item.changes), [item.id, item.changes]);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      role="img"
      aria-label={`${item.changes.length} relevant change${item.changes.length === 1 ? "" : "s"}`}
    >
      <path d={base} fill="none" stroke="var(--border-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {bursts.map((b, i) => (
        <g key={`${item.id}-${i}`}>
          <title>{`${IMPLICATION_META[b.change.implication]?.label ?? "Change"}: ${b.change.title}`}</title>
          <path
            d={b.d}
            fill="none"
            stroke={IMPLICATION_META[b.change.implication]?.color ?? "var(--uncertain)"}
            strokeWidth={2}
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

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Navy band in the place of Lindström's testimonials: one market scan at a time, its headline as the
 * quote, and its seismograph in a white card. Follows the discover filters.
 */
export function QuakeFeed({ items, filtered }: { items: QuakeFeedItemDTO[]; filtered: boolean }) {
  const [index, setIndex] = useState(0);
  const count = items.length;
  const i = count ? Math.min(index, count - 1) : 0;
  const q = items[i];

  return (
    <section id="market-changes" aria-labelledby="market-heading" className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeading
          id="market-heading"
          tone="inverse"
          eyebrow="Market watch"
          title="What changed in the market"
          description="Market scans read newly published articles about a startup’s problem. Each spike below is one change that matters."
        />

        {!q ? (
          <p className="mx-auto mt-10 max-w-md text-center text-sm text-primary-foreground/85">
            {filtered ? "No market scans match your filters yet." : "No market scans have finished yet."}
          </p>
        ) : (
          <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
            <div className="min-w-0" aria-live="polite">
              <p className="eyebrow text-primary-foreground">
                {q.startup.name}
                {q.startup.industry ? ` · ${q.startup.industry}` : ""}
              </p>
              <blockquote className="mt-3 font-display text-xl font-bold leading-snug sm:text-[1.6rem]">
                “{q.headline ?? "Market scan completed"}”
              </blockquote>
              <p className="mt-4 text-sm text-primary-foreground/90">
                <span className="font-bold">
                  {q.changes.length} change{q.changes.length === 1 ? "" : "s"}
                </span>
                <span className="mx-2 opacity-60">|</span>
                {q.candidates_count} new sources checked · <TimeAgo iso={q.completed_at ?? q.created_at} />
              </p>
              <div className="mt-7">
                <Button asChild variant="glass">
                  <Link to="/startup/$slug/quake/$scanId" params={{ slug: q.startup.slug, scanId: q.id }}>
                    See what changed <ArrowRight />
                  </Link>
                </Button>
              </div>
              {count > 1 && (
                <div className="mt-10 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIndex((i - 1 + count) % count)}
                    className="grid size-9 cursor-pointer place-items-center rounded-full border-2 border-primary-foreground transition-colors hover:bg-primary-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70"
                    aria-label="Previous market change"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndex((i + 1) % count)}
                    className="grid size-9 cursor-pointer place-items-center rounded-full border-2 border-primary-foreground transition-colors hover:bg-primary-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70"
                    aria-label="Next market change"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                  <span className="ml-1 text-sm tabular-nums">
                    <span className="font-bold">{pad(i + 1)}</span>
                    <span className="mx-2 opacity-60">|</span>
                    <span className="opacity-80">{pad(count)}</span>
                  </span>
                </div>
              )}
            </div>

            <Link
              to="/startup/$slug/quake/$scanId"
              params={{ slug: q.startup.slug, scanId: q.id }}
              className="group block rounded-[4px] bg-background p-5 text-foreground shadow-lift transition-transform hover:-translate-y-0.5 sm:p-7"
            >
              <div className="flex items-center gap-3">
                <StartupMark brand={q.startup.brand} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-bold">{q.startup.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[q.startup.industry, q.startup.geography].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <VerdictBadge verdict={q.verdict} status={q.status} />
              </div>
              <div className="mt-5 border-y border-border py-3">
                <QuakeTrace key={q.id} item={q} className="h-24" />
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                {(["positive", "negative", "uncertain"] as const).map((k) => (
                  <li key={k} className="flex items-center gap-1.5">
                    <span className="h-[3px] w-4 rounded-full" style={{ background: IMPLICATION_META[k].color }} />
                    {IMPLICATION_META[k].label}
                  </li>
                ))}
              </ul>
              {q.changes.length > 0 ? (
                <ul className="mt-5 space-y-2.5">
                  {q.changes.slice(0, 3).map((c, ci) => (
                    <li key={`${c.source_id}-${ci}`} className="flex gap-2.5 text-sm">
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full"
                        style={{ background: IMPLICATION_META[c.implication]?.color ?? "var(--uncertain)" }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="sr-only">{IMPLICATION_META[c.implication]?.label}: </span>
                        <span className="line-clamp-2">{c.title}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 text-sm text-muted-foreground">No new article changed this idea’s outlook.</p>
              )}
              <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
                Open the full scan <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
