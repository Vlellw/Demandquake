// Weekly web watch for claimed startups. One set of Context.dev monitors per startup, shared by every
// workspace that subscribes; monitors run on Context.dev's own schedule and the workspace pulls new
// findings when a founder opens it. Server-only.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as db } from "@/integrations/supabase/client.server";
import type { Database, Json } from "@/integrations/supabase/types";
import { ContextDevError, createMonitor, deleteMonitor, getMonitor, listMonitorChanges, monitorLimits, type MonitorInfo } from "./contextdev.server";
import { watchTargetsFor } from "./demand.server";
import { watchNeedsSync, type WatchKind, type WebWatchChange, type WebWatchDTO, type WebWatchItem } from "./watch";

type WatchRow = Database["public"]["Tables"]["startup_watches"]["Row"];
const STUCK_CREATING_MS = 2 * 60_000;
const ERROR_RETRY_MS = 60_000;

export class WatchError extends Error {
  userMessage: string;
  constructor(userMessage: string) {
    super(userMessage);
    this.name = "WatchError";
    this.userMessage = userMessage;
  }
}

export function watchMessage(err: unknown): string {
  if (err instanceof WatchError || err instanceof ContextDevError) return err.userMessage;
  return "The weekly watch is unavailable right now. Try again later.";
}

/** Confirms the caller can open this workspace (RLS as the user) and returns its startup. */
async function projectFor(sb: SupabaseClient<Database>, projectId: string): Promise<{ id: string; startup_id: string | null }> {
  const { data, error } = await sb.from("projects").select("id, startup_id").eq("id", projectId).maybeSingle();
  if (error) throw error;
  if (!data) throw new WatchError("This workspace no longer exists or you no longer have access.");
  return data;
}

async function watchesOf(startupId: string): Promise<WatchRow[]> {
  const { data, error } = await db.from("startup_watches").select("*").eq("startup_id", startupId).order("kind");
  if (error) throw error;
  return data ?? [];
}

function toItem(w: WatchRow): WebWatchItem {
  return {
    kind: w.kind as WatchKind,
    label: w.label ?? (w.kind === "search" ? "New on the web" : "Competitor pricing page"),
    target: w.target,
    status: w.status as WebWatchItem["status"],
    error: w.status === "error" ? (w.error ?? "This watch could not be set up.") : null,
    last_run_at: w.last_run_at,
    next_run_at: w.next_run_at,
  };
}

