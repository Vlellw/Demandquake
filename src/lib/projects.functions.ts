// Founder workspace server functions (signed-in only; RLS scopes rows to the caller).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { InvitePreviewDTO, ProjectDTO, ProjectSummaryDTO, ProjectInviteDTO, ProjectTeamDTO } from "./dto";
import { buildProjectFromStartup, type StartupForClaim } from "./claim";

const uuid = z.string().uuid();

const PROJECT_COLS = "*, project_members(count)";

function nameFromClaims(claims: Record<string, unknown> | undefined): string {
  const meta = (claims?.["user_metadata"] ?? {}) as { full_name?: string; name?: string };
  const email = typeof claims?.["email"] === "string" ? (claims["email"] as string) : "";
  return (meta.full_name || meta.name || email.split("@")[0] || "Founder").slice(0, 80);
}

function toProject(r: Record<string, unknown>, userId: string): ProjectDTO {
  const members = r["project_members"] as { count: number }[] | undefined;
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
    is_owner: r["user_id"] === userId,
    owner_name: (r["owner_name"] as string) ?? null,
    member_count: members?.[0]?.count ?? 0,
  };
}

export const claimStartup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { startupId: string; environment: 'sandbox' | 'live' }) => z.object({ startupId: uuid, environment: z.enum(['sandbox', 'live']) }).parse(d))
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
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: result, error: claimError } = await supabaseAdmin.rpc('claim_startup_with_credits', {
      p_user: userId, p_env: data.environment, p_startup: st.id,
      p_owner_name: nameFromClaims(context.claims as Record<string, unknown>),
      p_payload: payload as unknown as Database['public']['Tables']['projects']['Row']['brand'],
    });
    if (claimError) throw new Error(claimError.message);
    return z.object({ projectId: uuid, created: z.boolean(), cost: z.number() }).parse(result);
  });

export const listMyProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // RLS returns projects the caller owns or was invited to.
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, startup_id, name, tagline, brand, updated_at, user_id, owner_name, checklist, assumptions, startup_slug:research->>startup_slug, industry:research->>industry, geography:research->>geography, project_members(count), startup:startups!projects_startup_id_fkey(banner_image_url)")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as unknown as Record<string, unknown>[]).map((r): ProjectSummaryDTO => {
      const p = toProject(r, context.userId);
      const startup = r["startup"] as { banner_image_url: string | null } | null;
      return {
        id: p.id, startup_id: p.startup_id, name: p.name, tagline: p.tagline,
        brand: p.brand, updated_at: p.updated_at, is_owner: p.is_owner,
        owner_name: p.owner_name, member_count: p.member_count,
        banner_image_url: startup?.banner_image_url ?? null,
        research: { ...(typeof r["startup_slug"] === "string" ? { startup_slug: r["startup_slug"] } : {}), industry: r["industry"] as string | null, geography: r["geography"] as string | null },
        progress: { checks: p.checklist.length, checksDone: p.checklist.filter(c => c.done).length, assumptions: p.assumptions.length, tested: p.assumptions.filter(a => a.status !== "untested").length },
      };
    });
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) => ({ projectId: uuid.parse(d.projectId) }))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("projects").select(PROJECT_COLS).eq("id", data.projectId).maybeSingle();
    if (error) throw error;
    return row ? toProject(row as unknown as Record<string, unknown>, context.userId) : null;
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
        kind: z.enum(["claimed", "note", "scan", "member"]),
        title: z.string().max(200),
        text: z.string().max(2000),
        url: z.string().max(1000).nullable().optional(),
        author: z.string().max(80).nullable().optional(),
      }),
    )
    .max(200)
    .optional(),
});

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string; baseUpdatedAt: string; patch: z.input<typeof patchSchema> }) => ({
    projectId: uuid.parse(d.projectId),
    baseUpdatedAt: z.string().min(10).max(40).parse(d.baseUpdatedAt),
    patch: patchSchema.parse(d.patch),
  }))
  .handler(async ({ data, context }) => {
    // Optimistic concurrency: only write when nobody saved since this browser's last read.
    const { data: row, error } = await context.supabase
      .from("projects")
      .update(data.patch as unknown as Database["public"]["Tables"]["projects"]["Update"])
      .eq("id", data.projectId)
      .eq("updated_at", data.baseUpdatedAt)
      .select("updated_at")
      .maybeSingle();
    if (error) throw error;
    if (row) return { ok: true as const, updated_at: row.updated_at };

    const { data: latest, error: readErr } = await context.supabase
      .from("projects")
      .select(PROJECT_COLS)
      .eq("id", data.projectId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!latest) throw new Error("This workspace no longer exists or you no longer have access.");
    return { ok: false as const, conflict: true as const, project: toProject(latest as unknown as Record<string, unknown>, context.userId) };
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

// ---------- Co-founder collaboration ----------

export const getProjectTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) => ({ projectId: uuid.parse(d.projectId) }))
  .handler(async ({ data, context }): Promise<ProjectTeamDTO | null> => {
    const { supabase, userId } = context;
    const { data: project, error } = await supabase
      .from("projects")
      .select("user_id, owner_name")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw error;
    if (!project) return null;
    const isOwner = project.user_id === userId;
    const { data: members, error: mErr } = await supabase
      .from("project_members")
      .select("user_id, display_name, joined_at")
      .eq("project_id", data.projectId)
      .order("joined_at");
    if (mErr) throw mErr;
    let invites: ProjectInviteDTO[] = [];
    if (isOwner) {
      const { data: inv, error: iErr } = await supabase
        .from("project_invites")
        .select("id, token, created_at, expires_at")
        .eq("project_id", data.projectId)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (iErr) throw iErr;
      invites = inv ?? [];
    }
    return { is_owner: isOwner, owner_name: project.owner_name, members: members ?? [], invites };
  });

