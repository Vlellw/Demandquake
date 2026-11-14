import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Factory, Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { startDiscovery } from "@/lib/research.functions";
import { EXAMPLE_QUERIES, GEOGRAPHIES, INDUSTRIES } from "@/lib/taxonomy";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionHeading } from "@/components/common/SectionHeading";


/** "Research a new market" section: one plain search box, optional focus, examples and what happens next. */
export function SearchHero() {
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

  const selectClass =
    "h-10 w-auto gap-2 rounded-full border-ink/40 bg-background px-4 text-sm font-semibold text-foreground";

  return (
    <section id="discover" aria-labelledby="discover-heading" className="bg-surface-sunken">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20">
        <SectionHeading
          id="discover-heading"
          eyebrow="Research a new market"
          title="What should Demandquake research next?"
          description="Describe a market or a group of customers in your own words. We read the live web and publish the startups we find here."
        />

        <form
          className="mx-auto mt-10 max-w-3xl"
          onSubmit={(e) => {
            e.preventDefault();
            submit(query);
          }}
        >
          <div className="rounded-[4px] border border-border bg-background p-2 shadow-panel transition-shadow focus-within:shadow-glow">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="discover-query" className="sr-only">
                What to research
              </label>
              <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
                <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input
                  id="discover-query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Problems small clinics have with booking"
                  className="h-12 min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-faint focus:outline-none"
                  maxLength={300}
                  disabled={pending}
                />
              </div>
              <Button type="submit" variant="hero" size="lg" disabled={pending} className="sm:w-auto">
                {pending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                {pending ? "Starting research" : "Start research"}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Optional focus:</span>
            <Select value={industry} onValueChange={setIndustry} disabled={pending}>
              <SelectTrigger className={selectClass} aria-label="Industry focus">
                <Factory className="size-4" />
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
              <SelectTrigger className={selectClass} aria-label="Region focus">
                <MapPin className="size-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any region</SelectItem>
                {GEOGRAPHIES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-8 text-center sm:-mx-24 lg:-mx-40">
            <p className="eyebrow">Or try an example</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setQuery(q);
                    submit(q);
                  }}
                  className="cursor-pointer rounded-full border border-ink/40 bg-background px-4 py-2 text-sm text-foreground transition-colors hover:border-ink hover:bg-ink hover:text-ink-foreground disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </form>

        <ol className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            { n: "1", title: "Describe a market", body: "A sentence is enough, for example an industry, a region or a type of customer." },
            { n: "2", title: "We read the live web", body: "About 2–3 minutes. You can watch each step and every source as it comes in." },
            { n: "3", title: "New startups appear", body: "Each one is linked to its sources and added to the list above for anyone to explore." },
          ].map((step) => (
            <li key={step.n} className="flex gap-4 rounded-[4px] bg-background p-5 shadow-panel">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {step.n}
              </span>
              <span>
                <span className="block font-bold text-foreground">{step.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
