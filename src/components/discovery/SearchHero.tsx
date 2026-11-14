import { useState } from "react";
import { TimeAgo } from "@/components/common/TimeAgo";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2, MapPin, Factory } from "lucide-react";
import { toast } from "sonner";
import { startDiscovery } from "@/lib/research.functions";
import { EXAMPLE_QUERIES, GEOGRAPHIES, INDUSTRIES } from "@/lib/taxonomy";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeismicField } from "@/components/common/SeismicField";


export function SearchHero({ stats }: { stats: { startups: number; sources: number; domains: number; lastResearchAt: string | null } }) {
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState<string>("any");
  const [geography, setGeography] = useState<string>("any");
  const [pending, setPending] = useState(false);
  const start = useServerFn(startDiscovery);
  const navigate = useNavigate();

  async function submit(q: string, force = false) {
    const text = q.trim();
    if (text.length < 6) {
      toast.error("Describe what to research in a few more words.");
      return;
    }
    setPending(true);
    try {
      const res = await start({
        data: {
          query: text,
          industry: industry === "any" ? null : industry,
          geography: geography === "any" ? null : geography,
          force,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.reused === "cached") {
        toast("Showing recent research for this exact query", {
          description: "Live results from the last 12 hours are reused to save research credits.",
          action: { label: "Run fresh", onClick: () => submit(text, true) },
        });
      }
      navigate({ to: "/research/$runId", params: { runId: res.runId } });
    } catch (err) {
      console.error(err);
      toast.error("Could not start the discovery. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="bg-hero absolute inset-0" />
      <div className="bg-grid absolute inset-0 opacity-60" />
      <SeismicField className="absolute inset-x-0 bottom-0 h-40 w-full opacity-80" />
      <div className="relative mx-auto max-w-[1400px] px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow animate-float-up">The next unicorn hasn't been founded yet</p>
          <h1 className="mt-4 animate-float-up font-display text-4xl font-semibold leading-[1.02] text-foreground sm:text-6xl [animation-delay:80ms]">
            What problems should we turn into <span className="text-magma">startups</span> today?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl animate-float-up text-base text-muted-foreground sm:text-lg [animation-delay:160ms]">
            Demandquake researches the live web, finds recurring business problems, and turns them into unclaimed,
            evidence-backed startups — every claim linked to its source.
          </p>
        </div>

        <form
          className="mx-auto mt-10 max-w-3xl animate-float-up [animation-delay:240ms]"
          onSubmit={(e) => {
            e.preventDefault();
            submit(query);
          }}
        >
          <div className="panel-raised p-2 transition-shadow focus-within:shadow-glow">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="discover-query" className="sr-only">
                Research topic
              </label>
              <input
                id="discover-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Find startup opportunities in European manufacturing"
                className="h-12 min-w-0 flex-1 bg-transparent px-4 text-base text-foreground placeholder:text-faint focus:outline-none"
                maxLength={300}
                disabled={pending}
              />
              <Button type="submit" variant="hero" size="lg" disabled={pending} className="sm:w-auto">
                {pending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                {pending ? "Starting research" : "Discover"}
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border px-2 pt-2">
              <Select value={industry} onValueChange={setIndustry} disabled={pending}>
                <SelectTrigger className="h-8 w-auto gap-2 border-border bg-transparent text-xs text-muted-foreground" aria-label="Industry focus">
                  <Factory className="size-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any industry</SelectItem>
                  {INDUSTRIES.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={geography} onValueChange={setGeography} disabled={pending}>
                <SelectTrigger className="h-8 w-auto gap-2 border-border bg-transparent text-xs text-muted-foreground" aria-label="Geography focus">
                  <MapPin className="size-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any geography</SelectItem>
                  {GEOGRAPHIES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="ml-auto hidden font-mono text-[11px] text-faint sm:inline">≈ 2–3 min of live research</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                disabled={pending}
                onClick={() => {
                  setQuery(q);
                  submit(q);
                }}
                className="rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </form>

        <dl className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
          {[
            { label: "Unclaimed startups", value: stats.startups.toLocaleString() },
            { label: "Sources analyzed", value: stats.sources.toLocaleString() },
            { label: "Distinct domains", value: stats.domains.toLocaleString() },
            { label: "Last live research", value: stats.lastResearchAt ? <TimeAgo iso={stats.lastResearchAt} /> : "—" },
          ].map((s) => (
            <div key={s.label} className="bg-surface/80 px-4 py-3 text-center backdrop-blur">
              <dt className="eyebrow">{s.label}</dt>
              <dd className="mt-1 font-display text-xl font-semibold text-foreground">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
