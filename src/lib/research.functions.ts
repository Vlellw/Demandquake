// Public server functions for discovery, research runs, catalog reads and market scans.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const uuid = z.string().uuid();

// ---------- Catalog reads ----------
export const getStartupCards = createServerFn({ method: "GET" }).handler(async () => {
  const { listStartupCards } = await import("./catalog.server");
  return listStartupCards();
});

export const getRadarNodes = createServerFn({ method: "GET" }).handler(async () => {
  const { radarNodes } = await import("./catalog.server");
  return radarNodes();
});

export const getClusterSignals = createServerFn({ method: "GET" })
  .inputValidator((d: { clusterId: string }) => ({ clusterId: uuid.parse(d.clusterId) }))
  .handler(async ({ data }) => {
    const { clusterSignals } = await import("./catalog.server");
    return clusterSignals(data.clusterId);
  });

export const getDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  const { dashboardStats } = await import("./catalog.server");
  return dashboardStats();
});

export const getRecentRuns = createServerFn({ method: "GET" }).handler(async () => {
  const { recentRuns } = await import("./catalog.server");
  return recentRuns(10);
});

export const getRunDetail = createServerFn({ method: "GET" })
  .inputValidator((d: { runId: string }) => ({ runId: uuid.parse(d.runId) }))
  .handler(async ({ data }) => {
    const { runDetail } = await import("./catalog.server");
    return runDetail(data.runId);
  });

export const getStartupDetail = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: z.string().min(1).max(80).parse(d.slug) }))
  .handler(async ({ data }) => {
    const { startupDetail } = await import("./catalog.server");
    return startupDetail(data.slug);
  });

export const getScanDetail = createServerFn({ method: "GET" })
  .inputValidator((d: { scanId: string }) => ({ scanId: uuid.parse(d.scanId) }))
  .handler(async ({ data }) => {
    const { scanDetail } = await import("./catalog.server");
    return scanDetail(data.scanId);
  });

// ---------- Discovery ----------
const startSchema = z.object({
  query: z.string().trim().min(6, "Describe what to research in a few more words.").max(300),
  industry: z.string().max(60).nullable().optional(),
  geography: z.string().max(60).nullable().optional(),
  force: z.boolean().optional(),
});

export const startDiscovery = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof startSchema>) => startSchema.parse(d))
  .handler(async ({ data }) => {
    const { createRun, userMessageOf } = await import("./pipeline.server");
    try {
      const res = await createRun({
        query: data.query,
        industry: data.industry || null,
        geography: data.geography || null,
        force: Boolean(data.force),
      });
      return { ok: true as const, ...res };
    } catch (err) {
      console.error("[startDiscovery]", err);
      return { ok: false as const, error: userMessageOf(err) };
    }
  });

export const advanceDiscovery = createServerFn({ method: "POST" })
  .inputValidator((d: { runId: string }) => ({ runId: uuid.parse(d.runId) }))
  .handler(async ({ data }) => {
    const { advanceRun, userMessageOf } = await import("./pipeline.server");
    try {
      return { ok: true as const, ...(await advanceRun(data.runId)) };
    } catch (err) {
      console.error("[advanceDiscovery]", err);
      return { ok: false as const, error: userMessageOf(err) };
    }
  });

export const retryDiscovery = createServerFn({ method: "POST" })
  .inputValidator((d: { runId: string }) => ({ runId: uuid.parse(d.runId) }))
  .handler(async ({ data }) => {
    const { retryRun } = await import("./pipeline.server");
    await retryRun(data.runId);
    return { ok: true as const };
  });

// ---------- Market scans ----------
export const startMarketScan = createServerFn({ method: "POST" })
  .inputValidator((d: { startupId: string }) => ({ startupId: uuid.parse(d.startupId) }))
  .handler(async ({ data }) => {
    const { startScan } = await import("./scan.server");
    const { userMessageOf } = await import("./pipeline.server");
    try {
      return { ok: true as const, ...(await startScan(data.startupId)) };
    } catch (err) {
      console.error("[startMarketScan]", err);
      return { ok: false as const, error: userMessageOf(err) };
    }
  });

export const advanceMarketScan = createServerFn({ method: "POST" })
  .inputValidator((d: { scanId: string }) => ({ scanId: uuid.parse(d.scanId) }))
  .handler(async ({ data }) => {
    const { advanceScan } = await import("./scan.server");
    const { userMessageOf } = await import("./pipeline.server");
    try {
      return { ok: true as const, ...(await advanceScan(data.scanId)) };
    } catch (err) {
      console.error("[advanceMarketScan]", err);
      return { ok: false as const, error: userMessageOf(err) };
    }
  });

// ---------- Competitor brands (Context.dev brand lookups, cached per domain) ----------
const slugSchema = z.string().min(1).max(80);

export const getCompetitorBrands = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: slugSchema.parse(d.slug) }))
  .handler(async ({ data }) => {
    const { startupCompetitorBrands } = await import("./brands.server");
    return startupCompetitorBrands(data.slug);
  });

export const enrichCompetitorBrands = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string }) => ({ slug: slugSchema.parse(d.slug) }))
  .handler(async ({ data }) => {
    const { enrichStartupCompetitorBrands } = await import("./brands.server");
    return enrichStartupCompetitorBrands(data.slug);
  });

export const getStartupScans = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: slugSchema.parse(d.slug) }))
  .handler(async ({ data }) => {
    const { startupScans } = await import("./catalog.server");
    return startupScans(data.slug);
  });

export const getRecentQuakes = createServerFn({ method: "GET" }).handler(async () => {
  const { recentQuakes } = await import("./catalog.server");
  return recentQuakes(12);
});
