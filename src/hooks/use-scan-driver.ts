import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { advanceMarketScan } from "@/lib/research.functions";

const TERMINAL = new Set(["complete", "failed"]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Drives a market scan through its stages (fetch → analyze) from the browser. */
export function useScanDriver(scanId: string, slug: string, status: string | undefined) {
  const advance = useServerFn(advanceMarketScan);
  const queryClient = useQueryClient();
  const [driverError, setDriverError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const running = useRef(false);

  useEffect(() => {
    if (!status || TERMINAL.has(status) || running.current) return;
    running.current = true;
    let cancelled = false;
    setDriverError(null);

    (async () => {
      let failures = 0;
      while (!cancelled) {
        try {
          const res = await advance({ data: { scanId } });
          await queryClient.invalidateQueries({ queryKey: ["scan", scanId] });
          if (!res.ok) {
            setDriverError(res.error);
            break;
          }
          failures = 0;
          if (TERMINAL.has(res.status)) break;
          if (res.busy) await sleep(2500);
        } catch (err) {
          console.error("[scan] advance failed", err);
          failures++;
          if (failures >= 3) {
            setDriverError("Lost connection to the research engine. Your scan is saved — retry to continue.");
            break;
          }
          await sleep(3000 * failures);
        }
      }
      running.current = false;
      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: ["startup", slug] });
        queryClient.invalidateQueries({ queryKey: ["startups"] });
        queryClient.invalidateQueries({ queryKey: ["quakes"] });
      }
    })();

    return () => {
      cancelled = true;
      running.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId, generation, status && TERMINAL.has(status)]);

  return { driverError, restart: () => setGeneration((g) => g + 1) };
}
