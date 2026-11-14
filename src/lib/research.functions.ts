// Authenticated server functions for the shared research catalog and actions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { normalizeQueryKey } from './research-utils';

const uuid = z.string().uuid();

// ---------- Catalog reads ----------
export const getStartupCards = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { listStartupCards } = await import("./catalog.server");
  return listStartupCards(context.supabase);
});

export const getRadarNodes = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { radarNodes } = await import("./catalog.server");
  return radarNodes(context.supabase);
});

export const getClusterSignals = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { clusterId: string }) => ({ clusterId: uuid.parse(d.clusterId) }))
  .handler(async ({ data, context }) => {
    const { clusterSignals } = await import("./catalog.server");
    return clusterSignals(context.supabase, data.clusterId);
  });

export const getDashboardStats = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { dashboardStats } = await import("./catalog.server");
  return dashboardStats(context.supabase);
});

export const getRecentRuns = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { recentRuns } = await import("./catalog.server");
  return recentRuns(context.supabase, 10);
});

export const getRunDetail = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string }) => ({ runId: uuid.parse(d.runId) }))
  .handler(async ({ data, context }) => {
    const { runDetail } = await import("./catalog.server");
    return runDetail(context.supabase, data.runId);
  });

export const getStartupDetail = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => ({ slug: z.string().min(1).max(80).parse(d.slug) }))
  .handler(async ({ data, context }) => {
    const { startupDetail } = await import("./catalog.server");
    return startupDetail(context.supabase, data.slug);
  });

export const getScanDetail = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { scanId: string }) => ({ scanId: uuid.parse(d.scanId) }))
  .handler(async ({ data, context }) => {
    const { scanDetail } = await import("./catalog.server");
    return scanDetail(context.supabase, data.scanId);
  });

// ---------- Discovery ----------
const startSchema = z.object({
  query: z.string().trim().min(6, "Describe what to research in a few more words.").max(300),
  industry: z.string().max(60).nullable().optional(),
  geography: z.string().max(60).nullable().optional(),
  force: z.boolean().optional(),
  environment: z.enum(['sandbox','live']),
  requestId: z.string().uuid(),
  expectedCost: z.number().int().min(0),
});

export const startDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof startSchema>) => startSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    try {
      const { data: result, error } = await supabaseAdmin.rpc('start_paid_discovery', {
        p_user: context.userId, p_env: data.environment, p_request: data.requestId,
        p_query: data.query, p_key: normalizeQueryKey(data.query, data.industry ?? null, data.geography ?? null),
        p_industry: data.industry ?? '', p_geography: data.geography ?? '', p_force: Boolean(data.force), p_expected_cost: data.expectedCost,
      });
      if (error) return { ok: false as const, error: error.message };
      const res = z.object({ runId: z.string().uuid(), reused: z.enum(['cached','in_progress']).nullable(), cost: z.number() }).parse(result);
      return { ok: true as const, ...res };
    } catch (err) {
      console.error("[startDiscovery]", err);
      return { ok: false as const, error: err instanceof Error ? err.message : 'Could not start research' };
    }
  });

export const advanceDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string }) => ({ runId: uuid.parse(d.runId) }))
  .handler(async ({ data, context }) => {
    // Terminal runs are read-only: their reservation has already been settled.
    // Read through the caller's client so catalog access still obeys RLS.
    const terminalResult = async () => {
      const { data: run } = await context.supabase.from('discovery_runs').select('status').eq('id', data.runId).maybeSingle();
      return run && (run.status === 'complete' || run.status === 'failed')
        ? { ok: true as const, status: run.status, progressed: false, busy: false }
        : null;
    };
    const terminal = await terminalResult();
    if (terminal) return terminal;
    const { data: reservations, error } = await context.supabase.from('credit_reservations').select('id').eq('run_id', data.runId).eq('user_id', context.userId).eq('status','reserved').limit(1);
    if (error || !reservations?.length) {
      // Another worker can finish between the status read and reservation read.
      const settled = await terminalResult();
      if (settled) return settled;
      return { ok: false as const, error: 'Only a researcher with reserved credits can advance this run.' };
    }
    const { advanceRun, userMessageOf } = await import("./pipeline.server");
    try {
      return { ok: true as const, ...(await advanceRun(data.runId)) };
    } catch (err) {
      console.error("[advanceDiscovery]", err);
      return { ok: false as const, error: userMessageOf(err) };
    }
  });

export const retryDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string; environment: 'sandbox' | 'live' }) => z.object({ runId: uuid, environment: z.enum(['sandbox','live']) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const reserved = await supabaseAdmin.rpc('renew_discovery_reservation', { p_user: context.userId, p_env: data.environment, p_run: data.runId });
    if (reserved.error) throw new Error(reserved.error.message);
    const { retryRun } = await import("./pipeline.server");
    await retryRun(data.runId);
    return { ok: true as const };
  });

// ---------- Market scans ----------
export const startMarketScan = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { startupId: string }) => ({ startupId: uuid.parse(d.startupId) }))
  .handler(async ({ data, context }) => {
    const { startScan } = await import("./scan.server");
    const { userMessageOf } = await import("./pipeline.server");
    try {
      return { ok: true as const, ...(await startScan(data.startupId)) };
    } catch (err) {
      console.error("[startMarketScan]", err);
      return { ok: false as const, error: userMessageOf(err) };
    }
  });

export const advanceMarketScan = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { scanId: string }) => ({ scanId: uuid.parse(d.scanId) }))
  .handler(async ({ data, context }) => {
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

export const getCompetitorBrands = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => ({ slug: slugSchema.parse(d.slug) }))
  .handler(async ({ data, context }) => {
    const { startupCompetitorBrands } = await import("./brands.server");
    return startupCompetitorBrands(data.slug);
  });

export const enrichCompetitorBrands = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => ({ slug: slugSchema.parse(d.slug) }))
  .handler(async ({ data, context }) => {
    const { enrichStartupCompetitorBrands } = await import("./brands.server");
    return enrichStartupCompetitorBrands(data.slug);
  });

export const getStartupScans = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => ({ slug: slugSchema.parse(d.slug) }))
  .handler(async ({ data, context }) => {
    const { startupScans } = await import("./catalog.server");
    return startupScans(context.supabase, data.slug);
  });

export const getRecentQuakes = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { recentQuakes } = await import("./catalog.server");
  return recentQuakes(context.supabase, 12);
});
