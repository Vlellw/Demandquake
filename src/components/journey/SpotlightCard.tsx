import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, CalendarClock, FileSearch, Sparkles, Swords, Target, Users } from "lucide-react";
import type { StartupCardDTO } from "@/lib/dto";
import { StartupMark, brandStyle } from "@/components/brand/StartupMark";
import { Badge } from "@/components/ui/badge";
import { FreshnessBadge } from "@/components/discovery/StartupCard";
import { EVIDENCE_LABEL } from "@/lib/journey";
import { industryColor } from "@/lib/taxonomy";

/**
 * Step 1 spotlight: one idea explained in plain words — the problem found, who has it and why now —
 * so a newcomer can decide which one to inspect without opening every card.
 */
export function SpotlightCard({ card, index = 0, reason }: { card: StartupCardDTO; index?: number; reason?: string }) {
  const rows = [
    { icon: Target, label: "Problem found", text: card.problem_title },
    { icon: Users, label: "Who has it", text: card.who_is_affected },
    { icon: CalendarClock, label: "Why now", text: card.why_now },
  ].filter((r): r is { icon: typeof Target; label: string; text: string } => Boolean(r.text));

  return (
    <motion.li
      className="flex min-w-0 flex-col gap-2"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {reason && (
        <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" /> {reason}
        </p>
      )}
      <Link
        to="/startup/$slug"
        params={{ slug: card.slug }}
        style={brandStyle(card.brand)}
        className="group flex h-full flex-col overflow-hidden rounded-[4px] bg-card shadow-panel transition-shadow duration-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="brand-banner flex items-center gap-4 p-5">
          <StartupMark brand={card.brand} size="lg" className="border-transparent shadow-panel" />
          <div className="min-w-0">
            <p className="truncate text-[0.6875rem] font-bold uppercase tracking-[0.06em] opacity-90">
              {card.industry ?? "Other"} · {card.geography ?? "Global"}
            </p>
            <h3 className="mt-0.5 truncate font-display text-2xl font-bold leading-tight">{card.name}</h3>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <p className="line-clamp-2 text-[0.95rem] font-semibold leading-snug text-foreground">{card.tagline}</p>

          {rows.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-3 inline-flex items-center gap-1 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-inferred">
                <Sparkles className="size-3" aria-hidden="true" /> AI summary of the sources
              </p>
              <dl className="space-y-3">
                {rows.map(({ icon: Icon, label, text }) => (
                  <div key={label} className="flex gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-ink/25 text-primary" aria-hidden="true">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-foreground">{label}</dt>
                      <dd className="mt-0.5 line-clamp-3 text-sm leading-relaxed text-foreground/85">{text}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-1.5">
            <Badge variant="observed">
              <FileSearch /> {card.evidence_count} sources
            </Badge>
            <Badge variant="outline">
              <Swords /> {card.competitor_count} competitors
            </Badge>
            {card.evidence_strength && EVIDENCE_LABEL[card.evidence_strength] && (
              <Badge variant="default">
                <span className="size-1.5 rounded-full" style={{ background: industryColor(card.industry) }} aria-hidden="true" />
                {EVIDENCE_LABEL[card.evidence_strength]}
              </Badge>
            )}
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
            <FreshnessBadge iso={card.last_scanned_at ?? card.research_at} prefix={card.last_scanned_at ? "Scanned" : "Researched"} />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink px-4 py-1.5 text-xs font-bold text-foreground transition-colors group-hover:bg-ink group-hover:text-ink-foreground">
              Inspect the evidence <ArrowRight className="size-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.li>
  );
}
