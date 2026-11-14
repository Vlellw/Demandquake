import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Radar } from "lucide-react";
import { SearchHero } from "@/components/discovery/SearchHero";
import { OpportunityRadar } from "@/components/discovery/OpportunityRadar";
import { StartupCard } from "@/components/discovery/StartupCard";
import { DiscoveryFilters, EMPTY_FILTERS, type FilterState } from "@/components/discovery/DiscoveryFilters";
import { RecentRuns } from "@/components/discovery/RecentRuns";
import { QuakeFeed } from "@/components/discovery/QuakeFeed";
import { PickedForYou } from "@/components/discovery/PickedForYou";
import { radarQuery, recentQuakesQuery, recentRunsQuery, startupCardsQuery, statsQuery } from "@/lib/queries";
import { matchesFreshness } from "@/lib/research-utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Demandquake — Discover startups before they exist" },
      {
        name: "description",
        content:
          "Explore unclaimed startups generated from live web evidence: real problems, sources, competitors and opportunity assessments — then claim one.",
      },
      { property: "og:title", content: "Demandquake — Discover startups before they exist" },
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

  return (
    <div>
      <SearchHero stats={stats} />

      <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-10 sm:px-6">
        <div className="panel sticky top-16 z-30 px-4 py-3 backdrop-blur-xl">
          <DiscoveryFilters value={filters} onChange={setFilters} count={filteredCards.length} total={cards.length} />
        </div>

        <OpportunityRadar nodes={filteredNodes} />

        <PickedForYou cards={cards} />

        <QuakeFeed items={filteredQuakes} />

        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Marketplace</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">Newly discovered unclaimed startups</h2>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Each startup was generated from a problem cluster backed by live sources. Open one to inspect the evidence.
            </p>
          </div>
          {filteredCards.length === 0 ? (
            <div className="panel grid place-items-center px-6 py-16 text-center">
              <Radar className="size-8 text-primary" />
              <p className="mt-3 font-display text-lg text-foreground">
                {cards.length === 0 ? "No startups discovered yet" : "No startups match these filters"}
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {cards.length === 0
                  ? "Start a discovery above — Demandquake will research the live web and publish its first unclaimed startups here."
                  : "Clear a filter or run a new discovery focused on this area."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCards.map((c, i) => (
                <StartupCard key={c.id} card={c} index={i} />
              ))}
            </div>
          )}
        </section>

        <RecentRuns runs={runs} />
      </div>
    </div>
  );
}
