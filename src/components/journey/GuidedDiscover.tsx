import { useMemo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import type { StartupCardDTO } from "@/lib/dto";
import { useAuthUser } from "@/hooks/use-auth";
import { myProjectsQuery } from "@/lib/queries";
import { recommendStartups } from "@/lib/project-progress";
import { FOR_YOU, industryChoices, rankSpotlights } from "@/lib/journey";
import { industryColor } from "@/lib/taxonomy";
import { TimeAgo } from "@/components/common/TimeAgo";
import { InfoTip } from "@/components/common/InfoTip";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "./SpotlightCard";
import { DiscoverViewToggle } from "./DiscoverViewToggle";
import { cn } from "@/lib/utils";

type Stats = { startups: number; sources: number; domains: number; lastResearchAt: string | null };

const pill =
  "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Step 1 of the founder journey: pick an industry, see its three best-documented ideas, then choose a next action. */
export function GuidedDiscover({
  cards,
  stats,
  industry,
  onResearch,
}: {
  cards: StartupCardDTO[];
  stats: Stats;
  industry: string;
  onResearch: () => void;
}) {
  const { user } = useAuthUser();
  const { data: projects } = useQuery({ ...myProjectsQuery, enabled: !!user });
  const picks = useMemo(() => (projects ? recommendStartups(cards, projects, 3) : []), [cards, projects]);
  const choices = useMemo(() => industryChoices(cards), [cards]);

  // "For you" only exists once a founder has claimed something with related ideas.
  const selected = industry === FOR_YOU && picks.length === 0 ? "all" : industry;
  const pool = selected === "all" ? cards : selected === FOR_YOU ? picks.map((p) => p.card) : cards.filter((c) => c.industry === selected);
  const spotlights =
    selected === FOR_YOU ? picks : rankSpotlights(pool, 3).map((card) => ({ card, reason: undefined as string | undefined }));
  const industryLabel = selected === "all" || selected === FOR_YOU ? null : selected;
  const projectNames = (projects ?? []).slice(0, 3).map((p) => p.name);

  return (
    <section id="startups" aria-labelledby="choose-heading" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 pb-20 pt-6 sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h2 id="choose-heading" className="section-title mt-2 text-xl leading-tight sm:text-2xl">
            Which market interests you?{" "}
            <InfoTip align="start">
              Pick an industry. We show the ideas with the most evidence behind them — open one to check its sources before you decide.
            </InfoTip>
          </h2>
        </div>
        <DiscoverViewToggle view="guided" />
      </div>

      <p className="mt-5 text-sm text-muted-foreground">
        <span className="font-bold text-foreground">{stats.startups.toLocaleString("en-US")}</span> startups ·{" "}
        <span className="font-bold text-foreground">{stats.sources.toLocaleString("en-US")}</span> sources from{" "}
        <span className="font-bold text-foreground">{stats.domains.toLocaleString("en-US")}</span> websites
        {stats.lastResearchAt && (
          <>
            {" "}
            · latest research <TimeAgo iso={stats.lastResearchAt} />
          </>
        )}
      </p>

      {cards.length === 0 ? (
        <EmptyCatalog onResearch={onResearch} />
      ) : (
        <>
          <div role="group" aria-label="Choose an industry" className="mt-8 flex flex-wrap gap-2">
            {picks.length > 0 && (
              <IndustryPill value={FOR_YOU} selected={selected === FOR_YOU}>
                <Sparkles className="size-4" aria-hidden="true" /> For you
              </IndustryPill>
            )}
            <IndustryPill value="all" selected={selected === "all"} count={cards.length}>
              All industries
            </IndustryPill>
            {choices.map((c) => (
              <IndustryPill key={c.value} value={c.value} selected={selected === c.value} count={c.count}>
                <span className="size-2 rounded-full" style={{ background: industryColor(c.value) }} aria-hidden="true" />
                {c.label}
              </IndustryPill>
            ))}
          </div>

          <div className="mt-12">
            <div className="flex flex-col gap-2 border-b border-border pb-4 md:flex-row md:items-end md:justify-between">
              <h2 className="section-title text-2xl">
                {selected === FOR_YOU
                  ? "Close to what you’re building"
                  : industryLabel
                    ? `The best-documented ideas in ${industryLabel}`
                    : "The best-documented ideas right now"}{" "}
                <InfoTip align="start">
                  {selected === FOR_YOU
                    ? `Matched on industry and region with ${projectNames.join(", ")}.`
                    : "Ordered by how much independent evidence backs each problem — not by chance of success."}
                </InfoTip>
              </h2>
            </div>

            {spotlights.length === 0 ? (
              <div className="mt-8 grid place-items-center rounded-[4px] bg-surface-sunken px-6 py-14 text-center">
                <Compass className="size-8 text-primary" aria-hidden="true" />
                <p className="mt-3 font-display text-lg font-bold text-foreground">No startups in {industryLabel ?? "this area"} yet</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">Research this market and the startups we find will appear here.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Button asChild variant="outline">
                    <Link from="/discover" to="/discover" search={(p) => ({ ...p, industry: "all" })} resetScroll={false}>
                      Show all industries
                    </Link>
                  </Button>
                  <Button variant="hero" onClick={onResearch}>
                    Research this market <ArrowRight />
                  </Button>
                </div>
              </div>
            ) : (
              <ol className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {spotlights.map(({ card, reason }, i) => (
                  <SpotlightCard key={card.id} card={card} index={i} reason={reason} />
                ))}
              </ol>
            )}
          </div>

        </>
      )}
    </section>
  );
}

function IndustryPill({ value, selected, count, children }: { value: string; selected: boolean; count?: number; children: ReactNode }) {
  return (
    <Link
      from="/discover"
      to="/discover"
      search={(p) => ({ ...p, industry: value })}
      replace
      resetScroll={false}
      aria-current={selected ? "true" : undefined}
      className={cn(
        pill,
        selected ? "border-primary bg-primary text-primary-foreground" : "border-ink/40 bg-background text-foreground hover:border-ink hover:bg-accent",
      )}
    >
      {children}
      {typeof count === "number" && (
        <span
          className={cn(
            "rounded-full px-1.5 text-[0.6875rem] font-bold tabular-nums",
            selected ? "bg-primary-foreground text-primary" : "bg-surface-sunken text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

function EmptyCatalog({ onResearch }: { onResearch: () => void }) {
  return (
    <div className="mt-10 grid place-items-center rounded-[4px] bg-surface-sunken px-6 py-16 text-center">
      <Compass className="size-8 text-primary" aria-hidden="true" />
      <p className="mt-3 font-display text-lg font-bold text-foreground">No startups discovered yet</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Start a research run. Demandquake will read the live web and publish its first startups here.
      </p>
      <Button variant="hero" className="mt-5" onClick={onResearch}>
        Research a market <ArrowRight />
      </Button>
    </div>
  );
}
