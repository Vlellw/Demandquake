import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { competitorBrandsQuery } from "@/lib/queries";
import { enrichCompetitorBrands } from "@/lib/research.functions";
import type { BrandProfileDTO } from "@/lib/dto";

/**
 * Reads cached competitor brand profiles and, once per mount, asks the server to look up any
 * competitor domains that have not been fetched from Context.dev yet.
 */
export function useCompetitorBrands(slug: string) {
  const qc = useQueryClient();
  const query = useQuery(competitorBrandsQuery(slug));
  const enrich = useServerFn(enrichCompetitorBrands);
  const requested = useRef(false);
  const mutation = useMutation({
    mutationFn: () => enrich({ data: { slug } }),
    onSuccess: (data) => qc.setQueryData(competitorBrandsQuery(slug).queryKey, data),
  });
  const { mutate } = mutation;
  const missing = query.data?.missing.length ?? 0;

  useEffect(() => {
    if (missing > 0 && !requested.current) {
      requested.current = true;
      mutate();
    }
  }, [missing, mutate]);

  return {
    profiles: (query.data?.profiles ?? {}) as Record<string, BrandProfileDTO>,
    byName: query.data?.byName ?? {},
    looking: query.isLoading || mutation.isPending,
    failed: mutation.isError || query.isError,
  };
}
