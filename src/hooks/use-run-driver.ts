import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { advanceDiscovery } from "@/lib/research.functions";

const TERMINAL = new Set(["complete", "failed"]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Drives a discovery run forward from the browser: each call performs one pipeline stage
 * on the server. During startup generation several workers run in parallel.
 */
export function useRunDriver(runId: string, status: string | undefined, enabled = true) {
  const advance = useServerFn(advanceDiscovery);
  const queryClient = useQueryClient();
  const [driverError, setDriverError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const running = useRef(false);

  useEffect(() => {
    if (!enabled || !status || TERMINAL.has(status) || running.current) return;
    running.current = true;
    let cancelled = false;
    let finished = false;
    let currentStatus = status;
    setDriverError(null);

    const stopped = () => cancelled || finished || TERMINAL.has(
      queryClient.getQueryData<{ run: { status: string } }>(["run", runId])?.run.status ?? "",
    );

    const worker = async (id: number) => {
      let networkFailures = 0;
      while (!stopped()) {
        // One worker advances serial stages; the others join only for generation.
        // Sleeping locally avoids repeated auth/database calls competing with research.
        if (id > 0 && currentStatus !== "generating") {
          await sleep(250);
          continue;
        }
        try {
          const res = await advance({ data: { runId } });
          void queryClient.invalidateQueries({ queryKey: ["run", runId] });
          if (stopped()) return;
          if (!res.ok) {
            setDriverError(res.error);
            return;
          }
          networkFailures = 0;
          currentStatus = res.status;
          if (TERMINAL.has(res.status)) {
            finished = true;
            setDriverError(null);
            return;
          }
          if (res.busy) await sleep(2500);
        } catch (err) {
          if (stopped()) return;
          console.error("[research] advance failed", err);
          networkFailures++;
          if (networkFailures >= 3) {
            setDriverError("Lost connection to the research engine. Your progress is saved - retry to continue.");
            return;
          }
          await sleep(3000 * networkFailures);
        }
      }
    };

    Promise.all([worker(0), worker(1), worker(2)]).finally(() => {
      running.current = false;
      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: ["run", runId] });
        queryClient.invalidateQueries({ queryKey: ["credit-account"] });
        queryClient.invalidateQueries({ queryKey: ["startups"] });
        queryClient.invalidateQueries({ queryKey: ["radar"] });
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        queryClient.invalidateQueries({ queryKey: ["runs", "recent"] });
      }
    });

    return () => {
      cancelled = true;
      running.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, enabled, generation, status && TERMINAL.has(status)]);

  return { driverError: status === "complete" ? null : driverError, restart: () => setGeneration((g) => g + 1) };
}
