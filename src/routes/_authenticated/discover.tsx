import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { zodValidator } from "@tanstack/zod-adapter";
import { radarQuery, recentQuakesQuery, recentRunsQuery, startupCardsQuery, statsQuery } from "@/lib/queries";
import { DISCOVER_DEFAULTS, FOR_YOU, discoverSearchSchema, normalizeOverview, normalizeView } from "@/lib/journey";
import { JourneySteps } from "@/components/journey/JourneySteps";
import { GuidedDiscover } from "@/components/journey/GuidedDiscover";
import { CatalogView } from "@/components/journey/CatalogView";
import { ResearchDialog } from "@/components/journey/ResearchDialog";

export const Route = createFileRoute("/_authenticated/discover")({
  validateSearch: zodValidator(discoverSearchSchema),
  search: { middlewares: [stripSearchParams(DISCOVER_DEFAULTS)] },
  loaderDeps: ({ search }) => ({ view: normalizeView(search.view) }),
  head: () => ({
    meta: [
      { title: "Discover evidence-backed startups — Demandquake" },
      {
        name: "description",
        content:
          "Choose an industry, see the best-documented startup ideas found in live web evidence, inspect their sources and competitors, then claim one.",
      },
      { property: "og:title", content: "Discover evidence-backed startups — Demandquake" },
      {
        property: "og:description",
        content: "A step-by-step way to find a startup worth building: choose an idea, inspect the evidence, claim it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(startupCardsQuery),
      context.queryClient.ensureQueryData(statsQuery),
      // Market tools only appear in the full catalog, so the guided view doesn't wait for them.
      ...(deps.view === "all"
        ? [
            context.queryClient.ensureQueryData(radarQuery),
            context.queryClient.ensureQueryData(recentRunsQuery),
            context.queryClient.ensureQueryData(recentQuakesQuery),
          ]
        : []),
    ]),
  component: DiscoverPage,
});

function DiscoverPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/discover" });
  const { data: cards } = useSuspenseQuery(startupCardsQuery);
  const { data: stats } = useSuspenseQuery(statsQuery);
  const view = normalizeView(search.view);

  function setResearch(open: boolean) {
    navigate({
      search: (p) => ({ ...p, research: open, q: open ? p.q : "", rerun: open ? p.rerun : false }),
      replace: true,
      resetScroll: false,
    });
  }

  return (
    <div>
      <JourneySteps current={1} />
      {view === "guided" ? (
        <GuidedDiscover cards={cards} stats={stats} industry={search.industry} onResearch={() => setResearch(true)} />
      ) : (
        <CatalogView
          cards={cards}
          filters={{
            industry: search.industry === FOR_YOU ? "all" : search.industry,
            region: search.region,
            model: search.model,
            fresh: search.fresh,
          }}
          panel={normalizeOverview(search.overview)}
          onResearch={() => setResearch(true)}
        />
      )}
      <ResearchDialog
        open={search.research}
        onOpenChange={setResearch}
        initialQuery={search.q}
        initialIndustry={search.industry}
        rerun={search.rerun}
      />
    </div>
  );
}
