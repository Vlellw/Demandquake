import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronDown, ChevronUp, Compass, History, Map as MapIcon, Waves } from "lucide-react";
import type { StartupCardDTO } from "@/lib/dto";
import { radarQuery, recentQuakesQuery, recentRunsQuery } from "@/lib/queries";
import { filterCards, filterNodes, filterQuakes, filtersActive, type CatalogFilters, type OverviewPanel } from "@/lib/journey";
import { StartupCard } from "@/components/discovery/StartupCard";
import { DiscoveryFilters, EMPTY_FILTERS } from "@/components/discovery/DiscoveryFilters";
import { OpportunityRadar } from "@/components/discovery/OpportunityRadar";
import { QuakeFeed } from "@/components/discovery/QuakeFeed";
import { RecentRuns } from "@/components/discovery/RecentRuns";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscoverViewToggle } from "./DiscoverViewToggle";

const INITIAL_CARDS = 9;

/** Expert view: every startup with filters, then the market tools (map, market changes, past research) in tabs. */
export function CatalogView({
  cards,
  filters,
  panel,
  onResearch,
}: {
  cards: StartupCardDTO[];
  filters: CatalogFilters;
  panel: OverviewPanel;
  onResearch: () => void;
}) {
  const navigate = useNavigate({ from: "/discover" });
  const [showAll, setShowAll] = useState(false);
  const filtered = useMemo(() => filterCards(cards, filters), [cards, filters]);
  const active = filtersActive(filters);
  const visible = showAll ? filtered : filtered.slice(0, INITIAL_CARDS);

  function setFilters(next: CatalogFilters) {
    setShowAll(false);
    navigate({ search: (p) => ({ ...p, ...next }), replace: true, resetScroll: false });
  }

  return (
    <>
      <section id="startups" aria-labelledby="catalog-heading" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 pt-10 sm:px-6 sm:pt-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Step 2 of 4 · Full catalog</p>
            <h1 id="catalog-heading" className="section-title mt-2 text-[2rem] leading-tight sm:text-[2.6rem]">
              All startups waiting for a founder
            </h1>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Each one was drafted from a real problem found in live sources. Filter the list, then open a card to inspect its evidence.
            </p>
          </div>
          <DiscoverViewToggle view="all" />
        </div>

        <div className="mt-8 border-y border-border py-4">
          <DiscoveryFilters value={filters} onChange={setFilters} count={filtered.length} total={cards.length} />
        </div>

        {filtered.length === 0 ? (
          <div className="mt-8 grid place-items-center rounded-[4px] bg-surface-sunken px-6 py-16 text-center">
            <Compass className="size-8 text-primary" aria-hidden="true" />
            <p className="mt-3 font-display text-lg font-bold text-foreground">
              {cards.length === 0 ? "No startups discovered yet" : "No startups match these filters"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {cards.length === 0
                ? "Start a research run. Demandquake will read the live web and publish its first startups here."
                : "Clear a filter, or research this area to find new startups."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {active && (
                <Button variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear filters
                </Button>
              )}
              <Button variant="hero" onClick={onResearch}>
                Research a market <ArrowRight />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((c, i) => (
                <StartupCard key={c.id} card={c} index={i} />
              ))}
            </div>
            {filtered.length > INITIAL_CARDS && (
              <div className="mt-10 flex justify-center">
                <Button variant="outline" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                  {showAll ? "Show fewer" : `Show all ${filtered.length} startups`}
                  {showAll ? <ChevronUp /> : <ChevronDown />}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <MarketOverview filters={filters} panel={panel} />
    </>
  );
}

function MarketOverview({ filters, panel }: { filters: CatalogFilters; panel: OverviewPanel }) {
  const navigate = useNavigate({ from: "/discover" });
  return (
    <section id="market-overview" aria-labelledby="overview-heading" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 pb-20 pt-20 sm:px-6">
      <SectionHeading
        id="overview-heading"
        eyebrow="Market overview"
        title="Look at the whole market"
        description="For a wider view: every problem on one map, the latest market changes and past research. The map and market changes follow your filters."
      />
      <Tabs
        value={panel}
        onValueChange={(v) => navigate({ search: (p) => ({ ...p, overview: v }), replace: true, resetScroll: false })}
        className="mt-8"
      >
        <div className="flex justify-center overflow-x-auto border-b border-border">
          <TabsList variant="line" className="gap-8">
            <TabsTrigger variant="line" value="map" className="gap-2">
              <MapIcon className="size-4" aria-hidden="true" /> Problem map
            </TabsTrigger>
            <TabsTrigger variant="line" value="changes" className="gap-2">
              <Waves className="size-4" aria-hidden="true" /> Market changes
            </TabsTrigger>
            <TabsTrigger variant="line" value="runs" className="gap-2">
              <History className="size-4" aria-hidden="true" /> Latest research
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="map" className="mt-8">
          <MapPanel filters={filters} />
        </TabsContent>
        <TabsContent value="changes" className="mt-8">
          <ChangesPanel filters={filters} />
        </TabsContent>
        <TabsContent value="runs" className="mt-8">
          <RunsPanel />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function MapPanel({ filters }: { filters: CatalogFilters }) {
  const { data: nodes } = useSuspenseQuery(radarQuery);
  const filtered = useMemo(() => filterNodes(nodes, filters), [nodes, filters]);
  return (
    <>
      <p className="mb-4 text-center text-sm text-muted-foreground">Bigger dots have more sources behind them. Click one to read the posts behind it.</p>
      <OpportunityRadar nodes={filtered} />
    </>
  );
}

function ChangesPanel({ filters }: { filters: CatalogFilters }) {
  const { data: quakes } = useSuspenseQuery(recentQuakesQuery);
  const filtered = useMemo(() => filterQuakes(quakes, filters), [quakes, filters]);
  return (
    <>
      <p className="mb-4 text-center text-sm text-muted-foreground">
        Market scans read newly published articles about a startup’s problem. Each spike is one change that matters.
      </p>
      <QuakeFeed items={filtered} filtered={filtersActive(filters)} embedded />
    </>
  );
}

function RunsPanel() {
  const { data: runs } = useSuspenseQuery(recentRunsQuery);
  return (
    <>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Open a research run to replay what was searched, which sources were read and which startups came out of it.
      </p>
      <RecentRuns runs={runs} embedded />
    </>
  );
}

