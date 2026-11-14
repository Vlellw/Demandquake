import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
  BackgroundVariant,
} from "@xyflow/react";
import { Sparkles, Globe2 } from "lucide-react";
import type { ClusterDTO } from "@/lib/dto";
import type { Brand, Competitor, SourceRecord } from "@/lib/types";
import { SIGNAL_META, signalLabel } from "@/lib/taxonomy";
import { SourceFavicon } from "@/components/common/SourceFavicon";
import { StartupMark } from "@/components/brand/StartupMark";
import { formatDate } from "@/lib/format";
import { typeColor } from "@/components/research/ResearchConstellation";
import { useSources } from "./SourceDrawer";

type SourceData = { source: SourceRecord };
type GroupData = { label: string; count: number; color: string; kind: "observed" | "competitor" };
type ProblemData = { title: string; summary: string; strength: string };
type StartupData = { name: string; tagline: string; brand: Brand };

function SourceNode({ data }: NodeProps<Node<SourceData>>) {
  const s = data.source;
  return (
    <div className="prov-observed w-[230px] cursor-pointer rounded-lg p-2.5 text-left transition-colors hover:border-observed/70" title="Open source">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <SourceFavicon domain={s.domain} className="size-3" />
        <span className="truncate">{s.publisher ?? s.domain}</span>
        <span className="ml-auto shrink-0 font-mono text-faint">{s.published_at ? formatDate(s.published_at, { month: "short", year: "2-digit" }) : "web"}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-[11.5px] font-medium leading-snug text-foreground/90">{s.title}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function GroupNode({ data }: NodeProps<Node<GroupData>>) {
  return (
    <div className="w-[200px] rounded-xl border bg-surface-raised p-3" style={{ borderColor: `color-mix(in oklab, ${data.color} 50%, transparent)` }}>
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: data.color }} />
        <p className="text-[12px] font-semibold text-foreground">{data.label}</p>
      </div>
      <p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-observed">
        <Globe2 className="size-3" /> {data.count} observed source{data.count === 1 ? "" : "s"}
      </p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function ProblemNode({ data }: NodeProps<Node<ProblemData>>) {
  return (
    <div className="prov-inferred w-[250px] rounded-xl p-3.5">
      <Handle type="target" position={Position.Left} />
      <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-inferred">
        <Sparkles className="size-3" /> Identified problem
      </p>
      <p className="mt-1.5 font-display text-[14px] font-semibold leading-snug text-foreground">{data.title}</p>
      <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-muted-foreground">{data.summary}</p>
      <p className="mt-2 font-mono text-[10px] capitalize text-muted-foreground">{data.strength} evidence</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function StartupNode({ data }: NodeProps<Node<StartupData>>) {
  return (
    <div className="prov-inferred w-[230px] rounded-xl p-3.5">
      <Handle type="target" position={Position.Left} />
      <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-inferred">
        <Sparkles className="size-3" /> Proposed startup
      </p>
      <div className="mt-2 flex items-center gap-2">
        <StartupMark brand={data.brand} size="sm" />
        <p className="font-display text-base font-semibold text-foreground">{data.name}</p>
      </div>
      <p className="mt-1.5 line-clamp-2 text-[11px] text-muted-foreground">{data.tagline}</p>
    </div>
  );
}

const nodeTypes = { source: SourceNode, evgroup: GroupNode, problem: ProblemNode, startup: StartupNode };

export function EvidenceMap({
  cluster,
  competitors,
  startup,
}: {
  cluster: ClusterDTO | null;
  competitors: Competitor[];
  startup: { name: string; tagline: string; brand: Brand };
}) {
  const { sources, open } = useSources();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { nodes, edges, height } = useMemo(() => {
    const ns: Node[] = [];
    const es: Edge[] = [];
    if (!cluster) return { nodes: ns, edges: es, height: 400 };

    // Group evidence sources by signal type
    const groups = new Map<string, SourceRecord[]>();
    for (const sid of cluster.source_ids) {
      const src = sources.get(sid);
      if (!src) continue;
      const sig = cluster.signals.find((x) => x.source_id === sid);
      const type = sig?.signal_type ?? src.signal_type ?? "news";
      groups.set(type, [...(groups.get(type) ?? []), src]);
    }
    const compSources = [...new Set(competitors.map((c) => c.source_id).filter((x): x is string => Boolean(x)))]
      .map((id) => sources.get(id))
      .filter((s): s is SourceRecord => Boolean(s))
      .slice(0, 4);

    const rowGap = 78;
    let y = 0;
    const groupYs: { key: string; y: number }[] = [];
    for (const [type, list] of groups) {
      const startY = y;
      for (const src of list.slice(0, 5)) {
        ns.push({ id: `s-${src.id}`, type: "source", position: { x: 0, y }, data: { source: src } });
        es.push({ id: `e-${src.id}-${type}`, source: `s-${src.id}`, target: `g-${type}`, style: { stroke: typeColor(type), strokeWidth: 1.4, opacity: 0.7 } });
        y += rowGap;
      }
      const gy = startY + ((Math.min(list.length, 5) - 1) * rowGap) / 2;
      groupYs.push({ key: type, y: gy });
      ns.push({
        id: `g-${type}`,
        type: "evgroup",
        position: { x: 300, y: gy + 4 },
        data: { label: SIGNAL_META[type as keyof typeof SIGNAL_META]?.label ?? signalLabel(type), count: list.length, color: typeColor(type), kind: "observed" },
      });
      y += 22;
    }

    const evidenceBottom = y;
    let compGroupY: number | null = null;
    if (compSources.length) {
      y += 20;
      const startY = y;
      for (const src of compSources) {
        ns.push({ id: `s-${src.id}`, type: "source", position: { x: 0, y }, data: { source: src } });
        es.push({ id: `e-${src.id}-comp`, source: `s-${src.id}`, target: "g-competitors", style: { stroke: "var(--uncertain)", strokeWidth: 1.4, opacity: 0.7 } });
        y += rowGap;
      }
      compGroupY = startY + ((compSources.length - 1) * rowGap) / 2;
      ns.push({
        id: "g-competitors",
        type: "evgroup",
        position: { x: 300, y: compGroupY + 4 },
        data: { label: "Existing solutions & their limits", count: compSources.length, color: "var(--uncertain)", kind: "competitor" },
      });
    }

    const problemY = Math.max(0, evidenceBottom / 2 - 70);
    ns.push({ id: "problem", type: "problem", position: { x: 580, y: problemY }, data: { title: cluster.title, summary: cluster.summary, strength: cluster.evidence_strength } });
    for (const g of groupYs) {
      es.push({ id: `e-g-${g.key}`, source: `g-${g.key}`, target: "problem", animated: true, style: { stroke: "var(--inferred)", strokeDasharray: "5 4", strokeWidth: 1.4 } });
    }
    const startupY = compGroupY != null ? (problemY + compGroupY) / 2 : problemY + 10;
    ns.push({ id: "startup", type: "startup", position: { x: 900, y: startupY }, data: startup });
    es.push({ id: "e-problem-startup", source: "problem", target: "startup", animated: true, style: { stroke: "var(--inferred)", strokeDasharray: "5 4", strokeWidth: 2 } });
    if (compGroupY != null) {
      es.push({ id: "e-comp-startup", source: "g-competitors", target: "startup", animated: true, label: "differentiation", labelStyle: { fill: "var(--muted-foreground)", fontSize: 10 }, labelBgStyle: { fill: "var(--surface)" }, style: { stroke: "var(--uncertain)", strokeDasharray: "5 4", strokeWidth: 1.4 } });
    }
    return { nodes: ns, edges: es, height: Math.max(420, Math.min(y + 40, 900)) };
  }, [cluster, competitors, sources, startup]);

  if (!cluster) {
    return <p className="text-sm text-muted-foreground">The problem cluster behind this startup is no longer available.</p>;
  }

  return (
    <div className="evidence-flow overflow-hidden rounded-xl border border-border bg-surface-sunken" style={{ height }}>
      {mounted && (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => {
            if (node.type === "source") open((node.data as SourceData).source.id);
          }}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll={false}
          zoomOnScroll={false}
          minZoom={0.3}
          maxZoom={1.6}
          proOptions={{ hideAttribution: false }}
          colorMode="dark"
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="oklch(1 0 0 / 0.08)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      )}
    </div>
  );
}
