import { useEffect, useMemo, useRef, useState } from "react";
import { TimeAgo } from "@/components/common/TimeAgo";
import { InfoTip } from "@/components/common/InfoTip";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CloudOff,
  ExternalLink,
  FlaskConical,
  Loader2,
  MessageSquarePlus,
  Pencil,
  Plus,
  Radar,
  Trash2,
} from "lucide-react";
import { JourneySteps } from "@/components/journey/JourneySteps";
import { projectQuery, startupScansQuery } from "@/lib/queries";
import { startMarketScan } from "@/lib/research.functions";
import { VerdictBadge } from "@/components/startup/VerdictBadge";
import { deleteProject } from "@/lib/projects.functions";
import { TeamPanel } from "@/components/workspace/TeamPanel";
import { AssumptionsBoard } from "@/components/workspace/AssumptionsBoard";
import { WebWatch } from "@/components/workspace/WebWatch";
import { displayName, useAuthUser } from "@/hooks/use-auth";
import { useProjectSaver, type SaveState } from "@/hooks/use-project-saver";
import { marketCheckDue, projectProgress, scanUpdatesToLog } from "@/lib/project-progress";
import { useScanDriver } from "@/hooks/use-scan-driver";
import type { ProjectDTO } from "@/lib/dto";
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
      { title: loaderData ? `${loaderData.name} workspace - Demandquake` : "Workspace - Demandquake" },
      { name: "description", content: "Private founder workspace: concept, assumptions, validation and roadmap." },
      { property: "og:title", content: "Founder workspace - Demandquake" },
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
  const { project: p, update, state, savedAt, retry, receiveRemote, mergedFromTeammate } = useProjectSaver(initial);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthUser();
  const shared = !p.is_owner || p.member_count > 0;

  // Shared workspaces pull co-founders' edits periodically and on focus; the saver merges them.
  const { data: remote } = useQuery({ ...projectQuery(p.id), refetchInterval: shared ? 15_000 : false });
  useEffect(() => {
    if (remote) receiveRemote(remote);
  }, [remote, receiveRemote]);
  useEffect(() => {
    if (mergedFromTeammate > 0) toast.message("Synced with your co-founder’s latest changes", { id: "team-sync" });
  }, [mergedFromTeammate]);

  function onLeft() {
    queryClient.removeQueries({ queryKey: ["project", p.id] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    navigate({ to: "/workspace", replace: true });
  }
  const del = useServerFn(deleteProject);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
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
      <JourneySteps current={3} renderStep={(n, content, cls) => n === 1 ? (
        <Link to="/discover" className={cls}>{content}</Link>
      ) : n === 2 && r.startup_slug ? (
        <Link to="/startup/$slug" params={{ slug: r.startup_slug }} className={cls}>{content}</Link>
      ) : undefined} />
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[1300px] px-4 pb-8 pt-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {p.is_owner ? <Badge variant="positive">Claimed by you</Badge> : <Badge variant="observed">Shared by {p.owner_name ?? "the founder"}</Badge>}
            </div>
            <SaveIndicator state={state} savedAt={savedAt} onRetry={retry} />
          </div>
          <div className="mt-5 flex flex-col items-start gap-5 sm:flex-row">
            <StartupMark brand={p.brand} size="xl" />
            <div className="w-full min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Input
                  aria-label="Startup name"
                  value={p.name}
                  readOnly={!editing}
                  onChange={(e) => update({ name: e.target.value.slice(0, 80) })}
                  onBlur={() => !p.name.trim() && update({ name: initial.name }, { immediate: true })}
                  className={cn(
                    "h-auto flex-1 rounded-[4px] border-transparent bg-transparent px-0 font-display text-4xl font-bold text-primary shadow-none md:text-[2.6rem]",
                    editing ? "hover:border-border hover:px-2 focus-visible:border-border focus-visible:px-2" : "cursor-default",
                  )}
                />
                <Button
                  variant={editing ? "hero" : "secondary"}
                  size="sm"
                  onClick={() => setEditing((v) => !v)}
                  aria-pressed={editing}
                  aria-label={editing ? "Finish editing" : "Edit this workspace"}
                >
                  <Pencil /> Edit
                </Button>
                <InfoTip align="start" label="How this workspace works">
                  Press Edit to change the name, pitch, checklist, assumptions and notes - everything saves
                  automatically{shared ? " and your co-founders see your changes." : "."}
                </InfoTip>
              </div>
              <Textarea
                aria-label="Tagline"
                rows={1}
                value={p.tagline ?? ""}
                readOnly={!editing}
                onChange={(e) => update({ tagline: e.target.value.replace(/\s*\n\s*/g, " ").slice(0, 240) })}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
                placeholder={editing ? "One-line pitch" : ""}
                className={cn(
                  "mt-1 min-h-0 resize-none rounded-[4px] border-transparent bg-transparent px-0 py-1 text-lg text-foreground shadow-none [field-sizing:content] md:text-lg",
                  editing ? "hover:border-border hover:px-2 focus-visible:border-border focus-visible:px-2" : "cursor-default",
                )}
              />
            </div>
          </div>
        </div>
      </section>
      <section aria-label="Progress" className="bg-muted">
        <div className="mx-auto grid max-w-[1300px] gap-4 px-4 py-6 sm:grid-cols-3 sm:px-6">
          <Progress label="Validation checklist" done={pr.checksDone} total={pr.checks} />
          <Progress label="Assumptions tested" done={pr.tested} total={pr.assumptions} detail={`${pr.validated} validated · ${pr.invalidated} invalidated`} />
          <Progress label="Roadmap items done" done={pr.itemsDone} total={pr.items} />
        </div>
      </section>

      <div className="mx-auto grid max-w-[1300px] grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-6">
          <section className="panel p-5">
            <Textarea
              value={p.concept ?? ""}
              readOnly={!editing}
              onChange={(e) => update({ concept: e.target.value.slice(0, 8000) })}
              rows={7}
              placeholder={editing ? "Refine the concept in your own words…" : ""}
              className={cn("mt-3 resize-y bg-surface-sunken/60 text-[15px] leading-relaxed", !editing && "cursor-default")}
            />
            <p className="mt-1.5 text-right font-mono text-[10px] text-faint">{(p.concept ?? "").length}/8000</p>
          </section>

          <ChecklistSection project={p} update={update} editing={editing} />
          <AssumptionsBoard assumptions={p.assumptions} readOnly={!editing} onChange={(assumptions) => update({ assumptions }, { immediate: true })} />
        </div>

        <aside className="min-w-0 space-y-6">
          {p.pitch.slides.length > 0 && (
            <PitchPlayer
              slides={p.pitch.slides}
              ctx={{
                claimed: true,
                name: p.name,
                tagline: p.tagline ?? "",
                brand: p.brand,
                evidenceCount: r.sources?.length ?? 0,
                domains: [...new Set((r.sources ?? []).map((s) => s.domain))],
                sources: r.sources ?? [],
                features: [],
                customers: (r.customers ?? []).map((c) => c.segment),
                businessModel: r.business_model?.type ?? null,
              }}
            />
          )}
          {r.startup_slug && <MarketWatch slug={r.startup_slug} project={p} update={update} />}
          {r.startup_slug && <WebWatch projectId={p.id} />}
          <ResearchSnapshot project={p} />
          <div id="team" className="scroll-mt-24">
            <TeamPanel project={p} currentUserId={user?.id ?? null} onLeft={onLeft} />
          </div>
          <ActivityLog project={p} update={update} editing={editing} author={shared && user ? displayName(user) : null} />
          {p.is_owner && (
          <section className="panel border-negative/20 p-5">
            <p className="mt-2 text-sm text-muted-foreground">
              Deleting removes this workspace{p.member_count > 0 ? " for every co-founder" : ""}. The public opportunity stays available.
            </p>
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
          )}
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
        <CloudOff className="size-3" /> Not saved - retry
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
    <div className="stat-rule bg-surface p-4 pt-3 shadow-[var(--shadow-panel)]">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="font-display text-2xl font-bold text-primary">
          {done}
          <span className="text-sm font-semibold text-muted-foreground"> of {total}</span>
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full rounded-full bg-primary" animate={{ width: total ? `${(done / total) * 100}%` : "0%" }} />
      </div>
      {detail && <p className="mt-1.5 text-[11px] text-muted-foreground">{detail}</p>}
    </div>
  );
}