export async function readWebWatch(sb: SupabaseClient<Database>, projectId: string): Promise<WebWatchDTO> {
  const project = await projectFor(sb, projectId);
  if (!project.startup_id) return { supported: false, subscribed: false, watches: [], changes: [], stale: false };
  const [{ data: sub }, watches] = await Promise.all([
    db.from("startup_watch_subscribers").select("project_id").eq("project_id", projectId).maybeSingle(),
    watchesOf(project.startup_id),
  ]);
  if (!sub) return { supported: true, subscribed: false, watches: [], changes: [], stale: false };
  const { data: rows, error } = await db
    .from("startup_watch_changes")
    .select("id, kind, title, summary, url, matched, importance, detected_at")
    .eq("startup_id", project.startup_id)
    .order("detected_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  const now = Date.now();
  return {
    supported: true,
    subscribed: true,
    watches: [...watches].sort((a, b) => (a.kind === "search" ? -1 : 1) - (b.kind === "search" ? -1 : 1)).map(toItem),
    changes: (rows ?? []).map((c) => ({
      id: c.id,
      kind: c.kind as WatchKind,
      title: c.title,
      summary: c.summary,
      url: c.url,
      matched: (c.matched as unknown as WebWatchChange["matched"]) ?? [],
      importance: c.importance,
      detected_at: c.detected_at,
    })),
    stale: watches.some((w) => watchNeedsSync(w, now)) || watches.some((w) => w.status === "creating" && now - Date.parse(w.updated_at) > STUCK_CREATING_MS),
  };
}

/** Deletes monitors for startups no workspace subscribes to any more, freeing Context.dev slots. */
export async function cleanupOrphanWatches(): Promise<void> {
  const [{ data: watches }, { data: subs }] = await Promise.all([
    db.from("startup_watches").select("id, startup_id, monitor_id"),
    db.from("startup_watch_subscribers").select("startup_id"),
  ]);
  const live = new Set((subs ?? []).map((s) => s.startup_id));
  for (const w of watches ?? []) {
    if (live.has(w.startup_id)) continue;
    try {
      if (w.monitor_id) await deleteMonitor(w.monitor_id);
      await db.from("startup_watches").delete().eq("id", w.id);
    } catch (err) {
      console.error("[watch] orphan cleanup failed", err);
    }
  }
}

/** Claims the right to create one watch: inserts a 'creating' row, or takes over a failed or stuck one. */
async function claimWatch(startupId: string, kind: WatchKind, target: string, label: string, userId: string): Promise<boolean> {
  const { error } = await db.from("startup_watches").insert({ startup_id: startupId, kind, target, label, status: "creating", created_by: userId });
  if (!error) return true;
  if (error.code !== "23505") throw error;
  const nowIso = new Date().toISOString();
  const { data } = await db
    .from("startup_watches")
    .update({ status: "creating", target, label, error: null, updated_at: nowIso })
    .eq("startup_id", startupId)
    .eq("kind", kind)
    .or(
      `and(status.eq.error,updated_at.lt."${new Date(Date.now() - ERROR_RETRY_MS).toISOString()}"),and(status.eq.creating,updated_at.lt."${new Date(Date.now() - STUCK_CREATING_MS).toISOString()}")`,
    )
    .select("id");
  return Boolean(data && data.length);
}

function runTimes(m: MonitorInfo) {
  return { last_run_at: m.lastRunAt, next_run_at: m.nextRunAt };
}

async function setupWatch(
  startupId: string,
  kind: WatchKind,
  target: string,
  label: string,
  userId: string,
  monitor: Parameters<typeof createMonitor>[0],
): Promise<void> {
  if (!(await claimWatch(startupId, kind, target, label, userId))) return;
  const nowIso = () => new Date().toISOString();
  try {
    const limits = await monitorLimits();
    if (limits.limit > 0 && limits.used >= limits.limit) {
      await cleanupOrphanWatches();
      const again = await monitorLimits();
      if (again.limit > 0 && again.used >= again.limit) throw new WatchError("All weekly watch slots are in use right now. Market scans still work; try the watch again later.");
    }
    const m = await createMonitor(monitor);
    await db
      .from("startup_watches")
      .update({ monitor_id: m.id, status: "active", error: null, ...runTimes(m), updated_at: nowIso() })
      .eq("startup_id", startupId)
      .eq("kind", kind);
  } catch (err) {
    console.error(`[watch] ${kind} setup failed`, err);
    await db
      .from("startup_watches")
      .update({ status: "error", error: watchMessage(err), updated_at: nowIso() })
      .eq("startup_id", startupId)
      .eq("kind", kind);
  }
}

async function ensureWatches(startupId: string, userId: string): Promise<void> {
  const { data: st, error } = await db.from("startups").select("name, tagline, problem, monitor_queries").eq("id", startupId).maybeSingle();
  if (error) throw error;
  if (!st) throw new WatchError("This startup no longer exists.");
  const problem = ((st.problem as { statement?: string } | null)?.statement ?? st.tagline).slice(0, 400);
  const targets = await watchTargetsFor(startupId);
  const query = (targets.query ?? st.monitor_queries?.[0] ?? st.tagline).slice(0, 200);
  const existing = new Map((await watchesOf(startupId)).map((w) => [w.kind, w]));

  const needs = (kind: WatchKind) => {
    const w = existing.get(kind);
    return !w || w.status === "error" || (w.status === "creating" && Date.now() - Date.parse(w.updated_at) > STUCK_CREATING_MS);
  };

  if (needs("search")) {
    await setupWatch(startupId, "search", query, "New on the web about this problem", userId, {
      name: `Demandquake - ${st.name} - web`,
      target: {
        type: "search",
        query,
        instructions: `Report genuinely new articles, official rule changes, product launches, pricing changes or funding news about this problem: ${problem}. Ignore unrelated results, adverts and evergreen pages.`,
      },
      everyDays: 7,
    });
  }
  if (targets.pricing && needs("pricing")) {
    const limits = await monitorLimits().catch(() => null);
    // Leave a slot free for another startup's main watch before adding a second one here.
    if (!limits || limits.limit === 0 || limits.used + 1 < limits.limit) {
      await setupWatch(startupId, "pricing", targets.pricing.url, `${targets.pricing.competitor} pricing page`, userId, {
        name: `Demandquake - ${st.name} - pricing`,
        target: { type: "page", url: targets.pricing.url, instructions: "Report changes to plans, prices, free tiers, trial terms or what each plan includes." },
        everyDays: 7,
      });
    }
  }
}

export async function startWebWatch(sb: SupabaseClient<Database>, userId: string, projectId: string): Promise<WebWatchDTO> {
  const project = await projectFor(sb, projectId);
  if (!project.startup_id) throw new WatchError("Only workspaces claimed from a startup can be watched.");
  const { error } = await db
    .from("startup_watch_subscribers")
    .upsert({ project_id: projectId, startup_id: project.startup_id, user_id: userId }, { onConflict: "project_id", ignoreDuplicates: true });
  if (error) throw error;
  await ensureWatches(project.startup_id, userId);
  return readWebWatch(sb, projectId);
}

/** Pulls new findings and run times from Context.dev (at most every few hours per watch). */
export async function syncWebWatch(sb: SupabaseClient<Database>, userId: string, projectId: string): Promise<WebWatchDTO> {
  const project = await projectFor(sb, projectId);
  if (!project.startup_id) return readWebWatch(sb, projectId);
  const { data: sub } = await db.from("startup_watch_subscribers").select("project_id").eq("project_id", projectId).maybeSingle();
  if (!sub) return readWebWatch(sb, projectId);
  const startupId = project.startup_id;
  const watches = await watchesOf(startupId);
  if (watches.some((w) => w.status === "creating" && Date.now() - Date.parse(w.updated_at) > STUCK_CREATING_MS)) {
    await ensureWatches(startupId, userId);
  }
  const now = Date.now();
  for (const w of watches) {
    if (!w.monitor_id || !watchNeedsSync(w, now)) continue;
    // Claim the sync so two open workspaces don't both pull the same changes.
    const checkedIso = new Date().toISOString();
    let claim = db.from("startup_watches").update({ last_checked_at: checkedIso }).eq("id", w.id);
    claim = w.last_checked_at ? claim.eq("last_checked_at", w.last_checked_at) : claim.is("last_checked_at", null);
    const { data: claimed } = await claim.select("id");
    if (!claimed?.length) continue;
    try {
      const info = await getMonitor(w.monitor_id);
      if (!info) {
        await db.from("startup_watches").update({ status: "error", error: "This watch was removed. Start it again.", updated_at: checkedIso }).eq("id", w.id);
        continue;
      }
      const since = w.last_checked_at ? new Date(Date.parse(w.last_checked_at) - 24 * 60 * 60 * 1000).toISOString() : null;
      const changes = await listMonitorChanges(w.monitor_id, since);
      if (changes.length) {
        const { error } = await db.from("startup_watch_changes").upsert(
          changes.map((c) => ({
            id: c.id,
            watch_id: w.id,
            startup_id: startupId,
            kind: w.kind,
            title: c.title.slice(0, 300),
            summary: c.summary?.slice(0, 1000) ?? null,
            url: c.url,
            matched: c.matched as unknown as Json,
            importance: c.importance,
            detected_at: c.detectedAt,
          })),
          { onConflict: "id", ignoreDuplicates: true },
        );
        if (error) throw error;
      }
      const failed = info.status === "error" || info.status === "failed";
      await db
        .from("startup_watches")
        .update({
          ...runTimes(info),
          status: failed ? "error" : "active",
          error: failed ? (info.lastError ? "Context.dev could not run this watch. Start it again." : "This watch stopped running. Start it again.") : null,
          updated_at: checkedIso,
        })
        .eq("id", w.id);
    } catch (err) {
      console.error("[watch] sync failed", err);
      // Let the next visit try again instead of waiting for the full interval.
      await db.from("startup_watches").update({ last_checked_at: w.last_checked_at }).eq("id", w.id);
    }
  }
  return readWebWatch(sb, projectId);
}

export async function stopWebWatch(sb: SupabaseClient<Database>, projectId: string): Promise<WebWatchDTO> {
  const project = await projectFor(sb, projectId);
  await db.from("startup_watch_subscribers").delete().eq("project_id", projectId);
  if (project.startup_id) {
    const { count } = await db.from("startup_watch_subscribers").select("project_id", { count: "exact", head: true }).eq("startup_id", project.startup_id);
    if (!count) {
      for (const w of await watchesOf(project.startup_id)) {
        try {
          if (w.monitor_id) await deleteMonitor(w.monitor_id);
          await db.from("startup_watches").delete().eq("id", w.id);
        } catch (err) {
          console.error("[watch] stop cleanup failed", err);
        }
      }
    }
  }
  return readWebWatch(sb, projectId);
}
