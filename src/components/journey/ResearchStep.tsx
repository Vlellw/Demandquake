import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Coins, Factory, Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { startDiscovery } from "@/lib/research.functions";
import { EXAMPLE_QUERIES, INDUSTRIES } from "@/lib/taxonomy";
import { useAuthUser } from "@/hooks/use-auth";
import { creditAccountQuery, creditCatalogQuery } from "@/lib/credit-queries";
import { canAfford } from "@/lib/credit-rules";
import { getStripeEnvironment } from "@/lib/stripe";
import { InfoTip } from "@/components/common/InfoTip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NEXT_STEPS = [
  { n: "1", title: "We read the live web" },
  { n: "2", title: "Problems are grouped" },
  { n: "3", title: "New startups appear" },
];

/**
 * Step 1 of the journey, shown inline at the top of Discover: describe a market, then confirm the
 * credit cost in place. Only a successful search is charged; failed research is free.
 * `focusKey` changes whenever the page asks to jump here (e.g. "Research a market" buttons).
 */
export function ResearchStep({
  initialQuery = "",
  initialIndustry,
  rerun = false,
  focusKey = 0,
}: {
  initialQuery?: string;
  initialIndustry?: string | null;
  rerun?: boolean;
  focusKey?: number;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [industry, setIndustry] = useState<string>("any");
  const [geography, setGeography] = useState<string>("any");
  const [stage, setStage] = useState<"form" | "confirm">("form");
  const [force, setForce] = useState(false);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const requestId = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = useServerFn(startDiscovery);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthUser();
  const catalog = useQuery(creditCatalogQuery());
  const account = useQuery({ ...creditAccountQuery(user?.id ?? ""), enabled: Boolean(user) });
  const cost = catalog.data?.settings["discovery"];
  const wallet = account.data?.wallet;
  const available = wallet ? wallet.balance - wallet.reserved : null;
  const affordable = wallet && cost !== undefined ? canAfford(wallet.balance, wallet.reserved, cost) : false;

  const sectionRef = useRef<HTMLElement>(null);
  // Start from what the page asked for (e.g. "Run fresh" or the selected industry).
  useEffect(() => {
    const q = initialQuery.trim();
    setQuery(initialQuery);
    setIndustry(initialIndustry && (INDUSTRIES as readonly string[]).includes(initialIndustry) ? initialIndustry : "any");
    setGeography("any");
    setForce(rerun);
    setStage(rerun && q.length >= 6 ? "confirm" : "form");
    requestId.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, rerun]);

  useEffect(() => {
    if (!focusKey) return;
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setStage((st) => (st === "confirm" ? st : "form"));
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 350);
  }, [focusKey]);

  function review() {
    const text = query.trim();
    if (text.length < 6) {
      toast.error("Describe what to research in a few more words.");
      inputRef.current?.focus();
      return;
    }
    if (!user) {
      toast.error("Sign in to start research.");
      return;
    }
    if (cost === undefined) {
      toast.error(catalog.isError ? "Credit pricing couldn’t load. Please try again." : "Loading the credit price…");
      return;
    }
    setStage("confirm");
  }

  async function confirm() {
    const text = query.trim();
    if (cost === undefined || inFlight.current || !affordable) return;
    inFlight.current = true;
    setPending(true);
    requestId.current ??= crypto.randomUUID();
    try {
      const res = await start({
        data: {
          query: text,
          industry: industry === "any" ? null : industry,
          geography: geography === "any" ? null : geography,
          force,
          environment: getStripeEnvironment(),
          requestId: requestId.current,
          expectedCost: cost,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      requestId.current = null;
      await qc.invalidateQueries({ queryKey: ["credit-account"] });
      if (res.reused === "cached") {
        toast("Showing recent research for this exact question", {
          description: "Live results from the last 12 hours are reused to save credits.",
          action: {
            label: "Run fresh",
            onClick: () => navigate({ to: "/discover", search: { research: true, q: text, rerun: true } }),
          },
        });
      }
      navigate({ to: "/research/$runId", params: { runId: res.runId } });
    } catch (err) {
      console.error(err);
      toast.error("Couldn’t start the research. No credits were charged.");
    } finally {
      setPending(false);
      inFlight.current = false;
    }
  }

  const priceLine =
    cost === undefined ? (catalog.isError ? "Credit price unavailable" : "Loading credit price…") : `${cost} credits per successful search · failed research is free`;

  return (
    <section
      id="search-step"
      ref={sectionRef}
      aria-labelledby="search-heading"
      className="mx-auto max-w-[1400px] scroll-mt-24 px-4 pt-10 sm:px-6 sm:pt-14"
    >
      <div className="overflow-hidden rounded-[4px] border border-border bg-background shadow-panel">
        <div className="flex flex-col gap-4 border-b border-border bg-surface-sunken px-6 pb-5 pt-6 sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div className="max-w-3xl">
          <h2 id="search-heading" className="section-title text-[1.75rem] leading-tight sm:text-[2.2rem]">
            {stage === "form" ? "What should Demandquake research?" : "Ready to start?"}{" "}
            <InfoTip align="start">
              {stage === "form"
                ? "Describe a market or a group of customers in your own words. We read the live web and add the startups we find to the catalog."
                : "Check the details below. The research starts right away and you can follow every step. Failed research is never charged, and refreshing the page won’t charge you twice."}
            </InfoTip>
          </h2>
          </div>
        </div>

        {stage === "form" ? (
          <form
            className="px-6 py-6 sm:px-8"
            onSubmit={(e) => {
              e.preventDefault();
              review();
            }}
          >
            <label htmlFor="research-query" className="block text-center text-sm font-bold uppercase tracking-[0.06em] text-foreground">
              Your question
            </label>
            <div className="mx-auto mt-3 flex max-w-5xl items-center gap-3 rounded-[4px] border border-border bg-background px-4 shadow-panel transition-shadow focus-within:shadow-glow">
              <Search className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                id="research-query"
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Problems small clinics have with booking"
                className="h-16 min-w-0 flex-1 bg-transparent text-lg text-foreground placeholder:text-faint focus:outline-none sm:text-xl"
                maxLength={300}
              />
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.06em] text-foreground">Or start from an example</p>
              <div className="mx-auto mt-4 flex max-w-5xl flex-wrap justify-center gap-3">
                {EXAMPLE_QUERIES.map((q) => (
                  <Button
                    variant="outline"
                    key={q}
                    type="button"
                    onClick={() => {
                      setQuery(q);
                      inputRef.current?.focus();
                    }}
                    aria-pressed={query === q}
                    className="h-auto min-h-9 max-w-full whitespace-normal rounded-full border-ink/40 px-3 py-1.5 text-center text-xs leading-snug aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-primary sm:text-sm"
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Coins className="size-4 shrink-0" aria-hidden="true" /> {priceLine}
              </p>
              <Button type="submit" variant="hero" size="lg">
                Review and start <ArrowRight />
              </Button>
            </div>
          </form>
        ) : (
          <div className="px-6 py-6 sm:px-8">
            <div className="rounded-[4px] border-l-4 border-primary bg-surface-sunken p-4">
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-muted-foreground">You’re researching</p>
              <p className="mt-1 font-display text-lg font-bold leading-snug text-foreground">“{query.trim()}”</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="outline">
                  <Factory /> {industry === "any" ? "Any industry" : industry}
                </Badge>
                <Badge variant="outline">
                  <MapPin /> {geography === "any" ? "Any region" : geography}
                </Badge>
                {force && <Badge variant="default">Fresh research, not reused</Badge>}
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div className="stat-rule pt-3">
                <dt className="text-sm text-primary">Cost if it succeeds</dt>
                <dd className="font-display text-2xl font-bold text-primary">{cost ?? "…"} credits</dd>
              </div>
              <div className="stat-rule pt-3">
                <dt className="text-sm text-primary">You have</dt>
                <dd className="font-display text-2xl font-bold text-primary">
                  {available === null ? "…" : `${available.toLocaleString("en-US")} credits`}
                </dd>
              </div>
            </dl>

            {wallet && !affordable && (
              <p role="alert" className="mt-4 rounded-[4px] border border-negative/40 p-3 text-sm text-negative">
                You need {cost} available credits to start this research.{" "}
                <Link to="/credits" className="font-bold underline underline-offset-4">
                  Buy credits
                </Link>
              </p>
            )}

            <ol className="mt-6 grid gap-3 sm:grid-cols-3">
              {NEXT_STEPS.map((s) => (
                <li key={s.n} className="flex gap-3 rounded-[4px] border border-border p-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{s.n}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-foreground">{s.title}</span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => setStage("form")} disabled={pending}>
                <ArrowLeft /> Change the question
              </Button>
              {wallet && !affordable ? (
                <Button asChild size="lg">
                  <Link to="/credits">Buy credits</Link>
                </Button>
              ) : (
                <Button size="lg" variant="hero" onClick={confirm} disabled={pending || !wallet || cost === undefined}>
                  {pending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                  {pending ? "Starting research…" : `Start research · ${cost ?? "…"} credits`}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
