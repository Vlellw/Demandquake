import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, Brain, CircleAlert, FileSearch, Flag, Globe2, Radar, Scale, ShieldCheck, Sparkles, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/SectionHeading";
import { InfoTip } from "@/components/common/InfoTip";
import { ObservedTag, InferredTag } from "@/components/common/Provenance";
import { LevelMeter } from "@/components/common/LevelMeter";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/method")({
  head: () => ({
    meta: [
      { title: "How Demandquake works - evidence-first startup discovery" },
      {
        name: "description",
        content: "How Demandquake researches the live web with Context.dev, separates sourced facts from AI hypotheses, and assesses opportunities without fake success scores.",
      },
      { property: "og:title", content: "How Demandquake works" },
      { property: "og:description", content: "Live web research → evidence clusters → unclaimed startups, with every claim traceable to its source." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MethodPage,
});

type StepTag = "ai" | "observed" | "you";
type Step = { icon: typeof Brain; title: string; body: string; tag: StepTag };

const PHASES: { name: string; summary: string; steps: Step[] }[] = [
  {
    name: "Research",
    summary: "Find problems people already describe online.",
    steps: [
      { icon: Brain, title: "Plan the search", body: "Your question becomes a research plan: targeted searches for complaints, regulation, market news, technology shifts and explicit requests.", tag: "ai" },
      { icon: Globe2, title: "Search the live web", body: "Context.dev web and news search retrieves real publications - each stored with its link, publisher, publication date and when we read it.", tag: "observed" },
      { icon: FileSearch, title: "Pick out signals", body: "Each source is read for concrete signals: a complaint, a rule change, a funding round, a capability that didn’t exist before.", tag: "ai" },
      { icon: Boxes, title: "Group into problems", body: "Signals from different sources are grouped into recurring problems. Evidence strength reflects how many independent sources agree.", tag: "ai" },
    ],
  },
  {
    name: "Build",
    summary: "Turn a well-sourced problem into a startup idea.",
    steps: [
      { icon: Swords, title: "Check existing solutions", body: "A second live search looks for companies already working on each problem. Only companies named in sources are listed; logos and profiles come from Context.dev and are only shown when the company clearly matches.", tag: "observed" },
      { icon: Sparkles, title: "Draft the startup", body: "A startup idea is designed around the evidence: name, solution, customers, business model, risks, pitch and a plan for testing it.", tag: "ai" },
    ],
  },
  {
    name: "Grow",
    summary: "Claim the idea and keep an eye on the market.",
    steps: [
      { icon: Radar, title: "Watch for market changes", body: "A market scan searches the news again and explains whether each new development strengthens or weakens the idea. Claimed workspaces re-check on their own when their evidence is over a week old.", tag: "observed" },
      { icon: Flag, title: "Claim and test it", body: "Founders claim a startup into a private workspace with the research, assumptions and an experiment checklist - and can invite co-founders to edit it with them.", tag: "you" },
    ],
  },
];

const LIMITS = [
  "People complaining online is not proof they’ll pay. Every startup starts as “Not validated with customers yet”.",
  "Search coverage is broad but not complete. An empty competitor list means none were named in sources, not that none exist.",
  "Publication dates come from the publisher. Undated pages are marked as undated rather than guessed.",
  "Startup ideas are public and more than one founder can claim the same one - how you build it is what counts.",
];

function StepTagLabel({ tag }: { tag: StepTag }) {
  if (tag === "observed") return <ObservedTag />;
  if (tag === "ai") return <InferredTag label="AI" />;
  return (
    <span className="inline-flex items-center rounded-[3px] border border-foreground px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
      You
    </span>
  );
}

function MethodPage() {
  let n = 0;
  return (
    <div className="-mb-24">

      {/* Gray intro band */}
      <section className="bg-muted">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:py-20">
          <SectionHeading
            as="h1"
            align="left"
            title="Evidence first. Guesses labelled. No fake odds."
            description="Demandquake suggests startups that don’t exist yet by reading what the internet is already saying - and shows you which parts come from real sources and which are the AI’s suggestions."
          />
        </div>
      </section>

      {/* Steps by phase */}
      <section aria-labelledby="steps-heading" className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
        <SectionHeading id="steps-heading" title="From a question to a startup you can test" description="Eight steps in three phases. Each step is labelled so you know whether it’s based on sources, on AI reasoning, or on you." />
        <div className="mt-12 space-y-12">
          {PHASES.map((phase, pi) => (
            <div key={phase.name} className="grid gap-6 lg:grid-cols-[220px_1fr]">
              <div className="stat-rule pt-4">
                <h3 className="mt-1 font-display text-2xl font-bold text-primary">{phase.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{phase.summary}</p>
              </div>
              <ol className={cn("grid gap-4", phase.steps.length > 2 ? "sm:grid-cols-2" : "sm:grid-cols-2")}>
                {phase.steps.map((s) => {
                  n += 1;
                  return (
                    <li key={s.title} className="panel flex gap-4 p-5">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-primary text-primary">
                        <s.icon className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">{String(n).padStart(2, "0")}</span>
                          <h4 className="font-display text-base font-bold text-foreground">{s.title}</h4>
                          <StepTagLabel tag={s.tag} />
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* How to read labels: colored tiles */}
      <section aria-labelledby="labels-heading" className="bg-muted py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <SectionHeading id="labels-heading" title="Three kinds of information, always labelled" />
          <div className="mt-12 grid gap-px overflow-hidden rounded-[4px] bg-border md:grid-cols-3">
            <div className="flex flex-col bg-surface p-7">
              <ShieldCheck className="size-7 text-observed" aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl font-bold text-foreground">Facts from sources</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                Shown with a solid teal outline and numbered source chips. Click any chip to open the article, its date and what it supports.
              </p>
              <div className="mt-5">
                <ObservedTag count={12} />
              </div>
            </div>
            <div className="flex flex-col bg-surface p-7">
              <Sparkles className="size-7 text-inferred" aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl font-bold text-foreground">AI suggestions</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                Shown with a dashed purple outline. Names, solutions, prices, customers and plans are suggestions to start from - not findings.
              </p>
              <div className="mt-5">
                <InferredTag />
              </div>
            </div>
            <div className="flex flex-col bg-surface p-7">
              <Scale className="size-7 text-primary" aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl font-bold text-foreground">Plain-word ratings</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                Six areas rated Strong, Moderate, Weak or Unvalidated, each with written reasons and sources. Never a success percentage.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
                <LevelMeter level="strong" />
                <LevelMeter level="moderate" />
                <LevelMeter level="weak" />
                <LevelMeter level="unknown" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Limits */}
      <section aria-labelledby="limits-heading" className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
        <SectionHeading id="limits-heading" title="What Demandquake can’t tell you" />
        <ul className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
          {LIMITS.map((l) => (
            <li key={l} className="flex gap-3 border-t-[3px] border-primary bg-surface p-5 text-sm leading-relaxed text-foreground shadow-[var(--shadow-panel)]">
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              {l}
            </li>
          ))}
        </ul>
      </section>

      {/* Navy call to action */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Ready to look around?{" "}
              <InfoTip label="About getting started" align="start" className="border-primary-foreground/60 text-primary-foreground hover:border-primary-foreground hover:bg-primary-foreground/10">
                Create a free account to browse every startup and its sources. Claiming one costs credits, and new accounts get welcome credits.
              </InfoTip>
            </h2>
          </div>
          <Button asChild variant="glass" size="lg">
            <Link to="/discover">
              Browse startups <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
