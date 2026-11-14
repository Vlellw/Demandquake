import { useEffect, useMemo, useRef, useState } from "react";
import { TimeAgo } from "@/components/common/TimeAgo";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { forceCollide, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, ExternalLink, Info, Loader2, X } from "lucide-react";
import type { RadarNodeDTO } from "@/lib/dto";
import { clusterSignalsQuery } from "@/lib/queries";
import { industryColor, signalLabel } from "@/lib/taxonomy";

import { Badge } from "@/components/ui/badge";
import { StartupMark } from "@/components/brand/StartupMark";
import { SourceFavicon } from "@/components/common/SourceFavicon";
import { ObservedTag } from "@/components/common/Provenance";
import { cn } from "@/lib/utils";

type SimNode = SimulationNodeDatum & { d: RadarNodeDTO; r: number; ax: number; ay: number };

function radiusFor(count: number) {
  return 9 + Math.sqrt(Math.max(1, count)) * 6.5;
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({ w: Math.round(entry.contentRect.width), h: Math.round(entry.contentRect.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

export function OpportunityRadar({
  nodes,
  highlightId,
  highlightLabel = "This idea",
  compact = false,
}: {
  nodes: RadarNodeDTO[];
  /** Ring one problem (e.g. the one the current startup was built from). */
  highlightId?: string | null;
  highlightLabel?: string;
  compact?: boolean;
}) {
  const { ref, w, h } = useSize<HTMLDivElement>();
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const industries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of nodes) counts.set(n.industry ?? "Other", (counts.get(n.industry ?? "Other") ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [nodes]);

  const layout = useMemo(() => {
    if (!w || !h) return { simNodes: [] as SimNode[], anchors: [] as { name: string; x: number; y: number }[] };
    const cx = w / 2;
    const cy = h / 2;
    const ring = Math.min(w, h) * (industries.length > 1 ? 0.3 : 0);
    const anchors = industries.map((name, i) => {
      const angle = (i / Math.max(1, industries.length)) * Math.PI * 2 - Math.PI / 2;
      return { name, x: cx + Math.cos(angle) * ring * (w > h ? 1.35 : 1), y: cy + Math.sin(angle) * ring };
    });
    const anchorOf = new Map(anchors.map((a) => [a.name, a]));
    const simNodes: SimNode[] = nodes.map((d, i) => {
      const a = anchorOf.get(d.industry ?? "Other") ?? { x: cx, y: cy };
      return { d, r: radiusFor(d.signal_count), ax: a.x, ay: a.y, x: a.x + Math.cos(i) * 20, y: a.y + Math.sin(i) * 20 };
    });
    const sim = forceSimulation(simNodes)
      .force("x", forceX<SimNode>((n) => n.ax).strength(0.12))
      .force("y", forceY<SimNode>((n) => n.ay).strength(0.12))
      .force("charge", forceManyBody<SimNode>().strength(-14))
      .force("collide", forceCollide<SimNode>((n) => n.r + 3).iterations(3))
      .stop();
    for (let i = 0; i < 260; i++) sim.tick();
    for (const n of simNodes) {
      n.x = Math.max(n.r + 4, Math.min(w - n.r - 4, n.x ?? cx));
      n.y = Math.max(n.r + 4, Math.min(h - n.r - 4, n.y ?? cy));
    }
    return { simNodes, anchors };
  }, [nodes, industries, w, h]);

  const hoverNode = layout.simNodes.find((n) => n.d.id === hovered);
  const selectedNode = nodes.find((n) => n.id === selected) ?? null;
  const maxR = Math.hypot(w, h) / 2;

  return (
    <div className="panel relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border-2 border-foreground/80" /> Strong evidence
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border border-foreground/50" /> Moderate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border border-dashed border-foreground/50" /> Emerging
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-foreground/20" />
            <span className="size-1.5 rounded-full bg-foreground/20" /> Size = distinct sources
          </span>
        </div>
      </div>

      <div className="relative grid lg:grid-cols-[1fr_360px]">
        <div ref={ref} className={cn("relative overflow-hidden", compact ? "h-[380px] sm:h-[420px]" : "h-[460px] sm:h-[520px]")}>
          {/* radar rings + sweep */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            {[0.18, 0.36, 0.56, 0.78].map((f) => (
              <div
                key={f}
                className="absolute rounded-full border border-foreground/[0.06]"
                style={{ width: `${f * 140}%`, aspectRatio: "1" }}
              />
            ))}
            <div
              className="absolute aspect-square w-[140%] animate-radar-sweep rounded-full opacity-50"
              style={{ background: "conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--primary) 9%, transparent) 30deg, transparent 60deg)" }}
            />
          </div>

          {nodes.length === 0 && (
            <div className="absolute inset-0 grid place-items-center text-center">
              <div className="max-w-xs">
                <p className="font-display text-lg font-bold text-foreground">No problems on the map yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Start a research run and the problems it finds will appear here.</p>
              </div>
            </div>
          )}

          <svg width={w} height={h} className="absolute inset-0" role="group" aria-label="Opportunity radar of discovered problem clusters">
            {layout.anchors.length > 1 &&
              layout.anchors.map((a) => (
                <text
                  key={a.name}
                  x={a.x}
                  y={Math.max(14, a.y - Math.min(maxR, 120) * 0.62)}
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-bold uppercase tracking-[0.08em]"
                  opacity={0.7}
                >
                  {a.name}
                </text>
              ))}
            {layout.simNodes.map((n, i) => {
              const color = industryColor(n.d.industry);
              const isSel = selected === n.d.id;
              const isHover = hovered === n.d.id;
              const fresh = Date.now() - new Date(n.d.created_at).getTime() < 24 * 3600_000;
              const strength = n.d.evidence_strength;
              return (
                <motion.g
                  key={n.d.id}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.025, type: "spring", stiffness: 160, damping: 18 }}
                  style={{ transformOrigin: `${n.x}px ${n.y}px`, cursor: "pointer" }}
                  onMouseEnter={() => setHovered(n.d.id)}
                  onMouseLeave={() => setHovered((v) => (v === n.d.id ? null : v))}
                  onClick={() => setSelected(n.d.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${n.d.title}: ${n.d.signal_count} sources`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelected(n.d.id);
                  }}
                >
                  {fresh && (
                    <circle cx={n.x} cy={n.y} r={n.r} fill="none" stroke={color} strokeOpacity={0.5}>
                      <animate attributeName="r" from={n.r} to={n.r + 16} dur="2.6s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" from="0.5" to="0" dur="2.6s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    fill={color}
                    fillOpacity={isSel || isHover ? 0.42 : strength === "strong" ? 0.3 : strength === "moderate" ? 0.2 : 0.12}
                    stroke={color}
                    strokeWidth={isSel ? 3 : strength === "strong" ? 2.2 : 1.2}
                    strokeDasharray={strength === "emerging" ? "3 3" : undefined}
                    className="transition-all duration-200"
                  />
                  {n.d.startup && <circle cx={n.x} cy={n.y} r={2.6} fill={color} />}
                </motion.g>
              );
            })}
            {/* Highlight sits in its own top layer so neighbouring dots never cover the ring or its label. */}
            {(() => {
              const h = highlightId ? layout.simNodes.find((n) => n.d.id === highlightId) : undefined;
              if (!h) return null;
              const x = h.x ?? 0;
              const y = h.y ?? 0;
              const labelY = y - h.r - 12 < 14 ? y + h.r + 22 : y - h.r - 12;
              return (
                <g pointerEvents="none">
                  <circle cx={x} cy={y} r={h.r + 6} fill="none" stroke="var(--primary)" strokeWidth={2} strokeDasharray="4 3" />
                  <text
                    x={x}
                    y={labelY}
                    textAnchor="middle"
                    stroke="var(--background)"
                    strokeWidth={4}
                    paintOrder="stroke"
                    strokeLinejoin="round"
                    className="fill-primary text-[11px] font-bold"
                  >
                    {highlightLabel}
                  </text>
                </g>
              );
            })()}
          </svg>

          <AnimatePresence>
            {hoverNode && (
              <motion.div
                key={hoverNode.d.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute z-10 w-64 rounded-[4px] border border-border bg-popover p-3 text-left shadow-lift"
                style={{
                  left: Math.min(Math.max(8, (hoverNode.x ?? 0) - 128), w - 264),
                  top: (hoverNode.y ?? 0) > h / 2 ? (hoverNode.y ?? 0) - hoverNode.r - 120 : (hoverNode.y ?? 0) + hoverNode.r + 10,
                }}
              >
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                  <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: industryColor(hoverNode.d.industry) }} />
                  {hoverNode.d.industry} · {hoverNode.d.geography}
                </p>
                <p className="mt-1 text-sm font-semibold leading-snug text-foreground">{hoverNode.d.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{hoverNode.d.summary}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {hoverNode.d.signal_count} sources · {hoverNode.d.evidence_strength} evidence · click to open
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="absolute bottom-3 left-4 flex items-center gap-1.5 text-[11px] text-faint">
            <Info className="size-3" /> Dots are grouped by industry only. Distances are not measurements.
          </p>
        </div>

        <aside className="border-t border-border lg:border-l lg:border-t-0">
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <RadarDetail key={selectedNode.id} node={selectedNode} onClose={() => setSelected(null)} />
            ) : (
              <motion.div key="legend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
                <ul className="mt-3 space-y-2">
                  {industries.map((ind) => {
                    const count = nodes.filter((n) => (n.industry ?? "Other") === ind).length;
                    return (
                      <li key={ind} className="flex items-center gap-2 text-sm">
                        <span className="size-2.5 rounded-full" style={{ background: industryColor(ind) }} />
                        <span className="text-foreground/90">{ind}</span>
                        <span className="ml-auto font-mono text-xs text-muted-foreground">{count}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-6 rounded-[4px] bg-surface-sunken p-4 text-sm text-foreground">
                  Each dot is a problem that came up again and again in live sources. Click one to read the posts behind it
                  and open the startup made from it.
                  {highlightId && nodes.some((n) => n.id === highlightId) && (
                    <span className="mt-2 block font-semibold text-primary">The dashed ring marks the problem this idea was built from.</span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </div>
  );
}

function RadarDetail({ node, onClose }: { node: RadarNodeDTO; onClose: () => void }) {
  const { data, isLoading, isError } = useQuery(clusterSignalsQuery(node.id));
  const sourceById = new Map((data?.sources ?? []).map((s) => [s.id, s]));
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className="flex max-h-[520px] flex-col"
    >
      <div className="flex items-start gap-3 border-b border-border p-5">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: industryColor(node.industry) }} />
            {node.industry} · {node.category}
          </p>
          <h3 className="mt-1 font-display text-lg font-bold leading-snug text-foreground">{node.title}</h3>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close details">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <p className="text-sm text-muted-foreground">{node.summary}</p>
        <div className="flex flex-wrap gap-1.5">
          <ObservedTag label="Sources" count={node.signal_count} />
          <Badge variant="outline" className="capitalize">{node.evidence_strength} evidence</Badge>
          {node.signal_types.map((t) => (
            <Badge key={t} variant="secondary">{signalLabel(t)}</Badge>
          ))}
        </div>
        {node.strength_reason && <p className="data-label">{node.strength_reason}</p>}

        {node.startup ? (
          <Link
            to="/startup/$slug"
            params={{ slug: node.startup.slug }}
            className="group flex items-center gap-3 rounded-[4px] border border-border bg-surface p-3 shadow-panel transition-shadow hover:shadow-lift"
          >
            <StartupMark brand={node.startup.brand} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{node.startup.name}</p>
              <p className="truncate text-xs text-muted-foreground">{node.startup.tagline}</p>
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ) : (
          <p className="rounded-[4px] bg-surface-sunken p-3 text-xs text-muted-foreground">
            No startup was made from this problem. Only the strongest problems of each research run become startups.
          </p>
        )}

        <div>
          {isLoading && (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Loading sources…
            </p>
          )}
          {isError && <p className="mt-3 text-xs text-destructive">Couldn't load the sources for this problem. Try again in a moment.</p>}
          <ul className="mt-3 space-y-2.5">
            {(data?.cluster.signals ?? []).map((sig, i) => {
              const src = sourceById.get(sig.source_id);
              return (
                <li key={i} className="prov-observed rounded-[4px] p-3">
                  <p className="text-[13px] leading-snug text-foreground/90">{sig.claim}</p>
                  {src && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className={cn("mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-observed")}
                    >
                      <SourceFavicon domain={src.domain} className="size-3.5" />
                      <span className="truncate">{src.domain}</span>
                      <span className="text-faint">· {src.published_at ? <TimeAgo iso={src.published_at} /> : <>retrieved <TimeAgo iso={src.retrieved_at} /></>}</span>
                      <ExternalLink className="ml-auto size-3 shrink-0" />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        {node.run_query && (
          <p className="text-[11px] text-faint">
            Found by discovery: “{node.run_query}” · <TimeAgo iso={node.created_at} />
          </p>
        )}
      </div>
    </motion.div>
  );
}
