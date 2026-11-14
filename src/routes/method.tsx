import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Boxes, Brain, FileSearch, Flag, Globe2, Radar, Scale, ShieldCheck, Sparkles, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ObservedTag, InferredTag } from "@/components/common/Provenance";
import { LevelMeter } from "@/components/common/LevelMeter";
import { SeismicField } from "@/components/common/SeismicField";

export const Route = createFileRoute("/method")({
  head: () => ({
    meta: [
      { title: "How Demandquake works — evidence-first startup discovery" },
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

const STEPS = [
  { icon: Brain, title: "Plan", body: "Your request is turned into a research plan: targeted searches for complaints, regulation, market news, technology shifts and explicit requests.", tag: "ai" },
  { icon: Globe2, title: "Search the live web", body: "Context.dev web and news search retrieves real publications — each stored with its URL, publisher, publication date and retrieval time.", tag: "observed" },
  { icon: FileSearch, title: "Extract signals", body: "Each source is read for concrete signals: a complaint, a rule change, a funding round, a capability that didn’t exist before.", tag: "ai" },
  { icon: Boxes, title: "Cluster problems", body: "Signals from different sources are grouped into recurring problems. Evidence strength reflects how many independent sources agree.", tag: "ai" },
  { icon: Swords, title: "Check existing solutions", body: "A second live search looks for companies already addressing each problem. Only companies named in sources are listed; Context.dev brand data then adds each company’s logo, colors and profile, and name-only matches are checked against what the source says the company does.", tag: "observed" },
  { icon: Sparkles, title: "Generate the startup", body: "A startup concept is designed around the evidence: brand, solution, customers, business model, risks, pitch and validation plan.", tag: "ai" },
  { icon: Radar, title: "Watch for market change", body: "Opportunity Quake re-searches the news for new developments and explains how each one strengthens or weakens the opportunity. Claimed workspaces re-check automatically when their evidence is over a week old.", tag: "observed" },
  { icon: Flag, title: "Claim and validate", body: "Founders claim a startup into a private workspace with the research, assumptions and an experiment checklist — and can invite co-founders to edit it with them.", tag: "you" },
] as const;

function MethodPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="bg-hero pointer-events-none absolute inset-0" />
        <SeismicField className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full opacity-50" intensity={0.6} />
        <div className="relative mx-auto max-w-[1100px] px-4 py-16 sm:px-6 lg:py-24">
          <p className="eyebrow text-primary">Method</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-[1.05] text-foreground sm:text-6xl">
            Evidence first. Hypotheses labeled. No fake odds.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Demandquake finds startups that don’t exist yet by reading what the internet is already saying — and shows you exactly which parts are sourced and which are imagined.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-4 py-14 sm:px-6">
        <h2 className="font-display text-2xl font-semibold text-foreground">The research pipeline</h2>
        <ol className="relative mt-8 grid gap-4 md:grid-cols-2">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: (i % 2) * 0.08 }}
              className="panel flex gap-4 p-5"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.05] text-primary">
                <s.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <p className="font-display text-base font-semibold text-foreground">{s.title}</p>
                  {s.tag === "observed" ? <ObservedTag /> : s.tag === "ai" ? <InferredTag label="AI" /> : null}
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto grid max-w-[1100px] gap-6 px-4 py-14 sm:px-6 md:grid-cols-3">
          <div className="panel p-6">
            <ShieldCheck className="size-5 text-observed" />
            <p className="mt-3 font-display text-lg font-semibold text-foreground">Observed facts</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Shown with a solid cyan treatment and numbered source chips. Click any chip to see the publication, its date and what it supports.
            </p>
            <div className="mt-4">
              <ObservedTag count={12} />
            </div>
          </div>
          <div className="panel p-6">
            <Sparkles className="size-5 text-inferred" />
            <p className="mt-3 font-display text-lg font-semibold text-foreground">AI hypotheses</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Shown with a dashed gold treatment. Names, solutions, pricing, customers and plans are creative proposals — useful starting points, not findings.
            </p>
            <div className="mt-4">
              <InferredTag />
            </div>
          </div>
          <div className="panel p-6">
            <Scale className="size-5 text-uncertain" />
            <p className="mt-3 font-display text-lg font-semibold text-foreground">Qualitative assessment</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Six dimensions rated Strong, Moderate, Weak or Unvalidated, each with written reasoning and citations. Never a success percentage.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <LevelMeter level="strong" />
              <LevelMeter level="weak" />
              <LevelMeter level="unknown" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-4 py-14 sm:px-6">
        <h2 className="font-display text-2xl font-semibold text-foreground">What it can’t tell you</h2>
        <ul className="mt-5 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
          <li className="panel p-4">People complaining online is not proof they’ll pay. Validation status starts at “Unvalidated” for every startup.</li>
          <li className="panel p-4">Search coverage is broad but not complete; an empty competitor list means none were named in sources, not that none exist.</li>
          <li className="panel p-4">Publication dates come from the publisher. Undated pages are marked as such rather than guessed.</li>
          <li className="panel p-4">Generated concepts are public and can be claimed by more than one founder — execution is the moat.</li>
        </ul>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild variant="hero" size="lg">
            <Link to="/">Explore opportunities</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
