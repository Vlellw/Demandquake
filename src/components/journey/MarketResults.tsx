import { useSuspenseQueries } from "@tanstack/react-query";
import { startupCardsQuery, statsQuery } from "@/lib/queries";
import { FOR_YOU, normalizeOverview, normalizeView, type DiscoverSearch } from "@/lib/journey";
import { GuidedDiscover } from "./GuidedDiscover";
import { lazy, Suspense } from "react";

const CatalogView = lazy(() => import("./CatalogView").then(m => ({ default: m.CatalogView })));

/** Independent results boundary: the search form never waits for hidden catalog data. */
export function MarketResults({ search, onResearch }: { search: DiscoverSearch; onResearch: () => void }) {
  const view = normalizeView(search.view);
  const [cards, stats] = useSuspenseQueries({ queries: [startupCardsQuery, statsQuery] });
  if (view === "guided") return <GuidedDiscover cards={cards.data} stats={stats.data} industry={search.industry} onResearch={onResearch} />;
  return <Suspense fallback={<div role="status" className="px-6 py-12 text-muted-foreground">Loading catalog…</div>}><CatalogView cards={cards.data} filters={{ industry: search.industry === FOR_YOU ? "all" : search.industry, region: search.region, model: search.model, fresh: search.fresh }} panel={normalizeOverview(search.overview)} onResearch={onResearch} /></Suspense>;
}