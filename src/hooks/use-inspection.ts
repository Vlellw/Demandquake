import { useEffect, useState } from "react";
import { inspectionProgress, inspectionStorageKey, markVisited, parseVisited, type InspectionTab } from "@/lib/journey";

/**
 * Step 2 progress for one startup: which essential tabs this browser has opened. Stored per slug in
 * localStorage and read after hydration, so server and browser render the same first frame.
 */
export function useInspection(slug: string, tab: string) {
  const [state, setState] = useState<{ slug: string; visited: InspectionTab[] }>({ slug, visited: [] });

  useEffect(() => {
    let stored: string | null = null;
    let storageOk = true;
    try {
      stored = window.localStorage.getItem(inspectionStorageKey(slug));
    } catch {
      // Storage can be blocked (private mode); progress then lasts for this visit only.
      storageOk = false;
    }
    setState((prev) => {
      const base = storageOk ? parseVisited(stored) : prev.slug === slug ? prev.visited : [];
      return { slug, visited: markVisited(base, tab) };
    });
  }, [slug, tab]);

  useEffect(() => {
    if (state.slug !== slug || state.visited.length === 0) return;
    try {
      window.localStorage.setItem(inspectionStorageKey(slug), JSON.stringify(state.visited));
    } catch {
      /* blocked storage: keep in-memory progress only */
    }
  }, [state, slug]);

  const visited = state.slug === slug ? state.visited : [];
  return { visited, progress: inspectionProgress(visited) };
}
