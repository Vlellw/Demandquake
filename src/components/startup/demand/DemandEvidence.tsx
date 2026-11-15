import type { ReactNode } from "react";
import { AlertCircle, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/common/InfoTip";
import { ObservedTag } from "@/components/common/Provenance";
import { TimeAgo } from "@/components/common/TimeAgo";
import { useDemandEvidence } from "@/hooks/use-demand-evidence";
import { VISIBLE_SECTIONS, formatCount, type DemandEvidenceDTO, type DemandSection } from "@/lib/demand";
import { cn } from "@/lib/utils";
import { DemandPanel } from "./parts";
import { FundingBody, LocalBody, MarketSizeBody, PricingBody, ReviewsBody, VideosBody, VoicesBody, WhyNowBody } from "./sections";

type Sections = DemandEvidenceDTO["sections"];

function GlanceCell({ href, label, value, state }: { href: string; label: string; value: ReactNode; state: "ready" | "loading" | "missing" }) {
  return (
    <div className="stat-rule flex flex-col-reverse justify-end pt-3">
      <dt className="mt-1 text-xs text-muted-foreground">
        <a href={href} className="underline-offset-4 hover:text-primary hover:underline">
          {label}
        </a>
      </dt>
      <dd className="font-display text-2xl font-semibold leading-tight text-primary">
        {state === "loading" ? <span className="block h-7 w-12 rounded bg-muted shimmer-line" aria-label="Checking" /> : state === "missing" ? <span className="text-muted-foreground">-</span> : value}
      </dd>
    </div>
  );
}

function cellState(s: Sections[DemandSection]): "ready" | "loading" | "missing" {
  if (s.data && (s.status === "done" || s.status === "running" || s.status === "empty")) return "ready";
  if (s.status === "pending" || s.status === "running") return "loading";
  return "missing";
}

function Glance({ s }: { s: Sections }) {
  const voices = s.voices.data;
  const reviews = s.reviews.data;
  const pricing = s.pricing.data;
  const funding = s.funding.data;
  const videos = s.videos.data;
  const whyNow = s.why_now.data;
  return (
    <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-6">
      <GlanceCell href="#demand-voices" label="Customer posts on Reddit" state={cellState(s.voices)} value={voices?.relevant ?? 0} />
      <GlanceCell href="#demand-reviews" label="Competitor reviews read" state={cellState(s.reviews)} value={formatCount(reviews?.reviews_read ?? 0)} />
      <GlanceCell
        href="#demand-pricing"
        label="Competitors with public prices"
        state={cellState(s.pricing)}
        value={pricing ? `${pricing.summary.published}/${pricing.summary.checked}` : "0"}
      />
      <GlanceCell href="#demand-funding" label="Funded similar companies" state={cellState(s.funding)} value={funding?.summary.with_funding ?? 0} />
      <GlanceCell href="#demand-videos" label="How-to video views" state={cellState(s.videos)} value={formatCount(videos?.total_views ?? 0)} />
      <GlanceCell href="#demand-why-now" label="Dated rule changes" state={cellState(s.why_now)} value={whyNow?.changes.length ?? 0} />
    </dl>
  );
}

export function DemandEvidence({ slug }: { slug: string }) {
  const { evidence, loading, loadError, driverError, retry, retrying, restart } = useDemandEvidence(slug);

  if (loading) {
    return (
      <section className="panel p-5" aria-busy="true">
        <h2 className="font-display text-xl font-semibold text-foreground">Demand checks</h2>
        <div className="mt-5 grid grid-cols-2 gap-6 sm:grid-cols-3 xl:grid-cols-6" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-14 rounded bg-muted shimmer-line" />
          ))}
        </div>
      </section>
    );
  }
  if (loadError || !evidence) {
    return (
      <section className="panel flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="flex items-center gap-2 text-sm text-foreground/90">
          <AlertCircle className="size-4 text-destructive" aria-hidden="true" />
          Demand checks could not be loaded.
        </p>
        <Button size="sm" variant="outline" onClick={restart}>
          <RotateCw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      </section>
    );
  }

  const s = evidence.sections;
  const localShown = s.local.status !== "not_applicable";
  const visible = VISIBLE_SECTIONS.filter((k) => k !== "local" || localShown);
  const settled = visible.filter((k) => s[k].status === "done" || s[k].status === "empty" || s[k].status === "error").length;
  const working = evidence.needs_work && !driverError;
  const planFailed = s.plan.status === "error";
  const waiting = planFailed || s.plan.status !== "done";
  const latest = visible
    .map((k) => s[k].retrieved_at)
    .filter((x): x is string => Boolean(x))
    .sort()
    .at(-1);
  const panel = { onRetry: retry, retrying };

  return (
    <section aria-labelledby="demand-heading" className="space-y-6">
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="demand-heading" className="flex items-center gap-1.5 font-display text-xl font-semibold text-foreground">
            Demand checks
            <InfoTip align="start">
              Extra checks that test whether people really need this startup: what customers post, what competitor reviews complain about, what
              people already pay, where money is flowing and which rules are changing. Every count comes straight from the linked pages; AI only
              filters and groups them, and those parts carry a purple label. Checks run once and refresh monthly.
            </InfoTip>
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {working ? (
              <span className="inline-flex items-center gap-2" role="status">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {settled} of {visible.length} checks done
              </span>
            ) : latest ? (
              <span>
                Checked <TimeAgo iso={latest} />
              </span>
            ) : null}
            <ObservedTag label="Context.dev" />
          </div>
        </div>

        {(driverError || planFailed) && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="flex items-start gap-2 text-sm text-foreground/90">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              {driverError ?? s.plan.error}
            </p>
            {driverError ? (
              <Button size="sm" variant="outline" onClick={restart}>
                <RotateCw className="size-3.5" aria-hidden="true" />
                Continue
              </Button>
            ) : s.plan.retry_allowed ? (
              <Button size="sm" variant="outline" onClick={retry} disabled={retrying}>
                <RotateCw className={cn("size-3.5", retrying && "animate-spin")} aria-hidden="true" />
                Try again
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Retrying automatically later</span>
            )}
          </div>
        )}

        <Glance s={s} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DemandPanel
          id="demand-voices"
          className="lg:col-span-2"
          title="What customers say"
          info="Reddit posts from the last 12 months that match how affected people describe the problem. AI keeps only posts where people describe the problem themselves and picks a sentence; every quote is checked word for word against the post."
          section={s.voices}
          waiting={waiting}
          emptyText={(d) =>
            d
              ? `None of the ${d.scanned} Reddit posts from the last 12 months for ${d.queries.map((q) => `"${q}"`).join(" and ")} describe this problem. Few public complaints can mean low demand, or a problem people discuss elsewhere.`
              : "No Reddit posts found."
          }
          {...panel}
        >
          {(d) => <VoicesBody data={d} />}
        </DemandPanel>

        <DemandPanel
          id="demand-reviews"
          className="lg:col-span-2"
          title="Where competitors fall short"
          info="Recent public reviews of the closest competitors on G2, Google Play and the App Store. Store listings are only used when the developer website matches the competitor. AI groups the critical reviews into themes; quotes are the reviewers' own words."
          section={s.reviews}
          waiting={waiting}
          emptyText={(d) =>
            d && d.competitors_checked.length
              ? `No G2, Google Play or App Store listings were found for ${d.competitors_checked.join(", ")}.`
              : "This startup has no competitors with a known website to look up."
          }
          {...panel}
        >
          {(d) => <ReviewsBody data={d} />}
        </DemandPanel>

        <DemandPanel
          id="demand-pricing"
          className="lg:col-span-2"
          title="What people already pay"
          info="Prices exactly as printed on each competitor's own pricing page. Free plans are counted separately and never treated as a price. Use these to test your pricing assumptions; they are not a recommendation."
          section={s.pricing}
          waiting={waiting}
          emptyText={(d) =>
            d && d.competitors.length
              ? `No pricing pages were found on ${d.competitors.map((c) => c.domain).join(", ")}.`
              : "This startup has no competitors with a known website to check."
          }
          {...panel}
        >
          {(d) => <PricingBody data={d} />}
        </DemandPanel>

        <DemandPanel
          id="demand-funding"
          className="lg:col-span-2"
          title="Money in the market"
          info="Companies selling into the same problem, with headcount, founding year and disclosed funding from Context.dev's company data, plus press releases from the last two years. AI only decides which results are relevant."
          section={s.funding}
          waiting={waiting}
          emptyText={() => "No companies or recent announcements were found for this problem. An empty market can mean an opening, or little proven demand."}
          {...panel}
        >
          {(d) => <FundingBody data={d} reviews={s.reviews.data} />}
        </DemandPanel>

        <DemandPanel
          id="demand-why-now"
          title="Why now"
          info="Dated laws, rules and deadlines that change what affected people must do. Found by Context.dev's research assistant; the summary is AI-written (purple), and a quote is only shown when it appears word for word on the linked page."
          section={s.why_now}
          waiting={waiting}
          emptyText={() => "No dated rule changes from the last two years were found for this problem."}
          {...panel}
        >
          {(d) => <WhyNowBody data={d} />}
        </DemandPanel>

        <DemandPanel
          id="demand-market-size"
          title="Reported market size"
          info="Market-size figures exactly as published. Each figure was re-opened on its page and is only shown when the page states it. Publishers measure markets differently, so compare them with care."
          section={s.market_size}
          waiting={waiting}
          emptyText={(d) => `No published market-size figure could be confirmed${d?.topic ? ` for ${d.topic}` : ""}.`}
          {...panel}
        >
          {(d) => <MarketSizeBody data={d} />}
        </DemandPanel>

        <DemandPanel
          id="demand-videos"
          className={localShown ? "" : "lg:col-span-2"}
          title="How people cope today"
          info="View counts of the most relevant YouTube how-to videos. Many views on workarounds suggest people actively look for help with this problem."
          section={s.videos}
          waiting={waiting}
          emptyText={(d) => `No YouTube how-to videos were found${d?.query ? ` for "${d.query}"` : ""}.`}
          {...panel}
        >
          {(d) => <VideosBody data={d} />}
        </DemandPanel>

        {localShown && (
          <DemandPanel
            id="demand-local"
            title="Local demand"
            info="Businesses on Google Maps that serve this need locally, with their ratings and their lowest-rated reviews in the customers' own words."
            section={s.local}
            waiting={waiting}
            emptyText={(d) => `No businesses were found on Google Maps${d?.query ? ` for "${d.query}"` : ""}.`}
            {...panel}
          >
            {(d) => <LocalBody data={d} />}
          </DemandPanel>
        )}
      </div>
    </section>
  );
}
