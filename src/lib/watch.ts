// Weekly web watch: client-safe shapes shared by the server and the workspace panel.

export type WatchKind = "search" | "pricing";

export interface WebWatchItem {
  kind: WatchKind;
  label: string;
  target: string;
  status: "creating" | "active" | "error";
  error: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
}

export interface WebWatchChange {
  id: string;
  kind: WatchKind;
  title: string;
  /** Written by Context.dev's change detection (AI). */
  summary: string | null;
  url: string | null;
  matched: { url: string; title: string | null; snippet: string | null }[];
  importance: string | null;
  detected_at: string;
}

export interface WebWatchDTO {
  supported: boolean;
  subscribed: boolean;
  watches: WebWatchItem[];
  changes: WebWatchChange[];
  /** True when stored changes are older than the sync interval and should be refreshed from Context.dev. */
  stale: boolean;
}

export const WATCH_SYNC_MS = 6 * 60 * 60 * 1000;

/** A watch needs a sync when it is active and was never synced, or last synced longer ago than the interval. */
export function watchNeedsSync(w: { status: string; last_checked_at: string | null }, now: number, interval = WATCH_SYNC_MS): boolean {
  if (w.status !== "active") return false;
  if (!w.last_checked_at) return true;
  return now - Date.parse(w.last_checked_at) > interval;
}

/** First link for a change: its own URL, else the first matched page. */
export function changeLink(c: Pick<WebWatchChange, "url" | "matched">): string | null {
  return c.url ?? c.matched[0]?.url ?? null;
}
