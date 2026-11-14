import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Coins, Factory, Loader2, MapPin, Search, Telescope } from "lucide-react";
import { toast } from "sonner";
import { startDiscovery } from "@/lib/research.functions";
import { EXAMPLE_QUERIES, GEOGRAPHIES, INDUSTRIES } from "@/lib/taxonomy";
import { useAuthUser } from "@/hooks/use-auth";
import { creditAccountQuery, creditCatalogQuery } from "@/lib/credit-queries";
import { canAfford } from "@/lib/credit-rules";
import { getStripeEnvironment } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NEXT_STEPS = [
  { n: "1", title: "We read the live web", body: "About 2–3 minutes. You can watch every source come in." },
  { n: "2", title: "Problems are grouped", body: "Repeated complaints and requests become problem clusters." },
  { n: "3", title: "New startups appear", body: "Each one links to its sources and joins the catalog." },
];

/**
 * "Research a new market" as a focused two-stage dialog: describe the market, then confirm the
 * credit cost in place. Only a successful search is charged; failed research is free.
 */
export function ResearchDialog({
  open,
  onOpenChange,
  initialQuery = "",
  initialIndustry,
  rerun = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
  initialIndustry?: string | null;
  rerun?: boolean;
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
  const account = useQuery({ ...creditAccountQuery(user?.id ?? ""), enabled: Boolean(user) && open });
  const cost = catalog.data?.settings["discovery"];
  const wallet = account.data?.wallet;
  const available = wallet ? wallet.balance - wallet.reserved : null;
  const affordable = wallet && cost !== undefined ? canAfford(wallet.balance, wallet.reserved, cost) : false;

  // Each opening starts fresh from what the page asked for (e.g. "Run fresh" or the selected industry).
  useEffect(() => {
    if (!open) return;
    const q = initialQuery.trim();
    setQuery(initialQuery);
    setIndustry(initialIndustry && (INDUSTRIES as readonly string[]).includes(initialIndustry) ? initialIndustry : "any");
    setGeography("any");
    setForce(rerun);
    setStage(rerun && q.length >= 6 ? "confirm" : "form");
    requestId.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  const selectClass = "h-10 w-full gap-2 rounded-full border-ink/40 bg-background px-4 text-sm font-semibold text-foreground sm:w-auto";
  const priceLine =
    cost === undefined ? (catalog.isError ? "Credit price unavailable" : "Loading credit price…") : `${cost} credits per successful search · failed research is free`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl gap-0 overflow-y-auto rounded-[4px] p-0 sm:rounded-[4px]">
        <div className="border-b border-border bg-surface-sunken px-6 pb-5 pt-6 sm:px-8">
          <p className="eyebrow flex items-center gap-2">
            <Telescope className="size-3.5" aria-hidden="true" /> {stage === "form" ? "Research a new market" : "Confirm your research"}
          </p>
          <DialogTitle className="section-title mt-2 text-2xl">
            {stage === "form" ? "What should Demandquake research?" : "Ready to start?"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {stage === "form"
              ? "Describe a market or a group of customers in your own words. We read the live web and add the startups we find to the catalog."
              : "Check the details below. The research starts right away and you can follow every step."}
          </DialogDescription>
        </div>

        {stage === "form" ? (
          <form
            className="px-6 py-6 sm:px-8"
            onSubmit={(e) => {
              e.preventDefault();
              review();
            }}
          >
            <label htmlFor="research-query" className="text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-foreground">
              Your question
            </label>
            <div className="mt-2 flex items-center gap-3 rounded-[4px] border border-border bg-background px-3 shadow-panel transition-shadow focus-within:shadow-glow">
              <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                id="research-query"
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Problems small clinics have with booking"
                className="h-12 min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-faint focus:outline-none"
                maxLength={300}
              />
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="text-sm text-muted-foreground">Optional focus:</span>
              <Select value={industry} onValueChange={setIndustry}>
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
              <Select value={geography} onValueChange={setGeography}>
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

            <div className="mt-6">
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-foreground">Or start from an example</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setQuery(q);
                      inputRef.current?.focus();
                    }}
                    aria-pressed={query === q}
                    className="cursor-pointer rounded-full border border-ink/40 bg-background px-3.5 py-1.5 text-left text-sm text-foreground transition-colors hover:border-ink aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-primary"
                  >
                    {q}
                  </button>
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
            <p className="mt-3 text-sm text-muted-foreground">Failed research is never charged, and refreshing the page won’t charge you twice.</p>

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
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{s.body}</span>
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
      </DialogContent>
    </Dialog>
  );
}
