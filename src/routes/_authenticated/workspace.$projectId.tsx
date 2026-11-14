import { useMemo, useState } from "react";
import { TimeAgo } from "@/components/common/TimeAgo";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleDashed,
  CloudOff,
  ExternalLink,
  FlaskConical,
  Loader2,
  MessageSquarePlus,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { projectQuery } from "@/lib/queries";
import { deleteProject } from "@/lib/projects.functions";
import { useProjectSaver, type SaveState } from "@/hooks/use-project-saver";
import { nextAssumptionStatus, projectProgress } from "@/lib/project-progress";
import type { ProjectAssumption, ProjectDTO } from "@/lib/dto";
import { StartupMark, brandStyle } from "@/components/brand/StartupMark";
import { PitchPlayer } from "@/components/startup/PitchPlayer";
import { SourceFavicon } from "@/components/common/SourceFavicon";
import { LevelMeter } from "@/components/common/LevelMeter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DIMENSION_META, signalLabel } from "@/lib/taxonomy";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/workspace/$projectId")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(projectQuery(params.projectId));
    if (!p) throw notFound();
    return { name: p.name };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} workspace — Demandquake` : "Workspace — Demandquake" },
      { name: "description", content: "Private founder workspace: concept, assumptions, validation and roadmap." },
      { property: "og:title", content: "Founder workspace — Demandquake" },
      { property: "og:description", content: "Private founder workspace on Demandquake." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkspacePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-display text-2xl text-foreground">Workspace not found</p>
      <p className="mt-2 text-sm text-muted-foreground">It may have been deleted, or it belongs to another account.</p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/workspace">My startups</Link>
      </Button>
    </div>
  ),
});

const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function WorkspacePage() {
  const { projectId } = Route.useParams();
  const initial = useSuspenseQuery(projectQuery(projectId)).data!;
  return <Workspace key={initial.id} initial={initial} />;
}

function Workspace({ initial }: { initial: ProjectDTO }) {
  const { project: p, update, state, savedAt, retry } = useProjectSaver(initial);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const del = useServerFn(deleteProject);
  const [deleting, setDeleting] = useState(false);
  const pr = projectProgress(p);
  const r = p.research;

  async function onDelete() {
    setDeleting(true);
    try {
      await del({ data: { projectId: p.id } });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.removeQueries({ queryKey: ["project", p.id] });
      toast.success("Workspace deleted");
      navigate({ to: "/workspace" });
    } catch {
      toast.error("Couldn’t delete this workspace.");
      setDeleting(false);
    }
  }

  return (
    <div style={brandStyle(p.brand)}>
      <section className="relative overflow-hidden border-b border-border">
        <div className="brand-surface pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-[1300px] px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to="/workspace" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> My startups
            </Link>
            <SaveIndicator state={state} savedAt={savedAt} onRetry={retry} />
          </div>
          <div className="mt-6 flex flex-wrap items-start gap-5">
            <StartupMark brand={p.brand} size="xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="positive">Claimed by you</Badge>
                {r.startup_slug && (
                  <Link to="/startup/$slug" params={{ slug: r.startup_slug }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    Public research profile <ExternalLink className="size-3" />
                  </Link>
                )}
              </div>
              <Input
                aria-label="Startup name"
                value={p.name}
                onChange={(e) => update({ name: e.target.value.slice(0, 80) })}
                onBlur={() => !p.name.trim() && update({ name: initial.name }, { immediate: true })}
                className="mt-2 h-auto border-transparent bg-transparent px-0 font-display text-4xl font-semibold text-foreground shadow-none focus-visible:border-border focus-visible:px-2 md:text-4xl"
              />
              <Input
                aria-label="Tagline"
                value={p.tagline ?? ""}
                onChange={(e) => update({ tagline: e.target.value.slice(0, 240) })}
                placeholder="One-line pitch"
                className="mt-1 h-auto border-transparent bg-transparent px-0 text-lg text-foreground/85 shadow-none focus-visible:border-border focus-visible:px-2"
              />
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <Progress label="Validation checklist" done={pr.checksDone} total={pr.checks} />
            <Progress label="Assumptions tested" done={pr.tested} total={pr.assumptions} detail={`${pr.validated} validated · ${pr.invalidated} invalidated`} />
            <Progress label="Roadmap items" done={pr.itemsDone} total={pr.items} />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1300px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="panel p-5">
            <p className="eyebrow">Your concept</p>
            <Textarea
              value={p.concept ?? ""}
              onChange={(e) => update({ concept: e.target.value.slice(0, 8000) })}
              rows={7}
              placeholder="Refine the concept in your own words…"
              className="mt-3 resize-y bg-surface-sunken/60 text-[15px] leading-relaxed"
            />
            <p className="mt-1.5 text-right font-mono text-[10px] text-faint">{(p.concept ?? "").length}/8000</p>
          </section>

          <ChecklistSection project={p} update={update} />
          <AssumptionsBoard project={p} update={update} />
          <RoadmapSection project={p} update={update} />
        </div>

        <aside className="space-y-6">
          {p.pitch.slides.length > 0 && (
            <PitchPlayer
              slides={p.pitch.slides}
              ctx={{
                name: p.name,
                tagline: p.tagline ?? "",
                brand: p.brand,
                evidenceCount: r.sources?.length ?? 0,
                domains: [...new Set((r.sources ?? []).map((s) => s.domain))],
                features: [],
                customers: (r.customers ?? []).map((c) => c.segment),
                businessModel: r.business_model?.type ?? null,
              }}
              className="aspect-[4/3] sm:aspect-[4/3]"
            />
          )}
          <ResearchSnapshot project={p} />
          <ActivityLog project={p} update={update} />
          <section className="panel border-negative/20 p-5">
            <p className="eyebrow">Danger zone</p>
            <p className="mt-2 text-sm text-muted-foreground">Deleting removes your private workspace. The public opportunity stays available.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="mt-3 text-negative">
                  <Trash2 /> Delete workspace
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {p.name}?</AlertDialogTitle>
                  <AlertDialogDescription>Your notes, checklist progress and roadmap edits will be permanently removed.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} disabled={deleting}>
                    {deleting && <Loader2 className="animate-spin" />} Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </aside>
      </div>
    </div>
  );
}

type Update = ReturnType<typeof useProjectSaver>["update"];

function SaveIndicator({ state, savedAt, onRetry }: { state: SaveState; savedAt: string | null; onRetry: () => void }) {
  if (state === "saving")
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" /> Saving…
      </span>
    );
  if (state === "error")
    return (
      <button onClick={onRetry} className="inline-flex items-center gap-1.5 font-mono text-[11px] text-negative">
        <CloudOff className="size-3" /> Not saved — retry
      </button>
    );
  if (state === "saved")
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-positive">
        <Check className="size-3" /> Saved {savedAt ? <TimeAgo iso={savedAt} /> : null}
      </span>
    );
  return <span className="font-mono text-[11px] text-faint">Changes save automatically</span>;
}

function Progress({ label, done, total, detail }: { label: string; done: number; total: number; detail?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/70 p-4 backdrop-blur">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-semibold text-foreground">
          {done}
          <span className="text-sm text-muted-foreground">/{total}</span>
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]">
        <motion.div className="brand-fill h-full rounded-full" animate={{ width: total ? `${(done / total) * 100}%` : "0%" }} />
      </div>
      {detail && <p className="mt-1.5 text-[11px] text-muted-foreground">{detail}</p>}
    </div>
  );
}

function ChecklistSection({ project: p, update }: { project: ProjectDTO; update: Update }) {
  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Validation checklist</p>
        <span className="font-mono text-[11px] text-muted-foreground">
          {p.checklist.filter((c) => c.done).length} of {p.checklist.length} done
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {p.checklist.map((c) => (
          <li key={c.id} className={cn("flex gap-3 rounded-xl border p-4 transition-colors", c.done ? "border-positive/25 bg-positive/[0.04]" : "border-border")}>
            <Checkbox
              checked={c.done}
              onCheckedChange={(v) => update({ checklist: p.checklist.map((x) => (x.id === c.id ? { ...x, done: v === true } : x)) }, { immediate: true })}
              className="mt-0.5"
              aria-label={`Mark "${c.title}" done`}
            />
            <div className="min-w-0">
              <p className={cn("font-medium text-foreground", c.done && "text-muted-foreground line-through")}>{c.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
              <p className="mt-2 text-xs text-foreground/70">
                <span className="text-muted-foreground">{c.method}</span> · <span className="text-positive">Signal:</span> {c.success_signal}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const ASSUMPTION_COLUMNS: { status: ProjectAssumption["status"]; label: string; icon: React.ReactNode; tone: string }[] = [
  { status: "untested", label: "Untested", icon: <CircleDashed className="size-3.5" />, tone: "text-uncertain" },
  { status: "validated", label: "Validated", icon: <CheckCircle2 className="size-3.5" />, tone: "text-positive" },
  { status: "invalidated", label: "Invalidated", icon: <XCircle className="size-3.5" />, tone: "text-negative" },
];

function AssumptionsBoard({ project: p, update }: { project: ProjectDTO; update: Update }) {
  const [draft, setDraft] = useState("");
  function add() {
    const text = draft.trim();
    if (!text) return;
    update({ assumptions: [...p.assumptions, { id: uid("a"), text: text.slice(0, 600), type: "product", how_to_test: "", status: "untested" }] }, { immediate: true });
    setDraft("");
  }
  function setStatus(id: string, status: ProjectAssumption["status"]) {
    update({ assumptions: p.assumptions.map((a) => (a.id === id ? { ...a, status } : a)) }, { immediate: true });
  }
  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow flex items-center gap-1.5">
          <FlaskConical className="size-3.5" /> Assumptions board
        </p>
        <span className="text-[11px] text-muted-foreground">Click a card to move it</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {ASSUMPTION_COLUMNS.map((col) => {
          const items = p.assumptions.filter((a) => a.status === col.status);
          return (
            <div key={col.status} className="rounded-xl border border-border bg-surface-sunken/50 p-3">
              <p className={cn("flex items-center gap-1.5 text-xs font-medium", col.tone)}>
                {col.icon} {col.label} <span className="ml-auto font-mono text-muted-foreground">{items.length}</span>
              </p>
              <div className="mt-3 space-y-2">
                {items.map((a) => (
                  <motion.button
                    layout
                    key={a.id}
                    onClick={() => setStatus(a.id, nextAssumptionStatus(a.status))}
                    className="block w-full rounded-lg border border-border bg-surface p-3 text-left text-sm text-foreground/90 transition-colors hover:border-border-strong"
                    title="Click to change status"
                  >
                    {a.text}
                    {a.how_to_test && <span className="mt-1.5 block text-[11px] text-muted-foreground">Test: {a.how_to_test}</span>}
                  </motion.button>
                ))}
                {items.length === 0 && <p className="py-3 text-center text-[11px] text-faint">Nothing here yet</p>}
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="mt-3 flex gap-2"
      >
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add an assumption you need to test…" maxLength={600} />
        <Button type="submit" variant="outline" disabled={!draft.trim()}>
          <Plus /> Add
        </Button>
      </form>
    </section>
  );
}

function RoadmapSection({ project: p, update }: { project: ProjectDTO; update: Update }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  function toggle(phaseId: string, itemId: string, done: boolean) {
    update({ roadmap: p.roadmap.map((ph) => (ph.id === phaseId ? { ...ph, items: ph.items.map((i) => (i.id === itemId ? { ...i, done } : i)) } : ph)) }, { immediate: true });
  }
  function add(phaseId: string) {
    const text = (drafts[phaseId] ?? "").trim();
    if (!text) return;
    update({ roadmap: p.roadmap.map((ph) => (ph.id === phaseId ? { ...ph, items: [...ph.items, { id: uid("i"), text: text.slice(0, 400), done: false }] } : ph)) }, { immediate: true });
    setDrafts((d) => ({ ...d, [phaseId]: "" }));
  }
  function remove(phaseId: string, itemId: string) {
    update({ roadmap: p.roadmap.map((ph) => (ph.id === phaseId ? { ...ph, items: ph.items.filter((i) => i.id !== itemId) } : ph)) }, { immediate: true });
  }
  return (
    <section className="panel p-5">
      <p className="eyebrow">Roadmap</p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {p.roadmap.map((ph, idx) => (
          <div key={ph.id} className="flex flex-col rounded-xl border border-border p-4">
            <div className="flex items-center gap-2">
              <span className="brand-fill flex size-6 items-center justify-center rounded-full font-mono text-[11px] font-bold text-background">{idx + 1}</span>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold text-foreground">{ph.phase}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{ph.horizon}</p>
              </div>
            </div>
            <ul className="mt-3 flex-1 space-y-2">
              {ph.items.map((i) => (
                <li key={i.id} className="group flex items-start gap-2 text-sm">
                  <Checkbox checked={i.done} onCheckedChange={(v) => toggle(ph.id, i.id, v === true)} className="mt-0.5" aria-label={`Mark "${i.text}" done`} />
                  <span className={cn("flex-1", i.done ? "text-muted-foreground line-through" : "text-foreground/90")}>{i.text}</span>
                  <button onClick={() => remove(ph.id, i.id)} className="opacity-0 transition-opacity group-hover:opacity-100" aria-label="Remove item">
                    <Trash2 className="size-3.5 text-muted-foreground hover:text-negative" />
                  </button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                add(ph.id);
              }}
              className="mt-3 flex gap-1.5"
            >
              <Input value={drafts[ph.id] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [ph.id]: e.target.value }))} placeholder="Add item" className="h-8 text-xs" maxLength={400} />
              <Button type="submit" variant="ghost" size="sm" disabled={!(drafts[ph.id] ?? "").trim()} aria-label="Add roadmap item">
                <Plus />
              </Button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResearchSnapshot({ project: p }: { project: ProjectDTO }) {
  const r = p.research;
  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Research snapshot</p>
        {r.research_at && <span className="font-mono text-[10px] text-faint">from {formatDate(r.research_at)}</span>}
      </div>
      {r.problem && <p className="mt-3 text-sm leading-relaxed text-foreground/90">{r.problem.statement}</p>}
      {r.assessment && (
        <div className="mt-4 space-y-1.5">
          {r.assessment.dimensions.map((d) => (
            <div key={d.key} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{DIMENSION_META[d.key]?.label ?? d.key}</span>
              <LevelMeter level={d.level} compact />
            </div>
          ))}
        </div>
      )}
      {r.sources && r.sources.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="data-label">Evidence sources · {r.sources.length}</p>
          <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {r.sources.map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noreferrer" className="group flex items-start gap-2 rounded-md p-1.5 text-xs hover:bg-foreground/[0.04]">
                  <SourceFavicon domain={s.domain} className="mt-0.5 size-3.5" />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-foreground/90 group-hover:text-foreground">{s.title}</span>
                    <span className="text-faint">
                      {s.domain} · {s.signal_type ? signalLabel(s.signal_type) : "Source"}
                      {s.published_at ? ` · ${formatDate(s.published_at)}` : ""}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {r.competitors && r.competitors.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="data-label">Competitor gaps</p>
          <ul className="mt-2 space-y-1.5 text-xs">
            {r.competitors.map((c) => (
              <li key={c.name}>
                <span className="font-medium text-foreground">{c.name}</span> <span className="text-muted-foreground">— {c.gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ActivityLog({ project: p, update }: { project: ProjectDTO; update: Update }) {
  const [note, setNote] = useState("");
  const sorted = useMemo(() => [...p.updates].sort((a, b) => b.at.localeCompare(a.at)), [p.updates]);
  function add() {
    const text = note.trim();
    if (!text) return;
    update({ updates: [...p.updates, { id: uid("u"), at: new Date().toISOString(), kind: "note", title: "Founder note", text: text.slice(0, 2000) }] }, { immediate: true });
    setNote("");
  }
  return (
    <section className="panel p-5">
      <p className="eyebrow">Activity & notes</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="mt-3 space-y-2"
      >
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Log a customer conversation, insight or decision…" maxLength={2000} />
        <Button type="submit" size="sm" variant="outline" disabled={!note.trim()}>
          <MessageSquarePlus /> Add note
        </Button>
      </form>
      <ol className="mt-4 space-y-3 border-l border-border pl-4">
        {sorted.map((u) => (
          <li key={u.id} className="relative">
            <span className={cn("absolute -left-[21px] top-1.5 size-2 rounded-full", u.kind === "claimed" ? "bg-primary" : u.kind === "scan" ? "bg-observed" : "bg-inferred")} />
            <p className="font-mono text-[10px] text-muted-foreground">{formatDateTime(u.at)}</p>
            <p className="text-sm font-medium text-foreground">{u.title}</p>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{u.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
