// Visibility checks for server functions that use the service client after authorising the caller.
// Startups claimed privately are visible only to their workspace team; the caller's own client
// applies those rules, so a missing row means "not yours to see". Server-only.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Db = SupabaseClient<Database>;

export const UNAVAILABLE_STARTUP = "This startup isn’t available. Another founder may have claimed it privately.";

/** Returns the startup id when the caller may see it, otherwise null. */
export async function visibleStartupId(db: Db, key: { slug: string } | { id: string }): Promise<string | null> {
  const query = db.from("startups").select("id");
  const { data, error } = await ("slug" in key ? query.eq("slug", key.slug) : query.eq("id", key.id)).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/** True when the caller may see the market scan (its startup is public or theirs). */
export async function canSeeScan(db: Db, scanId: string): Promise<boolean> {
  const { data, error } = await db.from("market_scans").select("id").eq("id", scanId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
