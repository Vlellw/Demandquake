import { Link } from "@tanstack/react-router";
import { TimeAgo } from "@/components/common/TimeAgo";
import { motion } from "motion/react";
import { ArrowRight, FileSearch } from "lucide-react";
import type { StartupCardDTO } from "@/lib/dto";
import { StartupMark, brandStyle, bannerBackground } from "@/components/brand/StartupMark";
import { useStartupBanner } from "@/hooks/use-startup-banner";
import { Badge } from "@/components/ui/badge";
import { DIMENSION_KEYS, type Level } from "@/lib/types";
import { DIMENSION_META, LEVEL_META, industryColor } from "@/lib/taxonomy";
import { freshnessOf } from "@/lib/research-utils";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const levelBar: Record<Level, string> = {
  strong: "bg-positive h-full",
  moderate: "bg-moderate h-2/3",
  weak: "bg-negative h-1/3",
  unknown: "border border-dashed border-uncertain/60 h-full bg-transparent",
};

export function FreshnessBadge({ iso, prefix = "Researched" }: { iso: string; prefix?: string }) {
  const bucket = freshnessOf(iso);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={cn(
          "size-1.5 rounded-full",
          bucket === "24h" ? "bg-positive" : bucket === "7d" ? "bg-moderate" : bucket === "30d" ? "bg-uncertain" : "bg-faint",
        )}
      />
      {prefix} <TimeAgo iso={iso} />
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

/**
 * Lindström-style article card: a brand-colored block where a photo would sit, then an uppercase
 * category line, bold title, short text and outlined tags. The whole card opens the startup.
 */
export function StartupCard({ card, index = 0 }: { card: StartupCardDTO; index?: number }) {
  const claimed = card.claim_count > 0;
  const banner = useStartupBanner(card);
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.04, duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <Link
        to="/startup/$slug"
        params={{ slug: card.slug }}
        style={brandStyle(card.brand)}
        className="group flex h-full flex-col overflow-hidden rounded-[4px] bg-card shadow-panel transition-shadow duration-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="brand-banner relative flex h-32 items-end justify-between p-4" style={bannerBackground(card.brand, banner)}>
          <StartupMark brand={card.brand} size="lg" className="border-transparent shadow-panel" />
          <span className="rounded-[3px] bg-background px-2 py-1 text-[0.625rem] font-bold uppercase tracking-[0.06em] text-foreground">
            {claimed ? `${card.claim_count} building` : "Unclaimed"}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-foreground">
            <span className="truncate">
              {card.industry ?? "Other"} · {card.geography ?? "Global"}
            </span>
          </p>
          <h3 className="mt-2 font-display text-xl font-bold text-foreground transition-colors group-hover:text-primary">
            {card.name}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-foreground/85">{card.tagline}</p>
          {card.problem_title && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-observed">Problem found: </span>
              {card.problem_title}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {card.business_model_type && (
              <Badge variant="default" className="max-w-full truncate">
                {card.business_model_type}
              </Badge>
            )}
          </div>
          <div className="mt-auto flex items-center justify-between gap-3 pt-5">
            <Badge variant="observed"><FileSearch /> {card.evidence_count} sources</Badge>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
              View <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
