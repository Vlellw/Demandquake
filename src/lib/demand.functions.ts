// Authenticated server functions for the demand checks on a startup's Evidence tab.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugInput = (d: { slug: string }) => ({ slug: z.string().min(1).max(80).parse(d.slug) });

export const getDemandEvidence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(slugInput)
  .handler(async ({ data, context }) => {
    const { visibleStartupId } = await import("./access.server");
    if (!(await visibleStartupId(context.supabase, { slug: data.slug }))) return null;
    const { readDemandEvidence } = await import("./demand.server");
    return readDemandEvidence(data.slug);
  });

export const advanceDemandEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(slugInput)
  .handler(async ({ data, context }) => {
    const { visibleStartupId, UNAVAILABLE_STARTUP } = await import("./access.server");
    if (!(await visibleStartupId(context.supabase, { slug: data.slug }))) {
      return { evidence: null, progressed: false, busy: false, error: UNAVAILABLE_STARTUP as string | null };
    }
    const mod = await import("./demand.server");
    try {
      return { ...(await mod.advanceDemandEvidence(data.slug)), error: null as string | null };
    } catch (err) {
      console.error("[demand] advance failed", err);
      const message = err instanceof mod.DemandError ? err.userMessage : "Demand checks are unavailable right now. Try again later.";
      return { evidence: null, progressed: false, busy: false, error: message };
    }
  });

export const retryDemandEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(slugInput)
  .handler(async ({ data, context }) => {
    const { visibleStartupId, UNAVAILABLE_STARTUP } = await import("./access.server");
    if (!(await visibleStartupId(context.supabase, { slug: data.slug }))) throw new Error(UNAVAILABLE_STARTUP);
    const { retryDemandEvidence: retry } = await import("./demand.server");
    return retry(data.slug);
  });