export const createProjectInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) => ({ projectId: uuid.parse(d.projectId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: project } = await supabase
      .from("projects")
      .select("user_id, owner_name")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!project || project.user_id !== userId) throw new Error("Only the founder who claimed this startup can invite co-founders.");
    if (!project.owner_name) {
      await supabase.from("projects").update({ owner_name: nameFromClaims(claims as Record<string, unknown>) }).eq("id", data.projectId);
    }
    const { count } = await supabase
      .from("project_invites")
      .select("id", { count: "exact", head: true })
      .eq("project_id", data.projectId)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString());
    if ((count ?? 0) >= 5) throw new Error("You already have 5 active invite links. Revoke one before creating another.");
    const { data: invite, error } = await supabase
      .from("project_invites")
      .insert({ project_id: data.projectId, created_by: userId })
      .select("id, token, created_at, expires_at")
      .single();
    if (error) throw error;
    return invite as ProjectInviteDTO;
  });

export const revokeProjectInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { inviteId: string }) => ({ inviteId: uuid.parse(d.inviteId) }))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("project_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.inviteId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("Invite not found.");
    return { ok: true };
  });

/** Owner removes a co-founder, or a co-founder leaves. The activity feed records it first. */
export const removeProjectMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string; userId: string }) => ({ projectId: uuid.parse(d.projectId), userId: uuid.parse(d.userId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: member } = await supabase
      .from("project_members")
      .select("display_name")
      .eq("project_id", data.projectId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!member) throw new Error("This co-founder is no longer on the project.");
    const leaving = data.userId === userId;
    const { data: project } = await supabase.from("projects").select("updates").eq("id", data.projectId).maybeSingle();
    if (project) {
      const entry = {
        id: `m-${crypto.randomUUID().replace(/-/g, "")}`,
        at: new Date().toISOString(),
        kind: "member",
        title: leaving ? `${member.display_name} left the project` : `${member.display_name} was removed from the project`,
        text: leaving ? "They no longer have access to this workspace." : "The owner removed their access to this workspace.",
        author: member.display_name,
      };
      const updates = [...((project.updates as unknown[]) ?? []), entry];
      await supabase.from("projects").update({ updates } as never).eq("id", data.projectId);
    }
    const { error } = await supabase.from("project_members").delete().eq("project_id", data.projectId).eq("user_id", data.userId);
    if (error) throw error;
    return { ok: true, left: leaving };
  });

const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/, "Invalid invite link");

export const previewInvite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string }) => ({ token: d.token }))
  .handler(async ({ data, context }): Promise<InvitePreviewDTO> => {
    const empty = { project_id: null, project_name: null, tagline: null, brand: null, owner_name: null };
    const parsed = tokenSchema.safeParse(data.token);
    if (!parsed.success) return { status: "not_found", ...empty };
    const { data: rows, error } = await context.supabase.rpc("preview_project_invite", { _token: parsed.data });
    if (error) throw error;
    const r = rows?.[0];
    if (!r) return { status: "not_found", ...empty };
    return {
      status: r.status as InvitePreviewDTO["status"],
      project_id: r.project_id,
      project_name: r.project_name,
      tagline: r.tagline,
      brand: (r.brand as InvitePreviewDTO["brand"]) ?? null,
      owner_name: r.owner_name,
    };
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string }) => ({ token: tokenSchema.parse(d.token) }))
  .handler(async ({ data, context }) => {
    const { data: projectId, error } = await context.supabase.rpc("accept_project_invite", {
      _token: data.token,
      _display_name: nameFromClaims(context.claims as Record<string, unknown>),
    });
    if (error) {
      if (/invalid or has expired/i.test(error.message)) return { ok: false as const, error: "This invite link is invalid or has expired. Ask the founder for a new one." };
      throw error;
    }
    return { ok: true as const, projectId: projectId as string };
  });
