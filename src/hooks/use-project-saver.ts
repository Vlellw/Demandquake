import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { updateProject } from "@/lib/projects.functions";
import { changedFields, mergeProject, pickEditable, type EditableProject } from "@/lib/project-merge";
import type { ProjectDTO } from "@/lib/dto";

type Patch = Partial<EditableProject>;
export type SaveState = "idle" | "saving" | "saved" | "error";

const MAX_CONFLICT_RETRIES = 3;

/**
 * Local-first editing with debounced saves. Saves are conditional on the version this browser last
 * read; if a co-founder saved in between, their changes are merged in (see project-merge) and the
 * save retries, so neither person's edits are lost.
 */
export function useProjectSaver(initial: ProjectDTO) {
  const save = useServerFn(updateProject);
  const queryClient = useQueryClient();
  const [project, setProject] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [mergedFromTeammate, setMergedFromTeammate] = useState(0);
  const pending = useRef<Patch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const local = useRef<ProjectDTO>(initial);
  const base = useRef<ProjectDTO>(initial);
  const inFlight = useRef(false);

  const commitLocal = useCallback((next: ProjectDTO) => {
    local.current = next;
    setProject(next);
  }, []);

  /** Fold a newer server version into local state, keeping unsaved local edits. */
  const absorb = useCallback(
    (server: ProjectDTO) => {
      const merged = mergeProject(pickEditable(base.current), pickEditable(local.current), pickEditable(server));
      base.current = server;
      const next = { ...server, ...merged };
      commitLocal(next);
      pending.current = changedFields(merged, pickEditable(server));
      return Object.keys(pending.current).length > 0;
    },
    [commitLocal],
  );

  const flush = useCallback(async () => {
    if (inFlight.current) return;
    if (Object.keys(pending.current).length === 0) return;
    inFlight.current = true;
    setState("saving");
    let patch: Patch = {};
    let failed = false;
    try {
      for (let attempt = 0; attempt <= MAX_CONFLICT_RETRIES; attempt++) {
        patch = pending.current;
        if (Object.keys(patch).length === 0) break;
        pending.current = {};
        const res = await save({
          data: {
            projectId: initial.id,
            baseUpdatedAt: base.current.updated_at,
            patch: { ...patch, tagline: patch.tagline ?? undefined, concept: patch.concept ?? undefined },
          },
        });
        if (res.ok) {
          base.current = { ...base.current, ...patch, updated_at: res.updated_at };
          local.current = { ...local.current, updated_at: res.updated_at };
          patch = {};
          setSavedAt(res.updated_at);
          continue; // pick up edits made while this save was in flight
        }
        // A co-founder saved first: merge their version with ours, then retry with what's left.
        patch = {};
        absorb(res.project);
        setMergedFromTeammate((n) => n + 1);
        if (attempt === MAX_CONFLICT_RETRIES) throw new Error("Workspace kept changing while saving");
      }
      setState("saved");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (err) {
      console.error("[workspace] save failed", err);
      pending.current = { ...patch, ...pending.current };
      failed = true;
      setState("error");
    } finally {
      inFlight.current = false;
    }
    // Edits typed during the last request are saved on the next tick.
    if (!failed && Object.keys(pending.current).length) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 300);
    }
  }, [initial.id, save, queryClient, absorb]);

  const update = useCallback(
    (patch: Patch, opts?: { immediate?: boolean }) => {
      commitLocal({ ...local.current, ...patch });
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), opts?.immediate ? 0 : 700);
    },
    [flush, commitLocal],
  );

  /** Called when a fresher copy of the project arrives (e.g. periodic refetch while shared). */
  const receiveRemote = useCallback(
    (server: ProjectDTO) => {
      if (inFlight.current) return; // the save path handles conflicts itself
      if (server.updated_at === base.current.updated_at) return;
      if (new Date(server.updated_at).getTime() < new Date(base.current.updated_at).getTime()) return;
      const hadLocal = Object.keys(pending.current).length > 0;
      const needsSave = absorb(server);
      if (!hadLocal) setMergedFromTeammate((n) => n + 1);
      if (needsSave) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void flush(), 300);
      }
    },
    [absorb, flush],
  );

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      if (timer.current) clearTimeout(timer.current);
      void flush();
    };
  }, [flush]);

  return { project, update, state, savedAt, retry: flush, receiveRemote, mergedFromTeammate };
}
