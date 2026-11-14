import { useMemo, useRef, useState, useEffect } from "react";
import { scaleTime } from "d3-scale";
import { motion } from "motion/react";
import { Radar } from "lucide-react";
import type { TimelineEvent } from "@/lib/types";
import { TIMELINE_CATEGORIES } from "@/lib/types";
import { IMPLICATION_META, TIMELINE_META } from "@/lib/taxonomy";
import type { ScanSummaryDTO } from "@/lib/dto";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Cite, useSources } from "./SourceDrawer";
import { cn } from "@/lib/utils";

function eventDate(e: TimelineEvent) {
  return new Date(e.date ?? e.discovered_at);
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(800);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => e && setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const IMPL_BADGE = { positive: "positive", negative: "negative", uncertain: "uncertain" } as const;

export function OpportunityTimeline({ events, scans, compact = false }: { events: TimelineEvent[]; scans: ScanSummaryDTO[]; compact?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const { open } = useSources();
  const lanes = TIMELINE_CATEGORIES.filter((c) => events.some((e) => e.category === c));
  const laneH = compact ? 30 : 38;
  const left = compact ? 120 : 160;
  const H = lanes.length * laneH + 44;
  // "Now" is taken after hydration; before that the newest data point stands in, so server and browser render alike.
  const [clientNow, setClientNow] = useState<number | null>(null);
  useEffect(() => setClientNow(Date.now()), []);
  const dataNow = useMemo(
    () => Math.max(0, ...events.map((e) => eventDate(e).getTime()), ...scans.map((s) => new Date(s.created_at).getTime())),
    [events, scans],
  );
  const nowMs = clientNow ?? dataNow;

  const { x, ticks, fmt } = useMemo(() => {
    const dates = events.map(eventDate).concat(scans.map((s) => new Date(s.created_at)), [new Date(nowMs)]);
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(nowMs);
    const pad = Math.max(1000 * 60 * 60 * 24 * 7, (max.getTime() - min.getTime()) * 0.06);
    const sc = scaleTime()
      .domain([new Date(min.getTime() - pad), new Date(max.getTime() + pad * 0.6)])
      .range([left, Math.max(left + 200, width - 16)]);
    const spanDays = (max.getTime() - min.getTime()) / 86_400_000;
    const fmt: Intl.DateTimeFormatOptions = spanDays < 120 ? { day: "numeric", month: "short" } : { month: "short", year: "2-digit" };
    return { x: sc, ticks: sc.ticks(Math.max(3, Math.floor((width - left) / 110))), fmt };
  }, [events, scans, width, left, nowMs]);

  const sorted = [...events].sort((a, b) => eventDate(b).getTime() - eventDate(a).getTime());
  const listed = filter ? sorted.filter((e) => e.category === filter) : sorted;

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No dated market events have been mapped yet. Run a market scan to start the timeline.</p>;
  }

  return (
    <div className="space-y-5">
      <div ref={ref} className="relative w-full overflow-hidden rounded-[4px] border border-border bg-background">
        <svg width={width} height={H} role="img" aria-label="Timeline of market events affecting this opportunity">
          {lanes.map((c, i) => (
            <g key={c} opacity={filter && filter !== c ? 0.3 : 1}>
              <rect x={0} y={i * laneH + 8} width={width} height={laneH} fill={i % 2 ? "transparent" : "var(--surface-sunken)"} />
              <text x={14} y={i * laneH + 8 + laneH / 2 + 4} className="fill-muted-foreground text-[11px]">
                {compact ? TIMELINE_META[c].short : TIMELINE_META[c].label}
              </text>
            </g>
          ))}
          {ticks.map((t) => (
            <g key={t.getTime()}>
              <line x1={x(t)} x2={x(t)} y1={8} y2={H - 28} stroke="var(--border)" />
              <text x={x(t)} y={H - 12} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {formatDate(t.toISOString(), fmt)}
              </text>
            </g>
          ))}
          {scans.map((s) => (
            <g key={s.id}>
              <line x1={x(new Date(s.created_at))} x2={x(new Date(s.created_at))} y1={4} y2={H - 28} stroke="var(--primary)" strokeDasharray="3 3" opacity={0.6} />
              <circle cx={x(new Date(s.created_at))} cy={6} r={3} fill="var(--primary)" />
            </g>
          ))}
          <line x1={x(new Date(nowMs))} x2={x(new Date(nowMs))} y1={4} y2={H - 28} stroke="var(--foreground)" opacity={0.25} />
          {events.map((e, i) => {
            const lane = lanes.indexOf(e.category);
            const cx = x(eventDate(e));
            const cy = lane * laneH + 8 + laneH / 2;
            const color = IMPLICATION_META[e.implication].color;
            const active = hover === e.id;
            const dim = filter && filter !== e.category;
            return (
              <motion.g
                key={e.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: dim ? 0.25 : 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05, type: "spring", stiffness: 200, damping: 18 }}
                style={{ transformOrigin: `${cx}px ${cy}px`, cursor: e.source_id ? "pointer" : "default" }}
                onMouseEnter={() => setHover(e.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => e.source_id && open(e.source_id)}
              >
                {e.scan_id && <circle cx={cx} cy={cy} r={11} fill="none" stroke="var(--primary)" strokeWidth={1.4} className="animate-pulse" />}
                <circle cx={cx} cy={cy} r={active ? 8 : 6} fill={color} stroke="var(--background)" strokeWidth={2} />
                {!e.date && <circle cx={cx} cy={cy} r={2} fill="var(--background)" />}
              </motion.g>
            );
          })}
        </svg>
        {hover && (() => {
          const e = events.find((x) => x.id === hover)!;
          const lane = lanes.indexOf(e.category);
          const cx = x(eventDate(e));
          return (
            <div
              className="pointer-events-none absolute z-10 w-64 rounded-[4px] border border-border bg-popover p-3 text-xs shadow-lift"
              style={{ left: Math.min(Math.max(8, cx - 128), width - 264), top: lane * laneH + laneH + 14 }}
            >
              <p className="text-[10px] text-muted-foreground">
                {e.date ? formatDate(e.date) : `Undated · found ${formatDate(e.discovered_at)}`}
              </p>
              <p className="mt-1 font-semibold text-foreground">{e.title}</p>
              <p className="mt-1 text-muted-foreground">{e.note}</p>
            </div>
          );
        })()}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        {(["positive", "negative", "uncertain"] as const).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: IMPLICATION_META[k].color }} /> {IMPLICATION_META[k].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border border-primary" /> Found by market scan
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Radar className="size-3 text-primary" /> Scan date
        </span>
      </div>

      {!compact && (
        <>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setFilter(null)} className={cn("cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors", !filter ? "border-primary bg-primary text-primary-foreground" : "border-ink/30 text-foreground hover:border-ink")}>
              All · {events.length}
            </button>
            {lanes.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(filter === c ? null : c)}
                className={cn("cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors", filter === c ? "border-primary bg-primary text-primary-foreground" : "border-ink/30 text-foreground hover:border-ink")}
              >
                {TIMELINE_META[c].label} · {events.filter((e) => e.category === c).length}
              </button>
            ))}
          </div>
          <ol className="relative space-y-3 border-l border-border pl-5">
            {listed.map((e) => (
              <li key={e.id} className="relative" onMouseEnter={() => setHover(e.id)} onMouseLeave={() => setHover(null)}>
                <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full ring-4 ring-background" style={{ background: IMPLICATION_META[e.implication].color }} />
                <div className={cn("panel p-4 transition-shadow", hover === e.id && "shadow-lift")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">{e.date ? formatDate(e.date) : `Found ${formatDate(e.discovered_at)}`}</span>
                    <Badge variant="outline">{TIMELINE_META[e.category].label}</Badge>
                    <Badge variant={IMPL_BADGE[e.implication]}>{IMPLICATION_META[e.implication].label}</Badge>
                    {e.scan_id && <Badge variant="live">Market scan</Badge>}
                    {e.source_id && <Cite ids={[e.source_id]} className="ml-auto" />}
                  </div>
                  <p className="mt-2 font-semibold text-foreground">{e.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{e.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
