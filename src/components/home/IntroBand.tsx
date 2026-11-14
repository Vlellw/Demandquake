import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeAgo } from "@/components/common/TimeAgo";

type Stats = { startups: number; sources: number; domains: number; lastResearchAt: string | null };

/** Light-gray band: what Demandquake is, one pill action, and live counters with navy top rules. */
export function IntroBand({ stats }: { stats: Stats }) {
  const items = [
    { label: "Startups to explore", value: stats.startups.toLocaleString("en-US") },
    { label: "Sources read", value: stats.sources.toLocaleString("en-US") },
    { label: "Different websites", value: stats.domains.toLocaleString("en-US") },
    { label: "Latest research", value: stats.lastResearchAt ? <TimeAgo iso={stats.lastResearchAt} /> : "None yet" },
  ];
  return (
    <section className="bg-surface-sunken" aria-labelledby="intro-heading">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="intro-heading" className="section-title text-[1.75rem] sm:text-[2.1rem]">
            Demandquake turns real problems found online into startups you can claim
          </h2>
          <p className="mt-4 text-base leading-relaxed text-foreground sm:text-lg">
            Each idea starts from complaints, requests and news that businesses publish on the web. Facts link to their
            source, and anything the AI suggested is clearly marked as a hypothesis.
          </p>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/method">
              How it works <ArrowRight />
            </Link>
          </Button>
        </div>
        <dl className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 sm:gap-x-10">
          {items.map((s) => (
            <div key={s.label} className="stat-rule flex flex-col-reverse items-center pt-4 text-center">
              <dt className="mt-1 text-sm text-primary">{s.label}</dt>
              <dd className="font-display text-[1.9rem] font-bold leading-tight text-primary sm:text-[2.4rem]">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
