// Founder workspace server functions (signed-in only; RLS scopes rows to the caller).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { ProjectDTO } from "./dto";
import { buildProjectFromStartup, type StartupForClaim } from "./claim";

const uuid = z.string().uuid();

function toProject(r: Record<string, unknown>): ProjectDTO {
  return {
    id: r["id"] as string,
    startup_id: (r["startup_id"] as string) ?? null,
    name: r["name"] as string,
    tagline: (r["tagline"] as string) ?? null,
    concept: (r["concept"] as string) ?? null,
    brand: (r["brand"] as ProjectDTO["brand"]) ?? { hue: 40, glyph: "orbit", motto: "" },
    assumptions: (r["assumptions"] as ProjectDTO["assumptions"]) ?? [],
    checklist: (r["checklist"] as ProjectDTO["checklist"]) ?? [],
    roadmap: (r["roadmap"] as ProjectDTO["roadmap"]) ?? [],
    updates: (r["updates"] as ProjectDTO["updates"]) ?? [],
    pitch: (r["pitch"] as ProjectDTO["pitch"]) ?? { slides: [] },
    research: (r["research"] as ProjectDTO["research"]) ?? {},
    created_at: r["created_at"] as string,
    updated_at: r["updated_at"] as string,
  };
}

export const claimStartup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { startupId: string }) => ({ startupId: uuid.parse(d.startupId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", userId)
      .eq("startup_id", data.startupId)
      .maybeSingle();
    if (existing) return { projectId: existing.id, created: false };

    const { data: st, error } = await supabase.from("startups").select("*").eq("id", data.startupId).maybeSingle();
    if (error) throw error;
    if (!st) throw new Error("This startup no longer exists.");

    const ids = st.evidence_source_ids ?? [];
    const { data: sources } = ids.length
      ? await supabase.from("sources").select("id, title, url, domain, published_at, signal_type").in("id", ids)
      : { data: [] };

    const payload = buildProjectFromStartup(st as unknown as StartupForClaim, sources ?? [], new Date().toISOString());
    const { data: created, error: insErr } = await supabase
      .from("projects")
      .insert({ ...payload, user_id: userId } as never)
      .select("id")
      .single();
    if (insErr) throw insErr;
    return { projectId: created.id, created: true };
  });

export const listMyProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("*")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(toProject);
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) => ({ projectId: uuid.parse(d.projectId) }))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .select("*")
      .eq("id", data.projectId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return row ? toProject(row as unknown as Record<string, unknown>) : null;
  });

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  tagline: z.string().max(240).optional(),
  concept: z.string().max(8000).optional(),
  assumptions: z
    .array(
      z.object({
        id: z.string().max(40),
        text: z.string().max(600),
        type: z.string().max(40),
        how_to_test: z.string().max(600),
        status: z.enum(["untested", "validated", "invalidated"]),
      }),
    )
    .max(40)
    .optional(),
  checklist: z
    .array(
      z.object({
        id: z.string().max(40),
        title: z.string().max(200),
        description: z.string().max(800),
        method: z.string().max(300),
        success_signal: z.string().max(400),
        done: z.boolean(),
      }),
    )
    .max(40)
    .optional(),
  roadmap: z
    .array(
      z.object({
        id: z.string().max(40),
        phase: z.string().max(120),
        horizon: z.string().max(80),
        items: z.array(z.object({ id: z.string().max(40), text: z.string().max(400), done: z.boolean() })).max(30),
      }),
    )
    .max(12)
    .optional(),
  updates: z
    .array(
      z.object({
        id: z.string().max(60),
        at: z.string().max(40),
        kind: z.enum(["claimed", "note", "scan"]),
        title: z.string().max(200),
        text: z.string().max(2000),
        url: z.string().max(1000).nullable().optional(),
      }),
    )
    .max(200)
    .optional(),
});

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string; patch: z.input<typeof patchSchema> }) => ({
    projectId: uuid.parse(d.projectId),
    patch: patchSchema.parse(d.patch),
  }))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .update(data.patch as unknown as Database["public"]["Tables"]["projects"]["Update"])
      .eq("id", data.projectId)
      .eq("user_id", context.userId)
      .select("updated_at")
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("Project not found");
    return { updated_at: row.updated_at };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) => ({ projectId: uuid.parse(d.projectId) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .delete()
      .eq("id", data.projectId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
