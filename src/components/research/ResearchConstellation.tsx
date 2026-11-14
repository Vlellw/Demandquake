import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { ClusterDTO, StartupCardDTO } from "@/lib/dto";
import type { SourceRecord } from "@/lib/types";
import { industryColor, signalLabel } from "@/lib/taxonomy";

const TYPE_COLORS: Record<string, string> = {
  complaint: "var(--cat-2)",
  regulation: "var(--cat-7)",
  news: "var(--cat-6)",
  company: "var(--cat-3)",
  technology: "var(--cat-9)",
  discussion: "var(--cat-4)",
  request: "var(--cat-1)",
  research: "var(--cat-12)",
};

export function typeColor(t: string | null | undefined) {
  return TYPE_COLORS[t ?? ""] ?? "var(--faint)";
}

/**
 * Flow from live sources → AI-identified problem clusters → generated startups.
 * Edges exist only where a cluster signal cites the source.
 */
export function ResearchConstellation({
  sources,
  clusters,
  startups,
}: {
  sources: SourceRecord[];
  clusters: ClusterDTO[];
  startups: StartupCardDTO[];
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const evidence = sources.filter((s) => s.origin === "web" || s.origin === "news");
  const W = 900;
  const rowH = 16;
  const H = Math.max(320, Math.min(evidence.length, 46) * rowH + 40);

  const layout = useMemo(() => {
    const sorted = [...evidence]
      .sort((a, b) => (a.signal_type ?? a.search_intent ?? "").localeCompare(b.signal_type ?? b.search_intent ?? ""))
      .slice(0, 46);
    const srcPos = new Map(sorted.map((s, i) => [s.id, { x: 150, y: 24 + i * ((H - 48) / Math.max(1, sorted.length - 1)) }]));
    const clusterPos = new Map(
      clusters.map((c, i) => [c.id, { x: 520, y: 40 + (i + 0.5) * ((H - 80) / Math.max(1, clusters.length)) }]),
    );
    const startupPos = new Map<string, { x: number; y: number; card: StartupCardDTO }>();
    for (const c of clusters) {
      const st = startups.find((s) => s.id === c.startup_id);
      const cp = clusterPos.get(c.id)!;
      if (st) startupPos.set(c.id, { x: 790, y: cp.y, card: st });
    }
    const edges: { from: string; to: string; color: string }[] = [];
    for (const c of clusters) {
      for (const sid of new Set(c.signals.map((s) => s.source_id))) {
        if (srcPos.has(sid)) edges.push({ from: sid, to: c.id, color: industryColor(c.industry) });
      }
    }
    return { sorted, srcPos, clusterPos, startupPos, edges };
  }, [evidence, clusters, startups, H]);

  const linked = new Set(focus ? layout.edges.filter((e) => e.to === focus || e.from === focus).flatMap((e) => [e.from, e.to]) : []);

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[640px] w-full" role="img" aria-label="How sources combine into problems and startups">
        <text x={150} y={12} textAnchor="middle" className="fill-observed font-mono text-[10px] uppercase tracking-[0.14em]">
          Live sources · observed
        </text>
        <text x={520} y={12} textAnchor="middle" className="fill-inferred font-mono text-[10px] uppercase tracking-[0.14em]">
          Problem clusters · AI synthesis
        </text>
        <text x={790} y={12} textAnchor="middle" className="fill-inferred font-mono text-[10px] uppercase tracking-[0.14em]">
          Startups · AI generated
        </text>

        {layout.edges.map((e, i) => {
          const a = layout.srcPos.get(e.from)!;
          const b = layout.clusterPos.get(e.to)!;
          const dim = focus && !(linked.has(e.from) && linked.has(e.to));
          return (
            <motion.path
              key={`${e.from}-${e.to}`}
              d={`M${a.x + 6} ${a.y} C ${a.x + 180} ${a.y}, ${b.x - 200} ${b.y}, ${b.x - 34} ${b.y}`}
              fill="none"
              stroke={e.color}
              strokeWidth={1.2}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: dim ? 0.06 : 0.45 }}
              transition={{ duration: 0.9, delay: 0.2 + i * 0.015 }}
            />
          );
        })}

        {[...layout.startupPos.entries()].map(([cid, p]) => {
          const c = layout.clusterPos.get(cid)!;
          return (
            <motion.path
              key={`s-${cid}`}
              d={`M${c.x + 34} ${c.y} L ${p.x - 30} ${p.y}`}
              stroke="var(--inferred)"
              strokeDasharray="4 4"
              strokeWidth={1.4}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1, opacity: focus && focus !== cid ? 0.15 : 0.8 }}
              transition={{ duration: 0.6 }}
            />
          );
        })}

        {layout.sorted.map((s, i) => {
          const p = layout.srcPos.get(s.id)!;
          const dim = focus && !linked.has(s.id);
          return (
            <motion.g
              key={s.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: dim ? 0.25 : 1, x: 0 }}
              transition={{ delay: Math.min(i, 40) * 0.02 }}
              onMouseEnter={() => setFocus(s.id)}
              onMouseLeave={() => setFocus(null)}
              className="cursor-default"
            >
              <circle cx={p.x} cy={p.y} r={4.5} fill={typeColor(s.signal_type)} />
              <text x={p.x - 12} y={p.y + 3.5} textAnchor="end" className="fill-muted-foreground text-[10px]">
                {s.domain.length > 22 ? s.domain.slice(0, 21) + "…" : s.domain}
              </text>
              <title>{`${s.title} - ${s.domain} (${signalLabel(s.signal_type)})`}</title>
            </motion.g>
          );
        })}

        {clusters.map((c, i) => {
          const p = layout.clusterPos.get(c.id)!;
          const r = 14 + Math.sqrt(c.source_ids.length) * 6;
          const dim = focus && !linked.has(c.id) && focus !== c.id;
          return (
            <motion.g
              key={c.id}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: dim ? 0.3 : 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.12, type: "spring", stiffness: 140, damping: 16 }}
              style={{ transformOrigin: `${p.x}px ${p.y}px` }}
              onMouseEnter={() => setFocus(c.id)}
              onMouseLeave={() => setFocus(null)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={industryColor(c.industry)}
                fillOpacity={0.18}
                stroke={industryColor(c.industry)}
                strokeDasharray={c.evidence_strength === "emerging" ? "3 3" : undefined}
                strokeWidth={c.evidence_strength === "strong" ? 2.2 : 1.3}
              />
              <text x={p.x} y={p.y + 4} textAnchor="middle" className="fill-foreground font-mono text-[11px] font-semibold">
                {c.source_ids.length}
              </text>
              <foreignObject x={p.x + r + 8} y={p.y - 32} width={170} height={30}>
                <p className="line-clamp-2 text-[11px] leading-tight text-foreground/90">{c.title}</p>
              </foreignObject>
            </motion.g>
          );
        })}

        {[...layout.startupPos.entries()].map(([cid, p]) => (
          <motion.g key={`st-${cid}`} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
            <rect
              x={p.x - 28}
              y={p.y - 14}
              width={110}
              height={28}
              rx={8}
              fill="var(--surface-raised)"
              stroke="var(--inferred)"
              strokeDasharray="4 3"
            />
            <text x={p.x + 27} y={p.y + 4} textAnchor="middle" className="fill-foreground font-display text-[12px] font-semibold">
              {p.card.name.length > 14 ? p.card.name.slice(0, 13) + "…" : p.card.name}
            </text>
          </motion.g>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {Object.entries(TYPE_COLORS)
          .filter(([t]) => evidence.some((s) => s.signal_type === t))
          .map(([t, color]) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: color }} />
              {signalLabel(t)}
            </span>
          ))}
      </div>
    </div>
  );
}
