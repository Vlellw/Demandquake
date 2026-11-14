// Authenticated server functions for startup banner images.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

/**
 * Returns the startup's banner image URL, generating it once when missing.
 * Cards call this lazily; the result is cached on the startup row forever.
 * Returns { url: null } when generation failed — the caller keeps the plain brand banner.
 */
export const ensureStartupBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { startupId: string }) => ({ startupId: uuid.parse(d.startupId) }))
  .handler(async ({ data, context }) => {
    const { data: st, error } = await context.supabase
      .from("startups")
      .select("id, name, tagline, industry, brand, banner_image_url")
      .eq("id", data.startupId)
      .single();
    if (error || !st) throw new Error("Startup not found");
    if (st.banner_image_url) return { url: st.banner_image_url };
    const { generateStartupBanner } = await import("./banner.server");
    const url = await generateStartupBanner({ ...st, brand: st.brand as { hue?: number } | null });
    return { url };
  });
