import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowUpRight, FileSearch, Swords, Users } from "lucide-react";
import type { StartupCardDTO } from "@/lib/dto";
import { StartupMark, brandStyle } from "@/components/brand/StartupMark";
import { Badge } from "@/components/ui/badge";
import { DIMENSION_KEYS, type Level } from "@/lib/types";
import { DIMENSION_META, LEVEL_META, industryColor } from "@/lib/taxonomy";
import { freshnessOf } from "@/lib/research-utils";
import { timeAgo } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const levelBar: Record<Level, string> = {
  strong: "bg-positive h-full",
  moderate: "bg-inferred h-2/3",
  weak: "bg-negative h-1/3",
  unknown: "border border-dashed border-uncertain/60 h-full bg-transparent",
};

export function FreshnessBadge({ iso, prefix = "Researched" }: { iso: string; prefix?: string }) {
  const bucket = freshnessOf(iso);
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
      <span
        className={cn(
          "size-1.5 rounded-full",
          bucket === "24h" ? "bg-positive" : bucket === "7d" ? "bg-inferred" : bucket === "30d" ? "bg-uncertain" : "bg-faint",
        )}
      />
      {prefix} {timeAgo(iso)}
    </span>
  );
}

export function AssessmentStrip({ card }: { card: Pick<StartupCardDTO, "assessment"> }) {
  const dims = card.assessment?.dimensions ?? [];
  return (
    <div className="flex h-6 items-end gap-1" aria-label="Opportunity assessment overview">
      {DIMENSION_KEYS.map((k) => {
        const d = dims.find((x) => x.key === k);
        const level = (d?.level ?? "unknown") as Level;
        return (
          <Tooltip key={k}>
            <TooltipTrigger asChild>
              <span className="flex h-full w-3.5 items-end">
                <span className={cn("w-full rounded-sm", levelBar[level])} />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {DIMENSION_META[k].label}: {LEVEL_META[level].label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function StartupCard({ card, index = 0 }: { card: StartupCardDTO; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.04, duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <Link
        to="/startup/$slug"
        params={{ slug: card.slug }}
        style={brandStyle(card.brand)}
        className="group panel relative flex h-full flex-col overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-lift"
      >
        <div className="brand-surface pointer-events-none absolute inset-x-0 top-0 h-24 opacity-40 transition-opacity duration-300 group-hover:opacity-70" />
        <div className="relative flex items-start gap-3">
          <StartupMark brand={card.brand} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-display text-lg font-semibold text-foreground">{card.name}</h3>
              <ArrowUpRight className="ml-auto size-4 shrink-0 text-faint transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="size-1.5 rounded-full" style={{ background: industryColor(card.industry) }} />
              {card.industry} · {card.geography}
            </p>
          </div>
        </div>
        <p className="relative mt-4 line-clamp-2 text-[15px] leading-snug text-foreground/90">{card.tagline}</p>
        {card.problem_title && (
          <p className="relative mt-3 line-clamp-1 text-xs text-muted-foreground">
            <span className="text-observed">Problem found:</span> {card.problem_title}
          </p>
        )}
        <div className="relative mt-auto pt-5">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <FileSearch className="size-3.5 text-observed" /> {card.evidence_count} sources
              </span>
              <span className="inline-flex items-center gap-1">
                <Swords className="size-3.5" /> {card.competitor_count} rivals
              </span>
              {card.claim_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" /> {card.claim_count} building
                </span>
              )}
            </div>
            <AssessmentStrip card={card} />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <FreshnessBadge iso={card.last_scanned_at ?? card.research_at} prefix={card.last_scanned_at ? "Scanned" : "Researched"} />
            <div className="flex items-center gap-1.5">
              {card.business_model_type && <Badge variant="outline">{card.business_model_type}</Badge>}
              <Badge variant="live">Unclaimed</Badge>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
