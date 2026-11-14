// Three-way merge for founder workspaces shared between co-founders.
// `base` is the last version this browser saw from the server, `local` holds this browser's edits,
// `server` is the newer version a teammate saved. Edits on different items both survive; when the
// same item changed on both sides, this browser's edit wins (it is the one being saved).
import type { ProjectDTO } from "./dto";

export const EDITABLE_FIELDS = ["name", "tagline", "concept", "assumptions", "checklist", "roadmap", "updates"] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];
export type EditableProject = Pick<ProjectDTO, EditableField>;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type WithId = { id: string };

export function mergeById<T extends WithId>(base: T[], local: T[], server: T[], mergeItem?: (b: T, l: T, s: T) => T): T[] {
  const baseMap = new Map(base.map((x) => [x.id, x]));
  const localMap = new Map(local.map((x) => [x.id, x]));
  const serverIds = new Set(server.map((x) => x.id));
  const out: T[] = [];
  for (const s of server) {
    const b = baseMap.get(s.id);
    const l = localMap.get(s.id);
    if (b && !l) continue; // removed here
    if (l && b && !same(l, b)) {
      // changed here; if the teammate changed it too, combine where possible
      out.push(mergeItem && !same(s, b) ? mergeItem(b, l, s) : l);
    } else if (l && !b && !same(l, s)) {
      out.push(l); // both added the same id (e.g. a logged scan) - keep this browser's copy
    } else {
      out.push(s);
    }
  }
  for (const l of local) {
    if (!baseMap.has(l.id) && !serverIds.has(l.id)) out.push(l); // added here
  }
  return out;
}

function mergeScalar<T>(base: T, local: T, server: T): T {
  return same(local, base) ? server : local;
}

export function mergeProject(base: EditableProject, local: EditableProject, server: EditableProject): EditableProject {
  return {
    name: mergeScalar(base.name, local.name, server.name),
    tagline: mergeScalar(base.tagline, local.tagline, server.tagline),
    concept: mergeScalar(base.concept, local.concept, server.concept),
    assumptions: mergeById(base.assumptions, local.assumptions, server.assumptions),
    checklist: mergeById(base.checklist, local.checklist, server.checklist),
    roadmap: mergeById(base.roadmap, local.roadmap, server.roadmap, (b, l, s) => ({
      ...l,
      phase: mergeScalar(b.phase, l.phase, s.phase),
      horizon: mergeScalar(b.horizon, l.horizon, s.horizon),
      items: mergeById(b.items, l.items, s.items),
    })),
    updates: mergeById(base.updates, local.updates, server.updates),
  };
}

/** Fields where `next` differs from `server` - what still needs saving after a merge. */
export function changedFields(next: EditableProject, server: EditableProject): Partial<EditableProject> {
  const out: Partial<EditableProject> = {};
  for (const f of EDITABLE_FIELDS) {
    if (!same(next[f], server[f])) (out as Record<string, unknown>)[f] = next[f];
  }
  return out;
}

export function pickEditable(p: EditableProject): EditableProject {
  return {
    name: p.name,
    tagline: p.tagline,
    concept: p.concept,
    assumptions: p.assumptions,
    checklist: p.checklist,
    roadmap: p.roadmap,
    updates: p.updates,
  };
}