function ChecklistSection({ project: p, update, editing }: { project: ProjectDTO; update: Update; editing: boolean }) {
  return (
    <section id="checklist" className="panel scroll-mt-24 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title text-xl">Recommended actions</h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          {p.checklist.filter((c) => c.done).length} of {p.checklist.length} done
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {p.checklist.map((c) => (
          <li key={c.id} className={cn("flex gap-3 rounded-xl border p-4 transition-colors", c.done ? "border-positive/25 bg-positive/[0.04]" : "border-border")}>
            <Checkbox
              checked={c.done}
              disabled={!editing}
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
                <span className="font-medium text-foreground">{c.name}</span> <span className="text-muted-foreground">- {c.gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const SCAN_STAGE_COPY: Record<string, string> = {
  fetching: "Searching live news published since the research…",
  analyzing: "Comparing new developments with the evidence…",
};

const isRunning = (status: string) => status !== "complete" && status !== "failed";

function MarketWatch({ slug, project: p, update }: { slug: string; project: ProjectDTO; update: Update }) {
  const { data, isLoading, isError, refetch } = useQuery({
    ...startupScansQuery(slug),
    refetchInterval: (q) => (q.state.data?.scans.some((s) => isRunning(s.status)) ? 3000 : false),
  });
  const scanFn = useServerFn(startMarketScan);
  const [starting, setStarting] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const scans = data?.scans ?? [];
  const running = scans.find((s) => isRunning(s.status));
  const latestDone = scans.find((s) => s.status === "complete");
  const { driverError, restart } = useScanDriver(running?.id ?? "", slug, running?.status);

  // Log every completed scan into the activity feed exactly once.
  const pending = useMemo(() => (data ? scanUpdatesToLog(p.updates, data.scans, slug) : []), [data, p.updates, slug]);
  useEffect(() => {
    if (pending.length) update({ updates: [...p.updates, ...pending] }, { immediate: true });
  }, [pending, p.updates, update]);

  async function run(auto = false) {
    if (!data || starting) return;
    setStarting(true);
    try {
      const res = await scanFn({ data: { startupId: data.startupId } });
      if (!res.ok) {
        if (!auto) toast.error(res.error);
        return;
      }
      if (auto) setAutoStarted(true);
      await refetch();
    } catch (err) {
      console.error(err);
      if (!auto) toast.error("Couldn’t start the market scan. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  // Weekly re-check: when the newest evidence is over a week old, scan once on visit.
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });
  useEffect(() => {
    if (!data || running) return;
    const due = marketCheckDue({
      lastScanAt: latestDone?.completed_at ?? latestDone?.created_at ?? null,
      researchAt: p.research.research_at ?? null,
      now: Date.now(),
    });
    if (!due) return;
    const key = `dq-autoscan-${p.id}-${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void runRef.current(true);
  }, [data, running, latestDone, p.id, p.research.research_at]);

  return (
    <section className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mt-1 text-sm text-muted-foreground">
            Re-searches live news for developments that strengthen or weaken this opportunity - automatically once a week when you visit.
          </p>
        </div>
        <Radar className={cn("size-5 shrink-0 text-observed", running && "animate-pulse")} />
      </div>

      {running ? (
        <div className="mt-4 rounded-lg border border-observed/30 bg-observed/[0.05] p-3" aria-live="polite">
          <p className="flex items-center gap-2 text-sm text-foreground">
            <Loader2 className="size-4 animate-spin text-observed" />
            {SCAN_STAGE_COPY[running.status] ?? "Scanning the market…"}
          </p>
          {autoStarted && <p className="mt-1 text-[11px] text-muted-foreground">Started automatically - the last check was over a week ago.</p>}
          {driverError ? (
            <p className="mt-2 text-xs text-negative">
              {driverError}{" "}
              <button className="underline" onClick={restart}>
                Retry
              </button>
            </p>
          ) : (
            <Link to="/startup/$slug/quake/$scanId" params={{ slug, scanId: running.id }} className="mt-2 inline-flex items-center gap-1 text-xs text-observed hover:underline">
              Watch in detail <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
      ) : (
        <Button onClick={() => run(false)} disabled={starting || !data} variant="outline" className="mt-4 w-full">
          {starting ? <Loader2 className="animate-spin" /> : <Radar />} {latestDone ? "Scan again for changes" : "Run first market scan"}
        </Button>
      )}

      {isLoading && (
        <div className="mt-4 space-y-2" aria-label="Loading scans">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-foreground/[0.05]" />
          ))}
        </div>
      )}
      {isError && (
        <p className="mt-4 text-sm text-negative">
          Couldn’t load scan history.{" "}
          <button className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </p>
      )}
      {data && scans.length === 0 && !running && (
        <p className="mt-4 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          No scans yet. A scan compares recent news with this opportunity’s evidence and explains what changed.
        </p>
      )}
      {scans.some((s) => !isRunning(s.status)) && (
        <ul className="mt-4 space-y-2">
          {scans
            .filter((s) => !isRunning(s.status))
            .slice(0, 5)
            .map((s) => (
              <li key={s.id}>
                <Link
                  to="/startup/$slug/quake/$scanId"
                  params={{ slug, scanId: s.id }}
                  className="block rounded-lg border border-border p-3 transition-colors hover:border-observed/40 hover:bg-foreground/[0.03]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <VerdictBadge verdict={s.verdict} status={s.status} />
                    <span className="font-mono text-[10px] text-muted-foreground">
                      <TimeAgo iso={s.completed_at ?? s.created_at} />
                    </span>
                  </div>
                  {s.headline && <p className="mt-1.5 line-clamp-2 text-sm text-foreground/90">{s.headline}</p>}
                  {s.status === "complete" && (
                    <p className="mt-1 font-mono text-[10px] text-faint">
                      {s.changes.length} change{s.changes.length === 1 ? "" : "s"} · {s.candidates_count} new sources checked
                    </p>
                  )}
                </Link>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

const QUAKE_URL = /^\/startup\/([^/]+)\/quake\/([^/]+)$/;

function UpdateLink({ url }: { url: string }) {
  const m = url.match(QUAKE_URL);
  if (m?.[1] && m[2]) {
    return (
      <Link to="/startup/$slug/quake/$scanId" params={{ slug: m[1], scanId: m[2] }} className="mt-1 inline-flex items-center gap-1 text-xs text-observed hover:underline">
        View scan result <ArrowRight className="size-3" />
      </Link>
    );
  }
  if (!/^https?:\/\//.test(url)) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-observed hover:underline">
      Open link <ExternalLink className="size-3" />
    </a>
  );
}

function ActivityLog({ project: p, update, editing, author }: { project: ProjectDTO; update: Update; editing: boolean; author: string | null }) {
  const [note, setNote] = useState("");
  const sorted = useMemo(() => [...p.updates].sort((a, b) => b.at.localeCompare(a.at)), [p.updates]);
  function add() {
    const text = note.trim();
    if (!text) return;
    update(
      { updates: [...p.updates, { id: uid("u"), at: new Date().toISOString(), kind: "note", title: "Founder note", text: text.slice(0, 2000), author }] },
      { immediate: true },
    );
    setNote("");
  }
  return (
    <section id="notes" className="panel scroll-mt-24 p-5">
      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="mt-3 space-y-2"
        >
          <Textarea
            id="workspace-note"
            aria-label="New note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Log a customer conversation, insight or decision…"
            maxLength={2000}
          />
          <Button type="submit" size="sm" variant="outline" disabled={!note.trim()}>
            <MessageSquarePlus /> Add note
          </Button>
        </form>
      )}
      <ol className="mt-4 space-y-3 border-l border-border pl-4">
        {sorted.map((u) => (
          <li key={u.id} className="relative">
            <span
              className={cn(
                "absolute -left-[21px] top-1.5 size-2 rounded-full",
                u.kind === "claimed" ? "bg-primary" : u.kind === "scan" ? "bg-observed" : u.kind === "member" ? "bg-positive" : "bg-moderate",
              )}
            />
            <p className="font-mono text-[10px] text-muted-foreground">
              {formatDateTime(u.at)}
              {u.author && u.kind === "note" ? ` · ${u.author}` : ""}
            </p>
            <p className="text-sm font-medium text-foreground">{u.title}</p>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{u.text}</p>
            {u.url && <UpdateLink url={u.url} />}
          </li>
        ))}
      </ol>
    </section>
  );
}
