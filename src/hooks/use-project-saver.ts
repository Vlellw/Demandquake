import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { updateProject } from "@/lib/projects.functions";
import type { ProjectDTO } from "@/lib/dto";

type Patch = Partial<Pick<ProjectDTO, "name" | "tagline" | "concept" | "assumptions" | "checklist" | "roadmap" | "updates">>;
export type SaveState = "idle" | "saving" | "saved" | "error";

/** Local-first editing with debounced, merged saves to the founder's project row. */
export function useProjectSaver(initial: ProjectDTO) {
  const save = useServerFn(updateProject);
  const queryClient = useQueryClient();
  const [project, setProject] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const pending = useRef<Patch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    setState("saving");
    try {
      const patchForServer = {
        ...patch,
        tagline: patch.tagline ?? undefined,
        concept: patch.concept ?? undefined,
      };
      const res = await save({ data: { projectId: initial.id, patch: patchForServer } });
      setSavedAt(res.updated_at);
      setState("saved");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (err) {
      console.error("[workspace] save failed", err);
      pending.current = { ...patch, ...pending.current };
      setState("error");
    }
  }, [initial.id, save, queryClient]);

  const update = useCallback(
    (patch: Patch, opts?: { immediate?: boolean }) => {
      setProject((p) => ({ ...p, ...patch }));
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, opts?.immediate ? 0 : 700);
    },
    [flush],
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

  return { project, update, state, savedAt, retry: flush };
}
