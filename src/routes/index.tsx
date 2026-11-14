import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronDown, ChevronUp, Compass } from "lucide-react";
import { SearchHero } from "@/components/discovery/SearchHero";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { IntroBand } from "@/components/home/IntroBand";
import { HowItWorksMosaic } from "@/components/home/HowItWorksMosaic";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Button } from "@/components/ui/button";
import { OpportunityRadar } from "@/components/discovery/OpportunityRadar";
import { StartupCard } from "@/components/discovery/StartupCard";
import { DiscoveryFilters, EMPTY_FILTERS, type FilterState } from "@/components/discovery/DiscoveryFilters";
import { RecentRuns } from "@/components/discovery/RecentRuns";
import { QuakeFeed } from "@/components/discovery/QuakeFeed";
import { PickedForYou } from "@/components/discovery/PickedForYou";
import { radarQuery, recentQuakesQuery, recentRunsQuery, startupCardsQuery, statsQuery } from "@/lib/queries";
import { matchesFreshness } from "@/lib/research-utils";

const INITIAL_CARDS = 6;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Demandquake — Find a startup worth building" },
      {
        name: "description",
        content:
          "Explore unclaimed startups generated from live web evidence: real problems, sources, competitors and opportunity assessments — then claim one.",
      },
      { property: "og:title", content: "Demandquake — Find a startup worth building" },
      {
        property: "og:description",
        content: "A living map of business problems found on the internet, turned into evidence-backed startups you can claim.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(startupCardsQuery),
      context.queryClient.ensureQueryData(radarQuery),
      context.queryClient.ensureQueryData(statsQuery),
      context.queryClient.ensureQueryData(recentRunsQuery),
      context.queryClient.ensureQueryData(recentQuakesQuery),
    ]),
  component: DiscoverPage,
});

function DiscoverPage() {
  const { data: cards } = useSuspenseQuery(startupCardsQuery);
  const { data: nodes } = useSuspenseQuery(radarQuery);
  const { data: stats } = useSuspenseQuery(statsQuery);
  const { data: runs } = useSuspenseQuery(recentRunsQuery);
  const { data: quakes } = useSuspenseQuery(recentQuakesQuery);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [showAll, setShowAll] = useState(false);

  const filteredCards = useMemo(
    () =>
      cards.filter(
        (c) =>
          (filters.industry === "all" || c.industry === filters.industry) &&
          (filters.geography === "all" || c.geography === filters.geography) &&
          (filters.model === "all" || c.business_model_type === filters.model) &&
          matchesFreshness(c.last_scanned_at ?? c.research_at, filters.freshness),
      ),
    [cards, filters],
  );

  // The quake feed follows the same filters; one card per startup, newest material changes first.
  const filteredQuakes = useMemo(
    () =>
      quakes
        .filter(
          (q) =>
            (filters.industry === "all" || q.startup.industry === filters.industry) &&
            (filters.geography === "all" || q.startup.geography === filters.geography) &&
            matchesFreshness(q.completed_at ?? q.created_at, filters.freshness),
        )
        .slice(0, 6),
    [quakes, filters],
  );

  const filteredNodes = useMemo(
    () =>
      nodes.filter(
        (n) =>
          (filters.industry === "all" || n.industry === filters.industry) &&
          (filters.geography === "all" || n.geography === filters.geography) &&
          matchesFreshness(n.created_at, filters.freshness),
      ),
    [nodes, filters],
  );

  const filtersActive = Object.values(filters).some((v) => v !== "all");
  const visibleCards = showAll ? filteredCards : filteredCards.slice(0, INITIAL_CARDS);

  return (
    <div>
      <HeroCarousel />
      <IntroBand stats={stats} />

      <section id="startups" aria-labelledby="startups-heading" className="mx-auto max-w-[1400px] px-4 pt-20 sm:px-6">
        <PickedForYou cards={cards} />

        <SectionHeading
          id="startups-heading"
          eyebrow="Find a startup"
          title="Startups waiting for a founder"
          description="Each one was drafted from a real problem found in live sources. Open a card to read the evidence, competitors and a first business plan."
        />

        <div className="mt-10 border-y border-border py-4">
          <DiscoveryFilters value={filters} onChange={setFilters} count={filteredCards.length} total={cards.length} />
        </div>

        {filteredCards.length === 0 ? (
          <div className="mt-8 grid place-items-center rounded-[4px] bg-surface-sunken px-6 py-16 text-center">
            <Compass className="size-8 text-primary" />
            <p className="mt-3 font-display text-lg font-bold text-foreground">
              {cards.length === 0 ? "No startups discovered yet" : "No startups match these filters"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {cards.length === 0
                ? "Start a research run below. Demandquake will read the live web and publish its first startups here."
                : "Clear a filter, or research this area to find new startups."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {filtersActive && (
                <Button variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear filters
                </Button>
              )}
              <Button asChild variant="hero">
                <Link to="/" hash="discover">
                  Research a market <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {visibleCards.map((c, i) => (
                <StartupCard key={c.id} card={c} index={i} />
              ))}
            </div>
            {filteredCards.length > INITIAL_CARDS && (
              <div className="mt-10 flex justify-center">
                <Button variant="outline" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                  {showAll ? "Show fewer" : `Show all ${filteredCards.length} startups`}
                  {showAll ? <ChevronUp /> : <ChevronDown />}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <HowItWorksMosaic />

      <SearchHero />

      <QuakeFeed items={filteredQuakes} filtered={filtersActive} />

      <section id="map" aria-labelledby="map-heading" className="mx-auto max-w-[1400px] px-4 pt-20 sm:px-6">
        <SectionHeading
          id="map-heading"
          eyebrow="Opportunity map"
          title="Every problem we found, on one map"
          description="Bigger dots have more sources behind them. The map follows the filters you picked above."
        />
        <div className="mt-10">
          <OpportunityRadar nodes={filteredNodes} />
        </div>
      </section>

      <RecentRuns runs={runs} />
    </div>
  );
}
