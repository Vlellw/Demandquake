import { createFileRoute, Link } from "@tanstack/react-router";
import { TimeAgo } from "@/components/common/TimeAgo";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, Briefcase, CheckCircle2, FlaskConical, Radar } from "lucide-react";
import { myProjectsQuery } from "@/lib/queries";
import { StartupMark, brandStyle } from "@/components/brand/StartupMark";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/SectionHeading";

import { projectProgress } from "@/lib/project-progress";

export const Route = createFileRoute("/_authenticated/workspace/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(myProjectsQuery),
  head: () => ({
    meta: [
      { title: "My startups — Demandquake" },
      { name: "description", content: "Your claimed startup opportunities, validation progress and roadmaps." },
      { property: "og:title", content: "My startups — Demandquake" },
      { property: "og:description", content: "Your private founder workspace on Demandquake." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkspaceList,
});

function WorkspaceList() {
  const projects = useSuspenseQuery(myProjectsQuery).data;

  return (
    <div>
      <section className="bg-muted">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-6 px-4 py-12 sm:px-6">
          <SectionHeading
            as="h1"
            align="left"
            title="My startups"
            description="Startups you claimed or were invited to. Only you and your co-founders can see them."
          />
          <Button asChild variant="outline">
            <Link to="/discover">
              <Radar /> Find more startups
            </Link>
          </Button>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        {projects.length === 0 ? (
          <div className="mx-auto max-w-3xl text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full border-2 border-primary text-primary">
              <Briefcase className="size-6" aria-hidden="true" />
            </span>
            <h2 className="section-title mt-5 text-2xl">You haven’t claimed a startup yet</h2>
            <p className="mt-2 text-muted-foreground">Claiming copies a startup’s research into a private workspace where you can plan and test it.</p>
            <ol className="mt-10 grid gap-4 text-left sm:grid-cols-3">
              {EMPTY_STEPS.map((step, i) => (
                <li key={step} className="stat-rule bg-surface p-5 pt-4 shadow-[var(--shadow-panel)]">
                  <span className="font-display text-2xl font-bold text-primary">{i + 1}</span>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">{step}</p>
                </li>
              ))}
            </ol>
            <Button asChild variant="hero" size="lg" className="mt-10">
              <Link to="/discover">
                Browse startups <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p, i) => {
              const pr = projectProgress(p);
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link
                    to="/workspace/$projectId"
                    params={{ projectId: p.id }}
                    style={brandStyle(p.brand)}
                    className="group flex h-full flex-col overflow-hidden rounded-[4px] bg-card shadow-panel transition-shadow duration-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="brand-banner relative flex h-24 items-end justify-between p-4">
                      <StartupMark brand={p.brand} />
                      <span className="rounded-[3px] bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
                        {p.is_owner ? (p.member_count > 0 ? `You + ${p.member_count} co-founder${p.member_count === 1 ? "" : "s"}` : "Owner") : `Shared by ${p.owner_name ?? "the founder"}`}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="font-display text-xl font-bold text-foreground group-hover:text-primary">{p.name}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.tagline}</p>
                      <div className="mt-5 space-y-3">
                        <ProgressRow icon={<CheckCircle2 className="size-3.5" />} label="Validation checklist" done={pr.checksDone} total={pr.checks} />
                        <ProgressRow icon={<FlaskConical className="size-3.5" />} label="Assumptions tested" done={pr.tested} total={pr.assumptions} />
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-5 text-xs text-muted-foreground">
                        <span>
                          Updated <TimeAgo iso={p.updated_at} />
                        </span>
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">
                          Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const EMPTY_STEPS = ["Browse the startups on the home page.", "Open one that interests you and read its sources.", "Press “Claim this startup” to add it here."];

function ProgressRow({ icon, label, done, total }: { icon: React.ReactNode; label: string; done: number; total: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon} {label}
        </span>
        <span className="font-semibold text-foreground">
          {done}/{total}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: total ? `${(done / total) * 100}%` : "0%" }} />
      </div>
    </div>
  );
}
