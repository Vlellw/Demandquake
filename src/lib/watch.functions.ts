// Authenticated server functions for a workspace's weekly web watch.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = (d: { projectId: string }) => ({ projectId: z.string().uuid().parse(d.projectId) });

export const getWebWatch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input)
  .handler(async ({ data, context }) => {
    const { readWebWatch } = await import("./watch.server");
    return readWebWatch(context.supabase, data.projectId);
  });

export const startWebWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input)
  .handler(async ({ data, context }) => {
    const mod = await import("./watch.server");
    try {
      return { ok: true as const, watch: await mod.startWebWatch(context.supabase, context.userId, data.projectId) };
    } catch (err) {
      console.error("[watch] start failed", err);
      return { ok: false as const, error: mod.watchMessage(err) };
    }
  });

export const syncWebWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input)
  .handler(async ({ data, context }) => {
    const mod = await import("./watch.server");
    try {
      return { ok: true as const, watch: await mod.syncWebWatch(context.supabase, context.userId, data.projectId) };
    } catch (err) {
      console.error("[watch] sync failed", err);
      return { ok: false as const, error: mod.watchMessage(err) };
    }
  });

export const stopWebWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input)
  .handler(async ({ data, context }) => {
    const mod = await import("./watch.server");
    try {
      return { ok: true as const, watch: await mod.stopWebWatch(context.supabase, data.projectId) };
    } catch (err) {
      console.error("[watch] stop failed", err);
      return { ok: false as const, error: mod.watchMessage(err) };
    }
  });
