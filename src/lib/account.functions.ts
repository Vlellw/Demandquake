import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ token: z.string().trim().regex(/^\d{6,8}$/), confirmation: z.literal("DELETE") }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: current, error: currentError } = await context.supabase.auth.getUser();
    if (currentError || !current.user?.email || current.user.id !== context.userId) throw new Error("Please sign in again.");
    const { data: verified, error } = await context.supabase.auth.verifyOtp({ email: current.user.email, token: data.token, type: "email" });
    if (error || verified.user?.id !== context.userId) throw new Error("The confirmation code is invalid or expired.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: workspaceError } = await supabaseAdmin.from("projects").delete().eq("user_id", context.userId);
    if (workspaceError) throw new Error("Could not remove your workspaces. Please try again.");
    const { error: memberError } = await supabaseAdmin.from("project_members").delete().eq("user_id", context.userId);
    if (memberError) throw new Error("Could not remove your workspace memberships. Please try again.");
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (deleteError) throw new Error("Could not delete your account. Please try again.");
    return { ok: true };
  });