import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { DISCOVER_DEFAULTS, discoverSearchSchema, isSearchDone } from "@/lib/journey";
import { JourneySteps } from "@/components/journey/JourneySteps";
import { ResearchStep } from "@/components/journey/ResearchStep";
import { lazy, Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const MarketResults = lazy(() => import("@/components/journey/MarketResults").then(m => ({ default: m.MarketResults })));

export const Route = createFileRoute("/_authenticated/discover")({
  validateSearch: zodValidator(discoverSearchSchema),
  loaderDeps: ({ search }) => ({ view: search.view }),
  search: { middlewares: [stripSearchParams(DISCOVER_DEFAULTS)] },
  head: () => ({
    meta: [
      { title: "Discover evidence-backed startups - Demandquake" },
      {
        name: "description",
        content:
          "Choose an industry, see the best-documented startup ideas found in live web evidence, inspect their sources and competitors, then claim one.",
      },
      { property: "og:title", content: "Discover evidence-backed startups - Demandquake" },
      {
        property: "og:description",
        content: "A step-by-step way to find a startup worth building: choose an idea, inspect the evidence, claim it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/discover" });
  // Ideas remain hidden until a search has completed on this browser.
  const [marketOpen, setMarketOpen] = useState(false);
  useEffect(() => setMarketOpen(isSearchDone()), []);


  // "Research a market" buttons jump back up to Step 1 instead of opening a pop-up.
  const [focusKey, setFocusKey] = useState(0);
  const goToSearch = () => {
    setFocusKey((k) => k + 1);
    navigate({ search: (p) => ({ ...p, step: 1 }), resetScroll: true });
  };
  useEffect(() => {
    if (!search.research) return;
    setFocusKey((k) => k + 1);
    navigate({ search: (p) => ({ ...p, step: 1, research: false }), replace: true, resetScroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.research]);
  return (
    <div>
      <JourneySteps
        current={1}
        renderStep={(n, content, cls) =>
          n === 1 ? (
            <Button variant="ghost" type="button" onClick={goToSearch} className={`${cls} cursor-pointer hover:bg-transparent`}>
              {content}
            </Button>
          ) : undefined
        }
      />
      <ResearchStep
        initialQuery={search.q}
        initialIndustry={search.industry}
        rerun={search.rerun}
        focusKey={focusKey}
      />
      {marketOpen && <Suspense fallback={<div role="status" className="mx-auto max-w-[1400px] px-6 py-12 text-muted-foreground">Loading startups…</div>}>
        <MarketResults search={search} onResearch={goToSearch} />
      </Suspense>}
    </div>
  );
}
