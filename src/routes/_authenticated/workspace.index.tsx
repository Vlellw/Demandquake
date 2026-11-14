import { createFileRoute, Link } from "@tanstack/react-router";
import { TimeAgo } from "@/components/common/TimeAgo";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowUpRight, Briefcase, CheckCircle2, FlaskConical, Radar } from "lucide-react";
import { myProjectsQuery } from "@/lib/queries";
import { StartupMark, brandStyle } from "@/components/brand/StartupMark";
import { Button } from "@/components/ui/button";

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
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            <Briefcase className="size-3.5" /> Founder workspace
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-foreground">My startups</h1>
          <p className="mt-1 text-sm text-muted-foreground">Private to you. Track validation, assumptions and your roadmap for every claimed opportunity.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/">
            <Radar /> Discover more
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="panel mt-10 flex flex-col items-center px-6 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Briefcase className="size-6" />
          </div>
          <p className="mt-5 font-display text-xl font-semibold text-foreground">No claimed startups yet</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Browse evidence-backed opportunities and claim one to get its research, assumptions and validation checklist here.
          </p>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/">Explore opportunities</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p, i) => {
            const pr = projectProgress(p);
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link
                  to="/workspace/$projectId"
                  params={{ projectId: p.id }}
                  style={brandStyle(p.brand)}
                  className="group panel relative flex h-full flex-col overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift"
                >
                  <div className="brand-surface pointer-events-none absolute inset-x-0 top-0 h-20 opacity-40" />
                  <div className="relative flex items-start gap-3">
                    <StartupMark brand={p.brand} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg font-semibold text-foreground">{p.name}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{p.tagline}</p>
                    </div>
                    <ArrowUpRight className="size-4 text-faint transition-colors group-hover:text-foreground" />
                  </div>
                  <div className="relative mt-5 space-y-3">
                    <ProgressRow icon={<CheckCircle2 className="size-3.5" />} label="Validation checklist" done={pr.checksDone} total={pr.checks} />
                    <ProgressRow icon={<FlaskConical className="size-3.5" />} label="Assumptions tested" done={pr.tested} total={pr.assumptions} />
                  </div>
                  <p className="relative mt-auto pt-5 font-mono text-[11px] text-muted-foreground">Updated <TimeAgo iso={p.updated_at} /></p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProgressRow({ icon, label, done, total }: { icon: React.ReactNode; label: string; done: number; total: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon} {label}
        </span>
        <span className="font-mono text-foreground/80">
          {done}/{total}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]">
        <div className="brand-fill h-full rounded-full transition-all" style={{ width: total ? `${(done / total) * 100}%` : "0%" }} />
      </div>
    </div>
  );
}
