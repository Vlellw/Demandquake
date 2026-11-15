import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { demandEvidenceQuery } from "@/lib/queries";
import { advanceDemandEvidence, retryDemandEvidence } from "@/lib/demand.functions";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Reads a startup's cached demand checks and, while some check is still due, keeps asking the server
 * to run the next one. Workers are stateless, so several open tabs simply share the work.
 */
export function useDemandEvidence(slug: string) {
  const qc = useQueryClient();
  const query = useQuery(demandEvidenceQuery(slug));
  const advance = useServerFn(advanceDemandEvidence);
  const retryFn = useServerFn(retryDemandEvidence);
  const [driverError, setDriverError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const running = useRef(false);
  const needsWork = Boolean(query.data?.needs_work);

  useEffect(() => {
    if (!needsWork || running.current) return;
    running.current = true;
    let cancelled = false;
    setDriverError(null);
    (async () => {
      let failures = 0;
      while (!cancelled) {
        try {
          const res = await advance({ data: { slug } });
          if (cancelled) break;
          if (res.error || !res.evidence) {
            setDriverError(res.error ?? "Demand checks are unavailable right now.");
            break;
          }
          qc.setQueryData(demandEvidenceQuery(slug).queryKey, res.evidence);
          failures = 0;
          if (!res.evidence.needs_work) break;
          if (res.busy || !res.progressed) await sleep(3500);
        } catch (err) {
          if (cancelled) break;
          console.error("[demand] advance failed", err);
          failures++;
          if (failures >= 3) {
            setDriverError("Lost connection while gathering demand evidence. Progress is saved - try again.");
            break;
          }
          await sleep(3000 * failures);
        }
      }
      running.current = false;
    })();
    return () => {
      cancelled = true;
      running.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, needsWork, generation]);

  const retry = useMutation({
    mutationFn: () => retryFn({ data: { slug } }),
    onSuccess: (evidence) => {
      qc.setQueryData(demandEvidenceQuery(slug).queryKey, evidence);
      setDriverError(null);
      setGeneration((g) => g + 1);
    },
  });

  return {
    evidence: query.data ?? null,
    loading: query.isLoading,
    loadError: query.isError,
    driverError,
    retry: () => retry.mutate(),
    retrying: retry.isPending,
    restart: () => {
      setDriverError(null);
      setGeneration((g) => g + 1);
    },
  };
}
