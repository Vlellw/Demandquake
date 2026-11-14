import { useEffect, useState } from "react";
import { INSPECTION_STEPS, inspectionProgress, inspectionStorageKey, parseVisited, type InspectionTab } from "@/lib/journey";

const ALL_STEPS = INSPECTION_STEPS.map((s) => s.tab);

/**
 * Step 3 progress for one startup. The startup page shows every essential section on one page,
 * so opening it checks them all off. Stored per slug in localStorage and read after hydration,
 * so server and browser render the same first frame.
 */
export function useInspection(slug: string) {
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
      return { slug, visited: [...new Set([...base, ...ALL_STEPS])] };
    });
  }, [slug]);

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
